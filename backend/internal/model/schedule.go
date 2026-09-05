package model

import "time"

// ScheduleSession represents a swimming lesson schedule in PostgreSQL
type ScheduleSession struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Class        string    `json:"class"`
	Date         string    `json:"date"`      // e.g. "2026-10-01"
	TimeStart    string    `json:"timeStart"` // e.g. "15:00"
	TimeEnd      string    `json:"timeEnd"`   // e.g. "17:00"
	PoolArea     string    `json:"poolArea"`  // e.g. "Kolam Utama A"
	CoachID      string    `json:"coachId"`
	CoachName    string    `json:"coachName"`
	CoachPhone   string    `json:"coachPhone,omitempty"`
	StudentIDs   []string  `json:"studentIds"`
	StudentNames []string  `json:"studentNames"`
	Notes        string    `json:"notes,omitempty"`
	Status       string    `json:"status"` // "Active", "Completed", "Cancelled"
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreateScheduleInput represents payload for creating a schedule
type CreateScheduleInput struct {
	Title        string   `json:"title" binding:"required"`
	Class        string   `json:"class" binding:"required"`
	Date         string   `json:"date" binding:"required"`
	TimeStart    string   `json:"timeStart" binding:"required"`
	TimeEnd      string   `json:"timeEnd" binding:"required"`
	PoolArea     string   `json:"poolArea" binding:"required"`
	CoachID      string   `json:"coachId" binding:"required"`
	CoachName    string   `json:"coachName" binding:"required"`
	CoachPhone   string   `json:"coachPhone"`
	StudentIDs   []string `json:"studentIds"`
	StudentNames []string `json:"studentNames"`
	Notes        string   `json:"notes"`
	Status       string   `json:"status"`
}
