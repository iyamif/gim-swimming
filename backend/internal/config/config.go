package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	Port       string
	DBURL      string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	JWTSecret               string
	VAPIDPublicKey          string
	VAPIDPrivateKey         string
	VAPIDSubject            string
	FirebaseProjectID       string
	FirebaseCredentialsJSON string
	FirebaseCredentialsFile string
	FCMServerKey            string
}

// LoadConfig loads the configuration from environment variables with sensible defaults
func LoadConfig() *Config {
	// Attempt to load .env file. We ignore the error so that if it doesn't exist 
	// (e.g. in staging/production), the app will read directly from OS environment variables.
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found, using system environment variables")
	}

	return &Config{
		Port:                    getEnv("PORT", "8080"),
		DBURL:                   getEnv("DATABASE_URL", ""),
		DBHost:                  getEnv("DB_HOST", "localhost"),
		DBPort:                  getEnv("DB_PORT", "5432"),
		DBUser:                  getEnv("DB_USER", "postgres"),
		DBPassword:              getEnv("DB_PASSWORD", "postgres"),
		DBName:                  getEnv("DB_NAME", "gim_swimming"),
		DBSSLMode:               getEnv("DB_SSLMODE", "disable"),
		JWTSecret:               getEnv("JWT_SECRET", "gim_swimming_secret_key_123"),
		VAPIDPublicKey:          getEnv("VAPID_PUBLIC_KEY", "BP1E0qAKBOVQHlCwm5K8IF7kYkX1_IxtFrd_LzVzSsAjV6gPSooiYCV8xnaUu6k1rVd4jY_J6c3k0qUhcngrROU"),
		VAPIDPrivateKey:         getEnv("VAPID_PRIVATE_KEY", "cfiU4mGT5VAUuyjB5vTLW1KfjFfcAm235-5RCyNNWMk"),
		VAPIDSubject:            getEnv("VAPID_SUBJECT", "mailto:admin@gimswimming.com"),
		FirebaseProjectID:       getEnv("FIREBASE_PROJECT_ID", ""),
		FirebaseCredentialsJSON: getEnvRaw("FIREBASE_CREDENTIALS_JSON", ""),
		FirebaseCredentialsFile: getEnv("FIREBASE_CREDENTIALS_FILE", "firebase-service-account.json"),
		FCMServerKey:            getEnv("FCM_SERVER_KEY", ""),
	}
}

// getEnv gets an environment variable or returns a default value, stripping line breaks
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "\n", "")
	value = strings.ReplaceAll(value, "\r", "")
	value = strings.ReplaceAll(value, "\\n", "")
	value = strings.ReplaceAll(value, "\\r", "")
	return strings.TrimSpace(value)
}

// getEnvRaw gets an environment variable preserving newlines (for JSON / private keys)
func getEnvRaw(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return strings.TrimSpace(value)
}
