package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/models"
)

type TakerRepository struct {
	db *database.DB
}

func NewTakerRepository(db *database.DB) *TakerRepository {
	return &TakerRepository{db: db}
}

func (r *TakerRepository) Create(taker *models.Taker) error {
	query := `
		INSERT INTO takers (name, reg, email, password, is_verified, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, created_at, updated_at`
	
	err := r.db.QueryRow(query, taker.Name, taker.Reg, taker.Email, 
		taker.Password, taker.IsVerified, taker.ClientID).Scan(&taker.ID, &taker.CreatedAt, &taker.UpdatedAt)
	
	if err != nil {
		return fmt.Errorf("failed to create taker: %w", err)
	}
	return nil
}

func (r *TakerRepository) GetByID(id int) (*models.Taker, error) {
	taker := &models.Taker{}
	query := `
		SELECT id, name, reg, email, password, is_verified, client_id, 
			   created_at, updated_at
		FROM takers 
		WHERE id = $1`
	
	err := r.db.Get(taker, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("taker not found")
		}
		return nil, fmt.Errorf("failed to get taker: %w", err)
	}
	return taker, nil
}

func (r *TakerRepository) GetByEmail(email string) (*models.Taker, error) {
	taker := &models.Taker{}
	query := `
		SELECT id, name, reg, email, password, is_verified, client_id, 
			   created_at, updated_at
		FROM takers 
		WHERE email = $1`
	
	err := r.db.Get(taker, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("taker not found")
		}
		return nil, fmt.Errorf("failed to get taker: %w", err)
	}
	return taker, nil
}

func (r *TakerRepository) Update(id int, updates *models.TakerUpdateRequest) (*models.Taker, error) {
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
		return nil, fmt.Errorf("failed to update taker: %w", err)
	}

	return r.GetByID(id)
}

func (r *TakerRepository) Delete(id int) error {
	query := `DELETE FROM takers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete taker: %w", err)
	}
	return nil
}

func (r *TakerRepository) List(pagination models.Pagination, search string, groupID *int) (*models.PaginatedResponse, error) {
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

	takers := []models.Taker{}
	err = r.db.Select(&takers, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get takers: %w", err)
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

func (r *TakerRepository) GetTakerGroups(takerID int) ([]models.Group, error) {
	groups := []models.Group{}
	query := `
		SELECT g.id, g.name, g.description, g.code, g.last_taker_code, 
			   g.closed_at, g.client_id, g.created_at, g.updated_at
		FROM groups g
		JOIN group_taker gt ON g.id = gt.group_id
		WHERE gt.taker_id = $1
		ORDER BY g.name`
	
	err := r.db.Select(&groups, query, takerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get taker groups: %w", err)
	}
	return groups, nil
}

func (r *TakerRepository) UpdatePassword(takerID int, hashedPassword string) error {
	query := `UPDATE takers SET password = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, hashedPassword, takerID)
	if err != nil {
		return fmt.Errorf("failed to update taker password: %w", err)
	}
	return nil
}

func (r *TakerRepository) SetVerified(takerID int, verified bool) error {
	query := `UPDATE takers SET is_verified = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, verified, takerID)
	if err != nil {
		return fmt.Errorf("failed to update taker verification status: %w", err)
	}
	return nil
}