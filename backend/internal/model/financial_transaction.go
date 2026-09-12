package model

import "time"

// FinancialTransaction represents a manual or automated financial income/expense log
type FinancialTransaction struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`     // "income" or "expense"
	Category  string    `json:"category"` // e.g. "Pendaftaran", "Sewa Kolam", etc.
	Title     string    `json:"title"`
	Amount    float64   `json:"amount"`
	Date      string    `json:"date"` // "YYYY-MM-DD"
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateFinancialTransactionInput represents payload to create a new transaction
type CreateFinancialTransactionInput struct {
	Type     string  `json:"type" binding:"required"`
	Category string  `json:"category" binding:"required"`
	Title    string  `json:"title" binding:"required"`
	Amount   float64 `json:"amount" binding:"required"`
	Date     string  `json:"date" binding:"required"`
	Notes    string  `json:"notes"`
}
