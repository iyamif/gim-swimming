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
	studentRepo := repository.NewStudentRepository(pgDB)
	coachRepo := repository.NewCoachRepository(pgDB)
	scheduleRepo := repository.NewScheduleRepository(pgDB)
	invoiceRepo := repository.NewInvoiceRepository(pgDB)

	// Seed database with default data if tables are empty
	if pgDB != nil {
		database.SeedAll(pgDB, userRepo)
	}

	// Services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	appService := service.NewAppService(userRepo, studentRepo, coachRepo, scheduleRepo, invoiceRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authService, userRepo)
	appHandler := handler.NewAppHandler(appService)

	// 4. Setup Gin engine
	router := gin.Default()
	router.Use(CORSMiddleware())

	// 5. Setup routes
	routes.SetupRoutes(router, authHandler, appHandler, authService)

	// 6. Start server
	log.Printf("Starting GIM Swimming Server on port %s...", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Critical: Server failed to start: %v", err)
	}
}
