package models

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type ItemModel struct {
	db *database.DB
}

func NewItemModel(db *database.DB) *ItemModel {
	return &ItemModel{db: db}
}

func (r *ItemModel) Create(item *tables.Item) error {
	query := `
		INSERT INTO items (title, content, type, is_vignette, is_random, score, client_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, item.Title, item.Content, item.Type, item.IsVignette,
		item.IsRandom, item.Score, item.ClientID).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create item: %w", err)
	}
	return nil
}

func (r *ItemModel) GetByID(id int) (*tables.Item, error) {
	item := &tables.Item{}
	query := `
		SELECT id, title, content, type, is_vignette, is_random, score, client_id,
			   created_at, updated_at
		FROM items 
		WHERE id = $1`

	err := r.db.Get(item, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("item not found")
		}
		return nil, fmt.Errorf("failed to get item: %w", err)
	}
	return item, nil
}

func (r *ItemModel) Update(id int, updates *tables.ItemUpdateRequest) (*tables.Item, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Title != nil {
		setParts = append(setParts, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *updates.Title)
		argIndex++
	}
	if updates.Content != nil {
		setParts = append(setParts, fmt.Sprintf("content = $%d", argIndex))
		args = append(args, *updates.Content)
		argIndex++
	}
	if updates.Type != nil {
		setParts = append(setParts, fmt.Sprintf("type = $%d", argIndex))
		args = append(args, *updates.Type)
		argIndex++
	}
	if updates.IsVignette != nil {
		setParts = append(setParts, fmt.Sprintf("is_vignette = $%d", argIndex))
		args = append(args, *updates.IsVignette)
		argIndex++
	}
	if updates.IsRandom != nil {
		setParts = append(setParts, fmt.Sprintf("is_random = $%d", argIndex))
		args = append(args, *updates.IsRandom)
		argIndex++
	}
	if updates.Score != nil {
		setParts = append(setParts, fmt.Sprintf("score = $%d", argIndex))
		args = append(args, *updates.Score)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, "updated_at = NOW()")
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE items 
		SET %s 
		WHERE id = $%d`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update item: %w", err)
	}

	return r.GetByID(id)
}

func (r *ItemModel) Delete(id int) error {
	query := `DELETE FROM items WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete item: %w", err)
	}
	return nil
}

func (r *ItemModel) List(pagination tables.Pagination, search tables.ItemSearchRequest) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	whereClause := "WHERE 1=1"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3

	if search.Title != "" {
		whereClause += fmt.Sprintf(" AND title ILIKE $%d", argIndex)
		args = append(args, "%"+search.Title+"%")
		argIndex++
	}
	if search.Type != "" {
		whereClause += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, search.Type)
		argIndex++
	}
	if search.IsVignette != nil {
		whereClause += fmt.Sprintf(" AND is_vignette = $%d", argIndex)
		args = append(args, *search.IsVignette)
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM items %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get items with question count
	query := fmt.Sprintf(`
		SELECT i.id, i.title, i.content, i.type, i.is_vignette, i.is_random, 
			   i.score, i.client_id, i.created_at, i.updated_at,
			   COUNT(q.id) as question_count
		FROM items i
		LEFT JOIN questions q ON i.id = q.item_id
		%s 
		GROUP BY i.id, i.title, i.content, i.type, i.is_vignette, i.is_random,
				 i.score, i.client_id, i.created_at, i.updated_at
		ORDER BY i.created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	type ItemWithQuestionCount struct {
		tables.Item
		QuestionCount int `db:"question_count" json:"question_count"`
	}

	items := []ItemWithQuestionCount{}
	err = r.db.Select(&items, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get items: %w", err)
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

func (r *ItemModel) GetItemQuestions(itemID int, pagination tables.Pagination) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	// Get total count
	countQuery := `SELECT COUNT(*) FROM questions WHERE item_id = $1`
	var total int
	err := r.db.Get(&total, countQuery, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get questions with answers
	query := `
		SELECT q.id, q.item_id, q.type, q.question, q.is_random, q.score, q.order,
			   q.created_at, q.updated_at
		FROM questions q 
		WHERE q.item_id = $1
		ORDER BY q.order, q.id
		LIMIT $2 OFFSET $3`

	questions := []tables.Question{}
	err = r.db.Select(&questions, query, itemID, pagination.PerPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get item questions: %w", err)
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

func (r *ItemModel) GetItemWithQuestions(id int) (*tables.ItemWithQuestions, error) {
	item, err := r.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Get all questions for this item
	query := `
		SELECT id, item_id, type, question, is_random, score, "order", created_at, updated_at
		FROM questions 
		WHERE item_id = $1
		ORDER BY "order", id`

	questions := []tables.Question{}
	err = r.db.Select(&questions, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get item questions: %w", err)
	}

	return &tables.ItemWithQuestions{
		Item:      *item,
		Questions: questions,
	}, nil
}

func (r *ItemModel) GetItemCategories(itemID int) ([]tables.Category, error) {
	categories := []tables.Category{}
	query := `
		SELECT c.id, c.type, c.code, c.parent, c.name, c.description, c.client_id,
			   c.created_at, c.updated_at
		FROM categories c
		JOIN category_item ci ON c.id = ci.category_id
		WHERE ci.item_id = $1
		ORDER BY c.name`

	err := r.db.Select(&categories, query, itemID)
	if err != nil {
		return nil, fmt.Errorf("failed to get item categories: %w", err)
	}
	return categories, nil
}
