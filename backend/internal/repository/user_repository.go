package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/iyamif/gim-swimming/internal/model"
)

// UserRepository defines the interface for user storage operations
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
	FindByID(ctx context.Context, id int64) (*model.User, error)
	FindByPhoneOrIdentifier(ctx context.Context, identifier string) (*model.User, error)
	UpdateAvatar(ctx context.Context, username string, avatar string) error
	UpdatePassword(ctx context.Context, userID int64, hashedPassword string) error
}

// pgUserRepository implements UserRepository for PostgreSQL
type pgUserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new UserRepository instance for PostgreSQL
func NewUserRepository(db *sql.DB) UserRepository {
	return &pgUserRepository{
		db: db,
	}
}

// Create inserts a new user and populates the auto-generated ID
func (r *pgUserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (username, email, password, role, avatar, must_change_password, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
		RETURNING id`
	
	err := r.db.QueryRowContext(
		ctx, 
		query, 
		user.Username, 
		user.Email, 
		user.Password, 
		user.Role, 
		user.Avatar,
		user.MustChangePassword,
		user.CreatedAt, 
		user.UpdatedAt,
	).Scan(&user.ID)

	return err
}

// FindByEmail searches for a user by email
func (r *pgUserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, COALESCE(avatar, ''), COALESCE(must_change_password, false), created_at, updated_at 
		FROM users 
		WHERE LOWER(email) = LOWER($1)`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// FindByUsername searches for a user by username
func (r *pgUserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, COALESCE(avatar, ''), COALESCE(must_change_password, false), created_at, updated_at 
		FROM users 
		WHERE LOWER(username) = LOWER($1)`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// FindByID searches for a user by ID
func (r *pgUserRepository) FindByID(ctx context.Context, id int64) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, COALESCE(avatar, ''), COALESCE(must_change_password, false), created_at, updated_at 
		FROM users 
		WHERE id = $1`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// FindByPhoneOrIdentifier searches for user via username, email, or phone in students/coaches tables
func (r *pgUserRepository) FindByPhoneOrIdentifier(ctx context.Context, identifier string) (*model.User, error) {
	cleanIdentifier := strings.TrimSpace(identifier)

	// 1. Direct username/email match
	queryDirect := `
		SELECT id, username, email, password, role, COALESCE(avatar, ''), COALESCE(must_change_password, false), created_at, updated_at 
		FROM users 
		WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`

	var user model.User
	err := r.db.QueryRowContext(ctx, queryDirect, cleanIdentifier).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == nil {
		return &user, nil
	}

	// 2. Search via coaches phone
	queryCoach := `
		SELECT u.id, u.username, u.email, u.password, u.role, COALESCE(u.avatar, ''), COALESCE(u.must_change_password, false), u.created_at, u.updated_at
		FROM users u
		JOIN coaches c ON u.id = c.user_id OR LOWER(u.username) = LOWER(SPLIT_PART(c.name, ' ', 1)) OR LOWER(u.email) = LOWER(c.email)
		WHERE c.phone = $1 OR c.phone = $2
		LIMIT 1`
	err = r.db.QueryRowContext(ctx, queryCoach, cleanIdentifier, strings.TrimPrefix(cleanIdentifier, "0")).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == nil {
		return &user, nil
	}

	// 3. Search via students phone
	queryStudent := `
		SELECT u.id, u.username, u.email, u.password, u.role, COALESCE(u.avatar, ''), COALESCE(u.must_change_password, false), u.created_at, u.updated_at
		FROM users u
		JOIN students s ON LOWER(u.username) = LOWER(SPLIT_PART(s.name, ' ', 1)) OR LOWER(u.username) = LOWER(REPLACE(s.name, ' ', ''))
		WHERE s.phone = $1 OR s.phone = $2
		LIMIT 1`
	err = r.db.QueryRowContext(ctx, queryStudent, cleanIdentifier, strings.TrimPrefix(cleanIdentifier, "0")).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
		&user.Avatar,
		&user.MustChangePassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == nil {
		return &user, nil
	}

	return nil, nil
}

// UpdatePassword updates user's password and resets must_change_password to false
func (r *pgUserRepository) UpdatePassword(ctx context.Context, userID int64, hashedPassword string) error {
	query := `
		UPDATE users 
		SET password = $1, must_change_password = false, updated_at = NOW() 
		WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, hashedPassword, userID)
	return err
}

// UpdateAvatar updates user's profile avatar and syncs to students/coaches tables
func (r *pgUserRepository) UpdateAvatar(ctx context.Context, username string, avatar string) error {
	queryUser := `
		UPDATE users 
		SET avatar = $1, updated_at = NOW() 
		WHERE username = $2 OR email = $2`
	_, err := r.db.ExecContext(ctx, queryUser, avatar, username)
	if err != nil {
		return err
	}

	queryStudent := `
		UPDATE students
		SET avatar = $1, updated_at = NOW()
		WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
		   OR LOWER(name) = LOWER($2)`
	_, _ = r.db.ExecContext(ctx, queryStudent, avatar, username)

	queryCoach := `
		UPDATE coaches
		SET avatar = $1, updated_at = NOW()
		WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
		   OR LOWER(REPLACE(REPLACE(name, 'coach', ''), ' ', '')) = LOWER(REPLACE($2, ' ', ''))
		   OR LOWER(name) = LOWER($2)
		   OR LOWER(name) LIKE '%' || LOWER($2) || '%'
		   OR (LOWER($2) = 'adi' AND LOWER(name) LIKE '%adi%')
		   OR LOWER(email) = LOWER($2)
		   OR user_id IN (SELECT id FROM users WHERE username = $2 OR email = $2)`
	_, _ = r.db.ExecContext(ctx, queryCoach, avatar, username)

	return nil
}
