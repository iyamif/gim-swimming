package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/iyamif/gim-swimming/internal/model"
)

// ScheduleRepository defines interface for schedule operations
type ScheduleRepository interface {
	Create(ctx context.Context, s *model.ScheduleSession) error
	FindAll(ctx context.Context) ([]model.ScheduleSession, error)
	FindByID(ctx context.Context, id string) (*model.ScheduleSession, error)
	Delete(ctx context.Context, id string) error
}

type pgScheduleRepository struct {
	db *sql.DB
}

// NewScheduleRepository creates a new ScheduleRepository
func NewScheduleRepository(db *sql.DB) ScheduleRepository {
	return &pgScheduleRepository{db: db}
}

func (r *pgScheduleRepository) Create(ctx context.Context, s *model.ScheduleSession) error {
	studentIDsJSON, _ := json.Marshal(s.StudentIDs)
	studentNamesJSON, _ := json.Marshal(s.StudentNames)

	query := `
		INSERT INTO schedules (
			title, class, date, time_start, time_end, pool_area, 
			coach_id, coach_name, coach_phone, student_ids, student_names, 
			notes, status, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id;
	`

	var id int64
	err := r.db.QueryRowContext(
		ctx,
		query,
		s.Title,
		s.Class,
		s.Date,
		s.TimeStart,
		s.TimeEnd,
		s.PoolArea,
		s.CoachID,
		s.CoachName,
		s.CoachPhone,
		string(studentIDsJSON),
		string(studentNamesJSON),
		s.Notes,
		s.Status,
		s.CreatedAt,
		s.UpdatedAt,
	).Scan(&id)

	if err != nil {
		return err
	}

	s.ID = fmt.Sprintf("sch-%d", id)
	return nil
}

func (r *pgScheduleRepository) FindAll(ctx context.Context) ([]model.ScheduleSession, error) {
	query := `
		SELECT 
			id, title, class, date, time_start, time_end, pool_area, 
			coach_id, coach_name, COALESCE(coach_phone, ''), 
			COALESCE(student_ids, '[]'), COALESCE(student_names, '[]'), 
			COALESCE(notes, ''), status, created_at, updated_at
		FROM schedules
		ORDER BY date ASC, time_start ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.ScheduleSession
	for rows.Next() {
		var s model.ScheduleSession
		var rawID int64
		var studentIDsStr, studentNamesStr string

		err := rows.Scan(
			&rawID,
			&s.Title,
			&s.Class,
			&s.Date,
			&s.TimeStart,
			&s.TimeEnd,
			&s.PoolArea,
			&s.CoachID,
			&s.CoachName,
			&s.CoachPhone,
			&studentIDsStr,
			&studentNamesStr,
			&s.Notes,
			&s.Status,
			&s.CreatedAt,
			&s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		s.ID = fmt.Sprintf("sch-%d", rawID)

		// Parse JSON strings
		_ = json.Unmarshal([]byte(studentIDsStr), &s.StudentIDs)
		_ = json.Unmarshal([]byte(studentNamesStr), &s.StudentNames)
		if s.StudentIDs == nil {
			s.StudentIDs = []string{}
		}
		if s.StudentNames == nil {
			s.StudentNames = []string{}
		}

		list = append(list, s)
	}

	return list, nil
}

func (r *pgScheduleRepository) FindByID(ctx context.Context, id string) (*model.ScheduleSession, error) {
	var rawID int64
	_, err := fmt.Sscanf(id, "sch-%d", &rawID)
	if err != nil {
		_, err = fmt.Sscanf(id, "%d", &rawID)
		if err != nil {
			return nil, errors.New("invalid schedule id")
		}
	}

	query := `
		SELECT 
			id, title, class, date, time_start, time_end, pool_area, 
			coach_id, coach_name, COALESCE(coach_phone, ''), 
			COALESCE(student_ids, '[]'), COALESCE(student_names, '[]'), 
			COALESCE(notes, ''), status, created_at, updated_at
		FROM schedules
		WHERE id = $1;
	`

	var s model.ScheduleSession
	var studentIDsStr, studentNamesStr string

	err = r.db.QueryRowContext(ctx, query, rawID).Scan(
		&rawID,
		&s.Title,
		&s.Class,
		&s.Date,
		&s.TimeStart,
		&s.TimeEnd,
		&s.PoolArea,
		&s.CoachID,
		&s.CoachName,
		&s.CoachPhone,
		&studentIDsStr,
		&studentNamesStr,
		&s.Notes,
		&s.Status,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	s.ID = fmt.Sprintf("sch-%d", rawID)
	_ = json.Unmarshal([]byte(studentIDsStr), &s.StudentIDs)
	_ = json.Unmarshal([]byte(studentNamesStr), &s.StudentNames)
	if s.StudentIDs == nil {
		s.StudentIDs = []string{}
	}
	if s.StudentNames == nil {
		s.StudentNames = []string{}
	}

	return &s, nil
}

func (r *pgScheduleRepository) Delete(ctx context.Context, id string) error {
	var rawID int64
	_, err := fmt.Sscanf(id, "sch-%d", &rawID)
	if err != nil {
		_, err = fmt.Sscanf(id, "%d", &rawID)
		if err != nil {
			return errors.New("invalid schedule id format")
		}
	}

	query := `DELETE FROM schedules WHERE id = $1;`
	_, err = r.db.ExecContext(ctx, query, rawID)
	return err
}
