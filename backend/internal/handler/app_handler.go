package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/service"
)

// AppHandler handles HTTP requests for students, coaches, schedules, and invoices
type AppHandler struct {
	appService service.AppService
}

// NewAppHandler creates a new AppHandler
func NewAppHandler(appService service.AppService) *AppHandler {
	return &AppHandler{appService: appService}
}

// ================= STUDENTS & ATTENDANCE =================

// GetStudents handles GET /api/v1/students
func (h *AppHandler) GetStudents(c *gin.Context) {
	students, err := h.appService.GetStudents(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    students,
	})
}

// CreateStudent handles POST /api/v1/students
func (h *AppHandler) CreateStudent(c *gin.Context) {
	var input model.CreateStudentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	student, err := h.appService.CreateStudent(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Siswa berhasil didaftarkan",
		"data":    student,
	})
}

// SubmitBulkAttendance handles POST /api/v1/students/attendance
func (h *AppHandler) SubmitBulkAttendance(c *gin.Context) {
	var input model.BulkAttendanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.appService.SubmitBulkAttendance(c.Request.Context(), &input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Absensi berhasil disimpan dan diperbarui",
	})
}

// ================= COACHES =================

// GetCoaches handles GET /api/v1/coaches
func (h *AppHandler) GetCoaches(c *gin.Context) {
	coaches, err := h.appService.GetCoaches(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    coaches,
	})
}

// CreateCoach handles POST /api/v1/coaches
func (h *AppHandler) CreateCoach(c *gin.Context) {
	var input model.CreateCoachInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	coach, err := h.appService.CreateCoach(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Pelatih berhasil didaftarkan",
		"data":    coach,
	})
}

// ================= SCHEDULES =================

// GetSchedules handles GET /api/v1/schedules
func (h *AppHandler) GetSchedules(c *gin.Context) {
	schedules, err := h.appService.GetSchedules(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    schedules,
	})
}

// CreateSchedule handles POST /api/v1/schedules
func (h *AppHandler) CreateSchedule(c *gin.Context) {
	var input model.CreateScheduleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	schedule, err := h.appService.CreateSchedule(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Jadwal les renang berhasil disimpan",
		"data":    schedule,
	})
}

// DeleteSchedule handles DELETE /api/v1/schedules/:id
func (h *AppHandler) DeleteSchedule(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "id parameter is required",
		})
		return
	}

	if err := h.appService.DeleteSchedule(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jadwal berhasil dihapus",
	})
}

// ================= INVOICES =================

// GetInvoices handles GET /api/v1/invoices
func (h *AppHandler) GetInvoices(c *gin.Context) {
	invoices, err := h.appService.GetInvoices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    invoices,
	})
}

// CreateInvoice handles POST /api/v1/invoices
func (h *AppHandler) CreateInvoice(c *gin.Context) {
	var input model.CreateInvoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	invoice, err := h.appService.CreateInvoice(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tagihan SPP berhasil dibuat",
		"data":    invoice,
	})
}

// VerifyInvoice handles PATCH /api/v1/invoices/:id/verify
func (h *AppHandler) VerifyInvoice(c *gin.Context) {
	id := c.Param("id")
	var input model.VerifyInvoiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.appService.VerifyInvoice(c.Request.Context(), id, input.Confirm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	statusMsg := "Tagihan berhasil diverifikasi (Lunas)"
	if !input.Confirm {
		statusMsg = "Pembayaran ditolak (Belum Dibayar)"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": statusMsg,
	})
}

// UploadReceipt handles PATCH /api/v1/invoices/:id/receipt
func (h *AppHandler) UploadReceipt(c *gin.Context) {
	id := c.Param("id")
	var input model.UploadReceiptInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.appService.UploadInvoiceReceipt(c.Request.Context(), id, input.ReceiptURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bukti transfer berhasil diunggah",
	})
}
