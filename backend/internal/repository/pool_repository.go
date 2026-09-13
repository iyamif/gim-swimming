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

// PoolRepository defines database operations for pool venues
type PoolRepository interface {
	Create(ctx context.Context, pool *model.PoolVenue) error
	FindAll(ctx context.Context) ([]model.PoolVenue, error)
	FindByID(ctx context.Context, id string) (*model.PoolVenue, error)
	Update(ctx context.Context, id string, pool *model.UpdatePoolInput) (*model.PoolVenue, error)
	Delete(ctx context.Context, id string) error
}

type pgPoolRepository struct {
	db *sql.DB
}

// NewPoolRepository creates a new PoolRepository
func NewPoolRepository(db *sql.DB) PoolRepository {
	return &pgPoolRepository{db: db}
}

func parsePoolID(id string) (int64, error) {
	id = strings.TrimPrefix(id, "pool_")
	id = strings.TrimPrefix(id, "pool")
	return strconv.ParseInt(id, 10, 64)
}

func (r *pgPoolRepository) Create(ctx context.Context, pool *model.PoolVenue) error {
	query := `
		INSERT INTO pools (name, address, latitude, longitude, radius_meters, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, created_at, updated_at;
	`
	var id int64
	radius := pool.RadiusMeters
	if radius <= 0 {
		radius = 200
	}
	err := r.db.QueryRowContext(
		ctx,
		query,
		pool.Name,
		pool.Address,
		pool.Latitude,
		pool.Longitude,
		radius,
	).Scan(&id, &pool.CreatedAt, &pool.UpdatedAt)
	if err != nil {
		return err
	}

	pool.ID = fmt.Sprintf("pool_%d", id)
	pool.RadiusMeters = radius
	return nil
}

func (r *pgPoolRepository) FindAll(ctx context.Context) ([]model.PoolVenue, error) {
	query := `
		SELECT id, name, address, latitude, longitude, radius_meters, created_at, updated_at
		FROM pools
		ORDER BY id ASC;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.PoolVenue
	for rows.Next() {
		var p model.PoolVenue
		var rawID int64
		var address sql.NullString
		err := rows.Scan(
			&rawID,
			&p.Name,
			&address,
			&p.Latitude,
			&p.Longitude,
			&p.RadiusMeters,
			&p.CreatedAt,
			&p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		p.ID = fmt.Sprintf("pool_%d", rawID)
		if address.Valid {
			p.Address = address.String
		}
		list = append(list, p)
	}

	return list, nil
}

func (r *pgPoolRepository) FindByID(ctx context.Context, id string) (*model.PoolVenue, error) {
	rawID, err := parsePoolID(id)
	if err != nil {
		return nil, errors.New("invalid pool id")
	}

	query := `
		SELECT id, name, address, latitude, longitude, radius_meters, created_at, updated_at
		FROM pools
		WHERE id = $1;
	`
	var p model.PoolVenue
	var address sql.NullString
	err = r.db.QueryRowContext(ctx, query, rawID).Scan(
		&rawID,
		&p.Name,
		&address,
		&p.Latitude,
		&p.Longitude,
		&p.RadiusMeters,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	p.ID = fmt.Sprintf("pool_%d", rawID)
	if address.Valid {
		p.Address = address.String
	}
	return &p, nil
}

func (r *pgPoolRepository) Update(ctx context.Context, id string, input *model.UpdatePoolInput) (*model.PoolVenue, error) {
	rawID, err := parsePoolID(id)
	if err != nil {
		return nil, errors.New("invalid pool id")
	}

	existing, err := r.FindByID(ctx, id)
	if err != nil || existing == nil {
		return nil, errors.New("pool not found")
	}

	name := existing.Name
	if input.Name != "" {
		name = input.Name
	}
	address := existing.Address
	if input.Address != "" {
		address = input.Address
	}
	lat := existing.Latitude
	if input.Latitude != 0 {
		lat = input.Latitude
	}
	lng := existing.Longitude
	if input.Longitude != 0 {
		lng = input.Longitude
	}
	radius := existing.RadiusMeters
	if input.RadiusMeters > 0 {
		radius = input.RadiusMeters
	}

	query := `
		UPDATE pools
		SET name = $1, address = $2, latitude = $3, longitude = $4, radius_meters = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING updated_at;
	`
	err = r.db.QueryRowContext(ctx, query, name, address, lat, lng, radius, rawID).Scan(&existing.UpdatedAt)
	if err != nil {
		return nil, err
	}

	existing.Name = name
	existing.Address = address
	existing.Latitude = lat
	existing.Longitude = lng
	existing.RadiusMeters = radius
	return existing, nil
}

func (r *pgPoolRepository) Delete(ctx context.Context, id string) error {
	rawID, err := parsePoolID(id)
	if err != nil {
		return errors.New("invalid pool id")
	}

	query := `DELETE FROM pools WHERE id = $1;`
	_, err = r.db.ExecContext(ctx, query, rawID)
	return err
}
