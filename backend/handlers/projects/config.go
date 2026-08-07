package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
)

// ServiceConfig holds the database row for a service.
type ServiceConfig struct {
	Framework       string
	DefaultPort     int
	ScaffoldCommand *string
	StartFlags      *string
	DefaultPackages string
}

// ProjectConfig is the resolved config passed to container creation.
type ProjectConfig struct {
	ConfigsMap   map[string]ServiceConfig
	FrontendPort int
	BaseType     string
	BaseTag      string
	CleanName    string
}

// pickBaseImage always returns fullstacktest for now (mirrors Python logic).
func pickBaseImage(backendServices, frontendServices, db []string) string {
	return "fullstacktest"
}

// ProjectServicesConfig fetches service configs from the DB and builds the ProjectConfig.
func ProjectServicesConfig(
	ctx context.Context,
	db *sql.DB,
	builder *Builder,
	projectName string,
	backendServices, frontendServices, dbServices []string,
) (*ProjectConfig, error) {
	allServices := append(append(backendServices, frontendServices...), dbServices...)

	if len(allServices) == 0 {
		return &ProjectConfig{
			ConfigsMap:   map[string]ServiceConfig{},
			FrontendPort: 3000,
			BaseType:     "fullstacktest",
			BaseTag:      "devolib_fullstacktest:latest",
			CleanName:    CleanName(projectName),
		}, nil
	}

	// Build $1, $2, ... placeholders
	placeholders := make([]string, len(allServices))
	args := make([]interface{}, len(allServices))
	for i, s := range allServices {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = s
	}

	query := fmt.Sprintf(`
		SELECT framework, default_port, scaffold_command, start_flags, default_packages
		FROM services
		WHERE framework IN (%s)
	`, strings.Join(placeholders, ", "))

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying services: %w", err)
	}
	defer rows.Close()

	configsMap := make(map[string]ServiceConfig)
	for rows.Next() {
		var cfg ServiceConfig
		if err := rows.Scan(
			&cfg.Framework,
			&cfg.DefaultPort,
			&cfg.ScaffoldCommand,
			&cfg.StartFlags,
			&cfg.DefaultPackages,
		); err != nil {
			return nil, fmt.Errorf("scanning service row: %w", err)
		}
		configsMap[cfg.Framework] = cfg
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating service rows: %w", err)
	}

	// Pick frontend port from the first frontend service that has one.
	frontendPort := 3000
	for _, fw := range frontendServices {
		if cfg, ok := configsMap[fw]; ok && cfg.DefaultPort != 0 {
			frontendPort = cfg.DefaultPort
			break
		}
	}

	baseType := pickBaseImage(backendServices, frontendServices, dbServices)

	baseTag, err := builder.EnsureExists(ctx, baseType)
	if err != nil {
		return nil, fmt.Errorf("ensuring base image %s: %w", baseType, err)
	}

	return &ProjectConfig{
		ConfigsMap:   configsMap,
		FrontendPort: frontendPort,
		BaseType:     baseType,
		BaseTag:      baseTag,
		CleanName:    CleanName(projectName),
	}, nil
}

// CleanName makes a project name DNS-safe for Traefik routing.
func CleanName(name string) string {
	lower := strings.ToLower(name)

	reInvalid := regexp.MustCompile(`[^a-z0-9-]`)
	clean := reInvalid.ReplaceAllString(lower, "-")

	reConsecutive := regexp.MustCompile(`-+`)
	clean = reConsecutive.ReplaceAllString(clean, "-")

	clean = strings.Trim(clean, "-")

	if clean == "" {
		clean = fmt.Sprintf("proj-%d", simpleHash(name)%10000)
	}
	return clean
}

func simpleHash(s string) int {
	h := 0
	for _, c := range s {
		h = 31*h + int(c)
	}
	if h < 0 {
		h = -h
	}
	return h
}
