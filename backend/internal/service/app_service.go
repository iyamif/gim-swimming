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
	GetNotifications(ctx context.Context) ([]model.AdminNotification, error)
	MarkNotificationRead(ctx context.Context, id int64) error
}

type appService struct {
	userRepo       repository.UserRepository
	studentRepo    repository.StudentRepository
	coachRepo      repository.CoachRepository
	scheduleRepo   repository.ScheduleRepository
	invoiceRepo    repository.InvoiceRepository
	attendanceRepo repository.AttendanceRepository
}

// NewAppService creates a new AppService
func NewAppService(
	userRepo repository.UserRepository,
	studentRepo repository.StudentRepository,
	coachRepo repository.CoachRepository,
	scheduleRepo repository.ScheduleRepository,
	invoiceRepo repository.InvoiceRepository,
	attendanceRepo repository.AttendanceRepository,
) AppService {
	return &appService{
		userRepo:       userRepo,
		studentRepo:    studentRepo,
		coachRepo:      coachRepo,
		scheduleRepo:   scheduleRepo,
		invoiceRepo:    invoiceRepo,
		attendanceRepo: attendanceRepo,
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
	existing.UpdatedAt = time.Now()

	if err := s.scheduleRepo.Update(ctx, existing); err != nil {
		return nil, err
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

	if parseErr == nil {
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
	if isLate {
		notifMsg = fmt.Sprintf("%s telah absen (TERLAMBAT: %s) untuk sesi '%s' (%s, %s-%s WIB di %s). Jarak GPS: %.2f km.",
			input.PersonName, input.LateReason, schedule.Title, schedule.Date, schedule.TimeStart, schedule.TimeEnd, schedule.PoolArea, distanceKm)
	} else {
		notifMsg = fmt.Sprintf("%s telah absen (Hadir Tepat Waktu) untuk sesi '%s' (%s, %s-%s WIB di %s). Jarak GPS: %.2f km.",
			input.PersonName, schedule.Title, schedule.Date, schedule.TimeStart, schedule.TimeEnd, schedule.PoolArea, distanceKm)
	}

	_ = s.attendanceRepo.CreateNotification(ctx, &model.AdminNotification{
		Title:     notifTitle,
		Message:   notifMsg,
		Type:      notifType,
		IsRead:    false,
		CreatedAt: now,
	})

	return att, nil
}

// GetAttendances returns all attendances
func (s *appService) GetAttendances(ctx context.Context) ([]model.AttendanceRecord, error) {
	return s.attendanceRepo.FindAll(ctx)
}

// GetNotifications returns recent admin notifications
func (s *appService) GetNotifications(ctx context.Context) ([]model.AdminNotification, error) {
	return s.attendanceRepo.GetNotifications(ctx, 40)
}

// MarkNotificationRead marks a notification as read
func (s *appService) MarkNotificationRead(ctx context.Context, id int64) error {
	return s.attendanceRepo.MarkNotificationRead(ctx, id)
}

