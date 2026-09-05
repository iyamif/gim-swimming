package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// SeedAll checks if default tables have data, and if empty, seeds them.
func SeedAll(db *sql.DB, userRepo repository.UserRepository) {
	SeedUsers(userRepo)
	SeedStudentsAndAttendance(db)
	SeedCoaches(db)
	SeedSchedules(db)
	SeedInvoices(db)
}

// SeedUsers checks if the default users exist, and if not, creates them.
func SeedUsers(userRepo repository.UserRepository) {
	ctx := context.Background()

	defaultUsers := []struct {
		username string
		email    string
		password string
		role     string
	}{
		// Admin
		{
			username: "admin",
			email:    "admin@gimswimming.com",
			password: "password123",
			role:     model.RoleAdmin,
		},
		// Pelatih (Coaches)
		{
			username: "pelatih",
			email:    "pelatih@gimswimming.com",
			password: "password123",
			role:     model.RolePelatih,
		},
		{
			username: "adi",
			email:    "adi@gimswimming.com",
			password: "password123",
			role:     model.RolePelatih,
		},
		{
			username: "linda",
			email:    "linda@gimswimming.com",
			password: "password123",
			role:     model.RolePelatih,
		},
		{
			username: "rendi",
			email:    "rendi@gimswimming.com",
			password: "password123",
			role:     model.RolePelatih,
		},
		// Siswa & Orang Tua (Students & Parents)
		{
			username: "ortu",
			email:    "ortu@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
		{
			username: "rian",
			email:    "rian@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
		{
			username: "budi",
			email:    "budi@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
		{
			username: "siti",
			email:    "siti@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
		{
			username: "andre",
			email:    "andre@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
	}

	log.Println("Checking database for default seed users...")

	for _, du := range defaultUsers {
		existing, err := userRepo.FindByEmail(ctx, du.email)
		if err != nil {
			log.Printf("Error searching for seed user %s: %v", du.email, err)
			continue
		}

		if existing == nil {
			log.Printf("Seeding default user: %s (%s)...", du.username, du.role)
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(du.password), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("Failed to hash password for %s: %v", du.username, err)
				continue
			}

			user := &model.User{
				Username:  du.username,
				Email:     strings.ToLower(du.email),
				Password:  string(hashedPassword),
				Role:      du.role,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			err = userRepo.Create(ctx, user)
			if err != nil {
				log.Printf("Failed to create seed user %s: %v", du.username, err)
			} else {
				log.Printf("Successfully seeded default user %s (%s) with ID %d", du.username, du.role, user.ID)
			}
		} else {
			log.Printf("Seed user already exists: %s (%s)", du.username, du.role)
		}
	}
}

// SeedStudentsAndAttendance populates initial students and their logs if students table is empty
func SeedStudentsAndAttendance(db *sql.DB) {
	if db == nil {
		return
	}

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM students").Scan(&count)
	if err != nil {
		log.Printf("Error checking students count: %v", err)
		return
	}

	if count > 0 {
		log.Println("Students table already seeded.")
		return
	}

	log.Println("Seeding default students and attendance logs...")

	students := []struct {
		name           string
		class          string
		attendanceRate string
		parent         string
		phone          string
		age            string
		status         string
		logs           []struct {
			date   string
			status string
		}
	}{
		{
			name:           "Rian",
			class:          "Beginner",
			attendanceRate: "80%",
			parent:         "Bambang",
			phone:          "081234567891",
			age:            "10 thn",
			status:         "Active",
			logs: []struct {
				date   string
				status string
			}{
				{date: "24 Aug 2026", status: "Hadir"},
				{date: "21 Aug 2026", status: "Hadir"},
				{date: "17 Aug 2026", status: "Hadir"},
				{date: "14 Aug 2026", status: "Izin"},
				{date: "10 Aug 2026", status: "Alpa"},
			},
		},
		{
			name:           "Budi",
			class:          "Kids Swimming",
			attendanceRate: "100%",
			parent:         "Agus",
			phone:          "081234567892",
			age:            "7 thn",
			status:         "Active",
			logs: []struct {
				date   string
				status string
			}{
				{date: "24 Aug 2026", status: "Hadir"},
				{date: "21 Aug 2026", status: "Hadir"},
			},
		},
		{
			name:           "Siti",
			class:          "Private Class",
			attendanceRate: "50%",
			parent:         "Dewi",
			phone:          "081234567893",
			age:            "12 thn",
			status:         "Active",
			logs: []struct {
				date   string
				status string
			}{
				{date: "24 Aug 2026", status: "Hadir"},
				{date: "21 Aug 2026", status: "Sakit"},
			},
		},
	}

	for _, s := range students {
		var studentID int64
		query := `
			INSERT INTO students (name, class, attendance_rate, parent, phone, age, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
			RETURNING id;
		`
		err := db.QueryRow(query, s.name, s.class, s.attendanceRate, s.parent, s.phone, s.age, s.status).Scan(&studentID)
		if err != nil {
			log.Printf("Failed to insert student %s: %v", s.name, err)
			continue
		}

		log.Printf("Seeded student %s with ID %d", s.name, studentID)

		for _, logItem := range s.logs {
			_, err := db.Exec(`
				INSERT INTO attendance_logs (student_id, date, status, created_at)
				VALUES ($1, $2, $3, NOW());
			`, studentID, logItem.date, logItem.status)
			if err != nil {
				log.Printf("Failed to insert log for student %d: %v", studentID, err)
			}
		}
	}
}

// SeedCoaches populates initial coaches if coaches table is empty
func SeedCoaches(db *sql.DB) {
	if db == nil {
		return
	}

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM coaches").Scan(&count)
	if err != nil {
		log.Printf("Error checking coaches count: %v", err)
		return
	}

	if count > 0 {
		log.Println("Coaches table already seeded.")
		return
	}

	log.Println("Seeding default coaches...")

	coaches := []struct {
		name  string
		spec  string
		phone string
		email string
		class string
	}{
		{
			name:  "Coach Adi",
			spec:  "Gaya Bebas / Dada",
			phone: "085353333220",
			email: "adi@gimswimming.com",
			class: "Beginner",
		},
		{
			name:  "Coach Linda",
			spec:  "Kids Coach Specialist",
			phone: "08123456780",
			email: "linda@gimswimming.com",
			class: "Kids Swimming",
		},
		{
			name:  "Coach Rendi",
			spec:  "Private Instructor Specialist",
			phone: "081234567890",
			email: "rendi@gimswimming.com",
			class: "Private Class",
		},
	}

	for _, c := range coaches {
		_, err := db.Exec(`
			INSERT INTO coaches (name, spec, phone, email, class, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
		`, c.name, c.spec, c.phone, c.email, c.class)
		if err != nil {
			log.Printf("Failed to seed coach %s: %v", c.name, err)
		} else {
			log.Printf("Seeded coach %s", c.name)
		}
	}
}

// SeedSchedules populates initial schedules if schedules table is empty
func SeedSchedules(db *sql.DB) {
	if db == nil {
		return
	}

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM schedules").Scan(&count)
	if err != nil {
		log.Printf("Error checking schedules count: %v", err)
		return
	}

	if count > 0 {
		log.Println("Schedules table already seeded.")
		return
	}

	log.Println("Seeding default schedules...")

	schedules := []struct {
		title        string
		class        string
		date         string
		timeStart    string
		timeEnd      string
		poolArea     string
		coachID      string
		coachName    string
		coachPhone   string
		studentIDs   []string
		studentNames []string
		notes        string
		status       string
	}{
		{
			title:        "Beginner Class (Pagi)",
			class:        "Beginner Class",
			date:         "2026-09-05",
			timeStart:    "08:00",
			timeEnd:      "10:00",
			poolArea:     "Kolam Utama A",
			coachID:      "1",
			coachName:    "Coach Adi",
			coachPhone:   "085353333220",
			studentIDs:   []string{"1"},
			studentNames: []string{"Rian"},
			notes:        "Fokus latihan meluncur & teknik pernapasan",
			status:       "Active",
		},
		{
			title:        "Kids Swimming Class",
			class:        "Kids Swimming",
			date:         "2026-09-06",
			timeStart:    "10:00",
			timeEnd:      "11:30",
			poolArea:     "Kolam Anak B",
			coachID:      "2",
			coachName:    "Coach Linda",
			coachPhone:   "08123456780",
			studentIDs:   []string{"2"},
			studentNames: []string{"Budi"},
			notes:        "Latihan mengapung & gerakan kaki",
			status:       "Active",
		},
		{
			title:        "Private Class (1-on-1)",
			class:        "Private Class",
			date:         "2026-10-01",
			timeStart:    "15:00",
			timeEnd:      "17:00",
			poolArea:     "Kolam Utama A",
			coachID:      "3",
			coachName:    "Coach Rendi",
			coachPhone:   "081234567890",
			studentIDs:   []string{"custom-1"},
			studentNames: []string{"Andre"},
			notes:        "Sesi les privat intensif teknik gaya dada & pernapasan",
			status:       "Active",
		},
	}

	for _, s := range schedules {
		studentIDsJSON, _ := json.Marshal(s.studentIDs)
		studentNamesJSON, _ := json.Marshal(s.studentNames)

		_, err := db.Exec(`
			INSERT INTO schedules (title, class, date, time_start, time_end, pool_area, coach_id, coach_name, coach_phone, student_ids, student_names, notes, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW());
		`, s.title, s.class, s.date, s.timeStart, s.timeEnd, s.poolArea, s.coachID, s.coachName, s.coachPhone, string(studentIDsJSON), string(studentNamesJSON), s.notes, s.status)
		if err != nil {
			log.Printf("Failed to seed schedule %s: %v", s.title, err)
		} else {
			log.Printf("Seeded schedule: %s (%s)", s.title, s.date)
		}
	}
}

// SeedInvoices populates initial invoices if invoices table is empty
func SeedInvoices(db *sql.DB) {
	if db == nil {
		return
	}

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM invoices").Scan(&count)
	if err != nil {
		log.Printf("Error checking invoices count: %v", err)
		return
	}

	if count > 0 {
		log.Println("Invoices table already seeded.")
		return
	}

	log.Println("Seeding default invoices...")

	invoices := []struct {
		studentID     string
		name          string
		amount        float64
		desc          string
		status        string
		uploadReceipt *string
	}{
		{
			studentID:     "1",
			name:          "Rian",
			amount:        500000,
			desc:          "SPP Agustus 2026",
			status:        "Belum Dibayar",
			uploadReceipt: nil,
		},
		{
			studentID:     "2",
			name:          "Budi",
			amount:        500000,
			desc:          "SPP Agustus 2026",
			status:        "Lunas",
			uploadReceipt: stringPtr("bukti_spp_budi.jpg"),
		},
		{
			studentID:     "3",
			name:          "Siti",
			amount:        650000,
			desc:          "SPP Agustus 2026",
			status:        "Belum Dibayar",
			uploadReceipt: nil,
		},
	}

	for _, inv := range invoices {
		_, err := db.Exec(`
			INSERT INTO invoices (student_id, name, amount, description, status, upload_receipt, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
		`, inv.studentID, inv.name, inv.amount, inv.desc, inv.status, inv.uploadReceipt)
		if err != nil {
			log.Printf("Failed to seed invoice for %s: %v", inv.name, err)
		} else {
			log.Printf("Seeded invoice for %s", inv.name)
		}
	}
}

func stringPtr(s string) *string {
	return &s
}
