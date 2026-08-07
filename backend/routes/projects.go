package routes

import (
	handlers "devolib/handlers/projects"
	"devolib/middleware"

	//"devolib/middleware"
	"database/sql"

	"github.com/gin-gonic/gin"
)

func RegisterProjectRoutes(rg *gin.RouterGroup, db *sql.DB) {
	rg.GET("/list", middleware.AuthMiddleware(db), handlers.ListProjects(db))
	//rg.POST("/create", handlers.Login(db, jwtSecret))
	//rg.GET("/:project_id", middleware.AuthMiddleware(db, jwtSecret), handlers.Me(db))
	rg.GET("/metadata/:project_id")
	//rg.DELETE("/delete", handlers.Logout)
}
