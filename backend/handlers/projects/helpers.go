package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"devolib/structs"

	"github.com/google/uuid"
)

func optionalService(service string) []string {
	if service == "" {
		return nil
	}
	return []string{service}
}

func projectEnvMap(envs []structs.Env) map[string]string {
	result := make(map[string]string, len(envs))
	for _, env := range envs {
		if env.Key != "" {
			result[env.Key] = env.Value
		}
	}
	return result
}

func getDefaultEnvs(name string) []structs.Env {
	return []structs.Env{
		{Key: "FRONTEND_URL", Value: name + ".localhost", IsSecret: false},
		{Key: "BACKEND_URL", Value: "http://localhost:8000", IsSecret: false},
		{Key: "DATABASE_URL", Value: "postgresql+asyncpg://postgres@localhost:5432/myapp", IsSecret: true},
	}
}

func generateProjectAccessToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generating access token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func shellQuote(s string) string {
	if s == "" {
		return "''"
	}

	return "'" + strings.ReplaceAll(s, "'", `'"'"'`) + "'"
}

func hashProjectAccessToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func createProjectRecord(ctx context.Context, db *sql.DB, projectID, userID, name, accessToken string) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO projects (project_id, user_id, name, access_token)
		VALUES ($1, $2, $3, $4)
	`, projectID, userID, name, hashProjectAccessToken(accessToken))

	if err != nil {
		return fmt.Errorf("inserting project: %w", err)
	}
	return nil
}

func insertProjectServices(ctx context.Context, db *sql.DB, projectID string, frameworks []string) error {
	for _, framework := range frameworks {
		if framework == "" {
			continue
		}

		var serviceID string
		err := db.QueryRowContext(ctx,
			`SELECT id FROM services WHERE framework = $1`,
			framework,
		).Scan(&serviceID)

		// Matches the old Python behaviour: detected frameworks not represented
		// in the services table are simply ignored.
		if err == sql.ErrNoRows {
			continue
		}
		if err != nil {
			return fmt.Errorf("looking up service %s: %w", framework, err)
		}

		if _, err := db.ExecContext(ctx, `
			INSERT INTO project_services (id, project_id, service_id, created_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (project_id, service_id) DO NOTHING
		`, uuid.NewString(), projectID, serviceID); err != nil {
			return fmt.Errorf("inserting project service %s: %w", framework, err)
		}
	}

	return nil
}

func rollbackProject(ctx context.Context, db *sql.DB, projectID string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM projects WHERE project_id = $1`, projectID)
	return err
}

func updateProjectRoots(ctx context.Context, db *sql.DB, projectID string, result *CreateProjectResult) error {
	_, err := db.ExecContext(ctx, `
		UPDATE projects
		SET frontend_root = NULLIF($1, ''),
		    backend_root = NULLIF($2, ''),
		    db_root = NULLIF($3, '')
		WHERE project_id = $4
	`, result.FrontendRoot, result.BackendRoot, result.DBRoot, projectID)

	return err
}

func insertProjectMetadata(ctx context.Context, db *sql.DB, projectID string, envs []structs.Env, result *CreateProjectResult) error {
	envJSON, err := json.Marshal(envs)
	if err != nil {
		return err
	}
	pagesJSON, err := json.Marshal(result.Pages)
	if err != nil {
		return err
	}
	endpointsJSON, err := json.Marshal(result.Endpoints)
	if err != nil {
		return err
	}
	groupsJSON, err := json.Marshal(result.Groups)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, groups)
		VALUES ($1, $2::jsonb, '{}'::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)
		ON CONFLICT (project_id) DO UPDATE SET
			envs = EXCLUDED.envs,
			pages = EXCLUDED.pages,
			endpoints = EXCLUDED.endpoints,
			groups = EXCLUDED.groups,
			updated_at = NOW()
	`, projectID, string(envJSON), string(pagesJSON), string(endpointsJSON), string(groupsJSON))

	return err
}
