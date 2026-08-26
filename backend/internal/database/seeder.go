package database

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/iyamif/gim-swimming/internal/model"
	"github.com/iyamif/gim-swimming/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// SeedUsers checks if the default users exist, and if not, creates them.
func SeedUsers(userRepo repository.UserRepository) {
	ctx := context.Background()

	defaultUsers := []struct {
		username string
		email    string
		password string
		role     string
	}{
		{
			username: "admin",
			email:    "admin@gimswimming.com",
			password: "password123",
			role:     model.RoleAdmin,
		},
		{
			username: "pelatih",
			email:    "pelatih@gimswimming.com",
			password: "password123",
			role:     model.RolePelatih,
		},
		{
			username: "ortu",
			email:    "ortu@gimswimming.com",
			password: "password123",
			role:     model.RoleOrangTua,
		},
	}

	log.Println("Checking database for default seed users...")

	for _, du := range defaultUsers {
		existing, err := userRepo.FindByEmail(ctx, du.email)
		if err != nil {
			log.Printf("Error searching for seed user %s: %v", du.email, err)
			continue
		}

		if existing == nil {
			log.Printf("Seeding default user: %s (%s)...", du.username, du.role)
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(du.password), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("Failed to hash password for %s: %v", du.username, err)
				continue
			}

			user := &model.User{
				Username:  du.username,
				Email:     strings.ToLower(du.email),
				Password:  string(hashedPassword),
				Role:      du.role,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			err = userRepo.Create(ctx, user)
			if err != nil {
				log.Printf("Failed to create seed user %s: %v", du.username, err)
			} else {
				log.Printf("Successfully seeded default user %s (%s) with ID %d", du.username, du.role, user.ID)
			}
		} else {
			log.Printf("Seed user already exists: %s (%s)", du.username, du.role)
		}
	}
}
