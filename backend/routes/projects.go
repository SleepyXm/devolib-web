package routes

import (
	"database/sql"

	handlers "devolib/handlers/projects"
	"devolib/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterProjectRoutes(rg *gin.RouterGroup, db *sql.DB) {
	auth := middleware.AuthMiddleware(db)

	rg.GET("/list", auth, handlers.ListProjects(db))
	rg.GET("/repos", auth, handlers.GetGitHubRepos(db))
	rg.POST("/create", auth, handlers.CreateProject(db))
	rg.GET("/metadata/:project_id", auth, handlers.GetProjectMetadata(db))
	rg.PATCH("/metadata/:project_id", auth, handlers.PatchProjectMetadata(db))
	rg.POST("/start/:project_id", auth, handlers.StartProject(db))
	rg.POST("/stop/:project_id", auth, handlers.StopProject(db))
	rg.GET("/ws/:project_id", handlers.ProjectWebSocket(db))
	rg.DELETE("/delete", auth, handlers.DeleteProject(db))
	rg.GET("/:project_id", auth, handlers.GetProject(db))
}
