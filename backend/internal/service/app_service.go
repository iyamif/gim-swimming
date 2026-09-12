package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"regexp"
	"strconv"
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
	UpdateStudent(ctx context.Context, id int64, input *model.UpdateStudentInput) (*model.Student, error)
	UpdateStudentStatus(ctx context.Context, id int64, status string) error
	DeleteStudent(ctx context.Context, id int64) error
	SubmitBulkAttendance(ctx context.Context, input *model.BulkAttendanceInput) error

	// Coaches
	GetCoaches(ctx context.Context) ([]model.Coach, error)
	CreateCoach(ctx context.Context, input *model.CreateCoachInput) (*model.Coach, error)
	UpdateCoach(ctx context.Context, id int64, input *model.UpdateCoachInput) (*model.Coach, error)
	DeleteCoach(ctx context.Context, id int64) error

	// Schedules
	GetSchedules(ctx context.Context) ([]model.ScheduleSession, error)
	CreateSchedule(ctx context.Context, input *model.CreateScheduleInput) (*model.ScheduleSession, error)
	UpdateSchedule(ctx context.Context, id string, input *model.UpdateScheduleInput) (*model.ScheduleSession, error)
	DeleteSchedule(ctx context.Context, id string) error

	// Invoices
	GetInvoices(ctx context.Context) ([]model.Invoice, error)
	CreateInvoice(ctx context.Context, input *model.CreateInvoiceInput) (*model.Invoice, error)
	VerifyInvoice(ctx context.Context, id string, confirm bool) error
	UploadInvoiceReceipt(ctx context.Context, id string, receiptURL string) error

	// Attendances & Notifications
	CheckInAttendance(ctx context.Context, input *model.CheckInInput, user *model.User) (*model.AttendanceRecord, error)
	GetAttendances(ctx context.Context) ([]model.AttendanceRecord, error)
	// Notifications
	GetNotifications(ctx context.Context, role, name, userId string) ([]model.AdminNotification, error)
	MarkNotificationRead(ctx context.Context, id int64) error
	ClearAllNotifications(ctx context.Context, role, name, userId string) error

	// Financial Transactions
	GetFinancialTransactions(ctx context.Context) ([]model.FinancialTransaction, error)
	CreateFinancialTransaction(ctx context.Context, input *model.CreateFinancialTransactionInput) (*model.FinancialTransaction, error)
	DeleteFinancialTransaction(ctx context.Context, id string) error
}

type appService struct {
	userRepo       repository.UserRepository
	studentRepo    repository.StudentRepository
	coachRepo      repository.CoachRepository
	scheduleRepo   repository.ScheduleRepository
	invoiceRepo    repository.InvoiceRepository
	attendanceRepo repository.AttendanceRepository
	financialRepo  repository.FinancialTransactionRepository
	pushService    PushService
}

// NewAppService creates a new AppService
func NewAppService(
	userRepo repository.UserRepository,
	studentRepo repository.StudentRepository,
	coachRepo repository.CoachRepository,
	scheduleRepo repository.ScheduleRepository,
	invoiceRepo repository.InvoiceRepository,
	attendanceRepo repository.AttendanceRepository,
	financialRepo repository.FinancialTransactionRepository,
	pushService PushService,
) AppService {
	return &appService{
		userRepo:       userRepo,
		studentRepo:    studentRepo,
		coachRepo:      coachRepo,
		scheduleRepo:   scheduleRepo,
		invoiceRepo:    invoiceRepo,
		attendanceRepo: attendanceRepo,
		financialRepo:  financialRepo,
		pushService:    pushService,
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

	coachID := strings.TrimSpace(input.CoachID)
	if coachID == "" {
		coachID = strings.TrimSpace(input.CoachIdCamel)
	}
	coachName := strings.TrimSpace(input.CoachName)
	if coachName == "" {
		coachName = strings.TrimSpace(input.CoachNameCamel)
	}

	if coachName == "" {
		// If coach is not specified, automatically assign an existing coach randomly
		coaches, _ := s.coachRepo.FindAll(ctx)
		if len(coaches) > 0 {
			randIdx := rand.Intn(len(coaches))
			coachID = fmt.Sprintf("%d", coaches[randIdx].ID)
			coachName = coaches[randIdx].Name
		}
	}

	student := &model.Student{
		Name:           input.Name,
		Class:          input.Class,
		AttendanceRate: "100%",
		Parent:         input.Parent,
		Phone:          input.Phone,
		Age:            input.Age,
		CoachID:        coachID,
		CoachName:      coachName,
		Status:         "Active",
		Logs:           []model.AttendanceLog{},
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.studentRepo.Create(ctx, student); err != nil {
		return nil, err
	}

	// Auto-create user login account for the student/parent if not existing
	rawUsername := strings.ToLower(strings.Fields(input.Name)[0])
	reg := regexp.MustCompile("[^a-z0-9_]")
	username := reg.ReplaceAllString(rawUsername, "")
	if username == "" {
		username = fmt.Sprintf("siswa%d", student.ID)
	}

	// Make username unique if already taken
	existingUser, _ := s.userRepo.FindByUsername(ctx, username)
	if existingUser != nil {
		username = fmt.Sprintf("%s%d", username, student.ID)
	}

	email := fmt.Sprintf("%s@gimswimming.com", username)
	hashed, err := bcrypt.GenerateFromPassword([]byte("gim123"), bcrypt.DefaultCost)
	if err == nil {
		_ = s.userRepo.Create(ctx, &model.User{
			Username:           username,
			Email:              email,
			Password:           string(hashed),
			Role:               model.RoleOrangTua,
			MustChangePassword: true,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		})
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

// UpdateStudent updates student profile details (name, class, parent, phone, age, coach, status)
func (s *appService) UpdateStudent(ctx context.Context, id int64, input *model.UpdateStudentInput) (*model.Student, error) {
	student, err := s.studentRepo.FindByID(ctx, id)
	if err != nil || student == nil {
		return nil, errors.New("siswa tidak ditemukan")
	}

	if strings.TrimSpace(input.Name) != "" {
		student.Name = strings.TrimSpace(input.Name)
	}
	if strings.TrimSpace(input.Class) != "" {
		student.Class = strings.TrimSpace(input.Class)
	}
	if strings.TrimSpace(input.Parent) != "" {
		student.Parent = strings.TrimSpace(input.Parent)
	}
	if input.Phone != "" {
		student.Phone = strings.TrimSpace(input.Phone)
	}
	if input.Age != "" {
		student.Age = strings.TrimSpace(input.Age)
	}
	coachName := strings.TrimSpace(input.CoachName)
	if coachName == "" {
		coachName = strings.TrimSpace(input.CoachNameCamel)
	}
	if coachName != "" {
		student.CoachName = coachName
	}
	coachID := strings.TrimSpace(input.CoachID)
	if coachID == "" {
		coachID = strings.TrimSpace(input.CoachIdCamel)
	}
	if coachID != "" {
		student.CoachID = coachID
	}
	if strings.TrimSpace(input.Status) != "" {
		norm := strings.TrimSpace(input.Status)
		dbStatus := "Active"
		if strings.EqualFold(norm, "inactive") || strings.EqualFold(norm, "tidak aktif") {
			dbStatus = "Inactive"
		}
		student.Status = dbStatus
	}

	student.UpdatedAt = time.Now()
	if err := s.studentRepo.Update(ctx, student); err != nil {
		return nil, err
	}

	return student, nil
}

// UpdateStudentStatus updates a student's membership status (Active vs Inactive)
func (s *appService) UpdateStudentStatus(ctx context.Context, id int64, status string) error {
	norm := strings.TrimSpace(status)
	if !strings.EqualFold(norm, "active") && !strings.EqualFold(norm, "inactive") && !strings.EqualFold(norm, "aktif") && !strings.EqualFold(norm, "tidak aktif") {
		return errors.New("status siswa tidak valid (pilih Aktif atau Tidak Aktif)")
	}

	dbStatus := "Active"
	if strings.EqualFold(norm, "inactive") || strings.EqualFold(norm, "tidak aktif") {
		dbStatus = "Inactive"
	}

	return s.studentRepo.UpdateStatus(ctx, id, dbStatus)
}

// DeleteStudent deletes a student by ID
func (s *appService) DeleteStudent(ctx context.Context, id int64) error {
	return s.studentRepo.Delete(ctx, id)
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

	payPerSession := input.PayPerSession
	if payPerSession <= 0 {
		payPerSession = 100000
	}

	coach := &model.Coach{
		Name:          input.Name,
		Spec:          input.Spec,
		Phone:         input.Phone,
		Email:         input.Email,
		Class:         input.Class,
		Avatar:        input.Avatar,
		PayPerSession: payPerSession,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if coach.Spec == "" {
		coach.Spec = "Instruktur Renang"
	}

	// Auto-create user login account for the coach if not existing
	nameParts := strings.Fields(input.Name)
	rawUsername := strings.ToLower(nameParts[0])
	if strings.HasPrefix(strings.ToLower(input.Name), "coach ") && len(nameParts) > 1 {
		rawUsername = strings.ToLower(nameParts[1])
	}
	reg := regexp.MustCompile("[^a-z0-9_]")
	username := reg.ReplaceAllString(rawUsername, "")
	if username == "" {
		username = "coach"
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	if email == "" {
		email = fmt.Sprintf("%s@gimswimming.com", username)
	}

	existingUser, _ := s.userRepo.FindByUsername(ctx, username)
	if existingUser != nil && !strings.EqualFold(existingUser.Email, email) {
		// Username is taken by another user, try email prefix
		emailPrefix := strings.Split(email, "@")[0]
		emailClean := reg.ReplaceAllString(emailPrefix, "")
		if emailClean != "" && emailClean != username {
			if u2, _ := s.userRepo.FindByUsername(ctx, emailClean); u2 == nil {
				username = emailClean
				existingUser = nil
			}
		}
	}
	if existingUser != nil && !strings.EqualFold(existingUser.Email, email) {
		// If still taken, append suffix
		candidate := fmt.Sprintf("%s%d", username, time.Now().Unix()%10000)
		if u3, _ := s.userRepo.FindByUsername(ctx, candidate); u3 == nil {
			username = candidate
			existingUser = nil
		}
	}

	if existingUser == nil {
		existingByEmail, _ := s.userRepo.FindByEmail(ctx, email)
		if existingByEmail != nil {
			existingUser = existingByEmail
		}
	}

	if existingUser == nil {
		hashed, err := bcrypt.GenerateFromPassword([]byte("gim123"), bcrypt.DefaultCost)
		if err == nil {
			newUser := &model.User{
				Username:           username,
				Email:              email,
				Password:           string(hashed),
				Role:               model.RolePelatih,
				MustChangePassword: true,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
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

// UpdateCoach updates an existing coach's details
func (s *appService) UpdateCoach(ctx context.Context, id int64, input *model.UpdateCoachInput) (*model.Coach, error) {
	if input.Name == "" || input.Phone == "" || input.Email == "" {
		return nil, errors.New("nama, nomor telepon, dan email wajib diisi")
	}

	existing, err := s.coachRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.New("data pelatih tidak ditemukan")
	}

	existing.Name = input.Name
	if input.Spec != "" {
		existing.Spec = input.Spec
	}
	existing.Phone = input.Phone
	existing.Email = input.Email
	if input.Class != "" {
		existing.Class = input.Class
	}
	if input.Avatar != "" {
		existing.Avatar = input.Avatar
	}
	if input.PayPerSession > 0 {
		existing.PayPerSession = input.PayPerSession
	}
	existing.UpdatedAt = time.Now()

	if err := s.coachRepo.Update(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}

// DeleteCoach deletes a coach by ID
func (s *appService) DeleteCoach(ctx context.Context, id int64) error {
	return s.coachRepo.Delete(ctx, id)
}

// GetSchedules returns all schedules
func (s *appService) GetSchedules(ctx context.Context) ([]model.ScheduleSession, error) {
	return s.scheduleRepo.FindAll(ctx)
}

// timeStringToMinutes converts "15:00" or "15:00 WIB" to minutes from 00:00
func timeStringToMinutes(tStr string) (int, error) {
	tStr = strings.TrimSpace(strings.ReplaceAll(tStr, "WIB", ""))
	parts := strings.Split(tStr, ":")
	if len(parts) < 2 {
		return 0, fmt.Errorf("format waktu tidak valid: %s", tStr)
	}
	h, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil {
		return 0, err
	}
	m, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return 0, err
	}
	return h*60 + m, nil
}

// validateScheduleDuration validates duration rules per class program:
// - Kids / Baby: 30 minutes
// - Prestasi: 2 hours 30 minutes (15:00 - 17:30 WIB)
// - Private Class: 60 minutes (1 hour)
func validateScheduleDuration(className, timeStart, timeEnd string) error {
	startMins, err := timeStringToMinutes(timeStart)
	if err != nil {
		return fmt.Errorf("jam mulai tidak valid: %w", err)
	}
	endMins, err := timeStringToMinutes(timeEnd)
	if err != nil {
		return fmt.Errorf("jam selesai tidak valid: %w", err)
	}

	diff := endMins - startMins
	if diff <= 0 {
		return errors.New("jam selesai latihan harus lebih besar daripada jam mulai")
	}

	normClass := strings.ToLower(strings.TrimSpace(className))

	if strings.Contains(normClass, "kid") || strings.Contains(normClass, "baby") {
		if diff != 30 {
			return errors.New("durasi latihan untuk program Kids / Baby harus tepat 30 menit (contoh: 15:00 - 15:30)")
		}
	} else if strings.Contains(normClass, "prestasi") {
		if diff != 150 {
			return errors.New("durasi latihan untuk program Prestasi harus 2 jam 30 menit (jadwal resmi: 15:00 - 17:30 WIB)")
		}
	} else if strings.Contains(normClass, "private") {
		if diff != 60 {
			return errors.New("durasi latihan untuk program Private Class harus tepat 60 menit / 1 jam (contoh: 15:00 - 16:00)")
		}
	}

	return nil
}

// validateSingleStudentSchedule ensures 1-on-1 classes (Private and Kids/Baby) have at most 1 student
func validateSingleStudentSchedule(className string, studentIDs []string) error {
	normClass := strings.ToLower(strings.TrimSpace(className))
	if (strings.Contains(normClass, "private") || strings.Contains(normClass, "kid") || strings.Contains(normClass, "baby")) && len(studentIDs) > 1 {
		return errors.New("program kelas ini adalah 1-on-1 (1 pelatih hanya 1 murid). Silakan pilih maksimal 1 siswa")
	}
	return nil
}

// CreateSchedule adds a new schedule session
func (s *appService) CreateSchedule(ctx context.Context, input *model.CreateScheduleInput) (*model.ScheduleSession, error) {
	if input.Title == "" || input.Date == "" || input.TimeStart == "" || input.TimeEnd == "" {
		return nil, errors.New("title, date, timeStart, and timeEnd are required")
	}

	// Validate duration based on class
	if err := validateScheduleDuration(input.Class, input.TimeStart, input.TimeEnd); err != nil {
		return nil, err
	}

	// Validate 1-on-1 single student rule (Private Class and Kids / Baby)
	if err := validateSingleStudentSchedule(input.Class, input.StudentIDs); err != nil {
		return nil, err
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

	// Generate Targeted Notifications
	formattedDate := formatIndonesianDate(session.Date)
	timeRange := fmt.Sprintf("%s - %s WIB", session.TimeStart, session.TimeEnd)
	if strings.Contains(session.TimeStart, "WIB") {
		timeRange = fmt.Sprintf("%s - %s", session.TimeStart, session.TimeEnd)
	}

	studentNamesStr := strings.Join(session.StudentNames, ", ")
	if studentNamesStr == "" {
		studentNamesStr = "Belum ditentukan"
	}

	// 1. Notification for Assigned Coach
	if session.CoachName != "" {
		coachTitle := "Jadwal Pelatihan Baru"
		coachMsg := fmt.Sprintf("Halo Pelatih %s, Anda memiliki jadwal pelatihan baru: '%s' pada %s pukul %s di %s bersama siswa: %s.",
			session.CoachName, session.Title, formattedDate, timeRange, session.PoolArea, studentNamesStr)

		_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
			Title:        coachTitle,
			Message:      coachMsg,
			Type:         "schedule_coach",
			TargetRole:   "pelatih",
			TargetUserID: session.CoachID,
			TargetName:   session.CoachName,
			ScheduleID:   session.ID,
			IsRead:       false,
			CreatedAt:    now,
		})
	}

	// 2. Notifications for Selected Student(s) & Parents
	for idx, studentName := range session.StudentNames {
		trimmedName := strings.TrimSpace(studentName)
		if trimmedName == "" {
			continue
		}
		studentID := ""
		if idx < len(session.StudentIDs) {
			studentID = session.StudentIDs[idx]
		}

		studentTitle := "Jadwal Pelatihan Baru"
		studentMsg := fmt.Sprintf("Halo %s, Anda memiliki jadwal pelatihan baru: '%s' pada %s pukul %s di %s bersama Pelatih %s.",
			trimmedName, session.Title, formattedDate, timeRange, session.PoolArea, session.CoachName)

		_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
			Title:        studentTitle,
			Message:      studentMsg,
			Type:         "schedule_student",
			TargetRole:   "orang tua",
			TargetUserID: studentID,
			TargetName:   trimmedName,
			ScheduleID:   session.ID,
			IsRead:       false,
			CreatedAt:    now,
		})
	}

	// 3. Dispatch Native Mobile Web Push + VAPID Notifications
	if s.pushService != nil {
		s.pushService.SendSchedulePushNotification(ctx, session)
	}

	return session, nil
}

// UpdateSchedule modifies an existing schedule session
func (s *appService) UpdateSchedule(ctx context.Context, id string, input *model.UpdateScheduleInput) (*model.ScheduleSession, error) {
	existing, err := s.scheduleRepo.FindByID(ctx, id)
	if err != nil || existing == nil {
		return nil, errors.New("jadwal tidak ditemukan")
	}

	if input.Date != "" {
		// Validate that the date is not in the past
		now := time.Now()
		todayDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		parsedDate, err := time.ParseInLocation("2006-01-02", input.Date, now.Location())
		if err == nil {
			if parsedDate.Before(todayDate) {
				return nil, errors.New("tanggal jadwal tidak boleh tanggal yang sudah lewat")
			}
		} else {
			todayStr := todayDate.Format("2006-01-02")
			if input.Date < todayStr {
				return nil, errors.New("tanggal jadwal tidak boleh tanggal yang sudah lewat")
			}
		}
		existing.Date = input.Date
	}

	if input.Title != "" {
		existing.Title = input.Title
	}
	if input.Class != "" {
		existing.Class = input.Class
	}
	if input.TimeStart != "" {
		existing.TimeStart = input.TimeStart
	}
	if input.TimeEnd != "" {
		existing.TimeEnd = input.TimeEnd
	}
	if input.PoolArea != "" {
		existing.PoolArea = input.PoolArea
	}
	if input.CoachID != "" {
		existing.CoachID = input.CoachID
	}
	if input.CoachName != "" {
		existing.CoachName = input.CoachName
	}
	if input.CoachPhone != "" {
		existing.CoachPhone = input.CoachPhone
	}
	if input.StudentIDs != nil {
		existing.StudentIDs = input.StudentIDs
	}
	if input.StudentNames != nil {
		existing.StudentNames = input.StudentNames
	}
	if input.Notes != "" {
		existing.Notes = input.Notes
	}
	if input.Status != "" {
		existing.Status = input.Status
	}

	// Validate duration on update
	if err := validateScheduleDuration(existing.Class, existing.TimeStart, existing.TimeEnd); err != nil {
		return nil, err
	}

	// Validate 1-on-1 single student rule (Private Class and Kids / Baby)
	if err := validateSingleStudentSchedule(existing.Class, existing.StudentIDs); err != nil {
		return nil, err
	}

	existing.UpdatedAt = time.Now()

	if err := s.scheduleRepo.Update(ctx, existing); err != nil {
		return nil, err
	}

	// Generate Updated Notifications if schedule details were updated
	formattedDate := formatIndonesianDate(existing.Date)
	timeRange := fmt.Sprintf("%s - %s WIB", existing.TimeStart, existing.TimeEnd)
	studentNamesStr := strings.Join(existing.StudentNames, ", ")
	if studentNamesStr == "" {
		studentNamesStr = "Belum ditentukan"
	}

	// 1. Updated Coach Notification
	if existing.CoachName != "" {
		_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
			Title:        "Jadwal Pelatihan Diperbarui",
			Message:      fmt.Sprintf("Halo Pelatih %s, jadwal pelatihan '%s' telah diperbarui untuk tanggal %s pukul %s di %s bersama siswa: %s.",
				existing.CoachName, existing.Title, formattedDate, timeRange, existing.PoolArea, studentNamesStr),
			Type:         "schedule_coach",
			TargetRole:   "pelatih",
			TargetUserID: existing.CoachID,
			TargetName:   existing.CoachName,
			ScheduleID:   existing.ID,
			IsRead:       false,
			CreatedAt:    time.Now(),
		})
	}

	// 2. Updated Student Notifications
	for idx, studentName := range existing.StudentNames {
		trimmedName := strings.TrimSpace(studentName)
		if trimmedName == "" {
			continue
		}
		studentID := ""
		if idx < len(existing.StudentIDs) {
			studentID = existing.StudentIDs[idx]
		}
		_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
			Title:        "Jadwal Pelatihan Diperbarui",
			Message:      fmt.Sprintf("Halo %s, jadwal pelatihan '%s' telah diperbarui untuk tanggal %s pukul %s di %s bersama Pelatih %s.",
				trimmedName, existing.Title, formattedDate, timeRange, existing.PoolArea, existing.CoachName),
			Type:         "schedule_student",
			TargetRole:   "orang tua",
			TargetUserID: studentID,
			TargetName:   trimmedName,
			ScheduleID:   existing.ID,
			IsRead:       false,
			CreatedAt:    time.Now(),
		})
	}

	// Dispatch Native Mobile Web Push for updated schedule
	if s.pushService != nil {
		s.pushService.SendSchedulePushNotification(ctx, existing)
	}

	return existing, nil
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

// ================= ATTENDANCE & GEOLOCATION =================

// Pool location coordinate dictionary
func getPoolCoordinates(poolArea string) (float64, float64) {
	norm := strings.ToLower(strings.TrimSpace(poolArea))
	if strings.Contains(norm, "wera") || strings.Contains(norm, "312") {
		// Kolam Renang Yonif 312 Wera Subang
		return -6.550500, 107.747800
	}
	if strings.Contains(norm, "ciater") || strings.Contains(norm, "sari ater") {
		return -6.738800, 107.656500
	}
	// Default: Hotel Nalendra Plaza Subang
	return -6.565630, 107.761040
}

// calculateDistance calculates distance in kilometers using the Haversine formula
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth radius in kilometers
	dLat := (lat2 - lat1) * (math.Pi / 180.0)
	dLon := (lon2 - lon1) * (math.Pi / 180.0)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*(math.Pi/180.0))*math.Cos(lat2*(math.Pi/180.0))*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// CheckInAttendance processes attendance with GPS radius & time window checks
func (s *appService) CheckInAttendance(ctx context.Context, input *model.CheckInInput, user *model.User) (*model.AttendanceRecord, error) {
	if input.ScheduleID == "" || input.PersonName == "" || input.PersonID == "" {
		return nil, errors.New("schedule_id, person_id, dan person_name wajib diisi")
	}

	// 1. Fetch the schedule
	schedule, err := s.scheduleRepo.FindByID(ctx, input.ScheduleID)
	if err != nil || schedule == nil {
		return nil, errors.New("jadwal sesi renang tidak ditemukan")
	}

	// 2. Validate Time Window
	loc := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(loc)

	sessionStart, parseErr := time.ParseInLocation("2006-01-02 15:04", fmt.Sprintf("%s %s", schedule.Date, schedule.TimeStart), loc)
	if parseErr != nil {
		// Fallback parse
		sessionStart, parseErr = time.ParseInLocation("2006-01-02", schedule.Date, loc)
	}

	isLate := false
	status := input.Status
	if status == "" {
		status = "Hadir"
	}

	isCheckOut := status == "Selesai" || strings.Contains(status, "Keluar")

	if parseErr == nil && !isCheckOut {
		openWindow := sessionStart.Add(-2 * time.Hour)
		lateThreshold := sessionStart.Add(15 * time.Minute)

		// A. Check if check-in is attempted before openWindow (earlier than 2 hours before start)
		if now.Before(openWindow) {
			return nil, fmt.Errorf("presensi belum dibuka. Presensi untuk sesi '%s' baru bisa dilakukan mulai pukul %s WIB (2 jam sebelum sesi dimulai)", schedule.Title, openWindow.Format("15:04"))
		}

		// B. Check if check-in is attempted after lateThreshold (more than 15 minutes after start)
		if now.After(lateThreshold) {
			isLate = true
			if status == "Hadir" || status == "" {
				status = "Terlambat"
			}
			if strings.TrimSpace(input.LateReason) == "" && status == "Terlambat" {
				return nil, errors.New("presensi melewati batas 15 menit setelah sesi dimulai. Wajib mengisi alasan keterlambatan untuk catatan admin")
			}
		} else {
			if status == "Terlambat" {
				status = "Hadir"
			}
		}
	}

	// 3. Validate Geolocation Distance (Max 2.0 KM from pool)
	poolLat, poolLon := getPoolCoordinates(schedule.PoolArea)
	var distanceKm float64 = 0.0
	isValidLocation := true

	if input.Latitude != 0 && input.Longitude != 0 {
		distanceKm = calculateDistance(input.Latitude, input.Longitude, poolLat, poolLon)
		if distanceKm > 2.0 && status != "Izin" && status != "Sakit" {
			return nil, fmt.Errorf("presensi ditolak: Anda berada di luar radius 2 km dari kolam renang (Jarak Anda: %.2f km dari %s). Presensi hanya dapat dilakukan dalam radius maksimal 2.0 km", distanceKm, schedule.PoolArea)
		}
	}

	// 4. Create Attendance Record
	userId := ""
	userRole := ""
	if user != nil {
		userId = fmt.Sprintf("%d", user.ID)
		userRole = user.Role
	}

	att := &model.AttendanceRecord{
		ScheduleID:      schedule.ID,
		ScheduleTitle:   schedule.Title,
		Class:           schedule.Class,
		Date:            schedule.Date,
		TimeStart:       schedule.TimeStart,
		TimeEnd:         schedule.TimeEnd,
		PoolArea:        schedule.PoolArea,
		UserID:          userId,
		UserRole:        userRole,
		PersonType:      input.PersonType,
		PersonID:        input.PersonID,
		PersonName:      input.PersonName,
		Status:          status,
		IsLate:          isLate,
		LateReason:      input.LateReason,
		Latitude:        input.Latitude,
		Longitude:       input.Longitude,
		DistanceKm:      math.Round(distanceKm*100) / 100,
		IsValidLocation: isValidLocation,
		Notes:           input.Notes,
		CreatedAt:       now,
	}

	if err := s.attendanceRepo.Create(ctx, att); err != nil {
		return nil, err
	}

	// If notes provided on checkout/coach attendance, update schedule notes
	if strings.TrimSpace(input.Notes) != "" && (isCheckOut || input.PersonType == "coach") {
		schedule.Notes = input.Notes
		_ = s.scheduleRepo.Update(ctx, schedule)
	}

	// 5. If person is student, update student attendance logs and percentage
	if input.PersonType == "student" {
		studentIDInt := int64(0)
		fmt.Sscanf(input.PersonID, "%d", &studentIDInt)
		if studentIDInt > 0 {
			logStatus := "Hadir"
			if status == "Izin" || status == "Sakit" || status == "Alpa" {
				logStatus = status
			}
			_ = s.studentRepo.AddAttendanceLog(ctx, &model.AttendanceLog{
				StudentID: studentIDInt,
				Date:      now.Format("02 Jan 2006"),
				Status:    logStatus,
				CreatedAt: now,
			})

			logs, err := s.studentRepo.GetLogsByStudentID(ctx, studentIDInt)
			if err == nil && len(logs) > 0 {
				presentCount := 0
				for _, l := range logs {
					if l.Status == "Hadir" || l.Status == "Izin" || l.Status == "Sakit" {
						presentCount++
					}
				}
				ratePct := int(math.Round(float64(presentCount) / float64(len(logs)) * 100))
				_ = s.studentRepo.UpdateAttendanceRate(ctx, studentIDInt, fmt.Sprintf("%d%%", ratePct))
			}
		}
	}

	// 6. Generate Admin Notification
	notifTitle := fmt.Sprintf("Presensi Pelatih: %s", input.PersonName)
	notifType := "attendance_coach"
	if input.PersonType == "student" {
		notifTitle = fmt.Sprintf("Presensi Siswa: %s", input.PersonName)
		notifType = "attendance_student"
	}

	var notifMsg string
	if isCheckOut {
		notifTitle = fmt.Sprintf("Presensi Keluar: %s", input.PersonName)
		noteSnippet := ""
		if strings.TrimSpace(input.Notes) != "" {
			noteSnippet = fmt.Sprintf(" • Catatan Evaluasi: \"%s\"", input.Notes)
		}
		notifMsg = fmt.Sprintf("%s telah menyelesaikan sesi (Presensi Keluar) untuk '%s' (%s, %s-%s WIB di %s)%s.",
			input.PersonName, schedule.Title, schedule.Date, schedule.TimeStart, schedule.TimeEnd, schedule.PoolArea, noteSnippet)
	} else if isLate {
		notifMsg = fmt.Sprintf("%s telah absen (TERLAMBAT: %s) untuk sesi '%s' (%s, %s-%s WIB di %s). Jarak GPS: %.2f km.",
			input.PersonName, input.LateReason, schedule.Title, schedule.Date, schedule.TimeStart, schedule.TimeEnd, schedule.PoolArea, distanceKm)
	} else {
		notifMsg = fmt.Sprintf("%s telah absen (Hadir Tepat Waktu) untuk sesi '%s' (%s, %s-%s WIB di %s). Jarak GPS: %.2f km.",
			input.PersonName, schedule.Title, schedule.Date, schedule.TimeStart, schedule.TimeEnd, schedule.PoolArea, distanceKm)
	}

	_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
		Title:        notifTitle,
		Message:      notifMsg,
		Type:         notifType,
		TargetRole:   "admin",
		TargetUserID: userId,
		TargetName:   input.PersonName,
		ScheduleID:   schedule.ID,
		IsRead:       false,
		CreatedAt:    now,
	})

	// Dispatch Native Mobile Web Push for attendance check-in
	if s.pushService != nil {
		s.pushService.SendAttendancePushNotification(ctx, att, schedule)
	}

	return att, nil
}

// GetAttendances returns all attendances
func (s *appService) GetAttendances(ctx context.Context) ([]model.AttendanceRecord, error) {
	return s.attendanceRepo.FindAll(ctx)
}

// GetNotifications returns recent notifications filtered by target role and name
func (s *appService) GetNotifications(ctx context.Context, role, name, userId string) ([]model.AdminNotification, error) {
	return s.attendanceRepo.GetNotifications(ctx, role, name, userId, 40)
}

// MarkNotificationRead marks a notification as read
func (s *appService) MarkNotificationRead(ctx context.Context, id int64) error {
	return s.attendanceRepo.MarkNotificationRead(ctx, id)
}

// ClearAllNotifications deletes notifications based on role and user scope
func (s *appService) ClearAllNotifications(ctx context.Context, role, name, userId string) error {
	return s.attendanceRepo.ClearAllNotifications(ctx, role, name, userId)
}

// formatIndonesianDate converts a date string like "2026-09-09" to "Rabu, 09 Sep 2026"
func formatIndonesianDate(dateStr string) string {
	if dateStr == "" {
		return ""
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		// If already formatted or custom format, return as is
		return dateStr
	}

	days := map[time.Weekday]string{
		time.Sunday:    "Minggu",
		time.Monday:    "Senin",
		time.Tuesday:   "Selasa",
		time.Wednesday: "Rabu",
		time.Thursday:  "Kamis",
		time.Friday:    "Jumat",
		time.Saturday:  "Sabtu",
	}

	months := map[time.Month]string{
		time.January:   "Jan",
		time.February:  "Feb",
		time.March:     "Mar",
		time.April:     "Apr",
		time.May:       "Mei",
		time.June:      "Jun",
		time.July:      "Jul",
		time.August:    "Agu",
		time.September: "Sep",
		time.October:   "Okt",
		time.November:  "Nov",
		time.December:  "Des",
	}

	dayName := days[t.Weekday()]
	monthName := months[t.Month()]
	return fmt.Sprintf("%s, %02d %s %d", dayName, t.Day(), monthName, t.Year())
}

// GetFinancialTransactions returns all manual or recorded financial transactions
func (s *appService) GetFinancialTransactions(ctx context.Context) ([]model.FinancialTransaction, error) {
	return s.financialRepo.FindAll(ctx)
}

// CreateFinancialTransaction validates and stores a new financial transaction
func (s *appService) CreateFinancialTransaction(ctx context.Context, input *model.CreateFinancialTransactionInput) (*model.FinancialTransaction, error) {
	if input == nil {
		return nil, errors.New("input tidak boleh kosong")
	}
	if strings.TrimSpace(input.Title) == "" {
		return nil, errors.New("judul transaksi wajib diisi")
	}
	if input.Amount <= 0 {
		return nil, errors.New("nominal transaksi harus lebih besar dari 0")
	}
	if input.Type != "income" && input.Type != "expense" {
		return nil, errors.New("jenis transaksi harus berupa 'income' atau 'expense'")
	}
	if strings.TrimSpace(input.Date) == "" {
		input.Date = time.Now().Format("2006-01-02")
	}

	tx := &model.FinancialTransaction{
		Type:      input.Type,
		Category:  strings.TrimSpace(input.Category),
		Title:     strings.TrimSpace(input.Title),
		Amount:    input.Amount,
		Date:      input.Date,
		Notes:     strings.TrimSpace(input.Notes),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.financialRepo.Create(ctx, tx); err != nil {
		return nil, fmt.Errorf("failed to create financial transaction: %w", err)
	}

	return tx, nil
}

// DeleteFinancialTransaction removes a financial transaction by ID
func (s *appService) DeleteFinancialTransaction(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("ID transaksi wajib diisi")
	}
	return s.financialRepo.Delete(ctx, id)
}

