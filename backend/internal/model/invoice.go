package model

import "time"

// Invoice represents a tuition (SPP) payment record
type Invoice struct {
	ID            string    `json:"id"`
	StudentID     string    `json:"studentId"`
	Name          string    `json:"name"`
	Amount        float64   `json:"amount"`
	Desc          string    `json:"desc"`
	Status        string    `json:"status"` // "Belum Dibayar", "Menunggu Konfirmasi", "Lunas"
	UploadReceipt *string   `json:"uploadReceipt"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateInvoiceInput represents payload to create an invoice
type CreateInvoiceInput struct {
	StudentID string  `json:"studentId" binding:"required"`
	Name      string  `json:"name" binding:"required"`
	Amount    float64 `json:"amount" binding:"required"`
	Desc      string  `json:"desc" binding:"required"`
}

// VerifyInvoiceInput represents payload to verify or reject tuition receipt
type VerifyInvoiceInput struct {
	Confirm bool `json:"confirm"`
}

// UploadReceiptInput represents payload to upload payment receipt
type UploadReceiptInput struct {
	ReceiptURL string `json:"receiptUrl" binding:"required"`
}
