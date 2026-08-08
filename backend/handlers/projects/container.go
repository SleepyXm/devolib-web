package handlers

import (
	"context"
	"database/sql"
	"devolib/structs"
	"encoding/json"
	"fmt"
	"path"
	"strings"
)

type CreateProjectResult struct {
	ProjectID          string
	ContainerID        string
	Port               int
	URL                string
	BaseType           string
	CleanName          string
	FrontendRoot       string
	BackendRoot        string
	DBRoot             string
	Pages              []structs.Page
	Endpoints          []structs.Endpoint
	Groups             []structs.ProjectGroup
	DetectedFrameworks []string
}

func compactStrings(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

func scaffoldImport(ctx context.Context, helper *ContainerHelper, containerID, importURL string) (*structs.ScanResult, error) {
	repoName := strings.TrimSuffix(path.Base(strings.TrimSuffix(importURL, "/")), ".git")
	repoPath := "/app/workspace/" + repoName

	helper.Log.Info("cloning repo", "url", importURL)

	if _, err := helper.ExecInContainer(ctx, containerID,
		fmt.Sprintf("cd /app/workspace && git clone --depth=1 %s", shellQuote(importURL))); err != nil {
		return nil, fmt.Errorf("cloning repository: %w", err)
	}

	helper.Log.Info("scanning project structure", "url", importURL)
	scan := ScanProject(ctx, helper, containerID, repoPath)

	if FileExists(ctx, helper, containerID, repoPath+"/package.json") {
		helper.Log.Info("installing frontend dependencies", "url", importURL)
		if _, err := helper.ExecInContainer(ctx, containerID,
			fmt.Sprintf("cd %s && npm install", shellQuote(repoPath))); err != nil {
			helper.Log.Warn("frontend dependency installation failed", "error", err)
		}
	}

	if FileExists(ctx, helper, containerID, repoPath+"/requirements.txt") {
		helper.Log.Info("installing backend dependencies", "url", importURL)
		if _, err := helper.ExecInContainer(ctx, containerID,
			"pip install -r "+shellQuote(repoPath+"/requirements.txt")); err != nil {
			helper.Log.Warn("backend dependency installation failed", "error", err)
		}
	}

	return scan, nil
}

func scaffoldFresh(
	ctx context.Context,
	helper *ContainerHelper,
	containerID, projectName string,
	frontendServices, backendServices, dbServices []string,
	configsMap map[string]ServiceConfig,
) (*structs.ScaffoldResult, error) {
	result := &structs.ScaffoldResult{
		Pages:     []structs.Page{},
		Endpoints: []structs.Endpoint{},
	}

	for _, framework := range frontendServices {
		cfg, ok := configsMap[framework]
		if !ok {
			continue
		}

		if cfg.ScaffoldCommand != nil {
			cmd := strings.ReplaceAll(*cfg.ScaffoldCommand, "{name}", projectName)
			helper.Log.Info("scaffolding frontend", "framework", framework, "cmd", cmd)

			if _, err := helper.ExecInContainer(ctx, containerID,
				fmt.Sprintf("cd /app/workspace/frontend && %s", cmd)); err != nil {
				helper.Log.Warn("frontend scaffold failed", "framework", framework, "error", err)
			}
		}

		if cfg.DefaultPackages != "" && cfg.DefaultPackages != "[]" {
			var packages []string
			if err := json.Unmarshal([]byte(cfg.DefaultPackages), &packages); err != nil {
				helper.Log.Warn("invalid default packages", "framework", framework, "error", err)
			} else if len(packages) > 0 {
				if _, err := helper.ExecInContainer(ctx, containerID,
					fmt.Sprintf("cd %s && npm install %s",
						shellQuote("/app/workspace/frontend/"+projectName),
						strings.Join(packages, " "))); err != nil {
					helper.Log.Warn("npm install failed", "framework", framework, "error", err)
				}
			}
		}

		if framework == "React" {
			if err := helper.ScaffoldTemplate(ctx, containerID, "React", "/app/workspace/frontend/"+projectName); err != nil {
				helper.Log.Warn("React template scaffold failed", "error", err)
			}
			result.Pages = append(result.Pages, structs.Page{Route: "/", File: "src/App.jsx"})
		}
	}

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
				"mkdir -p /app/workspace/backend/routers && touch /app/workspace/backend/routers/__init__.py"); err != nil {
				helper.Log.Warn("FastAPI routers directory failed", "error", err)
			}

			result.Endpoints = append(result.Endpoints, structs.Endpoint{
				Method: "GET",
				Path:   "/api/health",
				File:   "main.py",
			})
		}

		if cfg.ScaffoldCommand != nil {
			cmd := strings.ReplaceAll(*cfg.ScaffoldCommand, "{name}", projectName)
			helper.Log.Info("scaffolding backend", "framework", framework, "cmd", cmd)

			if _, err := helper.ExecInContainer(ctx, containerID, cmd); err != nil {
				helper.Log.Warn("backend scaffold failed", "framework", framework, "error", err)
			}
		}
	}

	for _, framework := range dbServices {
		cfg, ok := configsMap[framework]
		if !ok || cfg.ScaffoldCommand == nil {
			continue
		}

		cmd := strings.ReplaceAll(*cfg.ScaffoldCommand, "{name}", projectName)
		helper.Log.Info("scaffolding database", "framework", framework, "cmd", cmd)

		if _, err := helper.ExecInContainer(ctx, containerID,
			fmt.Sprintf("cd /app/workspace/database && %s", cmd)); err != nil {
			helper.Log.Warn("database scaffold failed", "framework", framework, "error", err)
		}
	}

	return result, nil
}

func CreateProjectContainer(
	ctx context.Context,
	db *sql.DB,
	builder *Builder,
	helper *ContainerHelper,
	projectID, projectName string,
	backendServices, frontendServices, dbServices []string,
	importURL string,
	env map[string]string,
) (*CreateProjectResult, error) {
	cfg, err := ProjectServicesConfig(ctx, db, builder, projectName, backendServices, frontendServices, dbServices)
	if err != nil {
		return nil, fmt.Errorf("resolving project config: %w", err)
	}

	containerResult, err := helper.CreateAndStartContainer(
		ctx, projectID, projectName, cfg.BaseTag, cfg.BaseType, cfg.CleanName,
		cfg.FrontendPort, backendServices, frontendServices, dbServices, env,
	)
	if err != nil {
		return nil, fmt.Errorf("creating container: %w", err)
	}

	var scan *structs.ScanResult
	var fresh *structs.ScaffoldResult

	if importURL != "" {
		scan, err = scaffoldImport(ctx, helper, containerResult.ContainerID, importURL)
		if err != nil {
			return nil, fmt.Errorf("scaffolding imported project: %w", err)
		}
	} else {
		fresh, err = scaffoldFresh(
			ctx, helper, containerResult.ContainerID, cfg.CleanName,
			frontendServices, backendServices, dbServices, cfg.ConfigsMap,
		)
		if err != nil {
			return nil, fmt.Errorf("scaffolding fresh project: %w", err)
		}
	}

	if err := helper.ScaffoldTemplate(ctx, containerResult.ContainerID, "LoggingService", "/"); err != nil {
		helper.Log.Warn("failed to scaffold LoggingService", "project_id", projectID, "error", err)
	}

	if err := helper.ExecDetached(ctx, containerResult.ContainerID, "logd > /var/log/logd.log 2>&1"); err != nil {
		helper.Log.Warn("failed to start logd", "project_id", projectID, "error", err)
	}

	result := &CreateProjectResult{
		ProjectID:   projectID,
		ContainerID: containerResult.ContainerID,
		Port:        containerResult.Port,
		URL:         containerResult.URL,
		BaseType:    cfg.BaseType,
		CleanName:   cfg.CleanName,
	}

	if scan != nil {
		repoName := strings.TrimSuffix(path.Base(strings.TrimSuffix(importURL, "/")), ".git")

		result.FrontendRoot = scan.FrontendRoot
		if result.FrontendRoot == "" {
			result.FrontendRoot = "/app/workspace/" + repoName
		}

		result.BackendRoot = scan.BackendRoot
		result.DBRoot = scan.DBRoot
		result.Pages = scan.Pages
		result.Endpoints = scan.Endpoints
		result.DetectedFrameworks = compactStrings(
			scan.FrontendFramework,
			scan.BackendFramework,
			scan.DBFramework,
		)
	} else {
		if len(frontendServices) > 0 {
			result.FrontendRoot = "/app/workspace/frontend/" + cfg.CleanName
		}
		if len(backendServices) > 0 {
			result.BackendRoot = "/app/workspace/backend"
		}
		if len(dbServices) > 0 {
			result.DBRoot = "/app/workspace/database"
		}

		result.Pages = fresh.Pages
		result.Endpoints = fresh.Endpoints
	}

	result.Groups = buildProjectGroups(
		ctx, helper, containerResult.ContainerID, cfg.CleanName,
		frontendServices, backendServices, scan,
	)

	if err := helper.StopContainer(ctx, containerResult.ContainerID); err != nil {
		helper.Log.Warn("failed to stop container after setup", "project_id", projectID, "error", err)
	}

	if _, err := db.ExecContext(ctx,
		`UPDATE projects SET container_id = $1 WHERE project_id = $2`,
		containerResult.ContainerID, projectID,
	); err != nil {
		return nil, fmt.Errorf("updating container_id: %w", err)
	}

	return result, nil
}
