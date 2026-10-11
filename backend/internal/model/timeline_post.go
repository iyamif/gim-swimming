package model

import "time"

// TimelinePost represents a shared community post on the timeline
type TimelinePost struct {
	ID           string    `json:"id"`
	AuthorName   string    `json:"authorName"`
	AuthorRole   string    `json:"authorRole"`
	AuthorAvatar string    `json:"authorAvatar,omitempty"`
	Caption      string    `json:"caption"`
	MediaURL     string    `json:"mediaUrl,omitempty"`
	MediaType    string    `json:"mediaType,omitempty"` // "image" or "video"
	Category     string    `json:"category"`
	Likes        int       `json:"likes"`
	LikedBy      []string  `json:"likedBy"`
	CreatedAt    string    `json:"createdAt"`
	CreatedTime  time.Time `json:"created_time"`
}

// CreateTimelinePostInput payload for creating a post
type CreateTimelinePostInput struct {
	AuthorName   string `json:"authorName" binding:"required"`
	AuthorRole   string `json:"authorRole"`
	AuthorAvatar string `json:"authorAvatar"`
	Caption      string `json:"caption"`
	MediaURL     string `json:"mediaUrl"`
	MediaType    string `json:"mediaType"`
	Category     string `json:"category"`
}
