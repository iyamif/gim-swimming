package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
)

// AttendanceRepository handles database operations for attendances & notifications
type AttendanceRepository interface {
	Create(ctx context.Context, att *model.AttendanceRecord) error
	FindAll(ctx context.Context) ([]model.AttendanceRecord, error)
	FindByScheduleID(ctx context.Context, scheduleID string) ([]model.AttendanceRecord, error)
	FindByCoachID(ctx context.Context, coachID string) ([]model.AttendanceRecord, error)
	FindByStudentID(ctx context.Context, studentID string) ([]model.AttendanceRecord, error)
	FindByScheduleAndPerson(ctx context.Context, scheduleID, personID, personType string) (*model.AttendanceRecord, error)
	OverrideAttendance(ctx context.Context, att *model.AttendanceRecord) error
	UpdateStatus(ctx context.Context, id int64, status, notes string) error
	DeleteByPerson(ctx context.Context, personType, personID, personName string) error
	DeleteByScheduleID(ctx context.Context, scheduleID string) error

	// Notifications
	CreateNotification(ctx context.Context, notif *model.AdminNotification) error
	GetNotifications(ctx context.Context, role, name, userId string, limit int) ([]model.AdminNotification, error)
	MarkNotificationRead(ctx context.Context, id int64) error
	ClearAllNotifications(ctx context.Context, role, name, userId string) error
	HasNotification(ctx context.Context, notifType, scheduleID, targetRole, targetName string) (bool, error)
	DeleteNotificationsByScheduleID(ctx context.Context, scheduleID string) error
	DeleteNotificationsByTarget(ctx context.Context, targetRole, targetUserID, targetName string) error
}

type attendanceRepository struct {
	db *sql.DB
}

// NewAttendanceRepository creates a new AttendanceRepository instance
func NewAttendanceRepository(db *sql.DB) AttendanceRepository {
	return &attendanceRepository{db: db}
}

// Create inserts a new attendance record
func (r *attendanceRepository) Create(ctx context.Context, att *model.AttendanceRecord) error {
	query := `
		INSERT INTO attendances (
			schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
			user_id, user_role, person_type, person_id, person_name, status,
			is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, photo, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19, $20, $21, $22
		) RETURNING id, created_at
	`

	if att.CreatedAt.IsZero() {
		att.CreatedAt = time.Now()
	}

	return r.db.QueryRowContext(
		ctx,
		query,
		att.ScheduleID,
		att.ScheduleTitle,
		att.Class,
		att.Date,
		att.TimeStart,
		att.TimeEnd,
		att.PoolArea,
		att.UserID,
		att.UserRole,
		att.PersonType,
		att.PersonID,
		att.PersonName,
		att.Status,
		att.IsLate,
		att.LateReason,
		att.Latitude,
		att.Longitude,
		att.DistanceKm,
		att.IsValidLocation,
		att.Notes,
		att.Photo,
		att.CreatedAt,
	).Scan(&att.ID, &att.CreatedAt)
}

// FindAll retrieves all attendance records ordered by created_at DESC
func (r *attendanceRepository) FindAll(ctx context.Context) ([]model.AttendanceRecord, error) {
	query := `
		SELECT id, schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
		       user_id, user_role, person_type, person_id, person_name, status,
		       is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, COALESCE(photo, ''), created_at
		FROM attendances
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.AttendanceRecord
	for rows.Next() {
		var att model.AttendanceRecord
		var userId, userRole, notes, lateReason sql.NullString

		err := rows.Scan(
			&att.ID,
			&att.ScheduleID,
			&att.ScheduleTitle,
			&att.Class,
			&att.Date,
			&att.TimeStart,
			&att.TimeEnd,
			&att.PoolArea,
			&userId,
			&userRole,
			&att.PersonType,
			&att.PersonID,
			&att.PersonName,
			&att.Status,
			&att.IsLate,
			&lateReason,
			&att.Latitude,
			&att.Longitude,
			&att.DistanceKm,
			&att.IsValidLocation,
			&notes,
			&att.Photo,
			&att.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userId.Valid {
			att.UserID = userId.String
		}
		if userRole.Valid {
			att.UserRole = userRole.String
		}
		if notes.Valid {
			att.Notes = notes.String
		}
		if lateReason.Valid {
			att.LateReason = lateReason.String
		}

		records = append(records, att)
	}

	if records == nil {
		records = []model.AttendanceRecord{}
	}

	return records, nil
}

// FindByScheduleID retrieves attendances for a specific schedule
func (r *attendanceRepository) FindByScheduleID(ctx context.Context, scheduleID string) ([]model.AttendanceRecord, error) {
	query := `
		SELECT id, schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
		       user_id, user_role, person_type, person_id, person_name, status,
		       is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, COALESCE(photo, ''), created_at
		FROM attendances
		WHERE schedule_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, scheduleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.AttendanceRecord
	for rows.Next() {
		var att model.AttendanceRecord
		var userId, userRole, notes, lateReason sql.NullString

		err := rows.Scan(
			&att.ID,
			&att.ScheduleID,
			&att.ScheduleTitle,
			&att.Class,
			&att.Date,
			&att.TimeStart,
			&att.TimeEnd,
			&att.PoolArea,
			&userId,
			&userRole,
			&att.PersonType,
			&att.PersonID,
			&att.PersonName,
			&att.Status,
			&att.IsLate,
			&lateReason,
			&att.Latitude,
			&att.Longitude,
			&att.DistanceKm,
			&att.IsValidLocation,
			&notes,
			&att.Photo,
			&att.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userId.Valid {
			att.UserID = userId.String
		}
		if userRole.Valid {
			att.UserRole = userRole.String
		}
		if notes.Valid {
			att.Notes = notes.String
		}
		if lateReason.Valid {
			att.LateReason = lateReason.String
		}

		records = append(records, att)
	}

	if records == nil {
		records = []model.AttendanceRecord{}
	}

	return records, nil
}

// FindByCoachID retrieves attendances for a specific coach
func (r *attendanceRepository) FindByCoachID(ctx context.Context, coachID string) ([]model.AttendanceRecord, error) {
	query := `
		SELECT id, schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
		       user_id, user_role, person_type, person_id, person_name, status,
		       is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, COALESCE(photo, ''), created_at
		FROM attendances
		WHERE person_type = 'coach' AND (person_id = $1 OR user_id = $1)
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, coachID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.AttendanceRecord
	for rows.Next() {
		var att model.AttendanceRecord
		var userId, userRole, notes, lateReason sql.NullString

		err := rows.Scan(
			&att.ID,
			&att.ScheduleID,
			&att.ScheduleTitle,
			&att.Class,
			&att.Date,
			&att.TimeStart,
			&att.TimeEnd,
			&att.PoolArea,
			&userId,
			&userRole,
			&att.PersonType,
			&att.PersonID,
			&att.PersonName,
			&att.Status,
			&att.IsLate,
			&lateReason,
			&att.Latitude,
			&att.Longitude,
			&att.DistanceKm,
			&att.IsValidLocation,
			&notes,
			&att.Photo,
			&att.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userId.Valid {
			att.UserID = userId.String
		}
		if userRole.Valid {
			att.UserRole = userRole.String
		}
		if notes.Valid {
			att.Notes = notes.String
		}
		if lateReason.Valid {
			att.LateReason = lateReason.String
		}

		records = append(records, att)
	}

	if records == nil {
		records = []model.AttendanceRecord{}
	}

	return records, nil
}

// FindByStudentID retrieves attendances for a specific student
func (r *attendanceRepository) FindByStudentID(ctx context.Context, studentID string) ([]model.AttendanceRecord, error) {
	query := `
		SELECT id, schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
		       user_id, user_role, person_type, person_id, person_name, status,
		       is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, COALESCE(photo, ''), created_at
		FROM attendances
		WHERE person_type = 'student' AND (person_id = $1 OR user_id = $1)
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []model.AttendanceRecord
	for rows.Next() {
		var att model.AttendanceRecord
		var userId, userRole, notes, lateReason sql.NullString

		err := rows.Scan(
			&att.ID,
			&att.ScheduleID,
			&att.ScheduleTitle,
			&att.Class,
			&att.Date,
			&att.TimeStart,
			&att.TimeEnd,
			&att.PoolArea,
			&userId,
			&userRole,
			&att.PersonType,
			&att.PersonID,
			&att.PersonName,
			&att.Status,
			&att.IsLate,
			&lateReason,
			&att.Latitude,
			&att.Longitude,
			&att.DistanceKm,
			&att.IsValidLocation,
			&notes,
			&att.Photo,
			&att.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userId.Valid {
			att.UserID = userId.String
		}
		if userRole.Valid {
			att.UserRole = userRole.String
		}
		if notes.Valid {
			att.Notes = notes.String
		}
		if lateReason.Valid {
			att.LateReason = lateReason.String
		}

		records = append(records, att)
	}

	if records == nil {
		records = []model.AttendanceRecord{}
	}

	return records, nil
}

// CreateNotification inserts a notification for admin, coach, or student
func (r *attendanceRepository) CreateNotification(ctx context.Context, notif *model.AdminNotification) error {
	query := `
		INSERT INTO notifications (title, message, type, target_role, target_user_id, target_name, schedule_id, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`

	if notif.CreatedAt.IsZero() {
		notif.CreatedAt = time.Now()
	}

	return r.db.QueryRowContext(
		ctx,
		query,
		notif.Title,
		notif.Message,
		notif.Type,
		notif.TargetRole,
		notif.TargetUserID,
		notif.TargetName,
		notif.ScheduleID,
		notif.IsRead,
		notif.CreatedAt,
	).Scan(&notif.ID, &notif.CreatedAt)
}

// GetNotifications returns recent notifications filtered by target role and target name/user
func (r *attendanceRepository) GetNotifications(ctx context.Context, role, name, userId string, limit int) ([]model.AdminNotification, error) {
	if limit <= 0 {
		limit = 40
	}

	normalizedRole := strings.ToLower(strings.TrimSpace(role))
	normalizedName := strings.ToLower(strings.TrimSpace(name))
	trimmedUserId := strings.TrimSpace(userId)

	var query string
	var rows *sql.Rows
	var err error

	if normalizedRole == "admin" || (normalizedRole == "" && normalizedName == "" && trimmedUserId == "") {
		// Admin gets notifications targeted to admin or general broadcast,
		// but NOT schedule notifications meant for coaches or students.
		query = `
			SELECT id, title, message, type, COALESCE(target_role, ''), COALESCE(target_user_id, ''), COALESCE(target_name, ''), COALESCE(schedule_id, ''), is_read, created_at
			FROM notifications
			WHERE (target_role = 'admin' OR target_role = 'all' OR target_role = '')
			  AND type NOT IN ('schedule_coach', 'schedule_student', 'schedule_admin')
			ORDER BY created_at DESC
			LIMIT $1
		`
		rows, err = r.db.QueryContext(ctx, query, limit)
	} else if normalizedRole == "pelatih" {
		// Pelatih gets notifications specifically for them or broadcast
		query = `
			SELECT id, title, message, type, COALESCE(target_role, ''), COALESCE(target_user_id, ''), COALESCE(target_name, ''), COALESCE(schedule_id, ''), is_read, created_at
			FROM notifications
			WHERE (
				(target_role = 'pelatih' AND (
					target_name = '' 
					OR ($2 <> '' AND (LOWER(target_name) LIKE '%' || $2 || '%' OR $2 LIKE '%' || LOWER(target_name) || '%'))
					OR ($3 <> '' AND target_user_id = $3)
				))
				OR (target_role = 'all' AND target_name = '')
				OR (target_role = '' AND type IN ('attendance_coach', 'schedule_coach', 'system'))
			)
			ORDER BY created_at DESC
			LIMIT $1
		`
		rows, err = r.db.QueryContext(ctx, query, limit, normalizedName, trimmedUserId)
	} else {
		// Orang tua / Student gets notifications specifically for them or broadcast
		query = `
			SELECT id, title, message, type, COALESCE(target_role, ''), COALESCE(target_user_id, ''), COALESCE(target_name, ''), COALESCE(schedule_id, ''), is_read, created_at
			FROM notifications
			WHERE (
				(target_role IN ('orang tua', 'student') AND (
					target_name = '' 
					OR ($2 <> '' AND (LOWER(target_name) LIKE '%' || $2 || '%' OR $2 LIKE '%' || LOWER(target_name) || '%'))
					OR ($3 <> '' AND target_user_id = $3)
				))
				OR (target_role = 'all' AND target_name = '')
				OR (target_role = '' AND type IN ('attendance_student', 'schedule_student', 'system'))
			)
			ORDER BY created_at DESC
			LIMIT $1
		`
		rows, err = r.db.QueryContext(ctx, query, limit, normalizedName, trimmedUserId)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []model.AdminNotification
	for rows.Next() {
		var n model.AdminNotification
		if err := rows.Scan(&n.ID, &n.Title, &n.Message, &n.Type, &n.TargetRole, &n.TargetUserID, &n.TargetName, &n.ScheduleID, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifs = append(notifs, n)
	}

	if notifs == nil {
		notifs = []model.AdminNotification{}
	}

	return notifs, nil
}

// MarkNotificationRead updates notification read status
func (r *attendanceRepository) MarkNotificationRead(ctx context.Context, id int64) error {
	query := `UPDATE notifications SET is_read = true WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// ClearAllNotifications deletes notifications based on role/scope
func (r *attendanceRepository) ClearAllNotifications(ctx context.Context, role, name, userId string) error {
	normalizedRole := strings.ToLower(strings.TrimSpace(role))
	normalizedName := strings.ToLower(strings.TrimSpace(name))
	trimmedUserId := strings.TrimSpace(userId)

	if normalizedRole == "admin" || (normalizedRole == "" && normalizedName == "" && trimmedUserId == "") {
		query := `DELETE FROM notifications WHERE target_role = 'admin' OR target_role = 'all' OR target_role = '' OR target_role IS NULL`
		_, err := r.db.ExecContext(ctx, query)
		return err
	}

	if normalizedRole == "pelatih" {
		query := `
			DELETE FROM notifications
			WHERE (
				target_role = 'pelatih' AND (
					target_name = '' 
					OR ($1 <> '' AND (LOWER(target_name) LIKE '%' || $1 || '%' OR $1 LIKE '%' || LOWER(target_name) || '%'))
					OR ($2 <> '' AND target_user_id = $2)
				)
			)
			OR target_role = 'all'
			OR (target_role = '' AND type IN ('attendance_coach', 'schedule_coach', 'system'))
		`
		_, err := r.db.ExecContext(ctx, query, normalizedName, trimmedUserId)
		return err
	}

	query := `
		DELETE FROM notifications
		WHERE (
			target_role IN ('orang tua', 'student') AND (
				target_name = '' 
				OR ($1 <> '' AND (LOWER(target_name) LIKE '%' || $1 || '%' OR $1 LIKE '%' || LOWER(target_name) || '%' OR (LOWER(target_name) = 'rian' AND $1 = 'ortu')))
				OR ($2 <> '' AND target_user_id = $2)
			)
		)
		OR target_role = 'all'
		OR (target_role = '' AND type IN ('attendance_student', 'schedule_student', 'system'))
	`
	_, err := r.db.ExecContext(ctx, query, normalizedName, trimmedUserId)
	return err
}

// HasNotification checks if a notification of a given type and schedule already exists for role/target
func (r *attendanceRepository) HasNotification(ctx context.Context, notifType, scheduleID, targetRole, targetName string) (bool, error) {
	var count int
	var err error
	if targetName != "" {
		query := `SELECT COUNT(*) FROM notifications WHERE type = $1 AND schedule_id = $2 AND target_role = $3 AND target_name = $4`
		err = r.db.QueryRowContext(ctx, query, notifType, scheduleID, targetRole, targetName).Scan(&count)
	} else if targetRole != "" {
		query := `SELECT COUNT(*) FROM notifications WHERE type = $1 AND schedule_id = $2 AND target_role = $3`
		err = r.db.QueryRowContext(ctx, query, notifType, scheduleID, targetRole).Scan(&count)
	} else {
		query := `SELECT COUNT(*) FROM notifications WHERE type = $1 AND schedule_id = $2`
		err = r.db.QueryRowContext(ctx, query, notifType, scheduleID).Scan(&count)
	}

	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// FindByScheduleAndPerson looks up an existing attendance record for a person in a specific schedule
func (r *attendanceRepository) FindByScheduleAndPerson(ctx context.Context, scheduleID, personID, personType string) (*model.AttendanceRecord, error) {
	query := `
		SELECT id, schedule_id, schedule_title, class, date, time_start, time_end, pool_area,
		       user_id, user_role, person_type, person_id, person_name, status,
		       is_late, late_reason, latitude, longitude, distance_km, is_valid_location, notes, COALESCE(photo, ''), created_at
		FROM attendances
		WHERE schedule_id = $1 AND person_id = $2 AND person_type = $3
		ORDER BY id DESC LIMIT 1;
	`
	var att model.AttendanceRecord
	var userID, userRole, lateReason, notes sql.NullString
	err := r.db.QueryRowContext(ctx, query, scheduleID, personID, personType).Scan(
		&att.ID,
		&att.ScheduleID,
		&att.ScheduleTitle,
		&att.Class,
		&att.Date,
		&att.TimeStart,
		&att.TimeEnd,
		&att.PoolArea,
		&userID,
		&userRole,
		&att.PersonType,
		&att.PersonID,
		&att.PersonName,
		&att.Status,
		&att.IsLate,
		&lateReason,
		&att.Latitude,
		&att.Longitude,
		&att.DistanceKm,
		&att.IsValidLocation,
		&notes,
		&att.Photo,
		&att.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if userID.Valid {
		att.UserID = userID.String
	}
	if userRole.Valid {
		att.UserRole = userRole.String
	}
	if lateReason.Valid {
		att.LateReason = lateReason.String
	}
	if notes.Valid {
		att.Notes = notes.String
	}
	return &att, nil
}

// OverrideAttendance creates or updates attendance status manually by admin
func (r *attendanceRepository) OverrideAttendance(ctx context.Context, att *model.AttendanceRecord) error {
	existing, err := r.FindByScheduleAndPerson(ctx, att.ScheduleID, att.PersonID, att.PersonType)
	if err == nil && existing != nil {
		query := `
			UPDATE attendances
			SET status = $1, notes = $2, is_valid_location = true,
			    photo = CASE WHEN $3 <> '' THEN $3 ELSE photo END,
			    created_at = NOW()
			WHERE id = $4;
		`
		_, err := r.db.ExecContext(ctx, query, att.Status, att.Notes, att.Photo, existing.ID)
		att.ID = existing.ID
		return err
	}

	// If no existing record, create new one
	return r.Create(ctx, att)
}

// UpdateStatus updates the status and notes of a specific attendance record by ID
func (r *attendanceRepository) UpdateStatus(ctx context.Context, id int64, status, notes string) error {
	query := `
		UPDATE attendances
		SET status = $1, notes = $2
		WHERE id = $3;
	`
	_, err := r.db.ExecContext(ctx, query, status, notes, id)
	return err
}

// DeleteByPerson removes attendance records for a specific person (student or coach)
func (r *attendanceRepository) DeleteByPerson(ctx context.Context, personType, personID, personName string) error {
	query := `
		DELETE FROM attendances
		WHERE (person_type = $1 OR $1 = '')
		  AND (person_id = $2 OR LOWER(person_name) = LOWER($3));
	`
	_, err := r.db.ExecContext(ctx, query, personType, personID, personName)
	return err
}

// DeleteByScheduleID removes all attendance records for a given schedule
func (r *attendanceRepository) DeleteByScheduleID(ctx context.Context, scheduleID string) error {
	altID := strings.TrimPrefix(scheduleID, "sch-")
	query := `DELETE FROM attendances WHERE schedule_id = $1 OR schedule_id = $2;`
	_, err := r.db.ExecContext(ctx, query, scheduleID, altID)
	return err
}

// DeleteNotificationsByScheduleID removes notifications related to a schedule
func (r *attendanceRepository) DeleteNotificationsByScheduleID(ctx context.Context, scheduleID string) error {
	altID := strings.TrimPrefix(scheduleID, "sch-")
	query := `DELETE FROM notifications WHERE schedule_id = $1 OR schedule_id = $2;`
	_, err := r.db.ExecContext(ctx, query, scheduleID, altID)
	return err
}

// DeleteNotificationsByTarget removes notifications targeting a user role/id/name
func (r *attendanceRepository) DeleteNotificationsByTarget(ctx context.Context, targetRole, targetUserID, targetName string) error {
	query := `
		DELETE FROM notifications
		WHERE (target_role = $1 OR $1 = '')
		  AND (target_user_id = $2 OR LOWER(target_name) = LOWER($3));
	`
	_, err := r.db.ExecContext(ctx, query, targetRole, targetUserID, targetName)
	return err
}


