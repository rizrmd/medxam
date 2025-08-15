package models

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type ParticipantModel struct {
	db *database.DB
}

func NewParticipantModel(db *database.DB) *ParticipantModel {
	return &ParticipantModel{db: db}
}

func (r *ParticipantModel) Create(participant *tables.Participant) error {
	query := `
		INSERT INTO takers (name, reg, email, password, is_verified, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, participant.Name, participant.Reg, participant.Email,
		participant.Password, participant.IsVerified, participant.ClientID).Scan(&participant.ID, &participant.CreatedAt, &participant.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create participant: %w", err)
	}
	return nil
}

func (r *ParticipantModel) GetByID(id int) (*tables.Participant, error) {
	participant := &tables.Participant{}
	query := `
		SELECT id, name, reg, email, password, is_verified, client_id, 
			   created_at, updated_at
		FROM takers 
		WHERE id = $1`

	err := r.db.Get(participant, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("participant not found")
		}
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}
	return participant, nil
}

func (r *ParticipantModel) GetByEmail(email string) (*tables.Participant, error) {
	participant := &tables.Participant{}
	query := `
		SELECT id, name, reg, email, password, is_verified, client_id, 
			   created_at, updated_at
		FROM takers 
		WHERE email = $1`

	err := r.db.Get(participant, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("participant not found")
		}
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}
	return participant, nil
}

func (r *ParticipantModel) Update(id int, updates *tables.ParticipantUpdateRequest) (*tables.Participant, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Reg != nil {
		setParts = append(setParts, fmt.Sprintf("reg = $%d", argIndex))
		args = append(args, *updates.Reg)
		argIndex++
	}
	if updates.Email != nil {
		setParts = append(setParts, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *updates.Email)
		argIndex++
	}
	if updates.IsVerified != nil {
		setParts = append(setParts, fmt.Sprintf("is_verified = $%d", argIndex))
		args = append(args, *updates.IsVerified)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE takers 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update participant: %w", err)
	}

	return r.GetByID(id)
}

func (r *ParticipantModel) Delete(id int) error {
	query := `DELETE FROM takers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete participant: %w", err)
	}
	return nil
}

func (r *ParticipantModel) List(pagination tables.Pagination, search string, groupID *int) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	whereClause := "WHERE 1=1"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3

	if search != "" {
		whereClause += fmt.Sprintf(" AND (t.name ILIKE $%d OR t.email ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	if groupID != nil {
		whereClause += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM group_taker gt WHERE gt.taker_id = t.id AND gt.group_id = $%d)", argIndex)
		args = append(args, *groupID)
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM takers t %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get takers
	query := fmt.Sprintf(`
		SELECT t.id, t.name, t.reg, t.email, t.is_verified, t.client_id, 
			   t.created_at, t.updated_at
		FROM takers t %s 
		ORDER BY t.created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	participants := []tables.Participant{}
	err = r.db.Select(&participants, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       participants,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *ParticipantModel) GetParticipantGroups(participantID int) ([]tables.Group, error) {
	groups := []tables.Group{}
	query := `
		SELECT g.id, g.name, g.description, g.code, g.last_taker_code, 
			   g.closed_at, g.client_id, g.created_at, g.updated_at
		FROM groups g
		JOIN group_taker gt ON g.id = gt.group_id
		WHERE gt.taker_id = $1
		ORDER BY g.name`

	err := r.db.Select(&groups, query, participantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participant groups: %w", err)
	}
	return groups, nil
}

func (r *ParticipantModel) UpdatePassword(participantID int, hashedPassword string) error {
	query := `UPDATE takers SET password = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, hashedPassword, participantID)
	if err != nil {
		return fmt.Errorf("failed to update participant password: %w", err)
	}
	return nil
}

func (r *ParticipantModel) SetVerified(participantID int, verified bool) error {
	query := `UPDATE takers SET is_verified = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, verified, participantID)
	if err != nil {
		return fmt.Errorf("failed to update participant verification status: %w", err)
	}
	return nil
}

func (r *ParticipantModel) GetByRegistrationNumber(regNumber string) (*tables.Participant, error) {
	participant := &tables.Participant{}
	query := `
		SELECT id, name, reg, email, password, is_verified, client_id, 
			   created_at, updated_at
		FROM takers 
		WHERE reg = $1`

	err := r.db.Get(participant, query, regNumber)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("participant not found")
		}
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}
	return participant, nil
}

func (r *ParticipantModel) GetByTestCode(testCode string) (*tables.Participant, *tables.Delivery, error) {
	participant := &tables.Participant{}
	delivery := &tables.Delivery{}

	// Query to find participant and their active delivery by test code
	query := `
		SELECT 
			t.id, t.name, t.reg, t.email, t.password, t.is_verified, t.client_id, 
			t.created_at, t.updated_at,
			d.id as delivery_id, d.exam_id, d.group_id, d.name as delivery_name,
			d.scheduled_at, d.duration, d.is_anytime, d.automatic_start
		FROM takers t
		JOIN group_taker gt ON t.id = gt.taker_id
		JOIN deliveries d ON d.group_id = gt.group_id
		WHERE gt.taker_code = $1
			AND (d.is_finished IS NULL OR d.is_finished > NOW())
		ORDER BY d.scheduled_at DESC
		LIMIT 1`

	var deliveryID int
	var deliveryName *string

	err := r.db.QueryRow(query, testCode).Scan(
		&participant.ID, &participant.Name, &participant.Reg, &participant.Email,
		&participant.Password, &participant.IsVerified, &participant.ClientID,
		&participant.CreatedAt, &participant.UpdatedAt,
		&deliveryID, &delivery.ExamID, &delivery.GroupID, &deliveryName,
		&delivery.ScheduledAt, &delivery.Duration, &delivery.IsAnytime, &delivery.AutomaticStart,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, fmt.Errorf("invalid test code or no active delivery")
		}
		return nil, nil, fmt.Errorf("failed to get participant by test code: %w", err)
	}

	delivery.ID = deliveryID
	delivery.Name = deliveryName

	return participant, delivery, nil
}

func (r *ParticipantModel) CreateSession(session *tables.Session) error {
	// TODO: Implement participant session management
	// This needs to be integrated with the existing session system
	// or create a separate participant session table
	return nil
}
