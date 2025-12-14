// Package config handles application configuration.
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	Port                 string
	Environment          string
	FrontendURL          string
	GTFSDataPath         string
	LogLevel             string
	LogFormat            string // "json" or "console" (pretty)
	SwissTransportAPIURL string
	EnableSwissAPI       bool
	WSUpdateInterval     int // seconds
}

// Load loads configuration from environment variables.
func Load() *Config {
	// Load .env file if it exists (ignore error if not found)
	_ = godotenv.Load()

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		Environment:          getEnv("ENVIRONMENT", "development"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:3000"),
		GTFSDataPath:         getEnv("GTFS_DATA_PATH", "../data-swiss/gtfs-out"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		LogFormat:            getEnv("LOG_FORMAT", "json"), // Default to JSON format for structured logging
		SwissTransportAPIURL: getEnv("SWISS_TRANSPORT_API_URL", "https://transport.opendata.ch/v1"),
		EnableSwissAPI:       getEnvBool("ENABLE_SWISS_API", true),
		WSUpdateInterval:     getEnvInt("WS_UPDATE_INTERVAL", 5),
	}
}

// getEnv retrieves an environment variable with a default fallback.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvBool retrieves a boolean environment variable.
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return defaultValue
		}
		return parsed
	}
	return defaultValue
}

// getEnvInt retrieves an integer environment variable.
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return defaultValue
		}
		return parsed
	}
	return defaultValue
}

// IsDevelopment returns true if running in development mode.
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// IsProduction returns true if running in production mode.
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}
