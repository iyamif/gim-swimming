package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/SherClockHolmes/webpush-go"
	"github.com/iyamif/gim-swimming/internal/config"
	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"google.golang.org/api/option"
)

// PushService manages Web Push and FCM subscriptions and notification dispatches
type PushService interface {
	GetVAPIDPublicKey() string
	Subscribe(ctx context.Context, input *model.PushSubscriptionInput) (*model.PushSubscriptionRecord, error)
	Unsubscribe(ctx context.Context, endpoint string) error
	SendSchedulePushNotification(ctx context.Context, session *model.ScheduleSession)
	SendAttendancePushNotification(ctx context.Context, att *model.AttendanceRecord, session *model.ScheduleSession)
	SendTestPush(ctx context.Context, input *model.TestPushInput) (int, error)
	BroadcastPush(ctx context.Context, input *model.BroadcastPushInput) (sentCount int, totalCount int, err error)
}

type pushService struct {
	cfg             *config.Config
	pushRepo        repository.PushRepository
	attRepo         repository.AttendanceRepository
	vapidPublicKey  string
	vapidPrivateKey string
	vapidSubject    string
	fcmClient       *messaging.Client
}

// NewPushService initializes PushService with VAPID and Firebase Cloud Messaging credentials
func NewPushService(cfg *config.Config, pushRepo repository.PushRepository, attRepo repository.AttendanceRepository) PushService {
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

	// Initialize Firebase Admin SDK for FCM if credentials are provided
	var fcmClient *messaging.Client
	ctx := context.Background()

	var fbOpts []option.ClientOption
	if cfg.FirebaseCredentialsJSON != "" {
		fbOpts = append(fbOpts, option.WithCredentialsJSON([]byte(cfg.FirebaseCredentialsJSON)))
	} else if cfg.FirebaseCredentialsFile != "" {
		if _, err := os.Stat(cfg.FirebaseCredentialsFile); err == nil {
			fbOpts = append(fbOpts, option.WithCredentialsFile(cfg.FirebaseCredentialsFile))
		}
	}

	fbConfig := &firebase.Config{}
	if cfg.FirebaseProjectID != "" {
		fbConfig.ProjectID = cfg.FirebaseProjectID
	}

	fbApp, err := firebase.NewApp(ctx, fbConfig, fbOpts...)
	if err == nil {
		client, err := fbApp.Messaging(ctx)
		if err == nil {
			fcmClient = client
			log.Println("[FCM] Firebase Cloud Messaging initialized successfully.")
		} else {
			log.Printf("[FCM] Note: Firebase Messaging client not initialized (%v). Standard WebPush active.", err)
		}
	} else {
		log.Printf("[FCM] Note: Firebase App not initialized (%v). Standard WebPush active.", err)
	}

	return &pushService{
		cfg:             cfg,
		pushRepo:        pushRepo,
		attRepo:         attRepo,
		vapidPublicKey:  pubKey,
		vapidPrivateKey: privKey,
		vapidSubject:    subject,
		fcmClient:       fcmClient,
	}
}

// GetVAPIDPublicKey returns the public key for browser pushManager subscription
func (s *pushService) GetVAPIDPublicKey() string {
	return s.vapidPublicKey
}

// Subscribe saves or updates a browser push subscription
func (s *pushService) Subscribe(ctx context.Context, input *model.PushSubscriptionInput) (*model.PushSubscriptionRecord, error) {
	if input.Endpoint == "" && input.FCMToken == "" {
		return nil, fmt.Errorf("endpoint or fcm_token is required")
	}

	record := &model.PushSubscriptionRecord{
		UserID:      input.UserID,
		Role:        input.Role,
		Username:    input.Username,
		StudentName: input.StudentName,
		Endpoint:    input.Endpoint,
		P256dh:      input.Keys.P256dh,
		Auth:        input.Keys.Auth,
		FCMToken:    input.FCMToken,
	}

	if err := s.pushRepo.Upsert(ctx, record); err != nil {
		return nil, fmt.Errorf("failed to save push subscription: %w", err)
	}

	log.Printf("[Push] Subscribed device for user=%s, role=%s, student=%s (fcm=%t, id=%d)",
		record.Username, record.Role, record.StudentName, record.FCMToken != "", record.ID)

	return record, nil
}

// Unsubscribe deletes a subscription by endpoint
func (s *pushService) Unsubscribe(ctx context.Context, endpoint string) error {
	if endpoint == "" {
		return fmt.Errorf("endpoint is required")
	}
	return s.pushRepo.DeleteByEndpoint(ctx, endpoint)
}

// sendSinglePush sends notification payload using FCM (if token present) or Web Push
func (s *pushService) sendSinglePush(ctx context.Context, sub *model.PushSubscriptionRecord, payload *model.WebPushPayload) error {
	// 1. Try Firebase Cloud Messaging (FCM) first if FCM Token and Client are available
	cleanFCMToken := strings.TrimSpace(sub.FCMToken)
	if cleanFCMToken != "" && s.fcmClient != nil {
		dataMap := make(map[string]string)
		if payload.Data != nil {
			for k, v := range payload.Data {
				dataMap[k] = fmt.Sprintf("%v", v)
			}
		}
		dataMap["title"] = payload.Title
		dataMap["body"] = payload.Body
		dataMap["unread_count"] = strconv.Itoa(payload.UnreadCount)
		dataMap["tag"] = payload.Tag

		targetURL := "/apps"
		if payload.Data != nil {
			if u, ok := payload.Data["url"].(string); ok && u != "" {
				targetURL = u
			}
		}
		dataMap["url"] = targetURL

		fcmNotif := &messaging.Notification{
			Title: payload.Title,
			Body:  payload.Body,
		}
		// FCM Notification.ImageURL strictly requires an absolute http(s) URL
		if strings.HasPrefix(payload.Icon, "http://") || strings.HasPrefix(payload.Icon, "https://") {
			fcmNotif.ImageURL = payload.Icon
		}

		webpushNotif := &messaging.WebpushNotification{
			Title: payload.Title,
			Body:  payload.Body,
			Tag:   payload.Tag,
			Badge: payload.Badge,
		}
		if payload.Icon != "" {
			webpushNotif.Icon = payload.Icon
		}

		webpushConfig := &messaging.WebpushConfig{
			Headers: map[string]string{
				"Urgency": "high",
				"TTL":     "86400",
			},
			Notification: webpushNotif,
		}

		// Resolve Link for WebpushFCMOptions: Firebase requires valid HTTPS scheme
		linkURL := targetURL
		if !strings.HasPrefix(linkURL, "http://") && !strings.HasPrefix(linkURL, "https://") {
			if s.cfg != nil && s.cfg.AppURL != "" {
				base := strings.TrimRight(s.cfg.AppURL, "/")
				path := strings.TrimLeft(targetURL, "/")
				linkURL = base + "/" + path
			}
		}

		// Only include FCMOptions.Link if it is a valid HTTPS URL (Firebase rejects relative paths or non-https)
		if strings.HasPrefix(linkURL, "https://") {
			webpushConfig.FCMOptions = &messaging.WebpushFCMOptions{
				Link: linkURL,
			}
		}

		msg := &messaging.Message{
			Token:        cleanFCMToken,
			Notification: fcmNotif,
			Data:         dataMap,
			Webpush:      webpushConfig,
		}

		fcmResp, err := s.fcmClient.Send(ctx, msg)
		if err == nil {
			log.Printf("[FCM] Message sent successfully to user=%s (resp=%s)", sub.Username, fcmResp)
			return nil
		}
		log.Printf("[FCM] Send error for token (user=%s): %v. Falling back to WebPush...", sub.Username, err)
	}

	// 2. Standard Web Push (RFC 8291/8292) using VAPID
	if sub.Endpoint == "" || sub.P256dh == "" || sub.Auth == "" {
		return fmt.Errorf("push endpoint or cryptographic keys missing")
	}

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

// BroadcastPush broadcasts an announcement push notification to all subscribed devices and records it in notifications table
func (s *pushService) BroadcastPush(ctx context.Context, input *model.BroadcastPushInput) (int, int, error) {
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Message) == "" {
		return 0, 0, fmt.Errorf("judul dan pesan pengumuman tidak boleh kosong")
	}

	notifType := input.Type
	if notifType == "" {
		notifType = "announcement"
	}

	// 1. Save announcement notification to database for all users
	if s.attRepo != nil {
		notifRecord := &model.AdminNotification{
			Title:      input.Title,
			Message:    input.Message,
			Type:       notifType,
			TargetRole: "all",
			IsRead:     false,
			CreatedAt:  time.Now(),
		}
		if err := s.attRepo.CreateNotification(ctx, notifRecord); err != nil {
			log.Printf("[WebPush] Warning: Failed to persist broadcast notification: %v", err)
		} else {
			log.Printf("[WebPush] Broadcast notification persisted with ID=%d", notifRecord.ID)
		}
	}

	// 2. Fetch all active device push subscriptions
	subs, err := s.pushRepo.FindAll(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("gagal mengambil daftar perangkat terdaftar: %w", err)
	}

	if len(subs) == 0 {
		log.Println("[WebPush] Broadcast notification recorded, but no push subscriptions found.")
		return 0, 0, nil
	}

	targetURL := input.URL
	if targetURL == "" {
		targetURL = "/apps"
	}

	// 3. Dispatch Web Push notification to all subscribers
	sentCount := 0
	tag := fmt.Sprintf("announcement-%d", time.Now().Unix())

	for _, sub := range subs {
		// Calculate current unread count for the recipient device
		unreadCount, _ := s.pushRepo.GetUnreadNotificationCount(ctx, sub.Role, sub.StudentName, sub.UserID)
		if unreadCount <= 0 {
			unreadCount = 1
		}

		payload := &model.WebPushPayload{
			Title:       input.Title,
			Body:        input.Message,
			Message:     input.Message,
			Icon:        "/icon.png",
			Badge:       "/icon.png",
			Tag:         tag,
			UnreadCount: unreadCount,
			Data: map[string]interface{}{
				"url":  targetURL,
				"type": "announcement",
			},
		}

		if err := s.sendSinglePush(ctx, &sub, payload); err != nil {
			log.Printf("[WebPush] Failed sending broadcast to endpoint=%s user=%s: %v", sub.Endpoint[:min(30, len(sub.Endpoint))], sub.Username, err)
		} else {
			sentCount++
		}
	}

	log.Printf("[WebPush] Broadcast push successfully sent to %d / %d devices (Title: %s)", sentCount, len(subs), input.Title)
	return sentCount, len(subs), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

