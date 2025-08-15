package middleware

import (
	"context"
	"net/http"

	"github.com/medxamion/medxamion/internal/config"
	"github.com/medxamion/medxamion/internal/services"
	"github.com/medxamion/medxamion/internal/tables"
)

type contextKey string

const (
	UserContextKey        contextKey = "user"
	SessionDataContextKey contextKey = "session_data"
)

type AuthMiddleware struct {
	authService *services.AuthService
	config      *config.Config
}

func NewAuthMiddleware(authService *services.AuthService, config *config.Config) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
		config:      config,
	}
}

func (m *AuthMiddleware) SessionMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var sessionID string

			// Try to get session from cookie first
			cookie, err := r.Cookie(m.config.SessionCookieName)
			if err == nil {
				sessionID = cookie.Value
			} else {
				// Fallback to X-Session-ID header (for compatibility with current frontend)
				sessionID = r.Header.Get("X-Session-ID")
				if sessionID == "" {
					// No session found, continue without auth
					next.ServeHTTP(w, r)
					return
				}
			}

			// Validate session
			user, sessionData, err := m.authService.ValidateSession(sessionID)
			if err != nil {
				// Invalid session, clear cookie if it exists
				if cookie != nil {
					http.SetCookie(w, &http.Cookie{
						Name:     m.config.SessionCookieName,
						Value:    "",
						Path:     "/",
						MaxAge:   -1,
						HttpOnly: true,
						Secure:   m.config.SessionCookieSecure,
						SameSite: http.SameSiteStrictMode,
					})
				}
				next.ServeHTTP(w, r)
				return
			}

			// Add user and session data to request context
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			ctx = context.WithValue(ctx, SessionDataContextKey, sessionData)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func (m *AuthMiddleware) RequireAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (m *AuthMiddleware) RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sessionData := GetSessionDataFromContext(r.Context())
			if sessionData == nil {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			hasRequiredRole := false
			for _, requiredRole := range roles {
				if m.authService.HasRole(sessionData, requiredRole) {
					hasRequiredRole = true
					break
				}
			}

			if !hasRequiredRole {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func (m *AuthMiddleware) RequireAdmin() func(http.Handler) http.Handler {
	return m.RequireRole("administrator")
}

// Helper functions to get user and session data from context
func GetUserFromContext(ctx context.Context) *tables.User {
	user, ok := ctx.Value(UserContextKey).(*tables.User)
	if !ok {
		return nil
	}
	return user
}

func GetSessionDataFromContext(ctx context.Context) *tables.SessionData {
	sessionData, ok := ctx.Value(SessionDataContextKey).(*tables.SessionData)
	if !ok {
		return nil
	}
	return sessionData
}
