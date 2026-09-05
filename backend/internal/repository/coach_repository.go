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
	FindAll(ctx context.Context) ([]model.Coach, error)
	FindByID(ctx context.Context, id int64) (*model.Coach, error)
}

type pgCoachRepository struct {
	db *sql.DB
}

// NewCoachRepository creates a new CoachRepository
func NewCoachRepository(db *sql.DB) CoachRepository {
	return &pgCoachRepository{db: db}
}

func (r *pgCoachRepository) Create(ctx context.Context, coach *model.Coach) error {
	query := `
		INSERT INTO coaches (name, spec, phone, email, class, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id;
	`
	return r.db.QueryRowContext(
		ctx,
		query,
		coach.Name,
		coach.Spec,
		coach.Phone,
		coach.Email,
		coach.Class,
		coach.CreatedAt,
		coach.UpdatedAt,
	).Scan(&coach.ID)
}

func (r *pgCoachRepository) FindAll(ctx context.Context) ([]model.Coach, error) {
	query := `
		SELECT id, user_id, name, spec, phone, email, class, created_at, updated_at
		FROM coaches
		ORDER BY id ASC;
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
		SELECT id, user_id, name, spec, phone, email, class, created_at, updated_at
		FROM coaches
		WHERE id = $1;
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
