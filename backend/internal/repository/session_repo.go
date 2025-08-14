package repository

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/models"
)

type SessionRepository struct {
	db *database.DB
}

func NewSessionRepository(db *database.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(userID int, ipAddress, userAgent string, sessionData *models.SessionData) (*models.Session, error) {
	// First delete any existing sessions for this user (single session enforcement)
	err := r.DeleteByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to delete existing sessions: %w", err)
	}

	sessionID := uuid.New().String()
	payload, err := json.Marshal(sessionData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal session data: %w", err)
	}

	lastActivity := int(time.Now().Unix())
	
	query := `
		INSERT INTO sessions (id, user_id, ip_address, user_agent, payload, last_activity)
		VALUES ($1, $2, $3, $4, $5, $6)`
	
	_, err = r.db.Exec(query, sessionID, userID, ipAddress, userAgent, string(payload), lastActivity)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &models.Session{
		ID:           sessionID,
		UserID:       (*int64)(new(int64)),
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		Payload:      string(payload),
		LastActivity: lastActivity,
	}, nil
}

func (r *SessionRepository) GetByID(sessionID string) (*models.Session, error) {
	session := &models.Session{}
	query := `
		SELECT id, user_id, ip_address, user_agent, payload, last_activity
		FROM sessions 
		WHERE id = $1`
	
	err := r.db.Get(session, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	return session, nil
}

func (r *SessionRepository) UpdateActivity(sessionID string) error {
	lastActivity := int(time.Now().Unix())
	query := `UPDATE sessions SET last_activity = $1 WHERE id = $2`
	
	_, err := r.db.Exec(query, lastActivity, sessionID)
	if err != nil {
		return fmt.Errorf("failed to update session activity: %w", err)
	}
	return nil
}

func (r *SessionRepository) Delete(sessionID string) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := r.db.Exec(query, sessionID)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

func (r *SessionRepository) DeleteByUserID(userID int) error {
	query := `DELETE FROM sessions WHERE user_id = $1`
	_, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}
	return nil
}

func (r *SessionRepository) CleanupExpired(maxAge time.Duration) error {
	cutoff := int(time.Now().Add(-maxAge).Unix())
	query := `DELETE FROM sessions WHERE last_activity < $1`
	
	result, err := r.db.Exec(query, cutoff)
	if err != nil {
		return fmt.Errorf("failed to cleanup expired sessions: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("Cleaned up %d expired sessions\n", rowsAffected)
	
	return nil
}

func (r *SessionRepository) GetSessionData(sessionID string) (*models.SessionData, error) {
	session, err := r.GetByID(sessionID)
	if err != nil {
		return nil, err
	}

	var sessionData models.SessionData
	err = json.Unmarshal([]byte(session.Payload), &sessionData)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal session data: %w", err)
	}

	return &sessionData, nil
}

func (r *SessionRepository) IsValid(sessionID string, maxIdleTime time.Duration) (bool, error) {
	session, err := r.GetByID(sessionID)
	if err != nil {
		return false, nil // Session doesn't exist
	}

	lastActivity := time.Unix(int64(session.LastActivity), 0)
	if time.Since(lastActivity) > maxIdleTime {
		// Session expired, delete it
		r.Delete(sessionID)
		return false, nil
	}

	return true, nil
}