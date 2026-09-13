package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
)

// CoachPayrollRepository defines operations for coach payroll records
type CoachPayrollRepository interface {
	CreateOrUpdate(ctx context.Context, payroll *model.CoachPayroll) error
	FindAll(ctx context.Context, month string) ([]model.CoachPayroll, error)
	FindByID(ctx context.Context, id string) (*model.CoachPayroll, error)
	Approve(ctx context.Context, id string, notes string) (*model.CoachPayroll, error)
}

type pgCoachPayrollRepository struct {
	db *sql.DB
}

// NewCoachPayrollRepository creates a new CoachPayrollRepository
func NewCoachPayrollRepository(db *sql.DB) CoachPayrollRepository {
	return &pgCoachPayrollRepository{db: db}
}

func parsePayrollID(id string) (int64, error) {
	id = strings.TrimPrefix(id, "pay_")
	id = strings.TrimPrefix(id, "pr_")
	return strconv.ParseInt(id, 10, 64)
}

func (r *pgCoachPayrollRepository) CreateOrUpdate(ctx context.Context, p *model.CoachPayroll) error {
	// Check if already exists for this coach and month
	queryCheck := `
		SELECT id FROM coach_payrolls
		WHERE coach_id = $1 AND month = $2;
	`
	var existingID int64
	err := r.db.QueryRowContext(ctx, queryCheck, p.CoachID, p.Month).Scan(&existingID)
	if err == nil && existingID > 0 {
		// Update existing
		queryUpdate := `
			UPDATE coach_payrolls
			SET coach_name = $1, total_sessions = $2, pay_per_session = $3, bonus_amount = $4, total_amount = $5, notes = $6, updated_at = NOW()
			WHERE id = $7
			RETURNING id, status, approved_at, created_at, updated_at;
		`
		var approvedAt sql.NullTime
		err = r.db.QueryRowContext(
			ctx,
			queryUpdate,
			p.CoachName,
			p.TotalSessions,
			p.PayPerSession,
			p.BonusAmount,
			p.TotalAmount,
			p.Notes,
			existingID,
		).Scan(&existingID, &p.Status, &approvedAt, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return err
		}
		p.ID = fmt.Sprintf("pay_%d", existingID)
		if approvedAt.Valid {
			p.ApprovedAt = &approvedAt.Time
		}
		return nil
	}

	// Insert new
	queryInsert := `
		INSERT INTO coach_payrolls (coach_id, coach_name, month, total_sessions, pay_per_session, bonus_amount, total_amount, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, created_at, updated_at;
	`
	if p.Status == "" {
		p.Status = "Pending"
	}
	var id int64
	err = r.db.QueryRowContext(
		ctx,
		queryInsert,
		p.CoachID,
		p.CoachName,
		p.Month,
		p.TotalSessions,
		p.PayPerSession,
		p.BonusAmount,
		p.TotalAmount,
		p.Status,
		p.Notes,
	).Scan(&id, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return err
	}

	p.ID = fmt.Sprintf("pay_%d", id)
	return nil
}

func (r *pgCoachPayrollRepository) FindAll(ctx context.Context, month string) ([]model.CoachPayroll, error) {
	query := `
		SELECT id, coach_id, coach_name, month, total_sessions, pay_per_session, bonus_amount, total_amount, status, approved_at, notes, created_at, updated_at
		FROM coach_payrolls
	`
	var rows *sql.Rows
	var err error
	if month != "" {
		query += ` WHERE month = $1 ORDER BY id DESC;`
		rows, err = r.db.QueryContext(ctx, query, month)
	} else {
		query += ` ORDER BY month DESC, id DESC;`
		rows, err = r.db.QueryContext(ctx, query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.CoachPayroll
	for rows.Next() {
		var p model.CoachPayroll
		var rawID int64
		var approvedAt sql.NullTime
		var notes sql.NullString
		err := rows.Scan(
			&rawID,
			&p.CoachID,
			&p.CoachName,
			&p.Month,
			&p.TotalSessions,
			&p.PayPerSession,
			&p.BonusAmount,
			&p.TotalAmount,
			&p.Status,
			&approvedAt,
			&notes,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		p.ID = fmt.Sprintf("pay_%d", rawID)
		if approvedAt.Valid {
			p.ApprovedAt = &approvedAt.Time
		}
		if notes.Valid {
			p.Notes = notes.String
		}
		list = append(list, p)
	}

	return list, nil
}

func (r *pgCoachPayrollRepository) FindByID(ctx context.Context, id string) (*model.CoachPayroll, error) {
	rawID, err := parsePayrollID(id)
	if err != nil {
		return nil, errors.New("invalid payroll id")
	}

	query := `
		SELECT id, coach_id, coach_name, month, total_sessions, pay_per_session, bonus_amount, total_amount, status, approved_at, notes, created_at, updated_at
		FROM coach_payrolls
		WHERE id = $1;
	`
	var p model.CoachPayroll
	var approvedAt sql.NullTime
	var notes sql.NullString
	err = r.db.QueryRowContext(ctx, query, rawID).Scan(
		&rawID,
		&p.CoachID,
		&p.CoachName,
		&p.Month,
		&p.TotalSessions,
		&p.PayPerSession,
		&p.BonusAmount,
		&p.TotalAmount,
		&p.Status,
		&approvedAt,
		&notes,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	p.ID = fmt.Sprintf("pay_%d", rawID)
	if approvedAt.Valid {
		p.ApprovedAt = &approvedAt.Time
	}
	if notes.Valid {
		p.Notes = notes.String
	}
	return &p, nil
}

func (r *pgCoachPayrollRepository) Approve(ctx context.Context, id string, notes string) (*model.CoachPayroll, error) {
	rawID, err := parsePayrollID(id)
	if err != nil {
		return nil, errors.New("invalid payroll id")
	}

	now := time.Now()
	query := `
		UPDATE coach_payrolls
		SET status = 'Approved', approved_at = $1, notes = COALESCE(NULLIF($2, ''), notes), updated_at = NOW()
		WHERE id = $3
		RETURNING id, coach_id, coach_name, month, total_sessions, pay_per_session, bonus_amount, total_amount, status, approved_at, notes, created_at, updated_at;
	`
	var p model.CoachPayroll
	var approvedAt sql.NullTime
	var notesVal sql.NullString
	err = r.db.QueryRowContext(ctx, query, now, notes, rawID).Scan(
		&rawID,
		&p.CoachID,
		&p.CoachName,
		&p.Month,
		&p.TotalSessions,
		&p.PayPerSession,
		&p.BonusAmount,
		&p.TotalAmount,
		&p.Status,
		&approvedAt,
		&notesVal,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	p.ID = fmt.Sprintf("pay_%d", rawID)
	if approvedAt.Valid {
		p.ApprovedAt = &approvedAt.Time
	}
	if notesVal.Valid {
		p.Notes = notesVal.String
	}
	return &p, nil
}
