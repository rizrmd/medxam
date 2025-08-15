package models

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type ExamModel struct {
	db *database.DB
}

func NewExamModel(db *database.DB) *ExamModel {
	return &ExamModel{db: db}
}

func (r *ExamModel) Create(exam *tables.Exam) error {
	query := `
		INSERT INTO exams (code, name, description, options, is_mcq, is_interview, 
						  is_random, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, exam.Code, exam.Name, exam.Description, exam.Options,
		exam.IsMCQ, exam.IsInterview, exam.IsRandom, exam.ClientID).Scan(&exam.ID, &exam.CreatedAt, &exam.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create exam: %w", err)
	}
	return nil
}

func (r *ExamModel) GetByID(id int) (*tables.Exam, error) {
	exam := &tables.Exam{}
	query := `
		SELECT id, code, name, description, options, is_mcq, is_interview, 
			   is_random, client_id, created_at, updated_at
		FROM exams 
		WHERE id = $1`

	err := r.db.Get(exam, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("exam not found")
		}
		return nil, fmt.Errorf("failed to get exam: %w", err)
	}
	return exam, nil
}

func (r *ExamModel) GetByCode(code string) (*tables.Exam, error) {
	exam := &tables.Exam{}
	query := `
		SELECT id, code, name, description, options, is_mcq, is_interview, 
			   is_random, client_id, created_at, updated_at
		FROM exams 
		WHERE code = $1`

	err := r.db.Get(exam, query, code)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("exam not found")
		}
		return nil, fmt.Errorf("failed to get exam: %w", err)
	}
	return exam, nil
}

func (r *ExamModel) Update(id int, updates *tables.ExamUpdateRequest) (*tables.Exam, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Code != nil {
		setParts = append(setParts, fmt.Sprintf("code = $%d", argIndex))
		args = append(args, *updates.Code)
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
	if updates.IsMCQ != nil {
		setParts = append(setParts, fmt.Sprintf("is_mcq = $%d", argIndex))
		args = append(args, *updates.IsMCQ)
		argIndex++
	}
	if updates.IsInterview != nil {
		setParts = append(setParts, fmt.Sprintf("is_interview = $%d", argIndex))
		args = append(args, *updates.IsInterview)
		argIndex++
	}
	if updates.IsRandom != nil {
		setParts = append(setParts, fmt.Sprintf("is_random = $%d", argIndex))
		args = append(args, *updates.IsRandom)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE exams 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update exam: %w", err)
	}

	return r.GetByID(id)
}

func (r *ExamModel) Delete(id int) error {
	query := `DELETE FROM exams WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete exam: %w", err)
	}
	return nil
}

func (r *ExamModel) List(pagination tables.Pagination, search tables.ExamSearchRequest) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Build WHERE clause and arguments
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIndex := 1

	if search.Code != "" {
		whereClause += fmt.Sprintf(" AND code ILIKE $%d", argIndex)
		args = append(args, "%"+search.Code+"%")
		argIndex++
	}
	if search.Name != "" {
		whereClause += fmt.Sprintf(" AND name ILIKE $%d", argIndex)
		args = append(args, "%"+search.Name+"%")
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM exams %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Add pagination parameters
	limitParam := fmt.Sprintf("$%d", argIndex)
	argIndex++
	offsetParam := fmt.Sprintf("$%d", argIndex)
	args = append(args, pagination.PerPage, offset)

	// Get exams with question count
	query := fmt.Sprintf(`
		SELECT e.id, e.code, e.name, e.description, e.options, e.is_mcq, 
			   e.is_interview, e.is_random, e.client_id, e.created_at, e.updated_at,
			   COUNT(ei.item_id) as question_count
		FROM exams e
		LEFT JOIN exam_item ei ON e.id = ei.exam_id
		%s 
		GROUP BY e.id, e.code, e.name, e.description, e.options, e.is_mcq, 
				 e.is_interview, e.is_random, e.client_id, e.created_at, e.updated_at
		ORDER BY e.created_at DESC
		LIMIT %s OFFSET %s`, whereClause, limitParam, offsetParam)

	type ExamWithCount struct {
		tables.Exam
		QuestionCount int `db:"question_count" json:"question_count"`
	}

	exams := []ExamWithCount{}
	err = r.db.Select(&exams, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get exams: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       exams,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *ExamModel) GetExamItems(examID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `
		SELECT COUNT(*) 
		FROM exam_item ei 
		JOIN items i ON ei.item_id = i.id 
		WHERE ei.exam_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, examID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get items
	query := `
		SELECT i.id, i.title, i.content, i.type, i.is_vignette, i.is_random, 
			   i.score, i.client_id, i.created_at, i.updated_at, ei.order
		FROM exam_item ei 
		JOIN items i ON ei.item_id = i.id 
		WHERE ei.exam_id = $1
		ORDER BY ei.order, i.id
		LIMIT $2 OFFSET $3`

	type ItemWithOrder struct {
		tables.Item
		Order int `db:"order" json:"order"`
	}

	items := []ItemWithOrder{}
	err = r.db.Select(&items, query, examID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get exam items: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       items,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *ExamModel) AddItem(examID, itemID, order int) error {
	query := `
		INSERT INTO exam_item (exam_id, item_id, "order")
		VALUES ($1, $2, $3)
		ON CONFLICT (exam_id, item_id) DO UPDATE SET "order" = EXCLUDED."order"`

	_, err := r.db.Exec(query, examID, itemID, order)
	if err != nil {
		return fmt.Errorf("failed to add item to exam: %w", err)
	}
	return nil
}

func (r *ExamModel) RemoveItem(examID, itemID int) error {
	query := `DELETE FROM exam_item WHERE exam_id = $1 AND item_id = $2`
	_, err := r.db.Exec(query, examID, itemID)
	if err != nil {
		return fmt.Errorf("failed to remove item from exam: %w", err)
	}
	return nil
}

func (r *ExamModel) UpdateItemOrder(examID, itemID, order int) error {
	query := `UPDATE exam_item SET "order" = $3 WHERE exam_id = $1 AND item_id = $2`
	_, err := r.db.Exec(query, examID, itemID, order)
	if err != nil {
		return fmt.Errorf("failed to update item order: %w", err)
	}
	return nil
}
