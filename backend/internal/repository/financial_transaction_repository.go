package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/iyamif/gim-swimming/internal/model"
)

// FinancialTransactionRepository defines interface for financial transaction operations
type FinancialTransactionRepository interface {
	Create(ctx context.Context, tx *model.FinancialTransaction) error
	FindAll(ctx context.Context) ([]model.FinancialTransaction, error)
	Delete(ctx context.Context, id string) error
}

type pgFinancialTransactionRepository struct {
	db *sql.DB
}

// NewFinancialTransactionRepository creates a new FinancialTransactionRepository
func NewFinancialTransactionRepository(db *sql.DB) FinancialTransactionRepository {
	return &pgFinancialTransactionRepository{db: db}
}

func (r *pgFinancialTransactionRepository) Create(ctx context.Context, tx *model.FinancialTransaction) error {
	query := `
		INSERT INTO financial_transactions (type, category, title, amount, date, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id;
	`
	var id int64
	err := r.db.QueryRowContext(
		ctx,
		query,
		tx.Type,
		tx.Category,
		tx.Title,
		tx.Amount,
		tx.Date,
		tx.Notes,
		tx.CreatedAt,
		tx.UpdatedAt,
	).Scan(&id)

	if err != nil {
		return err
	}

	tx.ID = fmt.Sprintf("tx%d", id)
	return nil
}

func (r *pgFinancialTransactionRepository) FindAll(ctx context.Context) ([]model.FinancialTransaction, error) {
	query := `
		SELECT id, type, category, title, amount, date, notes, created_at, updated_at
		FROM financial_transactions
		ORDER BY date DESC, id DESC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []model.FinancialTransaction
	for rows.Next() {
		var tx model.FinancialTransaction
		var id int64
		var notes sql.NullString

		err := rows.Scan(
			&id,
			&tx.Type,
			&tx.Category,
			&tx.Title,
			&tx.Amount,
			&tx.Date,
			&notes,
			&tx.CreatedAt,
			&tx.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		tx.ID = fmt.Sprintf("tx%d", id)
		if notes.Valid {
			tx.Notes = notes.String
		}

		transactions = append(transactions, tx)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return transactions, nil
}

func (r *pgFinancialTransactionRepository) Delete(ctx context.Context, id string) error {
	cleanID := strings.TrimPrefix(strings.TrimPrefix(id, "tx-"), "tx")
	intID, err := strconv.ParseInt(cleanID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid transaction ID format: %s", id)
	}

	query := `DELETE FROM financial_transactions WHERE id = $1;`
	_, err = r.db.ExecContext(ctx, query, intID)
	return err
}
