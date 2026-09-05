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
		avatar VARCHAR(255) DEFAULT '',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS students (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		class VARCHAR(100) NOT NULL,
		attendance_rate VARCHAR(50) DEFAULT '100%',
		parent VARCHAR(255) NOT NULL,
		phone VARCHAR(50),
		age VARCHAR(50),
		status VARCHAR(50) DEFAULT 'Active',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS coaches (
		id SERIAL PRIMARY KEY,
		user_id INT REFERENCES users(id) ON DELETE SET NULL,
		name VARCHAR(255) NOT NULL,
		spec VARCHAR(255) NOT NULL,
		phone VARCHAR(50) NOT NULL,
		email VARCHAR(255) NOT NULL,
		class VARCHAR(100) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS attendance_logs (
		id SERIAL PRIMARY KEY,
		student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
		date VARCHAR(100) NOT NULL,
		status VARCHAR(50) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS schedules (
		id SERIAL PRIMARY KEY,
		title VARCHAR(255) NOT NULL,
		class VARCHAR(100) NOT NULL,
		date VARCHAR(50) NOT NULL,
		time_start VARCHAR(20) NOT NULL,
		time_end VARCHAR(20) NOT NULL,
		pool_area VARCHAR(100) NOT NULL,
		coach_id VARCHAR(50) NOT NULL,
		coach_name VARCHAR(255) NOT NULL,
		coach_phone VARCHAR(50),
		student_ids TEXT NOT NULL DEFAULT '[]',
		student_names TEXT NOT NULL DEFAULT '[]',
		notes TEXT DEFAULT '',
		status VARCHAR(50) DEFAULT 'Active',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS invoices (
		id SERIAL PRIMARY KEY,
		student_id VARCHAR(50) NOT NULL,
		name VARCHAR(255) NOT NULL,
		amount NUMERIC(12,2) NOT NULL,
		description VARCHAR(255) NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'Belum Dibayar',
		upload_receipt VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	-- Add column avatar if not exists
	ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT '';
	`

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
