package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
)

// PushRepository handles database operations for Web Push subscriptions
type PushRepository interface {
	Upsert(ctx context.Context, sub *model.PushSubscriptionRecord) error
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	DeleteByID(ctx context.Context, id int64) error
	ClearFCMToken(ctx context.Context, id int64) error
	FindAll(ctx context.Context) ([]model.PushSubscriptionRecord, error)
	FindForCoach(ctx context.Context, coachName, coachID string) ([]model.PushSubscriptionRecord, error)
	FindForStudents(ctx context.Context, studentNames, studentIDs []string) ([]model.PushSubscriptionRecord, error)
	FindForAdmin(ctx context.Context) ([]model.PushSubscriptionRecord, error)
	FindForUser(ctx context.Context, role, username, studentName, userID string) ([]model.PushSubscriptionRecord, error)
	GetUnreadNotificationCount(ctx context.Context, role, name, userId string) (int, error)
}

type pushRepository struct {
	db *sql.DB
}

// NewPushRepository creates a new PushRepository instance
func NewPushRepository(db *sql.DB) PushRepository {
	return &pushRepository{db: db}
}

// Upsert inserts or updates a browser push subscription by endpoint
func (r *pushRepository) Upsert(ctx context.Context, sub *model.PushSubscriptionRecord) error {
	query := `
		INSERT INTO push_subscriptions (user_id, role, username, student_name, endpoint, p256dh, auth, fcm_token, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (endpoint) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			role = EXCLUDED.role,
			username = EXCLUDED.username,
			student_name = EXCLUDED.student_name,
			p256dh = EXCLUDED.p256dh,
			auth = EXCLUDED.auth,
			fcm_token = CASE WHEN EXCLUDED.fcm_token <> '' THEN EXCLUDED.fcm_token ELSE push_subscriptions.fcm_token END,
			updated_at = EXCLUDED.updated_at
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	if sub.CreatedAt.IsZero() {
		sub.CreatedAt = now
	}
	sub.UpdatedAt = now

	return r.db.QueryRowContext(
		ctx,
		query,
		sub.UserID,
		sub.Role,
		sub.Username,
		sub.StudentName,
		sub.Endpoint,
		sub.P256dh,
		sub.Auth,
		sub.FCMToken,
		sub.CreatedAt,
		sub.UpdatedAt,
	).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
}

// DeleteByEndpoint removes a push subscription when unsubscribed or expired
func (r *pushRepository) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	query := `DELETE FROM push_subscriptions WHERE endpoint = $1`
	_, err := r.db.ExecContext(ctx, query, endpoint)
	return err
}

// DeleteByID removes a push subscription record by its primary key
func (r *pushRepository) DeleteByID(ctx context.Context, id int64) error {
	query := `DELETE FROM push_subscriptions WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// ClearFCMToken clears an invalid or expired FCM token from a push subscription record
func (r *pushRepository) ClearFCMToken(ctx context.Context, id int64) error {
	query := `UPDATE push_subscriptions SET fcm_token = '', updated_at = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	return err
}

// FindAll returns all push subscriptions
func (r *pushRepository) FindAll(ctx context.Context) ([]model.PushSubscriptionRecord, error) {
	query := `
		SELECT id, user_id, role, username, student_name, endpoint, p256dh, auth, COALESCE(fcm_token, ''), created_at, updated_at
		FROM push_subscriptions
		ORDER BY updated_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRows(rows)
}

// FindForCoach finds subscriptions for a specific coach
func (r *pushRepository) FindForCoach(ctx context.Context, coachName, coachID string) ([]model.PushSubscriptionRecord, error) {
	normName := strings.ToLower(strings.TrimSpace(coachName))
	cleanName := strings.TrimSpace(strings.ReplaceAll(normName, "coach ", ""))
	cleanName = strings.TrimSpace(strings.ReplaceAll(cleanName, "pelatih ", ""))
	trimmedID := strings.TrimSpace(coachID)

	query := `
		SELECT id, user_id, role, username, student_name, endpoint, p256dh, auth, COALESCE(fcm_token, ''), created_at, updated_at
		FROM push_subscriptions
		WHERE LOWER(role) IN ('pelatih', 'coach')
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	allSubs, err := r.scanRows(rows)
	if err != nil {
		return nil, err
	}

	nameWords := strings.Fields(cleanName)

	var matched []model.PushSubscriptionRecord
	for _, sub := range allSubs {
		subNormUser := strings.ToLower(strings.TrimSpace(sub.Username))
		subNormStudent := strings.ToLower(strings.TrimSpace(sub.StudentName))
		subUserID := strings.TrimSpace(sub.UserID)

		// 1. Direct ID match
		if trimmedID != "" && subUserID == trimmedID {
			matched = append(matched, sub)
			continue
		}

		// 2. Direct name or clean name match
		if cleanName != "" && (subNormUser == cleanName || subNormStudent == cleanName ||
			strings.Contains(cleanName, subNormUser) || strings.Contains(subNormUser, cleanName) ||
			strings.Contains(cleanName, subNormStudent) || strings.Contains(subNormStudent, cleanName)) {
			matched = append(matched, sub)
			continue
		}

		// 3. Word token match (e.g. "Coach Adi" matching "adi")
		isTokenMatch := false
		for _, w := range nameWords {
			if len(w) >= 2 && (subNormUser == w || subNormStudent == w || strings.Contains(subNormUser, w) || strings.Contains(w, subNormUser)) {
				isTokenMatch = true
				break
			}
		}

		if isTokenMatch {
			matched = append(matched, sub)
		}
	}

	return matched, nil
}

// FindForStudents finds subscriptions for specified students or their parents
func (r *pushRepository) FindForStudents(ctx context.Context, studentNames, studentIDs []string) ([]model.PushSubscriptionRecord, error) {
	if len(studentNames) == 0 && len(studentIDs) == 0 {
		return []model.PushSubscriptionRecord{}, nil
	}

	query := `
		SELECT id, user_id, role, username, student_name, endpoint, p256dh, auth, COALESCE(fcm_token, ''), created_at, updated_at
		FROM push_subscriptions
		WHERE role IN ('orang tua', 'student')
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	allSubs, err := r.scanRows(rows)
	if err != nil {
		return nil, err
	}

	// Filter matches by student name or student ID
	var matched []model.PushSubscriptionRecord
	for _, sub := range allSubs {
		subNormUser := strings.ToLower(strings.TrimSpace(sub.Username))
		subNormStudent := strings.ToLower(strings.TrimSpace(sub.StudentName))
		subUserID := strings.TrimSpace(sub.UserID)

		isMatch := false

		for _, name := range studentNames {
			normTarget := strings.ToLower(strings.TrimSpace(name))
			if normTarget == "" {
				continue
			}
			if strings.Contains(subNormStudent, normTarget) || strings.Contains(normTarget, subNormStudent) ||
				strings.Contains(subNormUser, normTarget) || strings.Contains(normTarget, subNormUser) {
				isMatch = true
				break
			}
		}

		if !isMatch {
			for _, id := range studentIDs {
				trimmedTargetID := strings.TrimSpace(id)
				if trimmedTargetID != "" && subUserID == trimmedTargetID {
					isMatch = true
					break
				}
			}
		}

		if isMatch {
			matched = append(matched, sub)
		}
	}

	return matched, nil
}

// FindForAdmin finds subscriptions for all admins
func (r *pushRepository) FindForAdmin(ctx context.Context) ([]model.PushSubscriptionRecord, error) {
	query := `
		SELECT id, user_id, role, username, student_name, endpoint, p256dh, auth, COALESCE(fcm_token, ''), created_at, updated_at
		FROM push_subscriptions
		WHERE role = 'admin'
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRows(rows)
}

// FindForUser finds subscriptions matching user params (for test push or single-user push)
func (r *pushRepository) FindForUser(ctx context.Context, role, username, studentName, userID string) ([]model.PushSubscriptionRecord, error) {
	normRole := strings.ToLower(strings.TrimSpace(role))
	normUsername := strings.ToLower(strings.TrimSpace(username))
	normStudent := strings.ToLower(strings.TrimSpace(studentName))
	trimmedUserID := strings.TrimSpace(userID)

	query := `
		SELECT id, user_id, role, username, student_name, endpoint, p256dh, auth, COALESCE(fcm_token, ''), created_at, updated_at
		FROM push_subscriptions
		WHERE (
			($1 <> '' AND LOWER(role) = $1)
			OR ($2 <> '' AND (LOWER(username) = $2 OR LOWER(student_name) = $2))
			OR ($3 <> '' AND (LOWER(student_name) = $3 OR LOWER(username) = $3))
			OR ($4 <> '' AND user_id = $4)
		)
	`
	rows, err := r.db.QueryContext(ctx, query, normRole, normUsername, normStudent, trimmedUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRows(rows)
}

// GetUnreadNotificationCount calculates the number of unread notifications for a recipient
func (r *pushRepository) GetUnreadNotificationCount(ctx context.Context, role, name, userId string) (int, error) {
	normalizedRole := strings.ToLower(strings.TrimSpace(role))
	normalizedName := strings.ToLower(strings.TrimSpace(name))
	trimmedUserId := strings.TrimSpace(userId)

	var count int
	var err error

	if normalizedRole == "admin" || (normalizedRole == "" && normalizedName == "" && trimmedUserId == "") {
		query := `
			SELECT COUNT(*)
			FROM notifications
			WHERE is_read = false
			  AND (target_role = 'admin' OR target_role = 'all' OR target_role = '')
			  AND type NOT IN ('schedule_coach', 'schedule_student', 'schedule_admin')
		`
		err = r.db.QueryRowContext(ctx, query).Scan(&count)
	} else if normalizedRole == "pelatih" {
		query := `
			SELECT COUNT(*)
			FROM notifications
			WHERE is_read = false
			  AND (
				(target_role = 'pelatih' AND (
					target_name = '' 
					OR ($1 <> '' AND (LOWER(target_name) LIKE '%' || $1 || '%' OR $1 LIKE '%' || LOWER(target_name) || '%'))
					OR ($2 <> '' AND target_user_id = $2)
				))
				OR (target_role = 'all' AND target_name = '')
				OR (target_role = '' AND type IN ('attendance_coach', 'schedule_coach', 'system'))
			  )
		`
		err = r.db.QueryRowContext(ctx, query, normalizedName, trimmedUserId).Scan(&count)
	} else {
		query := `
			SELECT COUNT(*)
			FROM notifications
			WHERE is_read = false
			  AND (
				(target_role IN ('orang tua', 'student') AND (
					target_name = '' 
					OR ($1 <> '' AND (LOWER(target_name) LIKE '%' || $1 || '%' OR $1 LIKE '%' || LOWER(target_name) || '%'))
					OR ($2 <> '' AND target_user_id = $2)
				))
				OR (target_role = 'all' AND target_name = '')
				OR (target_role = '' AND type IN ('attendance_student', 'schedule_student', 'system'))
			  )
		`
		err = r.db.QueryRowContext(ctx, query, normalizedName, trimmedUserId).Scan(&count)
	}

	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *pushRepository) scanRows(rows *sql.Rows) ([]model.PushSubscriptionRecord, error) {
	var results []model.PushSubscriptionRecord
	for rows.Next() {
		var s model.PushSubscriptionRecord
		var userID, role, username, studentName, fcmToken sql.NullString

		if err := rows.Scan(
			&s.ID,
			&userID,
			&role,
			&username,
			&studentName,
			&s.Endpoint,
			&s.P256dh,
			&s.Auth,
			&fcmToken,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if userID.Valid {
			s.UserID = userID.String
		}
		if role.Valid {
			s.Role = role.String
		}
		if username.Valid {
			s.Username = username.String
		}
		if studentName.Valid {
			s.StudentName = studentName.String
		}
		if fcmToken.Valid {
			s.FCMToken = fcmToken.String
		}

		results = append(results, s)
	}

	if results == nil {
		results = []model.PushSubscriptionRecord{}
	}

	return results, nil
}
