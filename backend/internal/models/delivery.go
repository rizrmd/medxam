package models

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type DeliveryModel struct {
	db *database.DB
}

// DeliveryListItem represents a delivery item in list view
type DeliveryListItem struct {
	ID             int        `json:"id"`
	ExamID         int        `json:"exam_id"`
	GroupID        int        `json:"group_id"`
	DisplayName    string     `json:"display_name"`
	ScheduledAt    *time.Time `json:"scheduled_at"`
	Duration       int        `json:"duration"`
	IsAnytime      bool       `json:"is_anytime"`
	AutomaticStart bool       `json:"automatic_start"`
	IsFinished     *time.Time `json:"is_finished"`
	LastStatus     *string    `json:"last_status"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	ExamTitle      string     `json:"exam_title"`
	GroupName      string     `json:"group_name"`
}

func NewDeliveryModel(db *database.DB) *DeliveryModel {
	return &DeliveryModel{db: db}
}

func (r *DeliveryModel) Create(delivery *tables.Delivery) error {
	query := `
		INSERT INTO deliveries (exam_id, group_id, name, scheduled_at, duration, ended_at,
							   is_anytime, automatic_start, is_finished, last_status, 
							   display_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, delivery.ExamID, delivery.GroupID, delivery.Name,
		delivery.ScheduledAt, delivery.Duration, delivery.EndedAt, delivery.IsAnytime,
		delivery.AutomaticStart, delivery.IsFinished, delivery.LastStatus,
		delivery.DisplayName).Scan(&delivery.ID, &delivery.CreatedAt, &delivery.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create delivery: %w", err)
	}
	return nil
}

func (r *DeliveryModel) GetByID(id int) (*tables.Delivery, error) {
	delivery := &tables.Delivery{}
	query := `
		SELECT id, exam_id, group_id, name, scheduled_at, duration, ended_at,
			   is_anytime, automatic_start, is_finished, last_status, display_name,
			   created_at, updated_at
		FROM deliveries 
		WHERE id = $1`

	err := r.db.Get(delivery, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("delivery not found")
		}
		return nil, fmt.Errorf("failed to get delivery: %w", err)
	}
	return delivery, nil
}

func (r *DeliveryModel) GetWithDetails(id int) (*tables.DeliveryWithDetails, error) {
	deliveryDetails := &tables.DeliveryWithDetails{}
	query := `
		SELECT d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration, d.ended_at,
			   d.is_anytime, d.automatic_start, d.is_finished, d.last_status, d.display_name,
			   d.created_at, d.updated_at,
			   e.id as exam_id, e.code as exam_code, e.name as exam_name, e.description as exam_description,
			   e.options as exam_options, e.is_mcq as exam_is_mcq, e.is_interview as exam_is_interview,
			   e.is_random as exam_is_random, e.client_id as exam_client_id,
			   e.created_at as exam_created_at, e.updated_at as exam_updated_at,
			   g.id as group_id, g.name as group_name, g.description as group_description,
			   g.code as group_code, g.last_taker_code, g.closed_at as group_closed_at,
			   g.client_id as group_client_id, g.created_at as group_created_at, 
			   g.updated_at as group_updated_at
		FROM deliveries d
		JOIN exams e ON d.exam_id = e.id
		JOIN groups g ON d.group_id = g.id
		WHERE d.id = $1`

	row := r.db.QueryRow(query, id)
	err := row.Scan(&deliveryDetails.ID, &deliveryDetails.ExamID, &deliveryDetails.GroupID,
		&deliveryDetails.Name, &deliveryDetails.ScheduledAt, &deliveryDetails.Duration,
		&deliveryDetails.EndedAt, &deliveryDetails.IsAnytime, &deliveryDetails.AutomaticStart,
		&deliveryDetails.IsFinished, &deliveryDetails.LastStatus, &deliveryDetails.DisplayName,
		&deliveryDetails.CreatedAt, &deliveryDetails.UpdatedAt,
		&deliveryDetails.Exam.ID, &deliveryDetails.Exam.Code, &deliveryDetails.Exam.Name,
		&deliveryDetails.Exam.Description, &deliveryDetails.Exam.Options, &deliveryDetails.Exam.IsMCQ,
		&deliveryDetails.Exam.IsInterview, &deliveryDetails.Exam.IsRandom, &deliveryDetails.Exam.ClientID,
		&deliveryDetails.Exam.CreatedAt, &deliveryDetails.Exam.UpdatedAt,
		&deliveryDetails.Group.ID, &deliveryDetails.Group.Name, &deliveryDetails.Group.Description,
		&deliveryDetails.Group.Code, &deliveryDetails.Group.LastTakerCode, &deliveryDetails.Group.ClosedAt,
		&deliveryDetails.Group.ClientID, &deliveryDetails.Group.CreatedAt, &deliveryDetails.Group.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("delivery not found")
		}
		return nil, fmt.Errorf("failed to get delivery with details: %w", err)
	}
	return deliveryDetails, nil
}

func (r *DeliveryModel) Update(id int, updates *tables.DeliveryUpdateRequest) (*tables.Delivery, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.ScheduledAt != nil {
		setParts = append(setParts, fmt.Sprintf("scheduled_at = $%d", argIndex))
		args = append(args, *updates.ScheduledAt)
		argIndex++
	}
	if updates.Duration != nil {
		setParts = append(setParts, fmt.Sprintf("duration = $%d", argIndex))
		args = append(args, *updates.Duration)
		argIndex++
	}
	if updates.IsAnytime != nil {
		setParts = append(setParts, fmt.Sprintf("is_anytime = $%d", argIndex))
		args = append(args, *updates.IsAnytime)
		argIndex++
	}
	if updates.AutomaticStart != nil {
		setParts = append(setParts, fmt.Sprintf("automatic_start = $%d", argIndex))
		args = append(args, *updates.AutomaticStart)
		argIndex++
	}
	if updates.DisplayName != nil {
		setParts = append(setParts, fmt.Sprintf("display_name = $%d", argIndex))
		args = append(args, *updates.DisplayName)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE deliveries 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update delivery: %w", err)
	}

	return r.GetByID(id)
}

func (r *DeliveryModel) Delete(id int) error {
	query := `DELETE FROM deliveries WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete delivery: %w", err)
	}
	return nil
}

func (r *DeliveryModel) List(pagination tables.Pagination, search tables.DeliverySearchRequest) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Build WHERE clause and filter arguments separately
	whereClause := "WHERE 1=1"
	filterArgs := []interface{}{}
	filterArgIndex := 1

	if search.Name != "" {
		whereClause += fmt.Sprintf(" AND d.name ILIKE $%d", filterArgIndex)
		filterArgs = append(filterArgs, "%"+search.Name+"%")
		filterArgIndex++
	}
	// Support both exact date and date range for scheduled_at
	if search.ScheduledAt != nil && search.ScheduledAtEnd != nil {
		// Date range filtering
		whereClause += fmt.Sprintf(" AND d.scheduled_at >= $%d AND d.scheduled_at <= $%d", filterArgIndex, filterArgIndex+1)
		filterArgs = append(filterArgs, *search.ScheduledAt, *search.ScheduledAtEnd)
		filterArgIndex += 2
	} else if search.ScheduledAt != nil {
		// Single date filtering
		whereClause += fmt.Sprintf(" AND DATE(d.scheduled_at) = DATE($%d)", filterArgIndex)
		filterArgs = append(filterArgs, *search.ScheduledAt)
		filterArgIndex++
	}
	// Support generic date range filtering on created_at (only if not using scheduled_at)
	if search.StartDate != nil && search.EndDate != nil && search.ScheduledAt == nil && search.ScheduledAtEnd == nil {
		whereClause += fmt.Sprintf(" AND d.created_at >= $%d AND d.created_at <= $%d", filterArgIndex, filterArgIndex+1)
		filterArgs = append(filterArgs, *search.StartDate, *search.EndDate)
		filterArgIndex += 2
	}
	if search.Status != "" {
		switch search.Status {
		case "pending":
			whereClause += " AND d.scheduled_at > NOW() AND d.is_finished IS NULL"
		case "ongoing":
			whereClause += " AND d.scheduled_at <= NOW() AND d.is_finished IS NULL"
		case "finished":
			whereClause += " AND d.is_finished IS NOT NULL"
		}
	}

	// Get total count with filter arguments
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM deliveries d %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, filterArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Build query with updated parameter indices for LIMIT and OFFSET
	queryArgIndex := filterArgIndex
	limitParam := fmt.Sprintf("$%d", queryArgIndex)
	queryArgIndex++
	offsetParam := fmt.Sprintf("$%d", queryArgIndex)

	// Get deliveries with exam and group info
	query := fmt.Sprintf(`
		SELECT d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration, d.ended_at,
			   d.is_anytime, d.automatic_start, d.is_finished, d.last_status, d.display_name,
			   d.created_at, d.updated_at,
			   e.code as exam_code, e.name as exam_name,
			   g.name as group_name, g.code as group_code,
			   COALESCE(COUNT(dt.taker_id), 0) as participants_count
		FROM deliveries d
		JOIN exams e ON d.exam_id = e.id
		JOIN groups g ON d.group_id = g.id
		LEFT JOIN delivery_taker dt ON d.id = dt.delivery_id
		%s 
		GROUP BY d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration, d.ended_at,
			     d.is_anytime, d.automatic_start, d.is_finished, d.last_status, d.display_name,
			     d.created_at, d.updated_at, e.code, e.name, g.name, g.code
		ORDER BY d.scheduled_at DESC, d.created_at DESC
		LIMIT %s OFFSET %s`, whereClause, limitParam, offsetParam)

	// Combine filter args with pagination args
	queryArgs := append(filterArgs, pagination.PerPage, offset)

	type DeliveryWithInfo struct {
		tables.Delivery
		ExamCode          string `db:"exam_code" json:"exam_code"`
		ExamName          string `db:"exam_name" json:"exam_name"`
		GroupName         string `db:"group_name" json:"group_name"`
		GroupCode         string `db:"group_code" json:"group_code"`
		ParticipantsCount int    `db:"participants_count" json:"participants_count"`
	}

	deliveries := []DeliveryWithInfo{}
	err = r.db.Select(&deliveries, query, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to get deliveries: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       deliveries,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *DeliveryModel) StartDelivery(id int) error {
	// Use atomic update to prevent double start - only update if not already started
	query := `
		UPDATE deliveries 
		SET last_status = 'started', 
		    started_at = COALESCE(started_at, NOW()),
		    updated_at = NOW() 
		WHERE id = $1 
		  AND (last_status IS NULL OR last_status NOT IN ('started', 'ongoing', 'finished'))
		  AND is_finished IS NULL`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to start delivery: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		// Check if delivery exists and its current status
		var currentStatus sql.NullString
		var isFinished sql.NullTime
		statusQuery := `SELECT last_status, is_finished FROM deliveries WHERE id = $1`
		err = r.db.QueryRow(statusQuery, id).Scan(&currentStatus, &isFinished)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("delivery with id %d does not exist", id)
			}
			return fmt.Errorf("failed to check delivery status: %w", err)
		}

		if isFinished.Valid {
			return fmt.Errorf("delivery %d is already finished", id)
		}

		if currentStatus.Valid && (currentStatus.String == "started" || currentStatus.String == "ongoing" || currentStatus.String == "finished") {
			return fmt.Errorf("delivery %d is already started (status: %s)", id, currentStatus.String)
		}

		return fmt.Errorf("delivery %d could not be started", id)
	}

	return nil
}

func (r *DeliveryModel) FinishDelivery(id int) error {
	query := `UPDATE deliveries SET is_finished = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to finish delivery: %w", err)
	}
	return nil
}

func (r *DeliveryModel) UpdateStatus(id int, status string) error {
	query := `UPDATE deliveries SET last_status = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update delivery status: %w", err)
	}
	return nil
}

func (r *DeliveryModel) PauseDelivery(id int) error {
	query := `UPDATE deliveries SET last_status = 'paused', updated_at = NOW() WHERE id = $1 AND last_status IN ('started', 'ongoing')`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to pause delivery: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("delivery cannot be paused - not in running state")
	}

	return nil
}

func (r *DeliveryModel) ResumeDelivery(id int) error {
	query := `UPDATE deliveries SET last_status = 'started', updated_at = NOW() WHERE id = $1 AND last_status = 'paused'`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to resume delivery: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("delivery cannot be resumed - not in paused state")
	}

	return nil
}

func (r *DeliveryModel) StopDelivery(id int) error {
	query := `UPDATE deliveries SET is_finished = NOW(), last_status = 'stopped', updated_at = NOW() WHERE id = $1 AND is_finished IS NULL`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to stop delivery: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("delivery cannot be stopped - already finished")
	}

	return nil
}

func (r *DeliveryModel) GetParticipantProgress(deliveryID int) ([]interface{}, error) {
	query := `
		SELECT 
			p.id, p.name, COALESCE(p.email, '') as email, COALESCE(p.reg, '') as identifier,
			a.id, a.started_at, a.ended_at, a.updated_at,
			COALESCE(
				(SELECT COUNT(*) FROM attempt_question aa WHERE aa.attempt_id = a.id), 
				0
			) as questions_answered,
			COALESCE(
				(SELECT COUNT(*) FROM exam_item ei 
				 JOIN exams e ON e.id = ei.exam_id 
				 JOIN deliveries d ON d.exam_id = e.id 
				 WHERE d.id = $1), 
				0
			) as total_questions,
			CASE 
				WHEN a.ended_at IS NOT NULL THEN 'completed'
				WHEN a.started_at IS NOT NULL AND a.ended_at IS NULL THEN 'in_progress'
				WHEN a.started_at IS NOT NULL AND a.updated_at < NOW() - INTERVAL '30 minutes' THEN 'abandoned'
				ELSE 'not_started'
			END as status
		FROM takers p
		JOIN groups g ON g.id = (SELECT group_id FROM deliveries WHERE id = $1)
		JOIN group_taker pg ON pg.group_id = g.id AND pg.taker_id = p.id
		LEFT JOIN attempts a ON a.attempted_by = p.id AND a.delivery_id = $1
		ORDER BY p.name`

	rows, err := r.db.Query(query, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to query participant progress: %w", err)
	}
	defer rows.Close()

	var progressList []interface{}
	for rows.Next() {
		var participantID int
		var participantName, participantEmail, participantIdentifier string
		var attemptID sql.NullInt64
		var startedAt, endedAt, lastActivity sql.NullTime
		var questionsAnswered, totalQuestions int
		var status string

		err := rows.Scan(
			&participantID,
			&participantName,
			&participantEmail,
			&participantIdentifier,
			&attemptID,
			&startedAt,
			&endedAt,
			&lastActivity,
			&questionsAnswered,
			&totalQuestions,
			&status,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan progress row: %w", err)
		}

		progress := map[string]interface{}{
			"participant": map[string]interface{}{
				"id":         participantID,
				"name":       participantName,
				"email":      participantEmail,
				"identifier": participantIdentifier,
			},
		}

		if attemptID.Valid {
			attemptData := map[string]interface{}{
				"id":                 int(attemptID.Int64),
				"questions_answered": questionsAnswered,
				"total_questions":    totalQuestions,
				"status":             status,
			}

			if startedAt.Valid {
				attemptData["started_at"] = startedAt.Time
			}
			if endedAt.Valid {
				attemptData["ended_at"] = endedAt.Time
			}
			if lastActivity.Valid {
				attemptData["last_activity"] = lastActivity.Time
			}

			progress["attempt"] = attemptData
		} else {
			progress["attempt"] = nil
		}

		progressList = append(progressList, progress)
	}

	return progressList, nil
}

func (r *DeliveryModel) GetDeliveryAttempts(deliveryID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `
		SELECT COUNT(*) 
		FROM attempts a 
		WHERE a.delivery_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get attempts with taker info
	query := `
		SELECT a.id, a.attempted_by, a.exam_id, a.delivery_id, a.ip_address,
			   a.started_at, a.ended_at, a.extra_minute, a.score, a.progress,
			   a.penalty, a.created_at, a.updated_at, a.finish_scoring,
			   t.name as taker_name, t.reg as taker_reg
		FROM attempts a
		JOIN takers t ON a.attempted_by = t.id
		WHERE a.delivery_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3`

	type AttemptWithTaker struct {
		tables.Attempt
		TakerName    string         `db:"taker_name"`
		TakerRegNull sql.NullString `db:"taker_reg"`
	}

	rawAttempts := []AttemptWithTaker{}
	err = r.db.Select(&rawAttempts, query, deliveryID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery attempts: %w", err)
	}

	// Transform to format expected by frontend
	attempts := make([]map[string]interface{}, len(rawAttempts))
	for i, attempt := range rawAttempts {
		takerReg := ""
		if attempt.TakerRegNull.Valid {
			takerReg = attempt.TakerRegNull.String
		}

		attempts[i] = map[string]interface{}{
			"id":             attempt.ID,
			"attempted_by":   attempt.AttemptedBy,
			"exam_id":        attempt.ExamID,
			"delivery_id":    attempt.DeliveryID,
			"ip_address":     attempt.IPAddress,
			"started_at":     attempt.StartedAt,
			"ended_at":       attempt.EndedAt,
			"extra_minute":   attempt.ExtraMinute,
			"score":          attempt.Score,
			"progress":       attempt.Progress,
			"penalty":        attempt.Penalty,
			"created_at":     attempt.CreatedAt,
			"updated_at":     attempt.UpdatedAt,
			"finish_scoring": attempt.FinishScoring,
			"taker": map[string]interface{}{
				"name": attempt.TakerName,
				"code": takerReg,
			},
		}
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

// GetDeliveriesForAutoStart retrieves deliveries that need to be automatically started
func (r *DeliveryModel) GetDeliveriesForAutoStart(currentTime time.Time) ([]*DeliveryListItem, error) {
	query := `
		SELECT d.id, d.exam_id, d.group_id, d.display_name, d.scheduled_at, 
			   d.duration, d.is_anytime, d.automatic_start, d.is_finished, 
			   d.last_status, d.created_at, d.updated_at,
			   e.name as exam_title, g.name as group_name
		FROM deliveries d
		JOIN exams e ON d.exam_id = e.id
		JOIN groups g ON d.group_id = g.id
		WHERE d.automatic_start = true 
		  AND d.scheduled_at IS NOT NULL
		  AND d.scheduled_at <= $1
		  AND (d.last_status IS NULL OR d.last_status NOT IN ('started', 'running', 'ongoing', 'finished'))
		  AND d.is_finished IS NULL
		ORDER BY d.scheduled_at ASC
	`

	rows, err := r.db.Query(query, currentTime)
	if err != nil {
		return nil, fmt.Errorf("error querying deliveries for auto start: %w", err)
	}
	defer rows.Close()

	var deliveries []*DeliveryListItem

	for rows.Next() {
		var delivery DeliveryListItem
		err := rows.Scan(
			&delivery.ID,
			&delivery.ExamID,
			&delivery.GroupID,
			&delivery.DisplayName,
			&delivery.ScheduledAt,
			&delivery.Duration,
			&delivery.IsAnytime,
			&delivery.AutomaticStart,
			&delivery.IsFinished,
			&delivery.LastStatus,
			&delivery.CreatedAt,
			&delivery.UpdatedAt,
			&delivery.ExamTitle,
			&delivery.GroupName,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning delivery row: %w", err)
		}

		deliveries = append(deliveries, &delivery)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating delivery rows: %w", err)
	}

	return deliveries, nil
}
