package model

import "time"

// Coach represents a coach/trainer record in PostgreSQL
type Coach struct {
	ID        int64     `json:"id"`
	UserID    *int64    `json:"user_id,omitempty"`
	Name      string    `json:"name"`
	Spec      string    `json:"spec"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	Class     string    `json:"class"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateCoachInput represents payload for registering a new coach
type CreateCoachInput struct {
	Name  string `json:"name" binding:"required"`
	Spec  string `json:"spec"`
	Phone string `json:"phone" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Class string `json:"class" binding:"required"`
}
