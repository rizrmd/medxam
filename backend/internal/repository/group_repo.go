package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/models"
)

type GroupRepository struct {
	db *database.DB
}

func NewGroupRepository(db *database.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) Create(group *models.Group) error {
	query := `
		INSERT INTO groups (name, description, code, last_taker_code, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, created_at, updated_at`
	
	err := r.db.QueryRow(query, group.Name, group.Description, group.Code, 
		group.LastTakerCode, group.ClientID).Scan(&group.ID, &group.CreatedAt, &group.UpdatedAt)
	
	if err != nil {
		return fmt.Errorf("failed to create group: %w", err)
	}
	return nil
}

func (r *GroupRepository) GetByID(id int) (*models.Group, error) {
	group := &models.Group{}
	query := `
		SELECT id, name, description, code, last_taker_code, closed_at, 
			   client_id, created_at, updated_at
		FROM groups 
		WHERE id = $1`
	
	err := r.db.Get(group, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("group not found")
		}
		return nil, fmt.Errorf("failed to get group: %w", err)
	}
	return group, nil
}

func (r *GroupRepository) Update(id int, updates *models.GroupUpdateRequest) (*models.Group, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Code != nil {
		setParts = append(setParts, fmt.Sprintf("code = $%d", argIndex))
		args = append(args, *updates.Code)
		argIndex++
	}
	if updates.ClosedAt != nil {
		setParts = append(setParts, fmt.Sprintf("closed_at = $%d", argIndex))
		args = append(args, *updates.ClosedAt)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE groups 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update group: %w", err)
	}

	return r.GetByID(id)
}

func (r *GroupRepository) Delete(id int) error {
	query := `DELETE FROM groups WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}
	return nil
}

func (r *GroupRepository) List(pagination models.Pagination, search string) (*models.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage
	
	whereClause := "WHERE 1=1"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3
	
	if search != "" {
		whereClause += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex)
		args = append(args, "%"+search+"%")
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM groups %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get groups with participant count
	query := fmt.Sprintf(`
		SELECT g.id, g.name, g.description, g.code, g.last_taker_code, 
			   g.closed_at, g.client_id, g.created_at, g.updated_at,
			   COUNT(gt.taker_id) as participant_count
		FROM groups g
		LEFT JOIN group_taker gt ON g.id = gt.group_id
		%s 
		GROUP BY g.id, g.name, g.description, g.code, g.last_taker_code, 
				 g.closed_at, g.client_id, g.created_at, g.updated_at
		ORDER BY g.created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	groups := []models.GroupWithStats{}
	err = r.db.Select(&groups, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get groups: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &models.PaginatedResponse{
		Data:       groups,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *GroupRepository) GetGroupTakers(groupID int, pagination models.Pagination) (*models.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `
		SELECT COUNT(*) 
		FROM group_taker gt 
		JOIN takers t ON gt.taker_id = t.id 
		WHERE gt.group_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get takers
	query := `
		SELECT t.id, t.name, t.reg, t.email, t.is_verified, t.client_id, 
			   t.created_at, t.updated_at, gt.code
		FROM group_taker gt 
		JOIN takers t ON gt.taker_id = t.id 
		WHERE gt.group_id = $1
		ORDER BY gt.code
		LIMIT $2 OFFSET $3`

	type TakerWithCode struct {
		models.Taker
		Code string `db:"code" json:"code"`
	}

	takers := []TakerWithCode{}
	err = r.db.Select(&takers, query, groupID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get group takers: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &models.PaginatedResponse{
		Data:       takers,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *GroupRepository) AddTaker(groupID, takerID int, code string) error {
	query := `
		INSERT INTO group_taker (group_id, taker_id, code)
		VALUES ($1, $2, $3)
		ON CONFLICT (group_id, taker_id) DO UPDATE SET code = EXCLUDED.code`
	
	_, err := r.db.Exec(query, groupID, takerID, code)
	if err != nil {
		return fmt.Errorf("failed to add taker to group: %w", err)
	}
	return nil
}

func (r *GroupRepository) RemoveTaker(groupID, takerID int) error {
	query := `DELETE FROM group_taker WHERE group_id = $1 AND taker_id = $2`
	_, err := r.db.Exec(query, groupID, takerID)
	if err != nil {
		return fmt.Errorf("failed to remove taker from group: %w", err)
	}
	return nil
}

func (r *GroupRepository) GenerateNextTakerCode(groupID int) (string, error) {
	// Get current last_taker_code and increment it
	query := `
		UPDATE groups 
		SET last_taker_code = last_taker_code + 1, updated_at = NOW()
		WHERE id = $1
		RETURNING last_taker_code`
	
	var nextCode int
	err := r.db.QueryRow(query, groupID).Scan(&nextCode)
	if err != nil {
		return "", fmt.Errorf("failed to generate next taker code: %w", err)
	}
	
	return fmt.Sprintf("%d", nextCode), nil
}