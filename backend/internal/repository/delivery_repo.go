package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/models"
)

type DeliveryRepository struct {
	db *database.DB
}

func NewDeliveryRepository(db *database.DB) *DeliveryRepository {
	return &DeliveryRepository{db: db}
}

func (r *DeliveryRepository) Create(delivery *models.Delivery) error {
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

func (r *DeliveryRepository) GetByID(id int) (*models.Delivery, error) {
	delivery := &models.Delivery{}
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

func (r *DeliveryRepository) GetWithDetails(id int) (*models.DeliveryWithDetails, error) {
	deliveryDetails := &models.DeliveryWithDetails{}
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

func (r *DeliveryRepository) Update(id int, updates *models.DeliveryUpdateRequest) (*models.Delivery, error) {
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

func (r *DeliveryRepository) Delete(id int) error {
	query := `DELETE FROM deliveries WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete delivery: %w", err)
	}
	return nil
}

func (r *DeliveryRepository) List(pagination models.Pagination, search models.DeliverySearchRequest) (*models.PaginatedResponse, error) {
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
			   g.name as group_name, g.code as group_code
		FROM deliveries d
		JOIN exams e ON d.exam_id = e.id
		JOIN groups g ON d.group_id = g.id
		%s 
		ORDER BY d.scheduled_at DESC, d.created_at DESC
		LIMIT %s OFFSET %s`, whereClause, limitParam, offsetParam)

	// Combine filter args with pagination args
	queryArgs := append(filterArgs, pagination.PerPage, offset)

	type DeliveryWithInfo struct {
		models.Delivery
		ExamCode  string `db:"exam_code" json:"exam_code"`
		ExamName  string `db:"exam_name" json:"exam_name"`
		GroupName string `db:"group_name" json:"group_name"`
		GroupCode string `db:"group_code" json:"group_code"`
	}

	deliveries := []DeliveryWithInfo{}
	err = r.db.Select(&deliveries, query, queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to get deliveries: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &models.PaginatedResponse{
		Data:       deliveries,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *DeliveryRepository) FinishDelivery(id int) error {
	query := `UPDATE deliveries SET is_finished = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to finish delivery: %w", err)
	}
	return nil
}

func (r *DeliveryRepository) UpdateStatus(id int, status string) error {
	query := `UPDATE deliveries SET last_status = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update delivery status: %w", err)
	}
	return nil
}

func (r *DeliveryRepository) GetDeliveryAttempts(deliveryID int, pagination models.Pagination) (*models.PaginatedResponse, error) {
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
		models.Attempt
		TakerName string `db:"taker_name" json:"taker_name"`
		TakerReg  string `db:"taker_reg" json:"taker_reg"`
	}

	attempts := []AttemptWithTaker{}
	err = r.db.Select(&attempts, query, deliveryID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery attempts: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &models.PaginatedResponse{
		Data:       attempts,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}