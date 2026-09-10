package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// Claims represents JWT payload structure
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// AuthService defines user authentication methods
type AuthService interface {
	Register(ctx context.Context, input model.RegisterInput) (*model.User, error)
	Login(ctx context.Context, input model.LoginInput) (string, *model.User, error)
	ValidateToken(tokenStr string) (*Claims, error)
	SetupPassword(ctx context.Context, userID int64, newPassword string) (*model.User, error)
	UpdateAvatar(ctx context.Context, username string, avatar string) error
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

// NewAuthService creates a new AuthService instance
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// Register creates a new user, hashes password, and saves to database
func (s *authService) Register(ctx context.Context, input model.RegisterInput) (*model.User, error) {
	// Check if user already exists by email
	existingUser, err := s.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email sudah terdaftar")
	}

	// Check if user already exists by username
	existingUser, err = s.userRepo.FindByUsername(ctx, input.Username)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("username sudah terdaftar")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	user := &model.User{
		Username:           input.Username,
		Email:              strings.ToLower(input.Email),
		Password:           string(hashedPassword),
		Role:               strings.ToLower(input.Role),
		MustChangePassword: false,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Login verifies password and returns token
func (s *authService) Login(ctx context.Context, input model.LoginInput) (string, *model.User, error) {
	var user *model.User
	var err error

	// Determine if input is email, phone, or username
	cleanInput := strings.TrimSpace(input.UsernameOrEmail)
	if strings.Contains(cleanInput, "@") {
		user, err = s.userRepo.FindByEmail(ctx, strings.ToLower(cleanInput))
	} else {
		user, err = s.userRepo.FindByPhoneOrIdentifier(ctx, cleanInput)
	}

	if err != nil {
		return "", nil, err
	}
	if user == nil {
		return "", nil, errors.New("kredensial tidak valid")
	}

	// Compare password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		return "", nil, errors.New("kredensial tidak valid")
	}

	// Generate JWT
	token, err := s.generateToken(user)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// SetupPassword updates initial password for user on first login and sets must_change_password to false
func (s *authService) SetupPassword(ctx context.Context, userID int64, newPassword string) (*model.User, error) {
	if len(newPassword) < 6 {
		return nil, errors.New("kata sandi baru minimal harus 6 karakter")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("gagal mengenkripsi kata sandi: %v", err)
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword)); err != nil {
		return nil, fmt.Errorf("gagal menyimpan kata sandi baru: %v", err)
	}

	updatedUser, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return updatedUser, nil
}

// generateToken generates a JWT token for a user
func (s *authService) generateToken(user *model.User) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours
	claims := &Claims{
		UserID:   strconv.FormatInt(user.ID, 10),
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "gim_swimming_backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return tokenString, nil
}

// ValidateToken validates the JWT and returns its claims
func (s *authService) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token tidak valid")
	}

	return claims, nil
}

// UpdateAvatar updates user's profile avatar
func (s *authService) UpdateAvatar(ctx context.Context, username string, avatar string) error {
	return s.userRepo.UpdateAvatar(ctx, username, avatar)
}
