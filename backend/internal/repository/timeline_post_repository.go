package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
)

// TimelinePostRepository defines database operations for timeline posts
type TimelinePostRepository interface {
	FindAll(ctx context.Context) ([]model.TimelinePost, error)
	Create(ctx context.Context, post *model.TimelinePost) error
	Delete(ctx context.Context, id string) error
	ToggleLike(ctx context.Context, id string, username string) (*model.TimelinePost, error)
}

type pgTimelinePostRepository struct {
	db *sql.DB
}

// NewTimelinePostRepository creates a new TimelinePostRepository
func NewTimelinePostRepository(db *sql.DB) TimelinePostRepository {
	return &pgTimelinePostRepository{db: db}
}

func parseTimelinePostID(id string) (int64, error) {
	id = strings.TrimPrefix(id, "post-")
	id = strings.TrimPrefix(id, "post_")
	return strconv.ParseInt(id, 10, 64)
}

func (r *pgTimelinePostRepository) FindAll(ctx context.Context) ([]model.TimelinePost, error) {
	query := `
		SELECT id, author_name, author_role, COALESCE(author_avatar, ''), caption, 
		       COALESCE(media_url, ''), COALESCE(media_type, ''), category, likes, 
		       COALESCE(liked_by, '[]'), created_at
		FROM timeline_posts
		ORDER BY id DESC
		LIMIT 100;
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []model.TimelinePost
	for rows.Next() {
		var p model.TimelinePost
		var intID int64
		var likedByJSON string
		var t time.Time

		err := rows.Scan(
			&intID,
			&p.AuthorName,
			&p.AuthorRole,
			&p.AuthorAvatar,
			&p.Caption,
			&p.MediaURL,
			&p.MediaType,
			&p.Category,
			&p.Likes,
			&likedByJSON,
			&t,
		)
		if err != nil {
			return nil, err
		}

		p.ID = fmt.Sprintf("post-%d", intID)
		p.CreatedTime = t
		p.CreatedAt = t.Format("02 Jan 15:04")

		var likedBy []string
		if likedByJSON != "" {
			_ = json.Unmarshal([]byte(likedByJSON), &likedBy)
		}
		p.LikedBy = likedBy

		posts = append(posts, p)
	}

	return posts, rows.Err()
}

func (r *pgTimelinePostRepository) Create(ctx context.Context, post *model.TimelinePost) error {
	query := `
		INSERT INTO timeline_posts (author_name, author_role, author_avatar, caption, media_url, media_type, category, likes, liked_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, created_at;
	`
	likedByJSON, _ := json.Marshal(post.LikedBy)
	if string(likedByJSON) == "" || string(likedByJSON) == "null" {
		likedByJSON = []byte("[]")
	}

	var id int64
	var t time.Time
	err := r.db.QueryRowContext(ctx, query,
		post.AuthorName,
		post.AuthorRole,
		post.AuthorAvatar,
		post.Caption,
		post.MediaURL,
		post.MediaType,
		post.Category,
		post.Likes,
		string(likedByJSON),
	).Scan(&id, &t)

	if err != nil {
		return err
	}

	post.ID = fmt.Sprintf("post-%d", id)
	post.CreatedTime = t
	post.CreatedAt = "Baru saja"
	return nil
}

func (r *pgTimelinePostRepository) Delete(ctx context.Context, id string) error {
	numID, err := parseTimelinePostID(id)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `DELETE FROM timeline_posts WHERE id = $1`, numID)
	return err
}

func (r *pgTimelinePostRepository) ToggleLike(ctx context.Context, id string, username string) (*model.TimelinePost, error) {
	numID, err := parseTimelinePostID(id)
	if err != nil {
		return nil, err
	}

	var likedByJSON string
	var currentLikes int
	query := `SELECT likes, COALESCE(liked_by, '[]') FROM timeline_posts WHERE id = $1`
	err = r.db.QueryRowContext(ctx, query, numID).Scan(&currentLikes, &likedByJSON)
	if err != nil {
		return nil, err
	}

	var likedBy []string
	if likedByJSON != "" {
		_ = json.Unmarshal([]byte(likedByJSON), &likedBy)
	}

	// Check if already liked
	hasLiked := false
	var newLikedBy []string
	for _, u := range likedBy {
		if strings.EqualFold(u, username) {
			hasLiked = true
		} else {
			newLikedBy = append(newLikedBy, u)
		}
	}

	newLikes := currentLikes
	if hasLiked {
		newLikes = currentLikes - 1
		if newLikes < 0 {
			newLikes = 0
		}
	} else {
		newLikedBy = append(newLikedBy, username)
		newLikes = currentLikes + 1
	}

	newJSON, _ := json.Marshal(newLikedBy)
	updateQuery := `
		UPDATE timeline_posts 
		SET likes = $1, liked_by = $2, updated_at = NOW() 
		WHERE id = $3 
		RETURNING id, author_name, author_role, COALESCE(author_avatar, ''), caption, 
		          COALESCE(media_url, ''), COALESCE(media_type, ''), category, likes, 
		          COALESCE(liked_by, '[]'), created_at;
	`

	var p model.TimelinePost
	var intID int64
	var resLikedJSON string
	var t time.Time

	err = r.db.QueryRowContext(ctx, updateQuery, newLikes, string(newJSON), numID).Scan(
		&intID,
		&p.AuthorName,
		&p.AuthorRole,
		&p.AuthorAvatar,
		&p.Caption,
		&p.MediaURL,
		&p.MediaType,
		&p.Category,
		&p.Likes,
		&resLikedJSON,
		&t,
	)
	if err != nil {
		return nil, err
	}

	p.ID = fmt.Sprintf("post-%d", intID)
	p.CreatedTime = t
	p.CreatedAt = t.Format("02 Jan 15:04")
	p.LikedBy = newLikedBy
	return &p, nil
}
