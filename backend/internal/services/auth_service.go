package services

import (
	"fmt"

	"github.com/medxamion/medxamion/internal/config"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
	"github.com/medxamion/medxamion/internal/utils"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	sessionRepo *repository.SessionRepository
	config      *config.Config
}

func NewAuthService(userRepo *repository.UserRepository, sessionRepo *repository.SessionRepository, config *config.Config) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		config:      config,
	}
}

func (s *AuthService) Login(username, password, ipAddress, userAgent string) (*models.Session, *models.User, error) {
	// Debug logging
	fmt.Printf("DEBUG: Login attempt for username: '%s'\n", username)
	
	// Get user by username
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		fmt.Printf("DEBUG: User lookup failed: %v\n", err)
		return nil, nil, fmt.Errorf("invalid credentials")
	}

	fmt.Printf("DEBUG: Found user: ID=%d, Username='%s'\n", user.ID, user.Username)

	// Check password
	if !utils.CheckPasswordHash(password, user.Password) {
		fmt.Printf("DEBUG: Password check failed for user %s\n", username)
		return nil, nil, fmt.Errorf("invalid credentials")
	}
	
	fmt.Printf("DEBUG: Password check passed for user %s\n", username)

	// Get user roles
	roles, err := s.userRepo.GetUserRoles(user.ID)
	if err != nil {
		fmt.Printf("DEBUG: Failed to get user roles for user %d: %v\n", user.ID, err)
		return nil, nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	
	fmt.Printf("DEBUG: Got %d roles for user %s\n", len(roles), username)

	// Create session data
	sessionData := &models.SessionData{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		Name:     user.Name,
		Roles:    roles,
	}

	// Create session (this will delete any existing sessions for this user)
	fmt.Printf("DEBUG: Creating session for user %s\n", username)
	session, err := s.sessionRepo.Create(user.ID, ipAddress, userAgent, sessionData)
	if err != nil {
		fmt.Printf("DEBUG: Failed to create session for user %d: %v\n", user.ID, err)
		return nil, nil, fmt.Errorf("failed to create session: %w", err)
	}
	
	fmt.Printf("DEBUG: Session created successfully for user %s, session ID: %s\n", username, session.ID)

	// Update last login
	err = s.userRepo.UpdateLastLogin(user.ID)
	if err != nil {
		// Non-critical error, just log it
		fmt.Printf("Warning: failed to update last login for user %d: %v\n", user.ID, err)
	}

	return session, user, nil
}

func (s *AuthService) Logout(sessionID string) error {
	return s.sessionRepo.Delete(sessionID)
}

func (s *AuthService) ValidateSession(sessionID string) (*models.User, *models.SessionData, error) {
	// Check if session is valid (exists and not expired)
	isValid, err := s.sessionRepo.IsValid(sessionID, s.config.SessionIdleTimeout)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to validate session: %w", err)
	}
	
	if !isValid {
		return nil, nil, fmt.Errorf("session invalid or expired")
	}

	// Get session data
	sessionData, err := s.sessionRepo.GetSessionData(sessionID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get session data: %w", err)
	}

	// Get full user data
	user, err := s.userRepo.GetByID(sessionData.UserID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Update session activity
	err = s.sessionRepo.UpdateActivity(sessionID)
	if err != nil {
		// Non-critical error
		fmt.Printf("Warning: failed to update session activity: %v\n", err)
	}

	return user, sessionData, nil
}

func (s *AuthService) HasRole(sessionData *models.SessionData, roleName string) bool {
	for _, role := range sessionData.Roles {
		if role.Name == roleName {
			return true
		}
	}
	return false
}

func (s *AuthService) IsAdmin(sessionData *models.SessionData) bool {
	return s.HasRole(sessionData, "administrator")
}

func (s *AuthService) CleanupExpiredSessions() error {
	return s.sessionRepo.CleanupExpired(s.config.SessionLifetime)
}