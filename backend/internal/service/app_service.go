package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// AppService defines all application business logic operations
type AppService interface {
	// Students & Attendance
	GetStudents(ctx context.Context) ([]model.Student, error)
	CreateStudent(ctx context.Context, input *model.CreateStudentInput) (*model.Student, error)
	SubmitBulkAttendance(ctx context.Context, input *model.BulkAttendanceInput) error

	// Coaches
	GetCoaches(ctx context.Context) ([]model.Coach, error)
	CreateCoach(ctx context.Context, input *model.CreateCoachInput) (*model.Coach, error)

	// Schedules
	GetSchedules(ctx context.Context) ([]model.ScheduleSession, error)
	CreateSchedule(ctx context.Context, input *model.CreateScheduleInput) (*model.ScheduleSession, error)
	DeleteSchedule(ctx context.Context, id string) error

	// Invoices
	GetInvoices(ctx context.Context) ([]model.Invoice, error)
	CreateInvoice(ctx context.Context, input *model.CreateInvoiceInput) (*model.Invoice, error)
	VerifyInvoice(ctx context.Context, id string, confirm bool) error
	UploadInvoiceReceipt(ctx context.Context, id string, receiptURL string) error
}

type appService struct {
	userRepo     repository.UserRepository
	studentRepo  repository.StudentRepository
	coachRepo    repository.CoachRepository
	scheduleRepo repository.ScheduleRepository
	invoiceRepo  repository.InvoiceRepository
}

// NewAppService creates a new AppService
func NewAppService(
	userRepo repository.UserRepository,
	studentRepo repository.StudentRepository,
	coachRepo repository.CoachRepository,
	scheduleRepo repository.ScheduleRepository,
	invoiceRepo repository.InvoiceRepository,
) AppService {
	return &appService{
		userRepo:     userRepo,
		studentRepo:  studentRepo,
		coachRepo:    coachRepo,
		scheduleRepo: scheduleRepo,
		invoiceRepo:  invoiceRepo,
	}
}

// GetStudents returns all students with their attendance history
func (s *appService) GetStudents(ctx context.Context) ([]model.Student, error) {
	return s.studentRepo.FindAll(ctx)
}

// CreateStudent registers a new student and generates initial registration invoice
func (s *appService) CreateStudent(ctx context.Context, input *model.CreateStudentInput) (*model.Student, error) {
	if input.Name == "" || input.Parent == "" || input.Phone == "" {
		return nil, errors.New("name, parent, and phone are required")
	}

	student := &model.Student{
		Name:           input.Name,
		Class:          input.Class,
		AttendanceRate: "100%",
		Parent:         input.Parent,
		Phone:          input.Phone,
		Age:            input.Age,
		Status:         "Active",
		Logs:           []model.AttendanceLog{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.studentRepo.Create(ctx, student); err != nil {
		return nil, err
	}

	// Auto-create user login account for the student/parent if not existing
	username := strings.ToLower(strings.Fields(input.Name)[0])
	email := fmt.Sprintf("%s@gimswimming.com", username)
	existingUser, _ := s.userRepo.FindByUsername(ctx, username)
	if existingUser == nil {
		hashed, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err == nil {
			_ = s.userRepo.Create(ctx, &model.User{
				Username:  username,
				Email:     email,
				Password:  string(hashed),
				Role:      model.RoleOrangTua,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			})
		}
	}

	// Auto-create initial registration invoice
	amount := 500000.0
	if input.Class == "Private Class" {
		amount = 650000.0
	}

	inv := &model.Invoice{
		StudentID:     fmt.Sprintf("%d", student.ID),
		Name:          student.Name,
		Amount:        amount,
		Desc:          "SPP Registrasi Baru",
		Status:        "Belum Dibayar",
		UploadReceipt: nil,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	_ = s.invoiceRepo.Create(ctx, inv)

	return student, nil
}

// SubmitBulkAttendance processes attendance for all students in a class
func (s *appService) SubmitBulkAttendance(ctx context.Context, input *model.BulkAttendanceInput) error {
	if input.Class == "" || len(input.AttendanceMap) == 0 {
		return errors.New("class and attendance records are required")
	}

	dateStr := input.Date
	if dateStr == "" {
		dateStr = time.Now().Format("02 Jan 2006") // e.g. "05 Sep 2026"
	}

	students, err := s.studentRepo.FindAll(ctx)
	if err != nil {
		return err
	}

	for _, student := range students {
		if student.Class != input.Class {
			continue
		}

		studentKey := fmt.Sprintf("%d", student.ID)
		status, exists := input.AttendanceMap[studentKey]
		if !exists {
			// Check if mapped by student string id or s1 / s2
			status = "Hadir"
		}

		// Insert log
		logItem := &model.AttendanceLog{
			StudentID: student.ID,
			Date:      dateStr,
			Status:    status,
			CreatedAt: time.Now(),
		}
		if err := s.studentRepo.AddAttendanceLog(ctx, logItem); err != nil {
			return err
		}

		// Recalculate attendance rate
		logs, err := s.studentRepo.GetLogsByStudentID(ctx, student.ID)
		if err == nil && len(logs) > 0 {
			presentCount := 0
			for _, l := range logs {
				if l.Status == "Hadir" || l.Status == "Izin" || l.Status == "Sakit" {
					presentCount++
				}
			}
			ratePct := int(math.Round(float64(presentCount) / float64(len(logs)) * 100))
			_ = s.studentRepo.UpdateAttendanceRate(ctx, student.ID, fmt.Sprintf("%d%%", ratePct))
		}
	}

	return nil
}

// GetCoaches returns list of coaches
func (s *appService) GetCoaches(ctx context.Context) ([]model.Coach, error) {
	return s.coachRepo.FindAll(ctx)
}

// CreateCoach adds a new coach
func (s *appService) CreateCoach(ctx context.Context, input *model.CreateCoachInput) (*model.Coach, error) {
	if input.Name == "" || input.Phone == "" || input.Email == "" {
		return nil, errors.New("name, phone, and email are required")
	}

	coach := &model.Coach{
		Name:      input.Name,
		Spec:      input.Spec,
		Phone:     input.Phone,
		Email:     input.Email,
		Class:     input.Class,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if coach.Spec == "" {
		coach.Spec = "Instruktur Renang"
	}

	// Auto-create user login account for the coach if not existing
	username := strings.ToLower(strings.Fields(input.Name)[0])
	if strings.HasPrefix(strings.ToLower(input.Name), "coach ") {
		parts := strings.Fields(input.Name)
		if len(parts) > 1 {
			username = strings.ToLower(parts[1])
		}
	}
	email := strings.ToLower(input.Email)
	if email == "" {
		email = fmt.Sprintf("%s@gimswimming.com", username)
	}

	existingUser, _ := s.userRepo.FindByUsername(ctx, username)
	if existingUser == nil {
		hashed, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err == nil {
			newUser := &model.User{
				Username:  username,
				Email:     email,
				Password:  string(hashed),
				Role:      model.RolePelatih,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			_ = s.userRepo.Create(ctx, newUser)
			coach.UserID = &newUser.ID
		}
	} else {
		coach.UserID = &existingUser.ID
	}

	if err := s.coachRepo.Create(ctx, coach); err != nil {
		return nil, err
	}

	return coach, nil
}

// GetSchedules returns all schedules
func (s *appService) GetSchedules(ctx context.Context) ([]model.ScheduleSession, error) {
	return s.scheduleRepo.FindAll(ctx)
}

// CreateSchedule adds a new schedule session
func (s *appService) CreateSchedule(ctx context.Context, input *model.CreateScheduleInput) (*model.ScheduleSession, error) {
	if input.Title == "" || input.Date == "" || input.TimeStart == "" || input.TimeEnd == "" {
		return nil, errors.New("title, date, timeStart, and timeEnd are required")
	}

	// Validate that the date is not in the past
	now := time.Now()
	todayDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	parsedDate, err := time.ParseInLocation("2006-01-02", input.Date, now.Location())
	if err == nil {
		if parsedDate.Before(todayDate) {
			return nil, errors.New("tanggal jadwal tidak boleh tanggal yang sudah lewat")
		}
	} else {
		// Fallback string compare if custom format
		todayStr := todayDate.Format("2006-01-02")
		if input.Date < todayStr {
			return nil, errors.New("tanggal jadwal tidak boleh tanggal yang sudah lewat")
		}
	}

	status := input.Status
	if status == "" {
		status = "Active"
	}

	session := &model.ScheduleSession{
		Title:        input.Title,
		Class:        input.Class,
		Date:         input.Date,
		TimeStart:    input.TimeStart,
		TimeEnd:      input.TimeEnd,
		PoolArea:     input.PoolArea,
		CoachID:      input.CoachID,
		CoachName:    input.CoachName,
		CoachPhone:   input.CoachPhone,
		StudentIDs:   input.StudentIDs,
		StudentNames: input.StudentNames,
		Notes:        input.Notes,
		Status:       status,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.scheduleRepo.Create(ctx, session); err != nil {
		return nil, err
	}

	return session, nil
}

// DeleteSchedule removes a schedule session by ID
func (s *appService) DeleteSchedule(ctx context.Context, id string) error {
	return s.scheduleRepo.Delete(ctx, id)
}

// GetInvoices returns list of tuition invoices
func (s *appService) GetInvoices(ctx context.Context) ([]model.Invoice, error) {
	return s.invoiceRepo.FindAll(ctx)
}

// CreateInvoice generates a new invoice
func (s *appService) CreateInvoice(ctx context.Context, input *model.CreateInvoiceInput) (*model.Invoice, error) {
	inv := &model.Invoice{
		StudentID:     input.StudentID,
		Name:          input.Name,
		Amount:        input.Amount,
		Desc:          input.Desc,
		Status:        "Belum Dibayar",
		UploadReceipt: nil,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.invoiceRepo.Create(ctx, inv); err != nil {
		return nil, err
	}

	return inv, nil
}

// VerifyInvoice confirms or rejects a tuition invoice
func (s *appService) VerifyInvoice(ctx context.Context, id string, confirm bool) error {
	inv, err := s.invoiceRepo.FindByID(ctx, id)
	if err != nil || inv == nil {
		return errors.New("invoice not found")
	}

	if confirm {
		return s.invoiceRepo.UpdateStatus(ctx, id, "Lunas", inv.UploadReceipt)
	}
	return s.invoiceRepo.UpdateStatus(ctx, id, "Belum Dibayar", nil)
}

// UploadInvoiceReceipt stores receipt URL and sets status to Menunggu Konfirmasi
func (s *appService) UploadInvoiceReceipt(ctx context.Context, id string, receiptURL string) error {
	return s.invoiceRepo.UploadReceipt(ctx, id, receiptURL)
}
