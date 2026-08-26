package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/iyamif/gim-swimming/internal/config"
	_ "github.com/lib/pq" // PostgreSQL driver
)

// DB is the global database connection pool
var DB *sql.DB

// ConnectDB initializes the PostgreSQL connection
func ConnectDB(cfg *config.Config) (*sql.DB, error) {
	var dsn string
	if cfg.DBURL != "" {
		log.Println("Connecting to PostgreSQL using DATABASE_URL...")
		dsn = cfg.DBURL
	} else {
		log.Printf("Connecting to PostgreSQL database %s on %s:%s...", cfg.DBName, cfg.DBHost, cfg.DBPort)
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %v", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection using Ping with a 3 second timeout
	err = db.Ping()
	if err != nil {
		log.Printf("WARNING: Could not ping PostgreSQL database: %v. Please make sure PostgreSQL is running.", err)
	} else {
		log.Println("Connected to PostgreSQL successfully!")
	}

	DB = db

	// Run schema migrations automatically on startup
	if err := runMigrations(); err != nil {
		log.Printf("WARNING: Failed to run database migrations: %v", err)
	} else {
		log.Println("Database schema migrations applied successfully.")
	}

	return db, nil
}

// runMigrations creates the initial database tables programmatically
func runMigrations() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username VARCHAR(100) UNIQUE NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(query)
	return err
}

// DisconnectDB closes database connection pool
func DisconnectDB() {
	if DB == nil {
		return
	}

	if err := DB.Close(); err != nil {
		log.Printf("Error closing PostgreSQL connection: %v", err)
	} else {
		log.Println("PostgreSQL connection closed.")
	}
}
