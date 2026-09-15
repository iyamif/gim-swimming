package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/iyamif/gim-swimming/internal/model"
)

// CoachRepository defines interface for coach storage operations
type CoachRepository interface {
	Create(ctx context.Context, coach *model.Coach) error
	Update(ctx context.Context, coach *model.Coach) error
	UpdateStatus(ctx context.Context, coachID int64, status string) error
	FindAll(ctx context.Context) ([]model.Coach, error)
	FindByID(ctx context.Context, id int64) (*model.Coach, error)
	FindByUserID(ctx context.Context, userID int64) (*model.Coach, error)
	LinkUser(ctx context.Context, coachID int64, userID int64) error
	Delete(ctx context.Context, id int64) error
}

type pgCoachRepository struct {
	db *sql.DB
}

// NewCoachRepository creates a new CoachRepository
func NewCoachRepository(db *sql.DB) CoachRepository {
	return &pgCoachRepository{db: db}
}

func (r *pgCoachRepository) Create(ctx context.Context, coach *model.Coach) error {
	if coach.PayPerSession <= 0 {
		coach.PayPerSession = 100000
	}
	if coach.Status == "" {
		coach.Status = "Active"
	}
	query := `
		INSERT INTO coaches (user_id, name, spec, phone, email, class, avatar, status, pay_per_session, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id;
	`
	return r.db.QueryRowContext(
		ctx,
		query,
		coach.UserID,
		coach.Name,
		coach.Spec,
		coach.Phone,
		coach.Email,
		coach.Class,
		coach.Avatar,
		coach.Status,
		coach.PayPerSession,
		coach.CreatedAt,
		coach.UpdatedAt,
	).Scan(&coach.ID)
}

func (r *pgCoachRepository) Update(ctx context.Context, coach *model.Coach) error {
	if coach.PayPerSession <= 0 {
		coach.PayPerSession = 100000
	}
	if coach.Status == "" {
		coach.Status = "Active"
	}
	query := `
		UPDATE coaches
		SET user_id = $1, name = $2, spec = $3, phone = $4, email = $5, class = $6, avatar = $7, status = $8, pay_per_session = $9, updated_at = $10
		WHERE id = $11;
	`
	_, err := r.db.ExecContext(
		ctx,
		query,
		coach.UserID,
		coach.Name,
		coach.Spec,
		coach.Phone,
		coach.Email,
		coach.Class,
		coach.Avatar,
		coach.Status,
		coach.PayPerSession,
		coach.UpdatedAt,
		coach.ID,
	)
	return err
}

func (r *pgCoachRepository) UpdateStatus(ctx context.Context, coachID int64, status string) error {
	query := `UPDATE coaches SET status = $1, updated_at = NOW() WHERE id = $2;`
	_, err := r.db.ExecContext(ctx, query, status, coachID)
	return err
}

func (r *pgCoachRepository) FindAll(ctx context.Context) ([]model.Coach, error) {
	query := `
		SELECT 
			c.id, 
			c.user_id, 
			c.name, 
			c.spec, 
			c.phone, 
			c.email, 
			c.class, 
			COALESCE(NULLIF(c.avatar, ''), COALESCE(u.avatar, '')), 
			COALESCE(NULLIF(c.status, ''), 'Active'),
			COALESCE(c.pay_per_session, 100000),
			c.created_at, 
			c.updated_at
		FROM coaches c
		LEFT JOIN users u ON c.user_id = u.id 
			OR LOWER(REPLACE(c.name, ' ', '')) = LOWER(REPLACE(u.username, ' ', ''))
			OR LOWER(REPLACE(REPLACE(c.name, 'coach', ''), ' ', '')) = LOWER(REPLACE(u.username, ' ', ''))
			OR LOWER(c.name) LIKE '%' || LOWER(u.username) || '%'
			OR (LOWER(u.username) = 'adi' AND LOWER(c.name) LIKE '%adi%')
			OR (LOWER(c.email) != '' AND LOWER(u.email) = LOWER(c.email))
		ORDER BY c.id ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var coaches []model.Coach
	for rows.Next() {
		var c model.Coach
		var userID sql.NullInt64
		err := rows.Scan(
			&c.ID,
			&userID,
			&c.Name,
			&c.Spec,
			&c.Phone,
			&c.Email,
			&c.Class,
			&c.Avatar,
			&c.Status,
			&c.PayPerSession,
			&c.CreatedAt,
			&c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if userID.Valid {
			c.UserID = &userID.Int64
		}
		coaches = append(coaches, c)
	}

	return coaches, nil
}

func (r *pgCoachRepository) FindByID(ctx context.Context, id int64) (*model.Coach, error) {
	query := `
		SELECT 
			c.id, 
			c.user_id, 
			c.name, 
			c.spec, 
			c.phone, 
			c.email, 
			c.class, 
			COALESCE(NULLIF(c.avatar, ''), COALESCE(u.avatar, '')), 
			COALESCE(NULLIF(c.status, ''), 'Active'),
			COALESCE(c.pay_per_session, 100000),
			c.created_at, 
			c.updated_at
		FROM coaches c
		LEFT JOIN users u ON c.user_id = u.id 
			OR LOWER(REPLACE(c.name, ' ', '')) = LOWER(REPLACE(u.username, ' ', ''))
			OR LOWER(REPLACE(REPLACE(c.name, 'coach', ''), ' ', '')) = LOWER(REPLACE(u.username, ' ', ''))
			OR LOWER(c.name) LIKE '%' || LOWER(u.username) || '%'
			OR (LOWER(u.username) = 'adi' AND LOWER(c.name) LIKE '%adi%')
			OR (LOWER(c.email) != '' AND LOWER(u.email) = LOWER(c.email))
		WHERE c.id = $1;
	`
	var c model.Coach
	var userID sql.NullInt64
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID,
		&userID,
		&c.Name,
		&c.Spec,
		&c.Phone,
		&c.Email,
		&c.Class,
		&c.Avatar,
		&c.Status,
		&c.PayPerSession,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if userID.Valid {
		c.UserID = &userID.Int64
	}

	return &c, nil
}

func (r *pgCoachRepository) FindByUserID(ctx context.Context, userID int64) (*model.Coach, error) {
	query := `
		SELECT 
			c.id, 
			c.user_id, 
			c.name, 
			c.spec, 
			c.phone, 
			c.email, 
			c.class, 
			COALESCE(NULLIF(c.avatar, ''), COALESCE(u.avatar, '')), 
			COALESCE(NULLIF(c.status, ''), 'Active'),
			COALESCE(c.pay_per_session, 100000),
			c.created_at, 
			c.updated_at
		FROM coaches c
		LEFT JOIN users u ON c.user_id = u.id 
		WHERE c.user_id = $1
		LIMIT 1;
	`
	var c model.Coach
	var uid sql.NullInt64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&c.ID,
		&uid,
		&c.Name,
		&c.Spec,
		&c.Phone,
		&c.Email,
		&c.Class,
		&c.Avatar,
		&c.Status,
		&c.PayPerSession,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if uid.Valid {
		c.UserID = &uid.Int64
	}

	return &c, nil
}

func (r *pgCoachRepository) LinkUser(ctx context.Context, coachID int64, userID int64) error {
	query := `UPDATE coaches SET user_id = $1, updated_at = NOW() WHERE id = $2;`
	_, err := r.db.ExecContext(ctx, query, userID, coachID)
	return err
}

func (r *pgCoachRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM coaches WHERE id = $1;`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
