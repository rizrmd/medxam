package services

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// ExamDeliveryDB manages the local SQLite database for a delivery
type ExamDeliveryDB struct {
	db         *sql.DB
	deliveryID int
	dbPath     string
}

// ParticipantData represents a participant in the local database
type ParticipantData struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Identifier string `json:"identifier"`
	Status     string `json:"status"`
}

// AttemptData represents an attempt in the local database
type AttemptData struct {
	ID              int        `json:"id"`
	ParticipantID   int        `json:"participant_id"`
	StartedAt       *time.Time `json:"started_at"`
	EndedAt         *time.Time `json:"ended_at"`
	CurrentQuestion int        `json:"current_question"`
	Status          string     `json:"status"`
}

// AnswerData represents an answer in the local database
type AnswerData struct {
	ID          int       `json:"id"`
	AttemptID   int       `json:"attempt_id"`
	QuestionID  int       `json:"question_id"`
	Answer      string    `json:"answer"`
	SubmittedAt time.Time `json:"submitted_at"`
	Score       int       `json:"score"`
}

// ProgressData represents participant progress
type ProgressData struct {
	ParticipantID     int        `json:"participant_id"`
	QuestionsAnswered int        `json:"questions_answered"`
	TotalQuestions    int        `json:"total_questions"`
	CurrentScore      int        `json:"current_score"`
	TimeRemaining     int        `json:"time_remaining"`
	LastActivity      *time.Time `json:"last_activity"`
}

// LiveProgressResponse represents the response for live progress queries
type LiveProgressResponse struct {
	Participant ParticipantData `json:"participant"`
	Attempt     *AttemptData    `json:"attempt"`
	Progress    *ProgressData   `json:"progress"`
}

// DeliveryStats represents aggregated delivery statistics
type DeliveryStats struct {
	TotalParticipants int `json:"total_participants"`
	NotStarted        int `json:"not_started"`
	InProgress        int `json:"in_progress"`
	Completed         int `json:"completed"`
	Abandoned         int `json:"abandoned"`
	AverageScore      int `json:"average_score"`
}

// NewExamDeliveryDB creates a new SQLite database for a delivery
func NewExamDeliveryDB(deliveryID int, dataDir string) (*ExamDeliveryDB, error) {
	timestamp := time.Now().Format("20060102_150405")
	dbName := fmt.Sprintf("delivery_%d_%s.db", deliveryID, timestamp)
	dbPath := filepath.Join(dataDir, dbName)

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

	examDB := &ExamDeliveryDB{
		db:         db,
		deliveryID: deliveryID,
		dbPath:     dbPath,
	}

	if err := examDB.createTables(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return examDB, nil
}

// createTables creates the necessary tables for the delivery
func (edb *ExamDeliveryDB) createTables() error {
	schema := `
	-- Participants table
	CREATE TABLE IF NOT EXISTS participants (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		identifier TEXT NOT NULL,
		status TEXT DEFAULT 'not_started'
	);

	-- Attempts table
	CREATE TABLE IF NOT EXISTS attempts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		participant_id INTEGER NOT NULL,
		started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		ended_at TIMESTAMP,
		current_question INTEGER DEFAULT 1,
		status TEXT DEFAULT 'in_progress',
		FOREIGN KEY (participant_id) REFERENCES participants(id)
	);

	-- Answers table
	CREATE TABLE IF NOT EXISTS answers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		attempt_id INTEGER NOT NULL,
		question_id INTEGER NOT NULL,
		answer TEXT NOT NULL,
		submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		score INTEGER DEFAULT 0,
		FOREIGN KEY (attempt_id) REFERENCES attempts(id)
	);

	-- Progress table
	CREATE TABLE IF NOT EXISTS progress (
		participant_id INTEGER PRIMARY KEY,
		questions_answered INTEGER DEFAULT 0,
		total_questions INTEGER NOT NULL,
		current_score INTEGER DEFAULT 0,
		time_remaining INTEGER,
		last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (participant_id) REFERENCES participants(id)
	);

	-- Indexes for performance
	CREATE INDEX IF NOT EXISTS idx_attempts_participant ON attempts(participant_id);
	CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(attempt_id);
	CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
	`

	_, err := edb.db.Exec(schema)
	return err
}

// Close closes the database connection
func (edb *ExamDeliveryDB) Close() error {
	return edb.db.Close()
}

// GetDBPath returns the database file path
func (edb *ExamDeliveryDB) GetDBPath() string {
	return edb.dbPath
}

// AddParticipant adds a participant to the database
func (edb *ExamDeliveryDB) AddParticipant(participant ParticipantData) error {
	query := `
		INSERT OR REPLACE INTO participants (id, name, email, identifier, status)
		VALUES (?, ?, ?, ?, ?)
	`
	_, err := edb.db.Exec(query, participant.ID, participant.Name, participant.Email, participant.Identifier, participant.Status)
	return err
}

// GetParticipants returns all participants
func (edb *ExamDeliveryDB) GetParticipants() ([]ParticipantData, error) {
	query := `SELECT id, name, email, identifier, status FROM participants ORDER BY name`

	rows, err := edb.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []ParticipantData
	for rows.Next() {
		var p ParticipantData
		err := rows.Scan(&p.ID, &p.Name, &p.Email, &p.Identifier, &p.Status)
		if err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}

	return participants, nil
}

// StartAttempt creates a new attempt for a participant
func (edb *ExamDeliveryDB) StartAttempt(participantID int, totalQuestions int) (int, error) {
	tx, err := edb.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Create attempt
	result, err := tx.Exec(`
		INSERT INTO attempts (participant_id, started_at, status)
		VALUES (?, ?, 'in_progress')
	`, participantID, time.Now())
	if err != nil {
		return 0, err
	}

	attemptID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Initialize progress
	_, err = tx.Exec(`
		INSERT OR REPLACE INTO progress (participant_id, questions_answered, total_questions, current_score, time_remaining, last_activity)
		VALUES (?, 0, ?, 0, ?, ?)
	`, participantID, totalQuestions, totalQuestions*60, time.Now()) // Assuming 1 minute per question
	if err != nil {
		return 0, err
	}

	// Update participant status
	_, err = tx.Exec(`UPDATE participants SET status = 'in_progress' WHERE id = ?`, participantID)
	if err != nil {
		return 0, err
	}

	return int(attemptID), tx.Commit()
}

// SubmitAnswer submits an answer and updates progress
func (edb *ExamDeliveryDB) SubmitAnswer(attemptID, questionID int, answer string, score int) error {
	tx, err := edb.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert answer
	_, err = tx.Exec(`
		INSERT OR REPLACE INTO answers (attempt_id, question_id, answer, submitted_at, score)
		VALUES (?, ?, ?, ?, ?)
	`, attemptID, questionID, answer, time.Now(), score)
	if err != nil {
		return err
	}

	// Update progress
	_, err = tx.Exec(`
		UPDATE progress SET 
			questions_answered = (SELECT COUNT(*) FROM answers WHERE attempt_id = ?),
			current_score = (SELECT COALESCE(SUM(score), 0) FROM answers WHERE attempt_id = ?),
			last_activity = ?
		WHERE participant_id = (SELECT participant_id FROM attempts WHERE id = ?)
	`, attemptID, attemptID, time.Now(), attemptID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// CompleteAttempt marks an attempt as completed
func (edb *ExamDeliveryDB) CompleteAttempt(attemptID int) error {
	tx, err := edb.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update attempt
	_, err = tx.Exec(`
		UPDATE attempts SET ended_at = ?, status = 'completed'
		WHERE id = ?
	`, time.Now(), attemptID)
	if err != nil {
		return err
	}

	// Update participant status
	_, err = tx.Exec(`
		UPDATE participants SET status = 'completed'
		WHERE id = (SELECT participant_id FROM attempts WHERE id = ?)
	`, attemptID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetLiveProgress returns live progress for all participants
func (edb *ExamDeliveryDB) GetLiveProgress() ([]LiveProgressResponse, error) {
	query := `
		SELECT 
			p.id, p.name, p.email, p.identifier, p.status,
			a.id, a.started_at, a.ended_at, a.current_question, a.status,
			pr.questions_answered, pr.total_questions, pr.current_score, pr.time_remaining, pr.last_activity
		FROM participants p
		LEFT JOIN attempts a ON p.id = a.participant_id
		LEFT JOIN progress pr ON p.id = pr.participant_id
		ORDER BY p.name
	`

	rows, err := edb.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []LiveProgressResponse
	for rows.Next() {
		var result LiveProgressResponse
		var attemptID sql.NullInt64
		var startedAt, endedAt sql.NullTime
		var currentQuestion sql.NullInt64
		var attemptStatus sql.NullString
		var questionsAnswered, totalQuestions, currentScore, timeRemaining sql.NullInt64
		var lastActivity sql.NullTime

		err := rows.Scan(
			&result.Participant.ID, &result.Participant.Name, &result.Participant.Email, &result.Participant.Identifier, &result.Participant.Status,
			&attemptID, &startedAt, &endedAt, &currentQuestion, &attemptStatus,
			&questionsAnswered, &totalQuestions, &currentScore, &timeRemaining, &lastActivity,
		)
		if err != nil {
			return nil, err
		}

		// Set attempt data if exists
		if attemptID.Valid {
			result.Attempt = &AttemptData{
				ID:              int(attemptID.Int64),
				ParticipantID:   result.Participant.ID,
				CurrentQuestion: int(currentQuestion.Int64),
				Status:          attemptStatus.String,
			}
			if startedAt.Valid {
				result.Attempt.StartedAt = &startedAt.Time
			}
			if endedAt.Valid {
				result.Attempt.EndedAt = &endedAt.Time
			}
		}

		// Set progress data if exists
		if questionsAnswered.Valid {
			result.Progress = &ProgressData{
				ParticipantID:     result.Participant.ID,
				QuestionsAnswered: int(questionsAnswered.Int64),
				TotalQuestions:    int(totalQuestions.Int64),
				CurrentScore:      int(currentScore.Int64),
				TimeRemaining:     int(timeRemaining.Int64),
			}
			if lastActivity.Valid {
				result.Progress.LastActivity = &lastActivity.Time
			}
		}

		results = append(results, result)
	}

	return results, nil
}

// GetDeliveryStats returns aggregated delivery statistics
func (edb *ExamDeliveryDB) GetDeliveryStats() (*DeliveryStats, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) as not_started,
			SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
			SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned
		FROM participants
	`

	var stats DeliveryStats
	err := edb.db.QueryRow(query).Scan(
		&stats.TotalParticipants,
		&stats.NotStarted,
		&stats.InProgress,
		&stats.Completed,
		&stats.Abandoned,
	)
	if err != nil {
		return nil, err
	}

	// Calculate average score for completed attempts
	avgQuery := `
		SELECT COALESCE(AVG(current_score), 0)
		FROM progress p
		JOIN participants pt ON p.participant_id = pt.id
		WHERE pt.status = 'completed'
	`

	var avgScore float64
	err = edb.db.QueryRow(avgQuery).Scan(&avgScore)
	if err != nil {
		return nil, err
	}

	stats.AverageScore = int(avgScore)

	return &stats, nil
}

// ExportAllData exports all data for final transfer to coordinator
func (edb *ExamDeliveryDB) ExportAllData() (map[string]interface{}, error) {
	// Get all participants
	participants, err := edb.GetParticipants()
	if err != nil {
		return nil, err
	}

	// Get all attempts
	attempts := []AttemptData{}
	query := `SELECT id, participant_id, started_at, ended_at, current_question, status FROM attempts`
	rows, err := edb.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var a AttemptData
		var startedAt, endedAt sql.NullTime
		err := rows.Scan(&a.ID, &a.ParticipantID, &startedAt, &endedAt, &a.CurrentQuestion, &a.Status)
		if err != nil {
			return nil, err
		}
		if startedAt.Valid {
			a.StartedAt = &startedAt.Time
		}
		if endedAt.Valid {
			a.EndedAt = &endedAt.Time
		}
		attempts = append(attempts, a)
	}

	// Get all answers
	answers := []AnswerData{}
	answerQuery := `SELECT id, attempt_id, question_id, answer, submitted_at, score FROM answers`
	answerRows, err := edb.db.Query(answerQuery)
	if err != nil {
		return nil, err
	}
	defer answerRows.Close()

	for answerRows.Next() {
		var a AnswerData
		err := answerRows.Scan(&a.ID, &a.AttemptID, &a.QuestionID, &a.Answer, &a.SubmittedAt, &a.Score)
		if err != nil {
			return nil, err
		}
		answers = append(answers, a)
	}

	// Get all progress
	progress := []ProgressData{}
	progressQuery := `SELECT participant_id, questions_answered, total_questions, current_score, time_remaining, last_activity FROM progress`
	progressRows, err := edb.db.Query(progressQuery)
	if err != nil {
		return nil, err
	}
	defer progressRows.Close()

	for progressRows.Next() {
		var p ProgressData
		var lastActivity sql.NullTime
		err := progressRows.Scan(&p.ParticipantID, &p.QuestionsAnswered, &p.TotalQuestions, &p.CurrentScore, &p.TimeRemaining, &lastActivity)
		if err != nil {
			return nil, err
		}
		if lastActivity.Valid {
			p.LastActivity = &lastActivity.Time
		}
		progress = append(progress, p)
	}

	return map[string]interface{}{
		"delivery_id":  edb.deliveryID,
		"participants": participants,
		"attempts":     attempts,
		"answers":      answers,
		"progress":     progress,
		"exported_at":  time.Now(),
	}, nil
}
