package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	DatabaseURL         string
	Port                int
	Environment         string
	SessionLifetime     time.Duration
	SessionIdleTimeout  time.Duration
	SessionCookieName   string
	SessionCookieSecure bool
	SessionCookieDomain string
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("PORT", "8080"))
	sessionLifetime, _ := time.ParseDuration(getEnv("SESSION_LIFETIME", "24h"))
	sessionIdleTimeout, _ := time.ParseDuration(getEnv("SESSION_IDLE_TIMEOUT", "2h"))
	sessionCookieSecure, _ := strconv.ParseBool(getEnv("SESSION_COOKIE_SECURE", "false"))

	return &Config{
		DatabaseURL:         getEnv("DATABASE_URL", ""),
		Port:                port,
		Environment:         getEnv("ENV", "development"),
		SessionLifetime:     sessionLifetime,
		SessionIdleTimeout:  sessionIdleTimeout,
		SessionCookieName:   getEnv("SESSION_COOKIE_NAME", "medxam_session"),
		SessionCookieSecure: sessionCookieSecure,
		SessionCookieDomain: getEnv("SESSION_COOKIE_DOMAIN", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
