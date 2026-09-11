package model

import "time"

// AttendanceLog represents an attendance entry for a student
type AttendanceLog struct {
	ID        int64     `json:"id"`
	StudentID int64     `json:"student_id"`
	Date      string    `json:"date"`   // e.g. "2026-09-05" or "24 Aug 2026"
	Status    string    `json:"status"` // "Hadir", "Sakit", "Izin", "Alpa"
	CreatedAt time.Time `json:"created_at"`
}

// Student represents a student record in PostgreSQL
type Student struct {
	ID             int64           `json:"id"`
	Name           string          `json:"name"`
	Class          string          `json:"class"`
	AttendanceRate string          `json:"attendanceRate"`
	Parent         string          `json:"parent"`
	Phone          string          `json:"phone,omitempty"`
	Age            string          `json:"age,omitempty"`
	CoachID        string          `json:"coach_id,omitempty"`
	CoachName      string          `json:"coach_name,omitempty"`
	Status         string          `json:"status"`
	Avatar         string          `json:"avatar"`
	Logs           []AttendanceLog `json:"logs"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// CreateStudentInput represents payload for registering a new student
type CreateStudentInput struct {
	Name           string `json:"name" binding:"required"`
	Class          string `json:"class" binding:"required"`
	Parent         string `json:"parent" binding:"required"`
	Phone          string `json:"phone" binding:"required"`
	Age            string `json:"age"`
	CoachID        string `json:"coach_id"`
	CoachName      string `json:"coach_name"`
	CoachIdCamel   string `json:"coachId"`
	CoachNameCamel string `json:"coachName"`
}

// BulkAttendanceInput represents attendance submission for a class session
type BulkAttendanceInput struct {
	Class         string            `json:"class" binding:"required"`
	Date          string            `json:"date"` // Optional, defaults to today
	AttendanceMap map[string]string `json:"attendanceMap" binding:"required"` // student_id -> status
}

// UpdateStudentStatusInput represents payload for updating student status
type UpdateStudentStatusInput struct {
	Status string `json:"status" binding:"required"`
}

// UpdateStudentInput represents payload for updating full student details
type UpdateStudentInput struct {
	Name           string `json:"name"`
	Class          string `json:"class"`
	Parent         string `json:"parent"`
	Phone          string `json:"phone"`
	Age            string `json:"age"`
	CoachID        string `json:"coach_id"`
	CoachName      string `json:"coach_name"`
	CoachIdCamel   string `json:"coachId"`
	CoachNameCamel string `json:"coachName"`
	Status         string `json:"status"`
}
