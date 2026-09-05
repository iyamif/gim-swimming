package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/handler"
	"github.com/iyamif/gim-swimming/internal/middleware"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/service"
)

// SetupRoutes configures endpoints, middlewares, and groups for the app
func SetupRoutes(
	router *gin.Engine,
	authHandler *handler.AuthHandler,
	appHandler *handler.AppHandler,
	authService service.AuthService,
) {
	// Root and Health Check
	router.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "GIM Swimming API is running",
		})
	})

	// V1 Api Group
	v1 := router.Group("/api/v1")
	{
		// Auth Routes (Public)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
		}

		// Auth Routes (Protected)
		authProtected := v1.Group("/auth")
		authProtected.Use(middleware.AuthMiddleware(authService))
		{
			authProtected.GET("/me", authHandler.Me)
			authProtected.PATCH("/avatar", authHandler.UpdateAvatar)
			authProtected.POST("/avatar", authHandler.UploadAvatar)
		}

		// Students & Attendance Endpoints
		studentGroup := v1.Group("/students")
		{
			studentGroup.GET("", appHandler.GetStudents)
			studentGroup.POST("", appHandler.CreateStudent)
			studentGroup.POST("/attendance", appHandler.SubmitBulkAttendance)
		}

		// Coaches Endpoints
		coachGroup := v1.Group("/coaches")
		{
			coachGroup.GET("", appHandler.GetCoaches)
			coachGroup.POST("", appHandler.CreateCoach)
		}

		// Schedules Endpoints
		scheduleGroup := v1.Group("/schedules")
		{
			scheduleGroup.GET("", appHandler.GetSchedules)
			scheduleGroup.POST("", appHandler.CreateSchedule)
			scheduleGroup.DELETE("/:id", appHandler.DeleteSchedule)
		}

		// Invoices Endpoints
		invoiceGroup := v1.Group("/invoices")
		{
			invoiceGroup.GET("", appHandler.GetInvoices)
			invoiceGroup.POST("", appHandler.CreateInvoice)
			invoiceGroup.PATCH("/:id/verify", appHandler.VerifyInvoice)
			invoiceGroup.PATCH("/:id/receipt", appHandler.UploadReceipt)
		}

		// Role-based Verification Test Endpoints
		adminGroup := v1.Group("/admin")
		adminGroup.Use(middleware.AuthMiddleware(authService), middleware.RequireRoles(model.RoleAdmin))
		{
			adminGroup.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"message": "Welcome Admin! You have full access to management features.",
				})
			})
		}

		pelatihGroup := v1.Group("/pelatih")
		pelatihGroup.Use(middleware.AuthMiddleware(authService), middleware.RequireRoles(model.RolePelatih))
		{
			pelatihGroup.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"message": "Welcome Pelatih! You have access to students & attendance features.",
				})
			})
		}

		ortuGroup := v1.Group("/ortu")
		ortuGroup.Use(middleware.AuthMiddleware(authService), middleware.RequireRoles(model.RoleOrangTua))
		{
			ortuGroup.GET("/dashboard", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"message": "Welcome Orang Tua! You have access to children's billing and logs.",
				})
			})
		}
	}
}
