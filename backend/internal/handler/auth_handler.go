package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"github.com/iyamif/gim-swimming/internal/service"
)

// AuthHandler handles HTTP requests for user authentication
type AuthHandler struct {
	authService service.AuthService
	userRepo    repository.UserRepository
}

// NewAuthHandler creates a new AuthHandler instance
func NewAuthHandler(authService service.AuthService, userRepo repository.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

// Register handles user registration request
func (h *AuthHandler) Register(c *gin.Context) {
	var input model.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid: " + err.Error()})
		return
	}

	user, err := h.authService.Register(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Pendaftaran berhasil",
		"data":    user,
	})
}

// Login handles user authentication request
func (h *AuthHandler) Login(c *gin.Context) {
	var input model.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid: " + err.Error()})
		return
	}

	token, user, err := h.authService.Login(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login berhasil",
		"data": model.AuthResponse{
			Token: token,
			User:  user,
		},
	})
}

// Me retrieves current authenticated user profile
func (h *AuthHandler) Me(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tidak terotentikasi"})
		return
	}

	userIdStr, ok := userIdVal.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca ID pengguna"})
		return
	}

	intId, err := strconv.ParseInt(userIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pengguna tidak valid"})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), intId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data profil"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateAvatar handles JSON update for user avatar (emoji or preset)
func (h *AuthHandler) UpdateAvatar(c *gin.Context) {
	usernameVal, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tidak terotentikasi"})
		return
	}

	username, ok := usernameVal.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca identitas pengguna"})
		return
	}

	var input model.UpdateAvatarInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid: " + err.Error()})
		return
	}

	if err := h.authService.UpdateAvatar(c.Request.Context(), username, input.Avatar); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui avatar: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Foto profil berhasil diperbarui",
		"avatar":  input.Avatar,
	})
}

// UploadAvatar handles file upload for user profile photo
func (h *AuthHandler) UploadAvatar(c *gin.Context) {
	usernameVal, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tidak terotentikasi"})
		return
	}

	username, ok := usernameVal.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca identitas pengguna"})
		return
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File foto profil tidak ditemukan: " + err.Error()})
		return
	}

	// Check extension
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".jpg"
	}

	// Generate clean filename
	filename := fmt.Sprintf("avatar_%s_%d%s", username, time.Now().Unix(), ext)

	// Save to frontend public/foto-profile
	saveDir := "../frontend/public/foto-profile"
	_ = os.MkdirAll(saveDir, 0755)
	dst := filepath.Join(saveDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file foto profil: " + err.Error()})
		return
	}

	avatarPath := fmt.Sprintf("/foto-profile/%s", filename)

	// Update user record in database
	if err := h.authService.UpdateAvatar(c.Request.Context(), username, avatarPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan foto profil ke database: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Foto profil berhasil diunggah dan disimpan",
		"avatar":  avatarPath,
	})
}
