package model

import "time"

// AttendanceRecord represents a verified attendance entry for a coach or student
type AttendanceRecord struct {
	ID              int64     `json:"id"`
	ScheduleID      string    `json:"schedule_id"`
	ScheduleTitle   string    `json:"schedule_title"`
	Class           string    `json:"class"`
	Date            string    `json:"date"`       // YYYY-MM-DD
	TimeStart       string    `json:"time_start"` // HH:MM
	TimeEnd         string    `json:"time_end"`   // HH:MM
	PoolArea        string    `json:"pool_area"`
	UserID          string    `json:"user_id,omitempty"`
	UserRole        string    `json:"user_role,omitempty"` // "pelatih", "orang tua", "admin"
	PersonType      string    `json:"person_type"`         // "coach" or "student"
	PersonID        string    `json:"person_id"`
	PersonName      string    `json:"person_name"`
	Status          string    `json:"status"` // "Hadir", "Terlambat", "Izin", "Sakit", "Alpa"
	IsLate          bool      `json:"is_late"`
	LateReason      string    `json:"late_reason,omitempty"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	DistanceKm      float64   `json:"distance_km"`
	IsValidLocation bool      `json:"is_valid_location"`
	Notes           string    `json:"notes,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// CheckInInput represents payload when a coach or student checks in
type CheckInInput struct {
	ScheduleID string  `json:"schedule_id" binding:"required"`
	PersonType string  `json:"person_type" binding:"required,oneof=coach student"`
	PersonID   string  `json:"person_id" binding:"required"`
	PersonName string  `json:"person_name" binding:"required"`
	Status     string  `json:"status"` // Defaults to "Hadir" or "Terlambat"
	LateReason string  `json:"late_reason"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Notes      string  `json:"notes"`
}

// AdminNotification represents in-app notification for admin
type AdminNotification struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"` // "attendance_coach", "attendance_student", "system"
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}
