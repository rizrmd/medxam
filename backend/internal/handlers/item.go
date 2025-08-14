package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
)

type ItemHandler struct {
	itemRepo *repository.ItemRepository
}

func NewItemHandler(itemRepo *repository.ItemRepository) *ItemHandler {
	return &ItemHandler{itemRepo: itemRepo}
}

func (h *ItemHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-items",
		Method:      http.MethodGet,
		Path:        "/api/items",
		Summary:     "List question sets",
		Description: "Get a paginated list of question sets with search and filtering.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListItems)

	huma.Register(api, huma.Operation{
		OperationID: "get-item",
		Method:      http.MethodGet,
		Path:        "/api/items/{id}",
		Summary:     "Get question set by ID",
		Description: "Get detailed information about a specific question set.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetItem)

	huma.Register(api, huma.Operation{
		OperationID: "get-item-with-questions",
		Method:      http.MethodGet,
		Path:        "/api/items/{id}/full",
		Summary:     "Get question set with all questions",
		Description: "Get a question set with all its questions included.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetItemWithQuestions)

	huma.Register(api, huma.Operation{
		OperationID: "create-item",
		Method:      http.MethodPost,
		Path:        "/api/items",
		Summary:     "Create new question set",
		Description: "Create a new question set (item).",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateItem)

	huma.Register(api, huma.Operation{
		OperationID: "update-item",
		Method:      http.MethodPut,
		Path:        "/api/items/{id}",
		Summary:     "Update question set",
		Description: "Update question set information.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateItem)

	huma.Register(api, huma.Operation{
		OperationID: "delete-item",
		Method:      http.MethodDelete,
		Path:        "/api/items/{id}",
		Summary:     "Delete question set",
		Description: "Delete a question set and all its questions.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteItem)

	huma.Register(api, huma.Operation{
		OperationID: "get-item-questions",
		Method:      http.MethodGet,
		Path:        "/api/items/{id}/questions",
		Summary:     "Get question set questions",
		Description: "Get paginated list of questions in a question set.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetItemQuestions)

	huma.Register(api, huma.Operation{
		OperationID: "get-item-categories",
		Method:      http.MethodGet,
		Path:        "/api/items/{id}/categories",
		Summary:     "Get question set categories",
		Description: "Get all categories that a question set belongs to.",
		Tags:        []string{"Items"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetItemCategories)
}

// List Items
type ListItemsInput struct {
	Page       int    `query:"page" default:"1" minimum:"1"`
	PerPage    int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Title      string `query:"title" maxLength:"255"`
	Type       string `query:"type" enum:"simple,multiple_choice,essay,interview"`
	IsVignette int    `query:"is_vignette" default:"0" enum:"0,1"`
}

type ListItemsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *ItemHandler) ListItems(ctx context.Context, input *ListItemsInput) (*ListItemsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	var isVignette *bool
	if input.IsVignette == 1 {
		v := true
		isVignette = &v
	} else if input.IsVignette == -1 {
		v := false
		isVignette = &v
	}

	search := models.ItemSearchRequest{
		Title:      input.Title,
		Type:       input.Type,
		IsVignette: isVignette,
	}

	result, err := h.itemRepo.List(pagination, search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get items", err)
	}

	return &ListItemsOutput{Body: *result}, nil
}

// Get Item
type GetItemInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetItemOutput struct {
	Body *models.Item `json:"body"`
}

func (h *ItemHandler) GetItem(ctx context.Context, input *GetItemInput) (*GetItemOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	item, err := h.itemRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Item not found")
	}

	return &GetItemOutput{Body: item}, nil
}

// Get Item with Questions
type GetItemWithQuestionsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetItemWithQuestionsOutput struct {
	Body *models.ItemWithQuestions `json:"body"`
}

func (h *ItemHandler) GetItemWithQuestions(ctx context.Context, input *GetItemWithQuestionsInput) (*GetItemWithQuestionsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	item, err := h.itemRepo.GetItemWithQuestions(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Item not found")
	}

	return &GetItemWithQuestionsOutput{Body: item}, nil
}

// Create Item
type CreateItemInput struct {
	Body models.ItemCreateRequest `json:"body"`
}

type CreateItemOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Item    *models.Item `json:"item,omitempty"`
	} `json:"body"`
}

func (h *ItemHandler) CreateItem(ctx context.Context, input *CreateItemInput) (*CreateItemOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	clientID := 2 // Default client ID
	item := &models.Item{
		Title:      input.Body.Title,
		Content:    input.Body.Content,
		Type:       input.Body.Type,
		IsVignette: input.Body.IsVignette,
		IsRandom:   input.Body.IsRandom,
		Score:      input.Body.Score,
		ClientID:   &clientID,
	}

	err := h.itemRepo.Create(item)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create item", err)
	}

	return &CreateItemOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			Item    *models.Item `json:"item,omitempty"`
		}{
			Success: true,
			Message: "Question set created successfully",
			Item:    item,
		},
	}, nil
}

// Update Item
type UpdateItemInput struct {
	ID   int                      `path:"id" minimum:"1"`
	Body models.ItemUpdateRequest `json:"body"`
}

type UpdateItemOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Item    *models.Item `json:"item,omitempty"`
	} `json:"body"`
}

func (h *ItemHandler) UpdateItem(ctx context.Context, input *UpdateItemInput) (*UpdateItemOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	item, err := h.itemRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update item", err)
	}

	return &UpdateItemOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			Item    *models.Item `json:"item,omitempty"`
		}{
			Success: true,
			Message: "Question set updated successfully",
			Item:    item,
		},
	}, nil
}

// Delete Item
type DeleteItemInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteItemOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ItemHandler) DeleteItem(ctx context.Context, input *DeleteItemInput) (*DeleteItemOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	err := h.itemRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete item", err)
	}

	return &DeleteItemOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Question set deleted successfully",
		},
	}, nil
}

// Get Item Questions
type GetItemQuestionsInput struct {
	ID      int `path:"id" minimum:"1"`
	Page    int `query:"page" default:"1" minimum:"1"`
	PerPage int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetItemQuestionsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *ItemHandler) GetItemQuestions(ctx context.Context, input *GetItemQuestionsInput) (*GetItemQuestionsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.itemRepo.GetItemQuestions(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get item questions", err)
	}

	return &GetItemQuestionsOutput{Body: *result}, nil
}

// Get Item Categories
type GetItemCategoriesInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetItemCategoriesOutput struct {
	Body []models.Category `json:"body"`
}

func (h *ItemHandler) GetItemCategories(ctx context.Context, input *GetItemCategoriesInput) (*GetItemCategoriesOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	categories, err := h.itemRepo.GetItemCategories(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get item categories", err)
	}

	return &GetItemCategoriesOutput{Body: categories}, nil
}