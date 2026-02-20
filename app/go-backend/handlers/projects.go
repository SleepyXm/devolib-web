package handlers

import (
	"api/test/structs"
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func ListProjects(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		rows, err := db.Query(`
            SELECT 
                p.project_id, p.name, p.status, p.container_id, 
                p.created_at, p.last_online,
                s.name, s.framework
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
			var serviceName, serviceFramework *string

			if err := rows.Scan(
				&p.ID, &p.Name, &p.Status, &p.ContainerID,
				&p.CreatedAt, &p.LastOnline,
				&serviceName, &serviceFramework,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
				return
			}

			if _, exists := projectsMap[p.ID]; !exists {
				projectsMap[p.ID] = &p
				order = append(order, p.ID)
			}

			if serviceName != nil {
				projectsMap[p.ID].Services = append(projectsMap[p.ID].Services, structs.Service{
					Name:      *serviceName,
					Framework: *serviceFramework,
				})
			}
		}

		projects := make([]structs.Project, 0, len(order))
		for _, id := range order {
			projects = append(projects, *projectsMap[id])
		}

		c.JSON(http.StatusOK, gin.H{"projects": projects})
	}
}
