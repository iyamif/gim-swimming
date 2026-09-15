package service

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"sync"
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

type resetOTPEntry struct {
	OTP       string
	UserID    int64
	Email     string
	ExpiresAt time.Time
}

// AuthService defines user authentication methods
type AuthService interface {
	Register(ctx context.Context, input model.RegisterInput) (*model.User, error)
	Login(ctx context.Context, input model.LoginInput) (string, *model.User, error)
	ValidateToken(tokenStr string) (*Claims, error)
	SetupPassword(ctx context.Context, userID int64, newPassword string) (*model.User, error)
	ChangePassword(ctx context.Context, userID int64, currentPassword, newPassword string) (*model.User, error)
	UpdateAvatar(ctx context.Context, username string, avatar string) error
	SendResetPasswordOTP(ctx context.Context, emailOrUsername string) (string, string, error)
	ResetPasswordWithOTP(ctx context.Context, emailOrUsername, otp, newPassword string) (*model.User, error)
}

type authService struct {
	userRepo    repository.UserRepository
	studentRepo repository.StudentRepository
	coachRepo   repository.CoachRepository
	jwtSecret   string
	otpMu       sync.RWMutex
	otpStore    map[string]*resetOTPEntry
}

// NewAuthService creates a new AuthService instance
func NewAuthService(userRepo repository.UserRepository, studentRepo repository.StudentRepository, coachRepo repository.CoachRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:    userRepo,
		studentRepo: studentRepo,
		coachRepo:   coachRepo,
		jwtSecret:   jwtSecret,
		otpStore:    make(map[string]*resetOTPEntry),
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

	// Check user membership / account activation status
	if strings.EqualFold(user.Role, model.RoleOrangTua) {
		if s.studentRepo != nil {
			students, _ := s.studentRepo.FindByUserID(ctx, user.ID)
			if len(students) == 0 {
				allStudents, _ := s.studentRepo.FindAll(ctx)
				for _, st := range allStudents {
					if (st.UserID != nil && *st.UserID == user.ID) ||
						strings.EqualFold(st.Name, user.Username) ||
						strings.EqualFold(st.Parent, user.Username) ||
						strings.EqualFold(st.Phone, user.Username) ||
						(cleanInput != "" && (strings.EqualFold(st.Phone, cleanInput) || strings.EqualFold(st.Name, cleanInput) || strings.EqualFold(st.Parent, cleanInput))) {
						students = append(students, st)
					}
				}
			}

			if len(students) > 0 {
				allInactive := true
				for _, st := range students {
					stStatus := strings.ToLower(strings.TrimSpace(st.Status))
					if stStatus == "active" || stStatus == "aktif" || stStatus == "" {
						allInactive = false
						break
					}
				}
				if allInactive {
					return "", nil, errors.New("Akun Anda telah dinonaktifkan oleh Admin. Silakan hubungi Admin untuk mengaktifkan kembali akun Anda.")
				}
			}
		}
	} else if strings.EqualFold(user.Role, model.RolePelatih) {
		if s.coachRepo != nil {
			coach, _ := s.coachRepo.FindByUserID(ctx, user.ID)
			if coach == nil {
				allCoaches, _ := s.coachRepo.FindAll(ctx)
				for _, c := range allCoaches {
					if (c.UserID != nil && *c.UserID == user.ID) ||
						strings.EqualFold(c.Name, user.Username) ||
						strings.EqualFold(c.Email, user.Email) ||
						(cleanInput != "" && (strings.EqualFold(c.Phone, cleanInput) || strings.EqualFold(c.Name, cleanInput) || strings.EqualFold(c.Email, cleanInput))) {
						coach = &c
						break
					}
				}
			}

			if coach != nil {
				cStatus := strings.ToLower(strings.TrimSpace(coach.Status))
				if cStatus == "inactive" || cStatus == "tidak aktif" {
					return "", nil, errors.New("Akun Pelatih Anda telah dinonaktifkan oleh Admin. Silakan hubungi Admin untuk mengaktifkan kembali akun Anda.")
				}
			}
		}
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

// ChangePassword verifies current password and updates with new password
func (s *authService) ChangePassword(ctx context.Context, userID int64, currentPassword, newPassword string) (*model.User, error) {
	if len(newPassword) < 6 {
		return nil, errors.New("kata sandi baru minimal harus 6 karakter")
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("pengguna tidak ditemukan")
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
		return nil, errors.New("kata sandi saat ini tidak sesuai")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("gagal mengenkripsi kata sandi: %v", err)
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword)); err != nil {
		return nil, fmt.Errorf("gagal menyimpan kata sandi baru: %v", err)
	}

	user.Password = ""
	user.MustChangePassword = false
	return user, nil
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

// maskEmail masks email for user privacy (e.g. j***e@domain.com)
func maskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}
	name := parts[0]
	domain := parts[1]
	if len(name) <= 2 {
		return name + "***@" + domain
	}
	return string(name[0]) + "***" + string(name[len(name)-1]) + "@" + domain
}

// SendResetPasswordOTP generates a 6-digit OTP, saves it in cache for 15 minutes, and dispatches email
func (s *authService) SendResetPasswordOTP(ctx context.Context, emailOrUsername string) (string, string, error) {
	cleanInput := strings.TrimSpace(strings.ToLower(emailOrUsername))
	if cleanInput == "" {
		return "", "", errors.New("silakan masukkan email atau username terdaftar")
	}

	var user *model.User
	var err error

	if strings.Contains(cleanInput, "@") {
		user, err = s.userRepo.FindByEmail(ctx, cleanInput)
	} else {
		user, err = s.userRepo.FindByUsername(ctx, cleanInput)
	}

	if err != nil || user == nil {
		// Fallback check by phone or identifier
		user, _ = s.userRepo.FindByPhoneOrIdentifier(ctx, cleanInput)
	}

	if user == nil {
		return "", "", errors.New("akun dengan email atau username tersebut tidak ditemukan")
	}

	if user.Email == "" {
		return "", "", errors.New("akun ini belum memiliki alamat email resmi yang terdaftar. Hubungi Administrator.")
	}

	// Generate 6-digit OTP
	rand.Seed(time.Now().UnixNano())
	otpCode := fmt.Sprintf("%06d", rand.Intn(900000)+100000)

	s.otpMu.Lock()
	s.otpStore[strings.ToLower(user.Email)] = &resetOTPEntry{
		OTP:       otpCode,
		UserID:    user.ID,
		Email:     user.Email,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}
	s.otpMu.Unlock()

	// Send Email Async
	go s.sendEmailOTP(user.Email, user.Username, otpCode)

	masked := maskEmail(user.Email)
	msg := fmt.Sprintf("Kode verifikasi OTP 6-digit telah dikirim ke %s (berlaku 15 menit)", masked)
	return masked, msg, nil
}

// sendEmailOTP dispatches OTP via SMTP if configured, and always logs to system console
func (s *authService) sendEmailOTP(toEmail, username, otpCode string) {
	subject := "Kode Verifikasi Reset Password - GIM Swimming Club"
	body := fmt.Sprintf(
		"Halo %s,\n\nBerikut adalah kode verifikasi 6-digit untuk mereset kata sandi akun GIM Swimming Anda:\n\n"+
			"👉 KODE OTP: %s\n\n"+
			"Kode ini hanya berlaku selama 15 menit. Jangan berikan kode ini kepada siapapun untuk menjaga keamanan akun Anda.\n\n"+
			"Salam,\nTim Manajemen GIM Swimming Club",
		username, otpCode,
	)

	log.Printf("📧 [EMAIL OTP GIM SWIMMING] Mengirim kode OTP [%s] ke email: %s (User: %s)", otpCode, toEmail, username)

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")
	smtpFrom := os.Getenv("SMTP_FROM")

	if smtpFrom == "" {
		smtpFrom = "noreply@gimswimming.com"
	}

	if smtpHost != "" && smtpPort != "" {
		auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		msg := []byte("From: GIM Swimming <" + smtpFrom + ">\r\n" +
			"To: " + toEmail + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
			body)

		addr := net.JoinHostPort(smtpHost, smtpPort)

		// Support port 465 (SSL/TLS) or 587 (STARTTLS)
		if smtpPort == "465" {
			tlsconfig := &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         smtpHost,
			}
			conn, err := tls.Dial("tcp", addr, tlsconfig)
			if err == nil {
				c, err := smtp.NewClient(conn, smtpHost)
				if err == nil {
					if err = c.Auth(auth); err == nil {
						if err = c.Mail(smtpFrom); err == nil {
							if err = c.Rcpt(toEmail); err == nil {
								w, err := c.Data()
								if err == nil {
									w.Write(msg)
									w.Close()
									c.Quit()
									log.Printf("✅ [EMAIL OTP SENT] Email reset password berhasil terkirim via SMTP ke %s", toEmail)
									return
								}
							}
						}
					}
				}
			}
		}

		err := smtp.SendMail(addr, auth, smtpFrom, []string{toEmail}, msg)
		if err != nil {
			log.Printf("⚠️ [EMAIL OTP SMTP WARNING] Gagal mengirim via SMTP (%v). OTP tetap tercatat di sistem: %s", err, otpCode)
		} else {
			log.Printf("✅ [EMAIL OTP SENT] Email reset password berhasil terkirim via SMTP ke %s", toEmail)
		}
	}
}

// ResetPasswordWithOTP verifies OTP and sets new password
func (s *authService) ResetPasswordWithOTP(ctx context.Context, emailOrUsername, otp, newPassword string) (*model.User, error) {
	if len(newPassword) < 6 {
		return nil, errors.New("kata sandi baru minimal harus 6 karakter")
	}

	cleanInput := strings.TrimSpace(strings.ToLower(emailOrUsername))
	cleanOTP := strings.TrimSpace(otp)

	if cleanInput == "" || cleanOTP == "" {
		return nil, errors.New("email dan kode verifikasi OTP wajib diisi")
	}

	var user *model.User
	var err error

	if strings.Contains(cleanInput, "@") {
		user, err = s.userRepo.FindByEmail(ctx, cleanInput)
	} else {
		user, err = s.userRepo.FindByUsername(ctx, cleanInput)
	}

	if err != nil || user == nil {
		user, _ = s.userRepo.FindByPhoneOrIdentifier(ctx, cleanInput)
	}

	if user == nil {
		return nil, errors.New("pengguna tidak ditemukan")
	}

	s.otpMu.Lock()
	entry, exists := s.otpStore[strings.ToLower(user.Email)]
	if !exists || entry.OTP != cleanOTP || time.Now().After(entry.ExpiresAt) {
		s.otpMu.Unlock()
		return nil, errors.New("kode verifikasi OTP salah atau telah kadaluarsa (berlaku 15 menit). Silakan minta kode baru.")
	}
	delete(s.otpStore, strings.ToLower(user.Email))
	s.otpMu.Unlock()

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("gagal mengenkripsi kata sandi: %v", err)
	}

	if err := s.userRepo.UpdatePassword(ctx, user.ID, string(hashedPassword)); err != nil {
		return nil, fmt.Errorf("gagal memperbarui kata sandi baru: %v", err)
	}

	user.Password = ""
	user.MustChangePassword = false
	return user, nil
}

