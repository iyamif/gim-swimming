package handler

import (
	"fmt"
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

// UpdateStudent handles PUT /api/v1/students/:id
func (h *AppHandler) UpdateStudent(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID siswa tidak valid",
		})
		return
	}

	var input model.UpdateStudentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	student, err := h.appService.UpdateStudent(c.Request.Context(), id, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data siswa berhasil diperbarui",
		"data":    student,
	})
}

// UpdateStudentStatus handles PATCH /api/v1/students/:id/status
func (h *AppHandler) UpdateStudentStatus(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID siswa tidak valid",
		})
		return
	}

	var input model.UpdateStudentStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := h.appService.UpdateStudentStatus(c.Request.Context(), id, input.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Status siswa berhasil diperbarui",
	})
}

// DeleteStudent handles DELETE /api/v1/students/:id
func (h *AppHandler) DeleteStudent(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID siswa tidak valid",
		})
		return
	}

	if err := h.appService.DeleteStudent(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data siswa berhasil dihapus",
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

// UpdateCoach handles PUT /api/v1/coaches/:id
func (h *AppHandler) UpdateCoach(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID pelatih tidak valid",
		})
		return
	}

	var input model.UpdateCoachInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	coach, err := h.appService.UpdateCoach(c.Request.Context(), id, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data pelatih berhasil diperbarui",
		"data":    coach,
	})
}

// DeleteCoach handles DELETE /api/v1/coaches/:id
func (h *AppHandler) DeleteCoach(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID pelatih tidak valid",
		})
		return
	}

	if err := h.appService.DeleteCoach(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data pelatih berhasil dihapus",
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

// UpdateSchedule handles PUT /api/v1/schedules/:id
func (h *AppHandler) UpdateSchedule(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "id parameter is required",
		})
		return
	}

	var input model.UpdateScheduleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	schedule, err := h.appService.UpdateSchedule(c.Request.Context(), id, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Jadwal les renang berhasil diperbarui",
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

// ================= ATTENDANCES & NOTIFICATIONS =================

// CheckInAttendance handles POST /api/v1/attendances/checkin
func (h *AppHandler) CheckInAttendance(c *gin.Context) {
	var input model.CheckInInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var currentUser *model.User
	if u, exists := c.Get("currentUser"); exists {
		if userObj, ok := u.(*model.User); ok {
			currentUser = userObj
		}
	}

	att, err := h.appService.CheckInAttendance(c.Request.Context(), &input, currentUser)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	msg := "Presensi berhasil disimpan!"
	if att.IsLate {
		msg = "Presensi berhasil disimpan (Status: Terlambat - Alasan dicatat)"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": msg,
		"data":    att,
	})
}

// GetAttendances handles GET /api/v1/attendances
func (h *AppHandler) GetAttendances(c *gin.Context) {
	attendances, err := h.appService.GetAttendances(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    attendances,
	})
}

// GetNotifications handles GET /api/v1/notifications
func (h *AppHandler) GetNotifications(c *gin.Context) {
	role := c.Query("role")
	name := c.Query("name")
	if name == "" {
		name = c.Query("user")
	}
	userId := c.Query("userId")

	// Check AuthMiddleware context values if query params are not provided
	if ctxRole, exists := c.Get("role"); exists && role == "" {
		if r, ok := ctxRole.(string); ok {
			role = r
		}
	}
	if ctxUser, exists := c.Get("username"); exists && name == "" {
		if u, ok := ctxUser.(string); ok {
			name = u
		}
	}
	if ctxUserId, exists := c.Get("userId"); exists && userId == "" {
		if uid, ok := ctxUserId.(string); ok {
			userId = uid
		}
	}

	notifications, err := h.appService.GetNotifications(c.Request.Context(), role, name, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    notifications,
	})
}

// MarkNotificationRead handles PATCH /api/v1/notifications/:id/read
func (h *AppHandler) MarkNotificationRead(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID notifikasi tidak valid",
		})
		return
	}

	if err := h.appService.MarkNotificationRead(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Notifikasi ditandai telah dibaca",
	})
}

// ClearAllNotifications handles DELETE /api/v1/notifications
func (h *AppHandler) ClearAllNotifications(c *gin.Context) {
	role := c.Query("role")
	name := c.Query("name")
	if name == "" {
		name = c.Query("user")
	}
	userId := c.Query("userId")

	if ctxRole, exists := c.Get("role"); exists && role == "" {
		if r, ok := ctxRole.(string); ok {
			role = r
		}
	}
	if ctxUser, exists := c.Get("username"); exists && name == "" {
		if u, ok := ctxUser.(string); ok {
			name = u
		}
	}
	if ctxUserId, exists := c.Get("userId"); exists && userId == "" {
		if uid, ok := ctxUserId.(string); ok {
			userId = uid
		}
	}

	if err := h.appService.ClearAllNotifications(c.Request.Context(), role, name, userId); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Semua notifikasi berhasil dihapus",
	})
}

// ================= FINANCIAL TRANSACTIONS =================

// GetFinancialTransactions handles GET /api/v1/financial-transactions
func (h *AppHandler) GetFinancialTransactions(c *gin.Context) {
	transactions, err := h.appService.GetFinancialTransactions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    transactions,
	})
}

// CreateFinancialTransaction handles POST /api/v1/financial-transactions
func (h *AppHandler) CreateFinancialTransaction(c *gin.Context) {
	var input model.CreateFinancialTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Format input transaksi tidak valid: " + err.Error(),
		})
		return
	}

	tx, err := h.appService.CreateFinancialTransaction(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Transaksi keuangan berhasil dicatat",
		"data":    tx,
	})
}

// DeleteFinancialTransaction handles DELETE /api/v1/financial-transactions/:id
func (h *AppHandler) DeleteFinancialTransaction(c *gin.Context) {
	id := c.Param("id")
	if err := h.appService.DeleteFinancialTransaction(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Transaksi keuangan berhasil dihapus",
	})
}

