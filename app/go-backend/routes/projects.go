package routes

import (
	"api/test/handlers"
	"api/test/middleware"
	//"api/test/middleware"
	"database/sql"

	"github.com/gin-gonic/gin"
)

func RegisterProjectRoutes(rg *gin.RouterGroup, db *sql.DB, jwtSecret []byte) {
	rg.GET("/list", middleware.AuthMiddleware(db, jwtSecret), handlers.ListProjects(db))
	//rg.POST("/create", handlers.Login(db, jwtSecret))
	//rg.GET("/:project_id", middleware.AuthMiddleware(db, jwtSecret), handlers.Me(db))
	rg.GET("/metadata/:project_id")
	//rg.DELETE("/delete", handlers.Logout)
}
