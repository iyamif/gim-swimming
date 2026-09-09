package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/iyamif/gim-swimming/internal/config"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
)

// PushService manages Web Push subscriptions and notification dispatches
type PushService interface {
	GetVAPIDPublicKey() string
	Subscribe(ctx context.Context, input *model.PushSubscriptionInput) (*model.PushSubscriptionRecord, error)
	Unsubscribe(ctx context.Context, endpoint string) error
	SendSchedulePushNotification(ctx context.Context, session *model.ScheduleSession)
	SendAttendancePushNotification(ctx context.Context, att *model.AttendanceRecord, session *model.ScheduleSession)
	SendTestPush(ctx context.Context, input *model.TestPushInput) (int, error)
}

type pushService struct {
	cfg             *config.Config
	pushRepo        repository.PushRepository
	vapidPublicKey  string
	vapidPrivateKey string
	vapidSubject    string
}

// NewPushService initializes PushService with VAPID credentials
func NewPushService(cfg *config.Config, pushRepo repository.PushRepository) PushService {
	pubKey := cfg.VAPIDPublicKey
	privKey := cfg.VAPIDPrivateKey
	subject := cfg.VAPIDSubject

	if subject == "" {
		subject = "mailto:admin@gimswimming.com"
	}

	// Auto-generate keys if not provided in environment
	if pubKey == "" || privKey == "" {
		log.Println("[WebPush] VAPID keys not found in config, generating temporary keys...")
		priv, pub, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			log.Printf("[WebPush] Warning: Failed to generate VAPID keys: %v", err)
		} else {
			pubKey = pub
			privKey = priv
			log.Println("[WebPush] Temporary VAPID keys successfully generated.")
		}
	}

	return &pushService{
		cfg:             cfg,
		pushRepo:        pushRepo,
		vapidPublicKey:  pubKey,
		vapidPrivateKey: privKey,
		vapidSubject:    subject,
	}
}

// GetVAPIDPublicKey returns the public key for browser pushManager subscription
func (s *pushService) GetVAPIDPublicKey() string {
	return s.vapidPublicKey
}

// Subscribe saves or updates a browser push subscription
func (s *pushService) Subscribe(ctx context.Context, input *model.PushSubscriptionInput) (*model.PushSubscriptionRecord, error) {
	if input.Endpoint == "" || input.Keys.P256dh == "" || input.Keys.Auth == "" {
		return nil, fmt.Errorf("endpoint and cryptographic keys (p256dh, auth) are required")
	}

	record := &model.PushSubscriptionRecord{
		UserID:      input.UserID,
		Role:        input.Role,
		Username:    input.Username,
		StudentName: input.StudentName,
		Endpoint:    input.Endpoint,
		P256dh:      input.Keys.P256dh,
		Auth:        input.Keys.Auth,
	}

	if err := s.pushRepo.Upsert(ctx, record); err != nil {
		return nil, fmt.Errorf("failed to save push subscription: %w", err)
	}

	log.Printf("[WebPush] Subscribed device for user=%s, role=%s, student=%s (id=%d)",
		record.Username, record.Role, record.StudentName, record.ID)

	return record, nil
}

// Unsubscribe deletes a subscription by endpoint
func (s *pushService) Unsubscribe(ctx context.Context, endpoint string) error {
	if endpoint == "" {
		return fmt.Errorf("endpoint is required")
	}
	return s.pushRepo.DeleteByEndpoint(ctx, endpoint)
}

// sendSinglePush sends Web Push payload to one specific subscription record
func (s *pushService) sendSinglePush(ctx context.Context, sub *model.PushSubscriptionRecord, payload *model.WebPushPayload) error {
	if s.vapidPublicKey == "" || s.vapidPrivateKey == "" {
		return fmt.Errorf("VAPID keys not configured")
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal push payload: %w", err)
	}

	sSubscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	options := &webpush.Options{
		Subscriber:      s.vapidSubject,
		VAPIDPublicKey:  s.vapidPublicKey,
		VAPIDPrivateKey: s.vapidPrivateKey,
		TTL:             86400, // 24 hours
		Urgency:         webpush.UrgencyHigh,
	}

	resp, err := webpush.SendNotificationWithContext(ctx, payloadBytes, sSubscription, options)
	if err != nil {
		return fmt.Errorf("webpush send error: %w", err)
	}
	defer resp.Body.Close()

	// If subscription has expired or is unsubscribed on push server, remove from DB
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		log.Printf("[WebPush] Subscription expired or gone (HTTP %d). Removing endpoint: %s", resp.StatusCode, sub.Endpoint)
		_ = s.pushRepo.DeleteByEndpoint(ctx, sub.Endpoint)
		return fmt.Errorf("subscription expired (%d)", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webpush server returned status code: %d", resp.StatusCode)
	}

	return nil
}

// SendSchedulePushNotification dispatches push notifications to coach and students/parents when schedule is created/updated
func (s *pushService) SendSchedulePushNotification(ctx context.Context, session *model.ScheduleSession) {
	if session == nil {
		return
	}

	// Run in background goroutine with independent timeout context so user API returns instantly
	go func(sess model.ScheduleSession) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()

		formattedDate := formatIndonesianDate(sess.Date)
		timeRange := fmt.Sprintf("%s - %s WIB", sess.TimeStart, sess.TimeEnd)
		if strings.Contains(sess.TimeStart, "WIB") {
			timeRange = fmt.Sprintf("%s - %s", sess.TimeStart, sess.TimeEnd)
		}

		studentNamesStr := strings.Join(sess.StudentNames, ", ")
		if studentNamesStr == "" {
			studentNamesStr = "Belum ditentukan"
		}

		// 1. Dispatch push to Coach
		if sess.CoachName != "" {
			coachSubs, err := s.pushRepo.FindForCoach(bgCtx, sess.CoachName, sess.CoachID)
			if err == nil && len(coachSubs) > 0 {
				unreadCount, _ := s.pushRepo.GetUnreadNotificationCount(bgCtx, "pelatih", sess.CoachName, sess.CoachID)
				if unreadCount <= 0 {
					unreadCount = 1
				}

				coachPayload := &model.WebPushPayload{
					Title:   "Jadwal Pelatihan Baru 🏊‍♂️",
					Body:    fmt.Sprintf("Halo Pelatih %s, Anda memiliki jadwal '%s' pada %s pukul %s di %s bersama siswa: %s.", sess.CoachName, sess.Title, formattedDate, timeRange, sess.PoolArea, studentNamesStr),
					Message: fmt.Sprintf("Jadwal '%s' pada %s pukul %s di %s.", sess.Title, formattedDate, timeRange, sess.PoolArea),
					Icon:    "/icon.png",
					Badge:   "/icon.png",
					Tag:     fmt.Sprintf("schedule-%s", sess.ID),
					UnreadCount: unreadCount,
					Data: map[string]interface{}{
						"url":         "/apps",
						"type":        "schedule",
						"schedule_id": sess.ID,
						"role":        "pelatih",
						"tab":         "jadwal",
					},
				}

				for _, sub := range coachSubs {
					if err := s.sendSinglePush(bgCtx, &sub, coachPayload); err != nil {
						log.Printf("[WebPush] Failed sending push to coach %s: %v", sess.CoachName, err)
					} else {
						log.Printf("[WebPush] Push sent successfully to coach %s (endpoint=%s)", sess.CoachName, sub.Endpoint[:min(30, len(sub.Endpoint))])
					}
				}
			}
		}

		// 2. Dispatch push to Students / Parents
		if len(sess.StudentNames) > 0 || len(sess.StudentIDs) > 0 {
			studentSubs, err := s.pushRepo.FindForStudents(bgCtx, sess.StudentNames, sess.StudentIDs)
			if err == nil && len(studentSubs) > 0 {
				for _, sub := range studentSubs {
					studentName := sub.StudentName
					if studentName == "" {
						studentName = sub.Username
					}

					unreadCount, _ := s.pushRepo.GetUnreadNotificationCount(bgCtx, "orang tua", studentName, sub.UserID)
					if unreadCount <= 0 {
						unreadCount = 1
					}

					studentPayload := &model.WebPushPayload{
						Title:   "Jadwal Latihan Renang Baru 🏊‍♂️",
						Body:    fmt.Sprintf("Halo %s, Anda memiliki jadwal latihan baru '%s' pada %s pukul %s di %s bersama Pelatih %s.", studentName, sess.Title, formattedDate, timeRange, sess.PoolArea, sess.CoachName),
						Message: fmt.Sprintf("Jadwal '%s' pada %s pukul %s di %s bersama Pelatih %s.", sess.Title, formattedDate, timeRange, sess.PoolArea, sess.CoachName),
						Icon:    "/icon.png",
						Badge:   "/icon.png",
						Tag:     fmt.Sprintf("schedule-%s", sess.ID),
						UnreadCount: unreadCount,
						Data: map[string]interface{}{
							"url":         "/apps",
							"type":        "schedule",
							"schedule_id": sess.ID,
							"role":        "orang tua",
							"tab":         "jadwal",
						},
					}

					if err := s.sendSinglePush(bgCtx, &sub, studentPayload); err != nil {
						log.Printf("[WebPush] Failed sending push to student %s: %v", studentName, err)
					} else {
						log.Printf("[WebPush] Push sent successfully to student %s", studentName)
					}
				}
			}
		}
	}(*session)
}

// SendAttendancePushNotification dispatches push to Admin when a coach or student checks in
func (s *pushService) SendAttendancePushNotification(ctx context.Context, att *model.AttendanceRecord, session *model.ScheduleSession) {
	if att == nil {
		return
	}

	go func(record model.AttendanceRecord) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		adminSubs, err := s.pushRepo.FindForAdmin(bgCtx)
		if err != nil || len(adminSubs) == 0 {
			return
		}

		unreadCount, _ := s.pushRepo.GetUnreadNotificationCount(bgCtx, "admin", "", "")
		if unreadCount <= 0 {
			unreadCount = 1
		}

		title := fmt.Sprintf("Presensi: %s", record.PersonName)
		if record.PersonType == "coach" {
			title = fmt.Sprintf("Presensi Pelatih: %s ⏱️", record.PersonName)
		} else {
			title = fmt.Sprintf("Presensi Siswa: %s ⏱️", record.PersonName)
		}

		statusLabel := record.Status
		if record.IsLate {
			statusLabel = fmt.Sprintf("Terlambat (%s)", record.LateReason)
		}

		scheduleTitle := record.ScheduleTitle
		if scheduleTitle == "" && session != nil {
			scheduleTitle = session.Title
		}

		body := fmt.Sprintf("%s telah absen (%s) untuk sesi '%s' di %s (Jarak GPS: %.2f km).",
			record.PersonName, statusLabel, scheduleTitle, record.PoolArea, record.DistanceKm)

		payload := &model.WebPushPayload{
			Title:       title,
			Body:        body,
			Message:     body,
			Icon:        "/icon.png",
			Badge:       "/icon.png",
			Tag:         fmt.Sprintf("att-%d", record.ID),
			UnreadCount: unreadCount,
			Data: map[string]interface{}{
				"url":           "/apps",
				"type":          "attendance",
				"attendance_id": record.ID,
				"schedule_id":   record.ScheduleID,
				"role":          "admin",
			},
		}

		for _, sub := range adminSubs {
			_ = s.sendSinglePush(bgCtx, &sub, payload)
		}
	}(*att)
}

// SendTestPush sends a test push notification to devices matching the input criteria
func (s *pushService) SendTestPush(ctx context.Context, input *model.TestPushInput) (int, error) {
	subs, err := s.pushRepo.FindForUser(ctx, input.Role, input.Username, input.StudentName, input.UserID)
	if err != nil {
		return 0, err
	}

	if len(subs) == 0 {
		return 0, fmt.Errorf("tidak ditemukan perangkat terdaftar untuk akun ini. Pastikan izin notifikasi sudah diizinkan di browser")
	}

	title := input.Title
	if title == "" {
		title = "GIM Swimming Push Test 🔔"
	}

	msg := input.Message
	if msg == "" {
		msg = fmt.Sprintf("Halo %s! Notifikasi push dan icon badge mobile berhasil terhubung dengan sukses.", input.Username)
	}

	unreadCount, _ := s.pushRepo.GetUnreadNotificationCount(ctx, input.Role, input.StudentName, input.UserID)
	if unreadCount <= 0 {
		unreadCount = 1
	}

	payload := &model.WebPushPayload{
		Title:       title,
		Body:        msg,
		Message:     msg,
		Icon:        "/icon.png",
		Badge:       "/icon.png",
		Tag:         fmt.Sprintf("test-push-%d", time.Now().Unix()),
		UnreadCount: unreadCount,
		Data: map[string]interface{}{
			"url":  "/apps",
			"type": "test",
		},
	}

	sentCount := 0
	for _, sub := range subs {
		if err := s.sendSinglePush(ctx, &sub, payload); err == nil {
			sentCount++
		}
	}

	return sentCount, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
