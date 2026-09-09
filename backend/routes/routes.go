package routes

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/handler"
	"github.com/iyamif/gim-swimming/internal/middleware"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/service"
)

// serveStaticImage serves uploaded images from multiple candidate directories with caching & CORS headers
func serveStaticImage(c *gin.Context, filename string) {
	candidateDirs := []string{
		"./uploads/foto-profile",
		"./public/foto-profile",
		"../frontend/public/foto-profile",
		"frontend/public/foto-profile",
		"./uploads",
		"./public",
	}

	cleanFilename := filepath.Base(filename)
	if cleanFilename == "." || cleanFilename == "/" || cleanFilename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama file tidak valid"})
		return
	}

	for _, dir := range candidateDirs {
		fullPath := filepath.Join(dir, cleanFilename)
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			c.Header("Cache-Control", "public, max-age=86400")
			c.Header("Access-Control-Allow-Origin", "*")
			c.File(fullPath)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "File foto tidak ditemukan"})
}

// SetupRoutes configures endpoints, middlewares, and groups for the app
func SetupRoutes(
	router *gin.Engine,
	authHandler *handler.AuthHandler,
	appHandler *handler.AppHandler,
	pushHandler *handler.PushHandler,
	authService service.AuthService,
) {
	// Root and Health Check
	router.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "GIM Swimming API is running",
		})
	})

	// Static routes for uploaded profile photos
	router.GET("/foto-profile/:filename", func(c *gin.Context) {
		serveStaticImage(c, c.Param("filename"))
	})
	router.GET("/uploads/foto-profile/:filename", func(c *gin.Context) {
		serveStaticImage(c, c.Param("filename"))
	})
	router.GET("/uploads/:filename", func(c *gin.Context) {
		serveStaticImage(c, c.Param("filename"))
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

		// Static routes under /api/v1
		v1.GET("/foto-profile/:filename", func(c *gin.Context) {
			serveStaticImage(c, c.Param("filename"))
		})
		v1.GET("/uploads/foto-profile/:filename", func(c *gin.Context) {
			serveStaticImage(c, c.Param("filename"))
		})
		v1.GET("/uploads/:filename", func(c *gin.Context) {
			serveStaticImage(c, c.Param("filename"))
		})

		// Web Push & VAPID Endpoints
		pushGroup := v1.Group("/push")
		{
			pushGroup.GET("/vapid-public-key", pushHandler.GetVAPIDPublicKey)
			pushGroup.POST("/subscribe", pushHandler.Subscribe)
			pushGroup.POST("/unsubscribe", pushHandler.Unsubscribe)
			pushGroup.POST("/test", pushHandler.SendTestPush)
			pushGroup.POST("/broadcast", pushHandler.BroadcastPush)
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
			scheduleGroup.PUT("/:id", appHandler.UpdateSchedule)
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

		// Attendances Endpoints (Schedule-based with GPS & Time Constraints)
		attendanceGroup := v1.Group("/attendances")
		{
			attendanceGroup.GET("", appHandler.GetAttendances)
			attendanceGroup.POST("/checkin", appHandler.CheckInAttendance)
		}

		// Notifications Endpoints (Admin Notifications)
		notificationGroup := v1.Group("/notifications")
		{
			notificationGroup.GET("", appHandler.GetNotifications)
			notificationGroup.PATCH("/:id/read", appHandler.MarkNotificationRead)
			notificationGroup.DELETE("", appHandler.ClearAllNotifications)
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
