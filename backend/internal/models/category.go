package models

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type CategoryModel struct {
	db *database.DB
}

func NewCategoryModel(db *database.DB) *CategoryModel {
	return &CategoryModel{db: db}
}

func (r *CategoryModel) Create(category *tables.Category) error {
	query := `
		INSERT INTO categories (type, code, parent, name, description, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, string(category.Type), category.Code, category.Parent,
		category.Name, category.Description, category.ClientID).Scan(&category.ID, &category.CreatedAt, &category.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create category: %w", err)
	}
	return nil
}

func (r *CategoryModel) GetByID(id int) (*tables.Category, error) {
	category := &tables.Category{}
	query := `
		SELECT id, type, code, parent, name, description, client_id, 
			   created_at, updated_at
		FROM categories 
		WHERE id = $1`

	err := r.db.Get(category, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to get category: %w", err)
	}
	return category, nil
}

func (r *CategoryModel) Update(id int, updates *tables.CategoryUpdateRequest) (*tables.Category, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Type != nil {
		setParts = append(setParts, fmt.Sprintf("type = $%d", argIndex))
		args = append(args, string(*updates.Type))
		argIndex++
	}
	if updates.Code != nil {
		setParts = append(setParts, fmt.Sprintf("code = $%d", argIndex))
		args = append(args, *updates.Code)
		argIndex++
	}
	if updates.Parent != nil {
		setParts = append(setParts, fmt.Sprintf("parent = $%d", argIndex))
		args = append(args, *updates.Parent)
		argIndex++
	}
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

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE categories 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update category: %w", err)
	}

	return r.GetByID(id)
}

func (r *CategoryModel) Delete(id int) error {
	query := `DELETE FROM categories WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}
	return nil
}

func (r *CategoryModel) List(pagination tables.Pagination, search tables.CategorySearchRequest) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	whereClause := "WHERE 1=1"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3

	if search.Name != "" {
		whereClause += fmt.Sprintf(" AND name ILIKE $%d", argIndex)
		args = append(args, "%"+search.Name+"%")
		argIndex++
	}
	if search.Type != "" {
		whereClause += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, string(search.Type))
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM categories %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get categories with question count
	query := fmt.Sprintf(`
		SELECT c.id, c.type, c.code, c.parent, c.name, c.description, c.client_id, 
			   c.created_at, c.updated_at,
			   COUNT(cq.question_id) as question_count
		FROM categories c
		LEFT JOIN category_question cq ON c.id = cq.category_id
		%s 
		GROUP BY c.id, c.type, c.code, c.parent, c.name, c.description, c.client_id,
				 c.created_at, c.updated_at
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	categories := []tables.CategoryWithCount{}
	err = r.db.Select(&categories, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       categories,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *CategoryModel) GetByType(categoryType tables.CategoryType) ([]tables.Category, error) {
	categories := []tables.Category{}
	query := `
		SELECT id, type, code, parent, name, description, client_id, 
			   created_at, updated_at
		FROM categories 
		WHERE type = $1
		ORDER BY name`

	err := r.db.Select(&categories, query, string(categoryType))
	if err != nil {
		return nil, fmt.Errorf("failed to get categories by type: %w", err)
	}
	return categories, nil
}

func (r *CategoryModel) GetCategoryQuestions(categoryID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `
		SELECT COUNT(*) 
		FROM category_question cq 
		JOIN questions q ON cq.question_id = q.id 
		WHERE cq.category_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, categoryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get questions
	query := `
		SELECT q.id, q.item_id, q.type, q.question, q.is_random, q.score, q.order,
			   q.created_at, q.updated_at
		FROM category_question cq 
		JOIN questions q ON cq.question_id = q.id 
		WHERE cq.category_id = $1
		ORDER BY q.order, q.id
		LIMIT $2 OFFSET $3`

	questions := []tables.Question{}
	err = r.db.Select(&questions, query, categoryID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get category questions: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       questions,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *CategoryModel) AddQuestion(categoryID, questionID int) error {
	query := `
		INSERT INTO category_question (category_id, question_id)
		VALUES ($1, $2)
		ON CONFLICT (category_id, question_id) DO NOTHING`

	_, err := r.db.Exec(query, categoryID, questionID)
	if err != nil {
		return fmt.Errorf("failed to add question to category: %w", err)
	}
	return nil
}

func (r *CategoryModel) RemoveQuestion(categoryID, questionID int) error {
	query := `DELETE FROM category_question WHERE category_id = $1 AND question_id = $2`
	_, err := r.db.Exec(query, categoryID, questionID)
	if err != nil {
		return fmt.Errorf("failed to remove question from category: %w", err)
	}
	return nil
}

func (r *CategoryModel) AddItem(categoryID, itemID int) error {
	query := `
		INSERT INTO category_item (category_id, item_id)
		VALUES ($1, $2)
		ON CONFLICT (category_id, item_id) DO NOTHING`

	_, err := r.db.Exec(query, categoryID, itemID)
	if err != nil {
		return fmt.Errorf("failed to add item to category: %w", err)
	}
	return nil
}

func (r *CategoryModel) RemoveItem(categoryID, itemID int) error {
	query := `DELETE FROM category_item WHERE category_id = $1 AND item_id = $2`
	_, err := r.db.Exec(query, categoryID, itemID)
	if err != nil {
		return fmt.Errorf("failed to remove item from category: %w", err)
	}
	return nil
}
