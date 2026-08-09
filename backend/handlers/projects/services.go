package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type projectServiceRow struct {
	Name, Category string
	DefaultCommand sql.NullString
	DefaultPort    sql.NullInt64
	CustomCommand  sql.NullString
	FrontendRoot   sql.NullString
	BackendRoot    sql.NullString
}

func startProjectService(ctx context.Context, db *sql.DB, helper *ContainerHelper, containerID, projectID, projectName, service string, send chan<- string) error {
	inspect, err := helper.Docker.ContainerInspect(ctx, containerID)
	if err != nil {
		queueProjectMessage(ctx, send, "[✗] Container unreachable: "+err.Error()+"\n")
		updateProjectServices(ctx, projectID, send, func(services map[string]any) {
			for key := range services {
				if key != "container" {
					delete(services, key)
				}
			}
			services["container"] = false
		})
		return nil
	}
	if inspect.State == nil || !inspect.State.Running {
		queueProjectMessage(ctx, send, "[✗] Container is not running\n")
		updateProjectServices(ctx, projectID, send, func(services map[string]any) {
			for key := range services {
				if key != "container" {
					services[key] = map[string]any{"enabled": false, "status": "dead"}
				}
			}
			services["container"] = false
		})
		return nil
	}

	var row projectServiceRow
	err = db.QueryRowContext(ctx, `
		SELECT s.name, s.category, s.default_start_command, s.default_port, ps.custom_start_command, p.frontend_root, p.backend_root
		FROM project_services ps
		JOIN services s ON s.id = ps.service_id
		JOIN projects p ON p.project_id = ps.project_id
		WHERE ps.project_id = $1 AND s.category = $2
	`, projectID, service).Scan(&row.Name, &row.Category, &row.DefaultCommand, &row.DefaultPort, &row.CustomCommand, &row.FrontendRoot, &row.BackendRoot)
	if err == sql.ErrNoRows {
		queueProjectMessage(ctx, send, "[✗] No "+service+" service configured\n")
		updateProjectServices(ctx, projectID, send, func(services map[string]any) {
			services[service] = map[string]any{"enabled": false, "port": 0, "status": "missing", "name": service}
		})
		return nil
	}
	if err != nil {
		return err
	}

	command := row.DefaultCommand.String
	if row.CustomCommand.Valid && row.CustomCommand.String != "" {
		command = row.CustomCommand.String
	}
	frontendRoot, backendRoot := row.FrontendRoot.String, row.BackendRoot.String
	if frontendRoot == "" {
		frontendRoot = "/app/workspace/" + projectName
	}
	if backendRoot == "" {
		backendRoot = "/app/workspace/" + projectName
	}
	switch service {
	case "frontend":
		err = helper.ExecDetached(ctx, containerID, "cd "+shellQuote(frontendRoot)+" && "+command+" >/tmp/frontend.log 2>&1 &")
	case "backend":
		err = helper.ExecDetached(ctx, containerID, "cd "+shellQuote(backendRoot)+" && "+command+" >/tmp/backend.log 2>&1 &")
	case "database":
		err = helper.ExecDetached(ctx, containerID, command+" >/tmp/database.log 2>&1")
	}
	if err != nil {
		return err
	}
	if service == "database" {
		time.Sleep(200 * time.Millisecond)
		output, _, checkErr := runContainerCommand(ctx, helper, containerID, "", []string{"sh", "-c", `su - postgres -c "psql -lqt | cut -d \| -f 1 | grep -qw myapp && echo exists || echo missing"`})
		if checkErr == nil && strings.Contains(output, "exists") {
			if err := pushProjectSchema(ctx, db, helper, containerID, projectID, send); err != nil {
				return err
			}
		} else {
			queueProjectMessage(ctx, send, "[ℹ] Database 'myapp' not found\n")
		}
	}

	queueProjectMessage(ctx, send, "[→] Starting "+row.Name+" ("+service+")...\n")
	time.Sleep(200 * time.Millisecond)
	port := int(row.DefaultPort.Int64)
	if projectServiceHealthy(ctx, helper, containerID, service) {
		queueProjectMessage(ctx, send, fmt.Sprintf("[✓] %s is running on port %d\n", row.Name, port))
		updateProjectServices(ctx, projectID, send, func(services map[string]any) {
			services[service] = map[string]any{"enabled": true, "port": port, "status": "running", "name": row.Name, "category": row.Category}
		})
		return nil
	}
	logOutput, _, logErr := runContainerCommand(ctx, helper, containerID, "", []string{"tail", "-20", "/tmp/" + service + ".log"})
	if logErr != nil || logOutput == "" {
		logOutput = "No logs available"
	}
	queueProjectMessage(ctx, send, "[!] Failed to start "+row.Name+". Logs:\n"+logOutput+"\n")
	updateProjectServices(ctx, projectID, send, func(services map[string]any) {
		services[service] = map[string]any{"enabled": false, "port": port, "status": "failed", "name": row.Name, "logs": logOutput}
	})
	return nil
}

func projectServiceHealthy(ctx context.Context, helper *ContainerHelper, containerID, service string) bool {
	// These category ports are part of the Python terminal protocol and intentionally ignore service-row overrides.
	port := map[string]string{"frontend": "5173", "backend": "8000", "database": "5432"}[service]
	if port == "" {
		return false
	}
	for attempt := 0; attempt < 10; attempt++ {
		output, exitCode, err := runContainerCommand(ctx, helper, containerID, "", []string{"sh", "-c", "netstat -tuln | grep " + port})
		if err == nil && exitCode == 0 && output != "" {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(500 * time.Millisecond):
		}
	}
	return false
}
