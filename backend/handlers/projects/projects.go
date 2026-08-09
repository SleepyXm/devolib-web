package handlers

import (
	"database/sql"
	"devolib/structs"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/errdefs"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	scanResult   *structs.ScanResult
	freshResult  *structs.ScaffoldResult
	frontendRoot string
	backendRoot  string
	dbRoot       string
	pages        []map[string]any
	endpoints    []map[string]any
	detected     []string
)

var (
	projectDockerOnce    sync.Once
	projectDockerBuilder *Builder
	projectDockerHelper  *ContainerHelper
	projectDockerErr     error
)

func projectDocker() (*Builder, *ContainerHelper, error) {
	projectDockerOnce.Do(func() {
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			projectDockerErr = err
			return
		}

		log := slog.Default()

		projectDockerBuilder = NewBuilder(cli, log)
		projectDockerHelper = NewContainerHelper(cli, log)
	})

	return projectDockerBuilder, projectDockerHelper, projectDockerErr
}

func ListProjects(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		rows, err := db.QueryContext(c.Request.Context(), `
			SELECT p.project_id, p.name, p.status, p.container_id,
			       p.created_at, p.last_online, s.name, s.framework
			FROM projects p
			LEFT JOIN project_services ps ON p.project_id = ps.project_id
			LEFT JOIN services s ON s.id = ps.service_id
			WHERE p.user_id = $1
			ORDER BY p.last_online DESC NULLS LAST, p.created_at DESC
		`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}
		defer rows.Close()

		projectsMap := map[string]*structs.Project{}
		order := []string{}

		for rows.Next() {
			var p structs.Project
			var containerID, serviceName, serviceFramework sql.NullString

			if err := rows.Scan(
				&p.ID,
				&p.Name,
				&p.Status,
				&containerID,
				&p.CreatedAt,
				&p.LastOnline,
				&serviceName,
				&serviceFramework,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
				return
			}

			p.ContainerID = containerID.String

			if _, exists := projectsMap[p.ID]; !exists {
				projectsMap[p.ID] = &p
				order = append(order, p.ID)
			}

			if serviceName.Valid {
				projectsMap[p.ID].Services = append(
					projectsMap[p.ID].Services,
					structs.Service{
						Name:      serviceName.String,
						Framework: serviceFramework.String,
					},
				)
			}
		}

		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}

		projects := make([]structs.Project, 0, len(order))
		for _, id := range order {
			projects = append(projects, *projectsMap[id])
		}

		c.JSON(http.StatusOK, gin.H{"projects": projects})
	}
}

func CreateProject(db *sql.DB) gin.HandlerFunc {
	builder, helper, dockerErr := projectDocker()

	return func(c *gin.Context) {
		if dockerErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker unavailable"})
			return
		}

		ctx := c.Request.Context()
		userID := c.GetString("userID")

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		var req structs.CreateProjectRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project request"})
			return
		}

		req.Name = strings.TrimSpace(req.Name)

		if req.Name == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Project name is required"})
			return
		}

		projectID := uuid.NewString()

		accessToken, err := generateProjectAccessToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate project token"})
			return
		}

		if err := createProjectRecord(
			ctx,
			db,
			projectID,
			userID,
			req.Name,
			accessToken,
		); err != nil {
			helper.Log.Error(
				"project record creation failed",
				"project_id", projectID,
				"error", err,
			)

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create project"})
			return
		}

		if err := insertProjectServices(
			ctx,
			db,
			projectID,
			compactStrings(req.Backend, req.Frontend, req.Database),
		); err != nil {
			_ = rollbackProject(ctx, db, projectID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save project services"})
			return
		}

		envs := req.Envs

		if len(envs) == 0 {
			envs = getDefaultEnvs(req.Name)
		}

		result, err := CreateProjectContainer(
			ctx,
			db,
			builder,
			helper,
			projectID,
			req.Name,
			optionalService(req.Backend),
			optionalService(req.Frontend),
			optionalService(req.Database),
			req.ImportURL,
			projectEnvMap(envs),
		)
		if err != nil {
			helper.Log.Error(
				"container creation failed",
				"project_id", projectID,
				"error", err,
			)

			_ = helper.DeleteProjectContainer(ctx, projectID)
			_ = rollbackProject(ctx, db, projectID)

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project container"})
			return
		}

		if len(result.DetectedFrameworks) > 0 {
			if err := insertProjectServices(
				ctx,
				db,
				projectID,
				result.DetectedFrameworks,
			); err != nil {
				helper.Log.Warn(
					"failed to save detected frameworks",
					"project_id", projectID,
					"error", err,
				)
			}
		}

		if err := updateProjectRoots(ctx, db, projectID, result); err != nil {
			helper.Log.Error(
				"failed to update project roots",
				"project_id", projectID,
				"error", err,
			)

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save project roots"})
			return
		}

		if err := insertProjectMetadata(
			ctx,
			db,
			projectID,
			envs,
			result,
		); err != nil {
			helper.Log.Error(
				"failed to create project metadata",
				"project_id", projectID,
				"error", err,
			)

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save project metadata"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"ok":           true,
			"project_id":   projectID,
			"container_id": result.ContainerID,
			"name":         req.Name,
			"access_token": accessToken,
		})
	}
}

func GetProject(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("project_id")
		userID := c.GetString("userID")

		var (
			name         string
			status       string
			accessToken  string
			containerID  sql.NullString
			frontendRoot sql.NullString
			backendRoot  sql.NullString
			dbRoot       sql.NullString
			createdAt    time.Time
			lastOnline   sql.NullTime
		)

		err := db.QueryRowContext(c.Request.Context(), `
			SELECT name, status, access_token, container_id, frontend_root, backend_root, db_root,
			       created_at, last_online
			FROM projects
			WHERE project_id = $1 AND user_id = $2
		`, projectID, userID).Scan(
			&name,
			&status,
			&accessToken,
			&containerID,
			&frontendRoot,
			&backendRoot,
			&dbRoot,
			&createdAt,
			&lastOnline,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load project"})
			return
		}

		var lastOnlineValue any

		if lastOnline.Valid {
			lastOnlineValue = lastOnline.Time
		}

		c.JSON(http.StatusOK, gin.H{
			"project_id":   projectID,
			"name":         name,
			"status":       status,
			"access_token": accessToken,
			"container_id": containerID.String,
			"created_at":   createdAt,
			"last_online":  lastOnlineValue,
			"roots": gin.H{
				"frontend_root": frontendRoot.String,
				"backend_root":  backendRoot.String,
				"db_root":       dbRoot.String,
			},
		})
	}
}

func DeleteProject(db *sql.DB) gin.HandlerFunc {
	_, helper, dockerErr := projectDocker()

	return func(c *gin.Context) {
		if dockerErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker unavailable"})
			return
		}

		var req struct {
			ProjectID string `json:"project_id"`
		}

		if err := c.ShouldBindJSON(&req); err != nil || req.ProjectID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "project_id is required"})
			return
		}

		userID := c.GetString("userID")

		var exists bool

		if err := db.QueryRowContext(c.Request.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM projects
				WHERE project_id = $1 AND user_id = $2
			)
		`, req.ProjectID, userID).Scan(&exists); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify project"})
			return
		}

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if err := helper.DeleteProjectContainer(
			c.Request.Context(),
			req.ProjectID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete project container"})
			return
		}

		if _, err := db.ExecContext(
			c.Request.Context(),
			`DELETE FROM projects WHERE project_id = $1 AND user_id = $2`,
			req.ProjectID,
			userID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete project"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":         true,
			"project_id": req.ProjectID,
			"deleted":    true,
		})
	}
}

func GetProjectMetadata(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("project_id")
		userID := c.GetString("userID")

		var owned bool

		if err := db.QueryRowContext(c.Request.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM projects
				WHERE project_id = $1 AND user_id = $2
			)
		`, projectID, userID).Scan(&owned); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify project"})
			return
		}

		if !owned {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		var envs, dbSchema, pages, endpoints, groups []byte
		var updatedAt sql.NullTime

		err := db.QueryRowContext(c.Request.Context(), `
			SELECT envs, db_schema, pages, endpoints, groups, updated_at
			FROM project_metadata
			WHERE project_id = $1
		`, projectID).Scan(
			&envs,
			&dbSchema,
			&pages,
			&endpoints,
			&groups,
			&updatedAt,
		)

		if err == sql.ErrNoRows {
			_, err = db.ExecContext(c.Request.Context(), `
				INSERT INTO project_metadata (
					project_id, envs, db_schema, pages, endpoints, groups
				)
				VALUES (
					$1, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
				)
			`, projectID)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create metadata"})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"envs":       []any{},
				"db_schema":  gin.H{},
				"pages":      []any{},
				"endpoints":  []any{},
				"groups":     []any{},
				"updated_at": nil,
			})

			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load metadata"})
			return
		}

		var envValue, schemaValue, pageValue, endpointValue, groupValue any

		_ = json.Unmarshal(envs, &envValue)
		_ = json.Unmarshal(dbSchema, &schemaValue)
		_ = json.Unmarshal(pages, &pageValue)
		_ = json.Unmarshal(endpoints, &endpointValue)
		_ = json.Unmarshal(groups, &groupValue)

		var updated any

		if updatedAt.Valid {
			updated = updatedAt.Time
		}

		c.JSON(http.StatusOK, gin.H{
			"envs":       envValue,
			"db_schema":  schemaValue,
			"pages":      pageValue,
			"endpoints":  endpointValue,
			"groups":     groupValue,
			"updated_at": updated,
		})
	}
}

func PatchProjectMetadata(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("project_id")
		userID := c.GetString("userID")

		var owned bool

		if err := db.QueryRowContext(c.Request.Context(), `
			SELECT EXISTS (
				SELECT 1 FROM projects
				WHERE project_id = $1 AND user_id = $2
			)
		`, projectID, userID).Scan(&owned); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify project"})
			return
		}

		if !owned {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		var body map[string]any

		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid metadata"})
			return
		}

		allowed := map[string]bool{
			"envs":      true,
			"db_schema": true,
			"pages":     true,
			"endpoints": true,
			"groups":    true,
		}

		var sets []string
		var args []any

		for field, value := range body {
			if !allowed[field] {
				continue
			}

			data, err := json.Marshal(value)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid metadata"})
				return
			}

			args = append(args, string(data))
			sets = append(
				sets,
				fmt.Sprintf("%s = $%d::jsonb", field, len(args)),
			)
		}

		if len(sets) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
			return
		}

		args = append(args, projectID)

		query := fmt.Sprintf(`
			UPDATE project_metadata
			SET %s, updated_at = NOW()
			WHERE project_id = $%d
		`, strings.Join(sets, ", "), len(args))

		if _, err := db.ExecContext(
			c.Request.Context(),
			query,
			args...,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update metadata"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}

func StartProject(db *sql.DB) gin.HandlerFunc {
	_, helper, dockerErr := projectDocker()

	return func(c *gin.Context) {
		if dockerErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker unavailable"})
			return
		}

		ctx := c.Request.Context()
		projectID := c.Param("project_id")
		userID := c.GetString("userID")

		var status string
		var containerID sql.NullString

		err := db.QueryRowContext(ctx, `
			SELECT status, container_id
			FROM projects
			WHERE project_id = $1 AND user_id = $2
		`, projectID, userID).Scan(
			&status,
			&containerID,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load project"})
			return
		}

		if !containerID.Valid || containerID.String == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project has no container"})
			return
		}

		if status == "running" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project is already running"})
			return
		}

		inspect, err := helper.Docker.ContainerInspect(ctx, containerID.String)
		if errdefs.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not inspect container"})
			return
		}
		if inspect.State == nil || !inspect.State.Running {
			err = helper.Docker.ContainerStart(ctx, containerID.String, container.StartOptions{})
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start container"})
			return
		}

		if _, err := helper.ExecInContainer(
			ctx,
			containerID.String,
			"pgrep logd",
		); err != nil {
			_ = helper.ExecDetached(
				ctx,
				containerID.String,
				"logd > /var/log/logd.log 2>&1",
			)
		}

		if _, err := db.ExecContext(ctx, `
			UPDATE projects
			SET status = 'running', last_online = NOW()
			WHERE project_id = $1
		`, projectID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update project status"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"ok":           true,
			"container_id": containerID.String,
			"status":       "running",
		})
	}
}

func StopProject(db *sql.DB) gin.HandlerFunc {
	_, helper, dockerErr := projectDocker()

	return func(c *gin.Context) {
		if dockerErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker unavailable"})
			return
		}

		ctx := c.Request.Context()
		projectID := c.Param("project_id")
		userID := c.GetString("userID")

		var containerID sql.NullString

		err := db.QueryRowContext(ctx, `
			SELECT container_id
			FROM projects
			WHERE project_id = $1 AND user_id = $2
		`, projectID, userID).Scan(&containerID)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load project"})
			return
		}

		if !containerID.Valid || containerID.String == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Project has no container"})
			return
		}

		inspect, err := helper.Docker.ContainerInspect(ctx, containerID.String)
		if errdefs.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not inspect container"})
			return
		}
		if inspect.State != nil && inspect.State.Running {
			err = helper.StopContainer(ctx, containerID.String)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not stop container"})
			return
		}

		if _, err := db.ExecContext(
			ctx,
			`UPDATE projects SET status = 'stopped', last_online = NOW() WHERE project_id = $1`,
			projectID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update project status"})
			return
		}

		notifyProjectStopped(ctx, projectID)
		c.JSON(http.StatusOK, gin.H{
			"ok":           true,
			"container_id": containerID.String,
			"status":       "stopped",
		})
	}
}
