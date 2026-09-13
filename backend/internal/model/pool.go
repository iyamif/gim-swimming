package model

import "time"

// PoolVenue represents a swimming pool location for training sessions
type PoolVenue struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Address      string    `json:"address"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	RadiusMeters int       `json:"radius_meters"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreatePoolInput payload for creating a pool venue
type CreatePoolInput struct {
	Name         string  `json:"name" binding:"required"`
	Address      string  `json:"address"`
	Latitude     float64 `json:"latitude" binding:"required"`
	Longitude    float64 `json:"longitude" binding:"required"`
	RadiusMeters int     `json:"radius_meters"`
}

// UpdatePoolInput payload for editing a pool venue
type UpdatePoolInput struct {
	Name         string  `json:"name"`
	Address      string  `json:"address"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	RadiusMeters int     `json:"radius_meters"`
}
