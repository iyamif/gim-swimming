package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/iyamif/gim-swimming/internal/model"
)

// UserRepository defines the interface for user storage operations
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
	FindByID(ctx context.Context, id int64) (*model.User, error)
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
		INSERT INTO users (username, email, password, role, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id`
	
	err := r.db.QueryRowContext(
		ctx, 
		query, 
		user.Username, 
		user.Email, 
		user.Password, 
		user.Role, 
		user.CreatedAt, 
		user.UpdatedAt,
	).Scan(&user.ID)

	return err
}

// FindByEmail searches for a user by email
func (r *pgUserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, role, created_at, updated_at 
		FROM users 
		WHERE email = $1`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
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
		SELECT id, username, email, password, role, created_at, updated_at 
		FROM users 
		WHERE username = $1`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
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
		SELECT id, username, email, password, role, created_at, updated_at 
		FROM users 
		WHERE id = $1`

	var user model.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Role,
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
