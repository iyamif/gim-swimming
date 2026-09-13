package model

import "time"

// ClassProgram represents a swimming course/class tier
type ClassProgram struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	MonthlyFee      float64   `json:"monthly_fee"`
	SessionsPerWeek int       `json:"sessions_per_week"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// CreateClassProgramInput payload for creating a class program
type CreateClassProgramInput struct {
	Name            string  `json:"name" binding:"required"`
	Description     string  `json:"description"`
	MonthlyFee      float64 `json:"monthly_fee" binding:"required"`
	SessionsPerWeek int     `json:"sessions_per_week"`
}

// UpdateClassProgramInput payload for updating a class program
type UpdateClassProgramInput struct {
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	MonthlyFee      float64 `json:"monthly_fee"`
	SessionsPerWeek int     `json:"sessions_per_week"`
}
