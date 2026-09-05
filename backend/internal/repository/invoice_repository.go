package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/iyamif/gim-swimming/internal/model"
)

// InvoiceRepository defines interface for invoice operations
type InvoiceRepository interface {
	Create(ctx context.Context, inv *model.Invoice) error
	FindAll(ctx context.Context) ([]model.Invoice, error)
	FindByID(ctx context.Context, id string) (*model.Invoice, error)
	UpdateStatus(ctx context.Context, id string, status string, receiptURL *string) error
	UploadReceipt(ctx context.Context, id string, receiptURL string) error
}

type pgInvoiceRepository struct {
	db *sql.DB
}

// NewInvoiceRepository creates a new InvoiceRepository
func NewInvoiceRepository(db *sql.DB) InvoiceRepository {
	return &pgInvoiceRepository{db: db}
}

func (r *pgInvoiceRepository) Create(ctx context.Context, inv *model.Invoice) error {
	query := `
		INSERT INTO invoices (student_id, name, amount, description, status, upload_receipt, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id;
	`
	var id int64
	err := r.db.QueryRowContext(
		ctx,
		query,
		inv.StudentID,
		inv.Name,
		inv.Amount,
		inv.Desc,
		inv.Status,
		inv.UploadReceipt,
		inv.CreatedAt,
		inv.UpdatedAt,
	).Scan(&id)

	if err != nil {
		return err
	}

	inv.ID = fmt.Sprintf("inv%d", id)
	return nil
}

func (r *pgInvoiceRepository) FindAll(ctx context.Context) ([]model.Invoice, error) {
	query := `
		SELECT id, student_id, name, amount, description, status, upload_receipt, created_at, updated_at
		FROM invoices
		ORDER BY id ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []model.Invoice
	for rows.Next() {
		var inv model.Invoice
		var rawID int64
		var receipt sql.NullString

		err := rows.Scan(
			&rawID,
			&inv.StudentID,
			&inv.Name,
			&inv.Amount,
			&inv.Desc,
			&inv.Status,
			&receipt,
			&inv.CreatedAt,
			&inv.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		inv.ID = fmt.Sprintf("inv%d", rawID)
		if receipt.Valid {
			inv.UploadReceipt = &receipt.String
		}

		invoices = append(invoices, inv)
	}

	return invoices, nil
}

func (r *pgInvoiceRepository) FindByID(ctx context.Context, id string) (*model.Invoice, error) {
	var rawID int64
	_, err := fmt.Sscanf(id, "inv%d", &rawID)
	if err != nil {
		_, err = fmt.Sscanf(id, "%d", &rawID)
		if err != nil {
			return nil, errors.New("invalid invoice id")
		}
	}

	query := `
		SELECT id, student_id, name, amount, description, status, upload_receipt, created_at, updated_at
		FROM invoices
		WHERE id = $1;
	`
	var inv model.Invoice
	var receipt sql.NullString

	err = r.db.QueryRowContext(ctx, query, rawID).Scan(
		&rawID,
		&inv.StudentID,
		&inv.Name,
		&inv.Amount,
		&inv.Desc,
		&inv.Status,
		&receipt,
		&inv.CreatedAt,
		&inv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	inv.ID = fmt.Sprintf("inv%d", rawID)
	if receipt.Valid {
		inv.UploadReceipt = &receipt.String
	}

	return &inv, nil
}

func (r *pgInvoiceRepository) UpdateStatus(ctx context.Context, id string, status string, receiptURL *string) error {
	var rawID int64
	_, err := fmt.Sscanf(id, "inv%d", &rawID)
	if err != nil {
		_, err = fmt.Sscanf(id, "%d", &rawID)
		if err != nil {
			return errors.New("invalid invoice id")
		}
	}

	query := `
		UPDATE invoices
		SET status = $1, upload_receipt = $2, updated_at = NOW()
		WHERE id = $3;
	`
	_, err = r.db.ExecContext(ctx, query, status, receiptURL, rawID)
	return err
}

func (r *pgInvoiceRepository) UploadReceipt(ctx context.Context, id string, receiptURL string) error {
	var rawID int64
	_, err := fmt.Sscanf(id, "inv%d", &rawID)
	if err != nil {
		_, err = fmt.Sscanf(id, "%d", &rawID)
		if err != nil {
			return errors.New("invalid invoice id")
		}
	}

	query := `
		UPDATE invoices
		SET status = 'Menunggu Konfirmasi', upload_receipt = $1, updated_at = NOW()
		WHERE id = $2;
	`
	_, err = r.db.ExecContext(ctx, query, receiptURL, rawID)
	return err
}
