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

				// Auto-sync coach.UserID and user.Email if admin updated coach email
				if coach.UserID == nil || *coach.UserID == 0 {
					coach.UserID = &user.ID
					_ = s.coachRepo.Update(ctx, coach)
				}
				if coach.Email != "" && !strings.EqualFold(coach.Email, user.Email) {
					user.Email = strings.ToLower(strings.TrimSpace(coach.Email))
					_ = s.userRepo.UpdateEmail(ctx, user.ID, user.Email)
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
	expirationTime := time.Now().Add(365 * 24 * time.Hour) // Token persists for 1 year (365 days)
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

// SendResetPasswordOTP checks if the email is registered, generates a 6-digit OTP, and dispatches it to that email
func (s *authService) SendResetPasswordOTP(ctx context.Context, emailOrUsername string) (string, string, error) {
	cleanInput := strings.TrimSpace(strings.ToLower(emailOrUsername))
	if cleanInput == "" {
		return "", "", errors.New("silakan masukkan alamat email akun Anda")
	}

	var user *model.User
	var targetEmail string

	// 1. Cek langsung apakah email terdaftar di tabel users
	if strings.Contains(cleanInput, "@") {
		user, _ = s.userRepo.FindByEmail(ctx, cleanInput)
		if user != nil {
			targetEmail = cleanInput
		}
	}

	// 2. Jika belum ditemukan di tabel users, cek apakah email terdaftar di data pelatih (coaches)
	if user == nil && s.coachRepo != nil {
		coaches, _ := s.coachRepo.FindAll(ctx)
		for _, c := range coaches {
			if strings.EqualFold(c.Email, cleanInput) {
				targetEmail = strings.ToLower(strings.TrimSpace(c.Email))
				// Temukan akun user yang terhubung dengan pelatih ini
				if c.UserID != nil && *c.UserID > 0 {
					user, _ = s.userRepo.FindByID(ctx, *c.UserID)
				}
				if user == nil {
					nameParts := strings.Fields(c.Name)
					rawUser := strings.ToLower(nameParts[0])
					if strings.HasPrefix(strings.ToLower(c.Name), "coach ") && len(nameParts) > 1 {
						rawUser = strings.ToLower(nameParts[1])
					}
					user, _ = s.userRepo.FindByUsername(ctx, rawUser)
				}
				if user != nil {
					// Sinkronkan email user di tabel users agar selalu sama dengan email pelatih
					user.Email = targetEmail
					_ = s.userRepo.UpdateEmail(ctx, user.ID, targetEmail)
					if c.UserID == nil || *c.UserID == 0 {
						_ = s.coachRepo.LinkUser(ctx, c.ID, user.ID)
					}
				}
				break
			}
		}
	}

	// 3. Jika belum ditemukan, cek apakah email terdaftar di data siswa (students) melalui username / user terhubung
	if user == nil && s.studentRepo != nil {
		students, _ := s.studentRepo.FindAll(ctx)
		for _, st := range students {
			if (st.Username != "" && strings.EqualFold(st.Username, cleanInput)) ||
				strings.EqualFold(st.Name, cleanInput) ||
				strings.EqualFold(st.Parent, cleanInput) ||
				strings.EqualFold(st.Phone, cleanInput) {
				if st.UserID != nil && *st.UserID > 0 {
					user, _ = s.userRepo.FindByID(ctx, *st.UserID)
				}
				if user == nil && st.Username != "" {
					user, _ = s.userRepo.FindByUsername(ctx, st.Username)
				}
				if user != nil {
					targetEmail = strings.ToLower(strings.TrimSpace(user.Email))
					break
				}
			}
		}
	}

	// 4. Jika user memasukkan username, cari user lalu ambil email terdaftarnya
	if user == nil && !strings.Contains(cleanInput, "@") {
		user, _ = s.userRepo.FindByUsername(ctx, cleanInput)
		if user == nil {
			user, _ = s.userRepo.FindByPhoneOrIdentifier(ctx, cleanInput)
		}

		if user != nil {
			// Cek apakah user ini pelatih yang memiliki email terupdate di coaches
			if s.coachRepo != nil {
				coaches, _ := s.coachRepo.FindAll(ctx)
				for _, c := range coaches {
					if (c.UserID != nil && *c.UserID == user.ID) ||
						strings.EqualFold(c.Name, user.Username) ||
						strings.Contains(strings.ToLower(c.Name), strings.ToLower(user.Username)) {
						if c.Email != "" {
							targetEmail = strings.ToLower(strings.TrimSpace(c.Email))
							user.Email = targetEmail
							_ = s.userRepo.UpdateEmail(ctx, user.ID, targetEmail)
						}
						break
					}
				}
			}
			if targetEmail == "" {
				targetEmail = strings.ToLower(strings.TrimSpace(user.Email))
			}
		}
	}

	// Jika email tidak ditemukan di manapun dalam sistem
	if user == nil || targetEmail == "" {
		return "", "", errors.New("email tidak terdaftar di sistem. Pastikan Anda memasukkan alamat email yang benar.")
	}

	// Generate 6-digit OTP
	rand.Seed(time.Now().UnixNano())
	otpCode := fmt.Sprintf("%06d", rand.Intn(900000)+100000)

	entry := &resetOTPEntry{
		OTP:       otpCode,
		UserID:    user.ID,
		Email:     targetEmail,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}

	s.otpMu.Lock()
	s.otpStore[targetEmail] = entry
	if user.Email != "" {
		s.otpStore[strings.ToLower(user.Email)] = entry
	}
	if user.Username != "" {
		s.otpStore[strings.ToLower(user.Username)] = entry
	}
	if cleanInput != "" {
		s.otpStore[cleanInput] = entry
	}
	s.otpMu.Unlock()

	// Kirimkan OTP ke target email terdaftar
	go s.sendEmailOTP(targetEmail, user.Username, otpCode)

	masked := maskEmail(targetEmail)
	msg := fmt.Sprintf("Kode verifikasi OTP 6-digit telah dikirim ke %s (berlaku 15 menit)", masked)
	return masked, msg, nil
}

// sendEmailOTP dispatches OTP via SMTP if configured, and always logs to system console
func (s *authService) sendEmailOTP(toEmail, username, otpCode string) {
	subject := "Kode Verifikasi Reset Password - GIM Swimming Club"
	plainBody := fmt.Sprintf(
		"Halo %s,\n\nBerikut adalah kode verifikasi 6-digit untuk mereset kata sandi akun GIM Swimming Anda:\n\n"+
			"👉 KODE OTP: %s\n\n"+
			"Kode ini hanya berlaku selama 15 menit. Jangan berikan kode ini kepada siapapun untuk menjaga keamanan akun Anda.\n\n"+
			"Salam,\nTim Manajemen GIM Swimming Club",
		username, otpCode,
	)

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Kata Sandi - GIM Swimming Club</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color:#f1f5f9;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width:540px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg, #1d4ed8 0%%, #0284c7 100%%);padding:36px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🏊‍♂️ GIM SWIMMING CLUB</h1>
              <p style="margin:8px 0 0 0;color:#bae6fd;font-size:14px;font-weight:500;">Permintaan Reset Kata Sandi Akun</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#334155;">
                Halo <strong>%s</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:#475569;">
                Kami menerima permintaan untuk mereset kata sandi akun GIM Swimming Anda. Gunakan kode verifikasi (OTP) 6-digit di bawah ini untuk melanjutkan:
              </p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color:#f8fafc;border:2px dashed #0284c7;border-radius:16px;padding:22px 16px;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">KODE VERIFIKASI (OTP)</div>
                    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#1d4ed8;margin-left:10px;">%s</div>
                    <div style="font-size:12px;color:#0369a1;font-weight:600;margin-top:8px;">⏳ Berlaku selama 15 menit</div>
                  </td>
                </tr>
              </table>
              <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:8px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;line-height:20px;color:#92400e;">
                  <strong>Penting:</strong> Jangan bagikan kode OTP ini kepada siapa pun termasuk pihak pengelola GIM Swimming. Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini.
                </p>
              </div>
              <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">
                Salam hangat,<br/>
                <strong style="color:#334155;">Tim Manajemen GIM Swimming Club</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #f1f5f9;padding:18px 30px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Email otomatis ini dikirim oleh sistem GIM Swimming Club. Mohon jangan membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, username, otpCode)

	log.Printf("📧 [EMAIL OTP GIM SWIMMING] Target: %s (User: %s) | Kode OTP: [%s]", toEmail, username, otpCode)

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")
	smtpFrom := os.Getenv("SMTP_FROM")

	if smtpHost == "" {
		log.Printf("ℹ️ [SMTP INFO] SMTP_HOST belum diset di .env. Kode OTP untuk [%s] adalah: %s (Berlaku 15 menit). Untuk pengiriman email fisik ke inbox, atur SMTP_HOST, SMTP_USER, & SMTP_PASSWORD di .env", toEmail, otpCode)
		return
	}

	if smtpFrom == "" {
		smtpFrom = smtpUser
		if smtpFrom == "" {
			smtpFrom = "noreply@gimswimming.com"
		}
	}
		if smtpPort == "" {
			smtpPort = "587"
		}

		boundary := "===GIM_SWIMMING_EMAIL_BOUNDARY==="
		var msgBuilder strings.Builder
		msgBuilder.WriteString(fmt.Sprintf("From: GIM Swimming <%s>\r\n", smtpFrom))
		msgBuilder.WriteString(fmt.Sprintf("To: %s\r\n", toEmail))
		msgBuilder.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
		msgBuilder.WriteString("MIME-Version: 1.0\r\n")
		msgBuilder.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", boundary))

		// Plain text part
		msgBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msgBuilder.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		msgBuilder.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
		msgBuilder.WriteString(plainBody)
		msgBuilder.WriteString("\r\n\r\n")

		// HTML part
		msgBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msgBuilder.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		msgBuilder.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
		msgBuilder.WriteString(htmlBody)
		msgBuilder.WriteString("\r\n\r\n")

		msgBuilder.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

		msg := []byte(msgBuilder.String())
		addr := net.JoinHostPort(smtpHost, smtpPort)

		var auth smtp.Auth
		if smtpUser != "" && smtpPass != "" {
			auth = smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		}

		if smtpPort == "465" {
			tlsconfig := &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         smtpHost,
			}
			conn, err := tls.Dial("tcp", addr, tlsconfig)
			if err == nil {
				c, err := smtp.NewClient(conn, smtpHost)
				if err == nil {
					if auth != nil {
						_ = c.Auth(auth)
					}
					if err = c.Mail(smtpFrom); err == nil {
						if err = c.Rcpt(toEmail); err == nil {
							w, err := c.Data()
							if err == nil {
								w.Write(msg)
								w.Close()
								c.Quit()
								log.Printf("✅ [EMAIL OTP SENT] Email reset password berhasil terkirim via SMTP (SSL 465) ke %s", toEmail)
								return
							}
						}
					}
					c.Close()
				}
			}
			log.Printf("⚠️ [EMAIL OTP SSL 465 WARNING] %v, mencoba smtp.SendMail...", err)
		}

		err := smtp.SendMail(addr, auth, smtpFrom, []string{toEmail}, msg)
		if err != nil {
			log.Printf("⚠️ [EMAIL OTP SMTP WARNING] Gagal mengirim via SMTP (%v). OTP tetap tercatat di sistem: %s", err, otpCode)
		} else {
			log.Printf("✅ [EMAIL OTP SENT] Email reset password berhasil terkirim via SMTP ke %s", toEmail)
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

	// Fallback lookup via Coach repository
	var matchedCoachReset *model.Coach
	if s.coachRepo != nil {
		coaches, _ := s.coachRepo.FindAll(ctx)
		for _, c := range coaches {
			isMatch := strings.EqualFold(c.Email, cleanInput) ||
				strings.EqualFold(c.Name, cleanInput) ||
				strings.EqualFold(c.Phone, cleanInput) ||
				(user != nil && c.UserID != nil && *c.UserID == user.ID) ||
				(user != nil && (strings.EqualFold(c.Email, user.Email) || strings.EqualFold(c.Name, user.Username) || strings.Contains(strings.ToLower(c.Name), strings.ToLower(user.Username))))

			if isMatch {
				matchedCoachReset = &c
				if user == nil {
					if c.UserID != nil && *c.UserID > 0 {
						user, _ = s.userRepo.FindByID(ctx, *c.UserID)
					}
					if user == nil && c.Email != "" {
						user, _ = s.userRepo.FindByEmail(ctx, c.Email)
					}
					if user == nil {
						nameParts := strings.Fields(c.Name)
						rawUser := strings.ToLower(nameParts[0])
						if strings.HasPrefix(strings.ToLower(c.Name), "coach ") && len(nameParts) > 1 {
							rawUser = strings.ToLower(nameParts[1])
						}
						user, _ = s.userRepo.FindByUsername(ctx, rawUser)
					}
				}
				break
			}
		}
	}

	// Fallback lookup via Student repository
	if user == nil && s.studentRepo != nil {
		students, _ := s.studentRepo.FindAll(ctx)
		for _, st := range students {
			if (st.Username != "" && strings.EqualFold(st.Username, cleanInput)) ||
				strings.EqualFold(st.Name, cleanInput) ||
				strings.EqualFold(st.Parent, cleanInput) ||
				strings.EqualFold(st.Phone, cleanInput) {
				if st.UserID != nil && *st.UserID > 0 {
					user, _ = s.userRepo.FindByID(ctx, *st.UserID)
				}
				if user == nil && st.Username != "" {
					user, _ = s.userRepo.FindByUsername(ctx, st.Username)
				}
				if user != nil {
					break
				}
			}
		}
	}

	if user == nil {
		return nil, errors.New("pengguna tidak ditemukan")
	}

	if matchedCoachReset != nil && matchedCoachReset.Email != "" {
		cEmail := strings.TrimSpace(strings.ToLower(matchedCoachReset.Email))
		if cEmail != "" && !strings.EqualFold(user.Email, cEmail) {
			user.Email = cEmail
			_ = s.userRepo.UpdateEmail(ctx, user.ID, cEmail)
		}
	}

	s.otpMu.Lock()
	var matchedEntry *resetOTPEntry
	if user.Email != "" {
		matchedEntry = s.otpStore[strings.ToLower(user.Email)]
	}
	if matchedEntry == nil && user.Username != "" {
		matchedEntry = s.otpStore[strings.ToLower(user.Username)]
	}
	if matchedEntry == nil {
		matchedEntry = s.otpStore[cleanInput]
	}

	if matchedEntry == nil || matchedEntry.OTP != cleanOTP || time.Now().After(matchedEntry.ExpiresAt) {
		s.otpMu.Unlock()
		return nil, errors.New("kode verifikasi OTP salah atau telah kadaluarsa (berlaku 15 menit). Silakan minta kode baru.")
	}

	// Cleanup all related OTP keys
	if user.Email != "" {
		delete(s.otpStore, strings.ToLower(user.Email))
	}
	if user.Username != "" {
		delete(s.otpStore, strings.ToLower(user.Username))
	}
	delete(s.otpStore, cleanInput)
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

