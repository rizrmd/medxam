package models

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type AttemptModel struct {
	db *database.DB
}

func NewAttemptModel(db *database.DB) *AttemptModel {
	return &AttemptModel{db: db}
}

func (r *AttemptModel) Create(attempt *tables.Attempt) error {
	query := `
		INSERT INTO attempts (attempted_by, exam_id, delivery_id, ip_address, started_at, 
							 extra_minute, score, progress, penalty, finish_scoring, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, attempt.AttemptedBy, attempt.ExamID, attempt.DeliveryID,
		attempt.IPAddress, attempt.StartedAt, attempt.ExtraMinute, attempt.Score,
		attempt.Progress, attempt.Penalty, attempt.FinishScoring).Scan(
		&attempt.ID, &attempt.CreatedAt, &attempt.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create attempt: %w", err)
	}
	return nil
}

func (r *AttemptModel) GetByID(id int) (*tables.Attempt, error) {
	attempt := &tables.Attempt{}
	query := `
		SELECT id, attempted_by, exam_id, delivery_id, ip_address, started_at, ended_at,
			   extra_minute, score, progress, penalty, finish_scoring, created_at, updated_at
		FROM attempts 
		WHERE id = $1`

	err := r.db.Get(attempt, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("attempt not found")
		}
		return nil, fmt.Errorf("failed to get attempt: %w", err)
	}
	return attempt, nil
}

func (r *AttemptModel) GetWithDetails(id int) (*tables.AttemptWithDetails, error) {
	attemptDetails := &tables.AttemptWithDetails{}
	query := `
		SELECT a.id, a.attempted_by, a.exam_id, a.delivery_id, a.ip_address, a.started_at, a.ended_at,
			   a.extra_minute, a.score, a.progress, a.penalty, a.finish_scoring, a.created_at, a.updated_at,
			   t.id as taker_id, t.name as taker_name, t.reg as taker_reg,
			   t.email as taker_email, t.is_verified as taker_is_verified,
			   t.client_id as taker_client_id, t.created_at as taker_created_at, t.updated_at as taker_updated_at,
			   e.id as exam_id, e.code as exam_code, e.name as exam_name, e.description as exam_description,
			   e.options as exam_options, e.is_mcq as exam_is_mcq, e.is_interview as exam_is_interview,
			   e.is_random as exam_is_random, e.client_id as exam_client_id,
			   e.created_at as exam_created_at, e.updated_at as exam_updated_at,
			   d.id as delivery_id, d.name as delivery_name, d.scheduled_at as delivery_scheduled_at,
			   d.duration as delivery_duration, d.ended_at as delivery_ended_at,
			   d.is_anytime as delivery_is_anytime, d.automatic_start as delivery_automatic_start,
			   d.is_finished as delivery_is_finished, d.last_status as delivery_last_status,
			   d.display_name as delivery_display_name, d.created_at as delivery_created_at,
			   d.updated_at as delivery_updated_at
		FROM attempts a
		JOIN takers t ON a.attempted_by = t.id
		JOIN exams e ON a.exam_id = e.id
		JOIN deliveries d ON a.delivery_id = d.id
		WHERE a.id = $1`

	row := r.db.QueryRow(query, id)
	err := row.Scan(&attemptDetails.ID, &attemptDetails.AttemptedBy, &attemptDetails.ExamID,
		&attemptDetails.DeliveryID, &attemptDetails.IPAddress, &attemptDetails.StartedAt,
		&attemptDetails.EndedAt, &attemptDetails.ExtraMinute, &attemptDetails.Score,
		&attemptDetails.Progress, &attemptDetails.Penalty, &attemptDetails.FinishScoring,
		&attemptDetails.CreatedAt, &attemptDetails.UpdatedAt,
		&attemptDetails.Participant.ID, &attemptDetails.Participant.Name, &attemptDetails.Participant.Reg,
		&attemptDetails.Participant.Email, &attemptDetails.Participant.IsVerified,
		&attemptDetails.Participant.ClientID, &attemptDetails.Participant.CreatedAt, &attemptDetails.Participant.UpdatedAt,
		&attemptDetails.Exam.ID, &attemptDetails.Exam.Code, &attemptDetails.Exam.Name,
		&attemptDetails.Exam.Description, &attemptDetails.Exam.Options, &attemptDetails.Exam.IsMCQ,
		&attemptDetails.Exam.IsInterview, &attemptDetails.Exam.IsRandom, &attemptDetails.Exam.ClientID,
		&attemptDetails.Exam.CreatedAt, &attemptDetails.Exam.UpdatedAt,
		&attemptDetails.Delivery.ID, &attemptDetails.Delivery.Name, &attemptDetails.Delivery.ScheduledAt,
		&attemptDetails.Delivery.Duration, &attemptDetails.Delivery.EndedAt,
		&attemptDetails.Delivery.IsAnytime, &attemptDetails.Delivery.AutomaticStart,
		&attemptDetails.Delivery.IsFinished, &attemptDetails.Delivery.LastStatus,
		&attemptDetails.Delivery.DisplayName, &attemptDetails.Delivery.CreatedAt,
		&attemptDetails.Delivery.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("attempt not found")
		}
		return nil, fmt.Errorf("failed to get attempt with details: %w", err)
	}
	return attemptDetails, nil
}

func (r *AttemptModel) StartAttempt(attemptedBy, deliveryID int, ipAddress string) (*tables.Attempt, error) {
	// Get delivery details to extract exam_id
	var examID int
	err := r.db.Get(&examID, "SELECT exam_id FROM deliveries WHERE id = $1", deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery exam: %w", err)
	}

	now := time.Now()
	attempt := &tables.Attempt{
		AttemptedBy:   attemptedBy,
		ExamID:        examID,
		DeliveryID:    deliveryID,
		IPAddress:     ipAddress,
		StartedAt:     &now,
		ExtraMinute:   0,
		Score:         0,
		Progress:      0,
		Penalty:       0,
		FinishScoring: false,
	}

	err = r.Create(attempt)
	if err != nil {
		return nil, err
	}

	return attempt, nil
}

func (r *AttemptModel) FinishAttempt(id int) error {
	now := time.Now()
	query := `UPDATE attempts SET ended_at = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id, now)
	if err != nil {
		return fmt.Errorf("failed to finish attempt: %w", err)
	}
	return nil
}

func (r *AttemptModel) UpdateScore(id int, score float64, penalty int) error {
	query := `
		UPDATE attempts 
		SET score = $2, penalty = $3, finish_scoring = true, updated_at = NOW() 
		WHERE id = $1`
	_, err := r.db.Exec(query, id, score, penalty)
	if err != nil {
		return fmt.Errorf("failed to update attempt score: %w", err)
	}
	return nil
}

func (r *AttemptModel) UpdateProgress(id int, progress int) error {
	query := `UPDATE attempts SET progress = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id, progress)
	if err != nil {
		return fmt.Errorf("failed to update attempt progress: %w", err)
	}
	return nil
}

func (r *AttemptModel) List(pagination tables.Pagination, search tables.AttemptSearchRequest) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	whereClause := "WHERE 1=1"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3

	if search.TakerID != 0 {
		whereClause += fmt.Sprintf(" AND a.attempted_by = $%d", argIndex)
		args = append(args, search.TakerID)
		argIndex++
	}
	if search.DeliveryID != 0 {
		whereClause += fmt.Sprintf(" AND a.delivery_id = $%d", argIndex)
		args = append(args, search.DeliveryID)
		argIndex++
	}
	if search.ExamID != 0 {
		whereClause += fmt.Sprintf(" AND a.exam_id = $%d", argIndex)
		args = append(args, search.ExamID)
		argIndex++
	}
	if search.IsFinished != nil {
		if *search.IsFinished {
			whereClause += " AND a.ended_at IS NOT NULL"
		} else {
			whereClause += " AND a.ended_at IS NULL"
		}
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM attempts a %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get attempts with taker and exam info
	query := fmt.Sprintf(`
		SELECT a.id, a.attempted_by, a.exam_id, a.delivery_id, a.ip_address,
			   a.started_at, a.ended_at, a.extra_minute, a.score, a.progress,
			   a.penalty, a.finish_scoring, a.created_at, a.updated_at,
			   t.name as taker_name, t.reg as taker_reg,
			   e.code as exam_code, e.name as exam_name
		FROM attempts a
		JOIN takers t ON a.attempted_by = t.id
		JOIN exams e ON a.exam_id = e.id
		%s 
		ORDER BY a.created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	type AttemptWithInfo struct {
		tables.Attempt
		TakerName string `db:"taker_name" json:"taker_name"`
		TakerReg  string `db:"taker_reg" json:"taker_reg"`
		ExamCode  string `db:"exam_code" json:"exam_code"`
		ExamName  string `db:"exam_name" json:"exam_name"`
	}

	attempts := []AttemptWithInfo{}
	err = r.db.Select(&attempts, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempts: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       attempts,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *AttemptModel) GetAttemptsByTaker(takerID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	search := tables.AttemptSearchRequest{
		TakerID: takerID,
	}
	return r.List(pagination, search)
}

func (r *AttemptModel) GetAttemptsByDelivery(deliveryID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	search := tables.AttemptSearchRequest{
		DeliveryID: deliveryID,
	}
	return r.List(pagination, search)
}

// Attempt Questions
func (r *AttemptModel) SaveAnswer(attemptQuestion *tables.AttemptQuestion) error {
	// First try to update existing answer
	updateQuery := `
		UPDATE attempt_question 
		SET answer = $3, updated_at = NOW()
		WHERE attempt_id = $1 AND question_id = $2
		RETURNING id`

	var id int
	err := r.db.QueryRow(updateQuery, attemptQuestion.AttemptID, attemptQuestion.QuestionID,
		attemptQuestion.Answer).Scan(&id)

	if err == sql.ErrNoRows {
		// Insert new answer
		insertQuery := `
			INSERT INTO attempt_question (attempt_id, question_id, answer, created_at, updated_at)
			VALUES ($1, $2, $3, NOW(), NOW())
			RETURNING id, created_at, updated_at`

		err = r.db.QueryRow(insertQuery, attemptQuestion.AttemptID, attemptQuestion.QuestionID,
			attemptQuestion.Answer).Scan(
			&attemptQuestion.ID, &attemptQuestion.CreatedAt, &attemptQuestion.UpdatedAt)
	} else if err != nil {
		return fmt.Errorf("failed to save answer: %w", err)
	} else {
		attemptQuestion.ID = id
	}

	return nil
}

func (r *AttemptModel) GetAttemptAnswers(attemptID int) ([]tables.AttemptQuestion, error) {
	query := `
		SELECT id, attempt_id, question_id, answer, score, is_correct,
			   created_at, updated_at
		FROM attempt_question 
		WHERE attempt_id = $1
		ORDER BY question_id`

	rows, err := r.db.Query(query, attemptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get attempt answers: %w", err)
	}
	defer rows.Close()

	var answers []tables.AttemptQuestion
	for rows.Next() {
		var aq tables.AttemptQuestion
		err := rows.Scan(
			&aq.ID,
			&aq.AttemptID,
			&aq.QuestionID,
			&aq.Answer,
			&aq.Score,
			&aq.IsCorrect,
			&aq.CreatedAt,
			&aq.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan answer row: %w", err)
		}
		// Set TimeSpent to 0 since it doesn't exist in DB
		aq.TimeSpent = 0
		answers = append(answers, aq)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating answer rows: %w", err)
	}

	return answers, nil
}

func (r *AttemptModel) GetResultsSummary(deliveryID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `SELECT COUNT(*) FROM attempts WHERE delivery_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get results summary
	query := `
		SELECT a.id as attempt_id, 
			   COALESCE(t.reg, t.name) as taker_code, 
			   t.name as taker_name,
			   e.name as exam_name, 
			   a.score, 
			   a.started_at, 
			   a.ended_at,
			   0 as total_questions,
			   COUNT(aq.id) as answered,
			   COUNT(CASE WHEN aq.is_correct = true THEN 1 END) as correct,
			   COUNT(CASE WHEN aq.is_correct = false THEN 1 END) as wrong,
			   CASE 
				   WHEN a.ended_at IS NOT NULL AND a.started_at IS NOT NULL 
				   THEN EXTRACT(EPOCH FROM (a.ended_at - a.started_at))::integer 
				   ELSE 0 
			   END as duration
		FROM attempts a
		JOIN takers t ON a.attempted_by = t.id
		JOIN exams e ON a.exam_id = e.id
		LEFT JOIN attempt_question aq ON a.id = aq.attempt_id
		WHERE a.delivery_id = $1
		GROUP BY a.id, t.reg, t.name, e.name, a.score, a.started_at, a.ended_at
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3`

	results := []tables.ResultSummary{}
	err = r.db.Select(&results, query, deliveryID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get results summary: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       results,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}
