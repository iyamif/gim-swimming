package model

import "time"

// PushSubscriptionRecord represents a stored browser push subscription in PostgreSQL
type PushSubscriptionRecord struct {
	ID          int64     `json:"id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`         // "admin", "pelatih", "orang tua", "student"
	Username    string    `json:"username"`     // e.g. "admin", "coach_bambang", "rian"
	StudentName string    `json:"student_name"` // e.g. "Rian"
	Endpoint    string    `json:"endpoint"`
	P256dh      string    `json:"p256dh"`
	Auth        string    `json:"auth"`
	FCMToken    string    `json:"fcm_token"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PushSubscriptionKeys contains the p256dh and auth client keys
type PushSubscriptionKeys struct {
	P256dh string `json:"p256dh" binding:"required"`
	Auth   string `json:"auth" binding:"required"`
}

// PushSubscriptionInput represents the payload sent by the frontend on subscription
type PushSubscriptionInput struct {
	Endpoint    string               `json:"endpoint" binding:"required"`
	Keys        PushSubscriptionKeys `json:"keys" binding:"required"`
	Role        string               `json:"role"`
	Username    string               `json:"username"`
	StudentName string               `json:"student_name"`
	UserID      string               `json:"user_id"`
	FCMToken    string               `json:"fcm_token"`
}

// PushUnsubscribeInput represents the payload sent to remove a subscription
type PushUnsubscribeInput struct {
	Endpoint string `json:"endpoint" binding:"required"`
}

// WebPushPayload is the JSON structure sent inside the encrypted Web Push notification
type WebPushPayload struct {
	Title       string                 `json:"title"`
	Body        string                 `json:"body"`
	Message     string                 `json:"message,omitempty"`
	Icon        string                 `json:"icon,omitempty"`
	Badge       string                 `json:"badge,omitempty"`
	Tag         string                 `json:"tag,omitempty"`
	UnreadCount int                    `json:"unread_count"`
	Data        map[string]interface{} `json:"data,omitempty"`
}

// TestPushInput represents the payload for sending a test notification to the user's current device
type TestPushInput struct {
	Role        string `json:"role"`
	Username    string `json:"username"`
	StudentName string `json:"student_name"`
	UserID      string `json:"user_id"`
	Title       string `json:"title,omitempty"`
	Message     string `json:"message,omitempty"`
}

// BroadcastPushInput represents payload when Admin broadcasts an announcement to all PWA devices
type BroadcastPushInput struct {
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
	URL     string `json:"url,omitempty"`
	Type    string `json:"type,omitempty"`
}

