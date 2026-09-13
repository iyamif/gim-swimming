package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/iyamif/gim-swimming/internal/model"
)

// ClassProgramRepository defines database operations for class programs
type ClassProgramRepository interface {
	Create(ctx context.Context, prog *model.ClassProgram) error
	FindAll(ctx context.Context) ([]model.ClassProgram, error)
	FindByID(ctx context.Context, id string) (*model.ClassProgram, error)
	Update(ctx context.Context, id string, input *model.UpdateClassProgramInput) (*model.ClassProgram, error)
	Delete(ctx context.Context, id string) error
}

type pgClassProgramRepository struct {
	db *sql.DB
}

// NewClassProgramRepository creates a new ClassProgramRepository
func NewClassProgramRepository(db *sql.DB) ClassProgramRepository {
	return &pgClassProgramRepository{db: db}
}

func parseClassProgramID(id string) (int64, error) {
	id = strings.TrimPrefix(id, "prog_")
	id = strings.TrimPrefix(id, "class_")
	id = strings.TrimPrefix(id, "prog")
	return strconv.ParseInt(id, 10, 64)
}

func (r *pgClassProgramRepository) Create(ctx context.Context, prog *model.ClassProgram) error {
	query := `
		INSERT INTO class_programs (name, description, monthly_fee, sessions_per_week, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, created_at, updated_at;
	`
	var id int64
	sessions := prog.SessionsPerWeek
	if sessions <= 0 {
		sessions = 2
	}
	err := r.db.QueryRowContext(
		ctx,
		query,
		prog.Name,
		prog.Description,
		prog.MonthlyFee,
		sessions,
	).Scan(&id, &prog.CreatedAt, &prog.UpdatedAt)
	if err != nil {
		return err
	}

	prog.ID = fmt.Sprintf("prog_%d", id)
	prog.SessionsPerWeek = sessions
	return nil
}

func (r *pgClassProgramRepository) FindAll(ctx context.Context) ([]model.ClassProgram, error) {
	query := `
		SELECT id, name, description, monthly_fee, sessions_per_week, created_at, updated_at
		FROM class_programs
		ORDER BY id ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.ClassProgram
	for rows.Next() {
		var p model.ClassProgram
		var rawID int64
		var desc sql.NullString
		err := rows.Scan(
			&rawID,
			&p.Name,
			&desc,
			&p.MonthlyFee,
			&p.SessionsPerWeek,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		p.ID = fmt.Sprintf("prog_%d", rawID)
		if desc.Valid {
			p.Description = desc.String
		}
		list = append(list, p)
	}

	return list, nil
}

func (r *pgClassProgramRepository) FindByID(ctx context.Context, id string) (*model.ClassProgram, error) {
	rawID, err := parseClassProgramID(id)
	if err != nil {
		return nil, errors.New("invalid class program id")
	}

	query := `
		SELECT id, name, description, monthly_fee, sessions_per_week, created_at, updated_at
		FROM class_programs
		WHERE id = $1;
	`
	var p model.ClassProgram
	var desc sql.NullString
	err = r.db.QueryRowContext(ctx, query, rawID).Scan(
		&rawID,
		&p.Name,
		&desc,
		&p.MonthlyFee,
		&p.SessionsPerWeek,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	p.ID = fmt.Sprintf("prog_%d", rawID)
	if desc.Valid {
		p.Description = desc.String
	}
	return &p, nil
}

func (r *pgClassProgramRepository) Update(ctx context.Context, id string, input *model.UpdateClassProgramInput) (*model.ClassProgram, error) {
	rawID, err := parseClassProgramID(id)
	if err != nil {
		return nil, errors.New("invalid class program id")
	}

	existing, err := r.FindByID(ctx, id)
	if err != nil || existing == nil {
		return nil, errors.New("class program not found")
	}

	name := existing.Name
	if input.Name != "" {
		name = input.Name
	}
	desc := existing.Description
	if input.Description != "" {
		desc = input.Description
	}
	fee := existing.MonthlyFee
	if input.MonthlyFee > 0 {
		fee = input.MonthlyFee
	}
	sessions := existing.SessionsPerWeek
	if input.SessionsPerWeek > 0 {
		sessions = input.SessionsPerWeek
	}

	query := `
		UPDATE class_programs
		SET name = $1, description = $2, monthly_fee = $3, sessions_per_week = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at;
	`
	err = r.db.QueryRowContext(ctx, query, name, desc, fee, sessions, rawID).Scan(&existing.UpdatedAt)
	if err != nil {
		return nil, err
	}

	existing.Name = name
	existing.Description = desc
	existing.MonthlyFee = fee
	existing.SessionsPerWeek = sessions
	return existing, nil
}

func (r *pgClassProgramRepository) Delete(ctx context.Context, id string) error {
	rawID, err := parseClassProgramID(id)
	if err != nil {
		return errors.New("invalid class program id")
	}

	query := `DELETE FROM class_programs WHERE id = $1;`
	_, err = r.db.ExecContext(ctx, query, rawID)
	return err
}
