package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/config"
	"github.com/iyamif/gim-swimming/internal/database"
	"github.com/iyamif/gim-swimming/internal/handler"
	"github.com/iyamif/gim-swimming/internal/repository"
	"github.com/iyamif/gim-swimming/internal/service"
	"github.com/iyamif/gim-swimming/routes"
)

// CORSMiddleware handles cross-origin requests from the frontend
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// 1. Load configuration
	cfg := config.LoadConfig()

	// 2. Connect to PostgreSQL
	pgDB, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Critical: Failed to connect to database: %v", err)
	}
	defer database.DisconnectDB()

	// 3. Initialize layers
	// Repositories
	userRepo := repository.NewUserRepository(pgDB)

	// Seed database with default users if they don't exist
	if pgDB != nil {
		database.SeedUsers(userRepo)
	}

	// Services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)

	// Handlers
	authHandler := handler.NewAuthHandler(authService, userRepo)

	// 4. Setup Gin engine
	router := gin.Default()
	router.Use(CORSMiddleware())

	// 5. Setup routes
	routes.SetupRoutes(router, authHandler, authService)

	// 6. Start server
	log.Printf("Starting GIM Swimming Server on port %s...", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Critical: Server failed to start: %v", err)
	}
}
