package routes

import (
	"database/sql"
	handlers "devolib/handlers/profile"
	"devolib/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterProfileRoutes(rg *gin.RouterGroup, db *sql.DB) {
	rg.GET("/profile/preferences", middleware.AuthMiddleware(db), handlers.GetPreferences(db))
	rg.PUT("/profile/preferences", middleware.AuthMiddleware(db), handlers.UpdatePreferences(db))
}
