package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/service"
)

// PushHandler handles HTTP requests related to Web Push notifications and VAPID
type PushHandler struct {
	pushService service.PushService
}

// NewPushHandler creates a new PushHandler
func NewPushHandler(pushService service.PushService) *PushHandler {
	return &PushHandler{pushService: pushService}
}

// GetVAPIDPublicKey returns the server's public VAPID key
func (h *PushHandler) GetVAPIDPublicKey(c *gin.Context) {
	pubKey := h.pushService.GetVAPIDPublicKey()
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"public_key": pubKey,
	})
}

// Subscribe registers or updates a browser push subscription
func (h *PushHandler) Subscribe(c *gin.Context) {
	var input model.PushSubscriptionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Payload subscription tidak valid: " + err.Error(),
		})
		return
	}

	record, err := h.pushService.Subscribe(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Gagal mendaftarkan push notification: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Push subscription berhasil disimpan",
		"data":    record,
	})
}

// Unsubscribe removes a browser push subscription
func (h *PushHandler) Unsubscribe(c *gin.Context) {
	var input model.PushUnsubscribeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Endpoint tidak valid",
		})
		return
	}

	if err := h.pushService.Unsubscribe(c.Request.Context(), input.Endpoint); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Gagal menghapus subscription: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Push subscription berhasil dihapus",
	})
}

// SendTestPush sends a test push notification to verify push delivery and icon badge
func (h *PushHandler) SendTestPush(c *gin.Context) {
	var input model.TestPushInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Data tes push tidak valid: " + err.Error(),
		})
		return
	}

	sentCount, err := h.pushService.SendTestPush(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Notifikasi tes berhasil dikirim ke perangkat Anda!",
		"sent_count": sentCount,
	})
}
