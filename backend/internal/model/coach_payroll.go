package model

import "time"

// CoachPayroll represents a monthly payroll disbursement record for coaches
type CoachPayroll struct {
	ID            string     `json:"id"`
	CoachID       string     `json:"coach_id"`
	CoachName     string     `json:"coach_name"`
	Month         string     `json:"month"` // e.g. "September 2026"
	TotalSessions int        `json:"total_sessions"`
	PayPerSession float64    `json:"pay_per_session"`
	BonusAmount   float64    `json:"bonus_amount"`
	TotalAmount   float64    `json:"total_amount"`
	Status        string     `json:"status"` // "Pending", "Approved", "Rejected"
	ApprovedAt    *time.Time `json:"approved_at"`
	Notes         string     `json:"notes"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// CreateCoachPayrollInput payload to generate/save payroll
type CreateCoachPayrollInput struct {
	CoachID       string  `json:"coach_id" binding:"required"`
	CoachName     string  `json:"coach_name" binding:"required"`
	Month         string  `json:"month" binding:"required"`
	TotalSessions int     `json:"total_sessions"`
	PayPerSession float64 `json:"pay_per_session"`
	BonusAmount   float64 `json:"bonus_amount"`
	TotalAmount   float64 `json:"total_amount"`
	Notes         string  `json:"notes"`
}

// ApproveCoachPayrollInput payload for approving coach payroll
type ApproveCoachPayrollInput struct {
	Confirm bool   `json:"confirm"`
	Notes   string `json:"notes"`
}
