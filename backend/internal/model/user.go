package model

import (
	"time"
)

// Role constants
const (
	RoleAdmin    = "admin"
	RolePelatih  = "pelatih"
	RoleOrangTua = "orang tua"
)

// User represents the user schema in PostgreSQL
type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// RegisterInput represents registration payload
type RegisterInput struct {
	Username string `json:"username" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin pelatih 'orang tua'"`
}

// LoginInput represents login payload
type LoginInput struct {
	UsernameOrEmail string `json:"usernameOrEmail" binding:"required"`
	Password        string `json:"password" binding:"required"`
}

// UpdateAvatarInput represents avatar update payload
type UpdateAvatarInput struct {
	Avatar string `json:"avatar"`
}

// AuthResponse represents authentication response containing JWT and user profile details
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
