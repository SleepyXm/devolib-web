package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// CreateProjectResult is returned after a successful project container creation.
type CreateProjectResult struct {
	ProjectID   string
	ContainerID string
	Port        int
	URL         string
	ConfigsMap  map[string]ServiceConfig
	BaseType    string
	CleanName   string
}

// CreateProjectContainer orchestrates image selection, container creation, and scaffolding.
func CreateProjectContainer(
	ctx context.Context,
	db *sql.DB,
	builder *Builder,
	helper *ContainerHelper,
	projectID, projectName string,
	backendServices, frontendServices, dbServices []string,
	env map[string]string,
) (*CreateProjectResult, error) {
	// 1. Resolve service configs and base image.
	cfg, err := ProjectServicesConfig(ctx, db, builder, projectName, backendServices, frontendServices, dbServices)
	if err != nil {
		return nil, fmt.Errorf("resolving project config: %w", err)
	}

	// 2. Create and start the container.
	result, err := helper.CreateAndStartContainer(
		ctx,
		projectID,
		projectName,
		cfg.BaseTag,
		cfg.BaseType,
		cfg.CleanName,
		cfg.FrontendPort,
		backendServices,
		frontendServices,
		dbServices,
		env,
	)
	if err != nil {
		return nil, fmt.Errorf("creating container: %w", err)
	}

	// 3. Scaffold the logging service.
	if err := helper.ScaffoldTemplate(ctx, result.ContainerID, "LoggingService", "/"); err != nil {
		helper.Log.Warn("failed to scaffold LoggingService", "project_id", projectID, "error", err)
	}

	// 4. Start logd.
	if _, err := helper.ExecInContainer(ctx, result.ContainerID, "logd &"); err != nil {
		helper.Log.Warn("failed to start logd", "project_id", projectID, "error", err)
	}

	// 5. Scaffold fresh project files for each service.
	if err := scaffoldFresh(ctx, helper, result.ContainerID, projectName, frontendServices, backendServices, dbServices, cfg.ConfigsMap); err != nil {
		return nil, fmt.Errorf("scaffolding project: %w", err)
	}

	// 6. Persist the container ID.
	if _, err := db.ExecContext(ctx,
		`UPDATE projects SET container_id = $1 WHERE project_id = $2`,
		result.ContainerID, projectID,
	); err != nil {
		return nil, fmt.Errorf("updating container_id: %w", err)
	}

	return &CreateProjectResult{
		ProjectID:   projectID,
		ContainerID: result.ContainerID,
		Port:        result.Port,
		URL:         result.URL,
		ConfigsMap:  cfg.ConfigsMap,
		BaseType:    cfg.BaseType,
		CleanName:   cfg.CleanName,
	}, nil
}

// scaffoldFresh runs scaffolding commands inside the container for each service.
func scaffoldFresh(
	ctx context.Context,
	helper *ContainerHelper,
	containerID, projectName string,
	frontendServices, backendServices, dbServices []string,
	configsMap map[string]ServiceConfig,
) error {
	// Frontend
	for _, framework := range frontendServices {
		cfg, ok := configsMap[framework]
		if !ok {
			continue
		}

		if cfg.ScaffoldCommand != nil {
			cmd := replaceName(*cfg.ScaffoldCommand, projectName)
			helper.Log.Info("scaffolding frontend", "framework", framework, "cmd", cmd)
			if _, err := helper.ExecInContainer(ctx, containerID,
				fmt.Sprintf("cd /app/workspace/frontend && %s", cmd),
			); err != nil {
				helper.Log.Warn("frontend scaffold failed", "framework", framework, "error", err)
			}
		}

		if cfg.DefaultPackages != "" && cfg.DefaultPackages != "[]" {
			packages := parseJSONStringArray(cfg.DefaultPackages)
			if len(packages) > 0 {
				pkgList := joinStrings(packages)
				if _, err := helper.ExecInContainer(ctx, containerID,
					fmt.Sprintf("cd /app/workspace/frontend/%s && npm install %s", projectName, pkgList),
				); err != nil {
					helper.Log.Warn("npm install failed", "framework", framework, "error", err)
				}
			}
		}

		if framework == "React" {
			if err := helper.ScaffoldTemplate(ctx, containerID, "React",
				fmt.Sprintf("/app/workspace/frontend/%s", projectName),
			); err != nil {
				helper.Log.Warn("React template scaffold failed", "error", err)
			}
		}
	}

	// Backend
	for _, framework := range backendServices {
		cfg, ok := configsMap[framework]
		if !ok {
			continue
		}

		if framework == "FastAPI" {
			if err := helper.ScaffoldTemplate(ctx, containerID, "FastAPI", "/app/workspace/backend"); err != nil {
				helper.Log.Warn("FastAPI template scaffold failed", "error", err)
			}
			if _, err := helper.ExecInContainer(ctx, containerID,
				"mkdir -p /app/workspace/backend/routers && touch /app/workspace/backend/routers/__init__.py",
			); err != nil {
				helper.Log.Warn("FastAPI routers dir failed", "error", err)
			}
		}

		if cfg.ScaffoldCommand != nil {
			cmd := replaceName(*cfg.ScaffoldCommand, projectName)
			helper.Log.Info("scaffolding backend", "framework", framework, "cmd", cmd)
			if _, err := helper.ExecInContainer(ctx, containerID, cmd); err != nil {
				helper.Log.Warn("backend scaffold failed", "framework", framework, "error", err)
			}
		}
	}

	// Database
	for _, framework := range dbServices {
		cfg, ok := configsMap[framework]
		if !ok {
			continue
		}
		if cfg.ScaffoldCommand != nil {
			cmd := replaceName(*cfg.ScaffoldCommand, projectName)
			helper.Log.Info("scaffolding database", "framework", framework, "cmd", cmd)
			if _, err := helper.ExecInContainer(ctx, containerID,
				fmt.Sprintf("cd /app/workspace/database && %s", cmd),
			); err != nil {
				helper.Log.Warn("db scaffold failed", "framework", framework, "error", err)
			}
		}
	}

	return nil
}

// replaceName substitutes {name} in a scaffold command with the project name.
func replaceName(cmd, name string) string {
	result := ""
	for i := 0; i < len(cmd); i++ {
		if i+5 < len(cmd) && cmd[i:i+6] == "{name}" {
			result += name
			i += 5
		} else {
			result += string(cmd[i])
		}
	}
	return result
}

// parseJSONStringArray parses a JSON string array like `["a","b"]` into a Go slice.
// Kept simple to avoid importing encoding/json for this one case.
func parseJSONStringArray(s string) []string {
	if s == "" || s == "[]" {
		return nil
	}
	// Strip [ and ]
	s = s[1 : len(s)-1]
	if s == "" {
		return nil
	}
	var result []string
	for _, part := range splitCSV(s) {
		part = trimQuotes(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func splitCSV(s string) []string {
	var parts []string
	current := ""
	inQuote := false
	for _, c := range s {
		switch {
		case c == '"':
			inQuote = !inQuote
			current += string(c)
		case c == ',' && !inQuote:
			parts = append(parts, current)
			current = ""
		default:
			current += string(c)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

func trimQuotes(s string) string {
	s = strings.TrimSpace(s)
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		return s[1 : len(s)-1]
	}
	return s
}
