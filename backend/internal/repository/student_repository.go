package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/iyamif/gim-swimming/internal/model"
)

// StudentRepository defines interface for student operations
type StudentRepository interface {
	Create(ctx context.Context, student *model.Student) error
	FindAll(ctx context.Context) ([]model.Student, error)
	FindByID(ctx context.Context, id int64) (*model.Student, error)
	GetLogsByStudentID(ctx context.Context, studentID int64) ([]model.AttendanceLog, error)
	AddAttendanceLog(ctx context.Context, log *model.AttendanceLog) error
	UpdateAttendanceRate(ctx context.Context, studentID int64, rate string) error
}

type pgStudentRepository struct {
	db *sql.DB
}

// NewStudentRepository creates a new StudentRepository
func NewStudentRepository(db *sql.DB) StudentRepository {
	return &pgStudentRepository{db: db}
}

func (r *pgStudentRepository) Create(ctx context.Context, student *model.Student) error {
	query := `
		INSERT INTO students (name, class, attendance_rate, parent, phone, age, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id;
	`
	return r.db.QueryRowContext(
		ctx,
		query,
		student.Name,
		student.Class,
		student.AttendanceRate,
		student.Parent,
		student.Phone,
		student.Age,
		student.Status,
		student.CreatedAt,
		student.UpdatedAt,
	).Scan(&student.ID)
}

func (r *pgStudentRepository) FindAll(ctx context.Context) ([]model.Student, error) {
	query := `
		SELECT id, name, class, attendance_rate, parent, COALESCE(phone, ''), COALESCE(age, ''), status, created_at, updated_at
		FROM students
		ORDER BY id ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []model.Student
	for rows.Next() {
		var s model.Student
		err := rows.Scan(
			&s.ID,
			&s.Name,
			&s.Class,
			&s.AttendanceRate,
			&s.Parent,
			&s.Phone,
			&s.Age,
			&s.Status,
			&s.CreatedAt,
			&s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Fetch attendance logs for each student
		logs, err := r.GetLogsByStudentID(ctx, s.ID)
		if err != nil {
			s.Logs = []model.AttendanceLog{}
		} else {
			s.Logs = logs
		}

		students = append(students, s)
	}

	return students, nil
}

func (r *pgStudentRepository) FindByID(ctx context.Context, id int64) (*model.Student, error) {
	query := `
		SELECT id, name, class, attendance_rate, parent, COALESCE(phone, ''), COALESCE(age, ''), status, created_at, updated_at
		FROM students
		WHERE id = $1;
	`
	var s model.Student
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID,
		&s.Name,
		&s.Class,
		&s.AttendanceRate,
		&s.Parent,
		&s.Phone,
		&s.Age,
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

	logs, _ := r.GetLogsByStudentID(ctx, s.ID)
	if logs != nil {
		s.Logs = logs
	} else {
		s.Logs = []model.AttendanceLog{}
	}

	return &s, nil
}

func (r *pgStudentRepository) GetLogsByStudentID(ctx context.Context, studentID int64) ([]model.AttendanceLog, error) {
	query := `
		SELECT id, student_id, date, status, created_at
		FROM attendance_logs
		WHERE student_id = $1
		ORDER BY id DESC;
	`
	rows, err := r.db.QueryContext(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []model.AttendanceLog
	for rows.Next() {
		var l model.AttendanceLog
		if err := rows.Scan(&l.ID, &l.StudentID, &l.Date, &l.Status, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}

	return logs, nil
}

func (r *pgStudentRepository) AddAttendanceLog(ctx context.Context, log *model.AttendanceLog) error {
	query := `
		INSERT INTO attendance_logs (student_id, date, status, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id;
	`
	return r.db.QueryRowContext(ctx, query, log.StudentID, log.Date, log.Status, log.CreatedAt).Scan(&log.ID)
}

func (r *pgStudentRepository) UpdateAttendanceRate(ctx context.Context, studentID int64, rate string) error {
	query := `
		UPDATE students
		SET attendance_rate = $1, updated_at = NOW()
		WHERE id = $2;
	`
	_, err := r.db.ExecContext(ctx, query, rate, studentID)
	return err
}
