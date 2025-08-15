package handlers

import (
	"context"
	"net/http"

	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/tables"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
)

type CategoryHandler struct {
	categoryRepo *models.CategoryModel
}

func NewCategoryHandler(categoryRepo *models.CategoryModel) *CategoryHandler {
	return &CategoryHandler{categoryRepo: categoryRepo}
}

func (h *CategoryHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-categories",
		Method:      http.MethodGet,
		Path:        "/api/categories",
		Summary:     "List categories",
		Description: "Get a paginated list of question categories with search and type filtering.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListCategories)

	huma.Register(api, huma.Operation{
		OperationID: "get-category",
		Method:      http.MethodGet,
		Path:        "/api/categories/{id}",
		Summary:     "Get category by ID",
		Description: "Get detailed information about a specific category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetCategory)

	huma.Register(api, huma.Operation{
		OperationID: "create-category",
		Method:      http.MethodPost,
		Path:        "/api/categories",
		Summary:     "Create new category",
		Description: "Create a new question category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateCategory)

	huma.Register(api, huma.Operation{
		OperationID: "update-category",
		Method:      http.MethodPut,
		Path:        "/api/categories/{id}",
		Summary:     "Update category",
		Description: "Update category information.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateCategory)

	huma.Register(api, huma.Operation{
		OperationID: "delete-category",
		Method:      http.MethodDelete,
		Path:        "/api/categories/{id}",
		Summary:     "Delete category",
		Description: "Delete a question category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteCategory)

	huma.Register(api, huma.Operation{
		OperationID: "get-categories-by-type",
		Method:      http.MethodGet,
		Path:        "/api/categories/type/{type}",
		Summary:     "Get categories by type",
		Description: "Get all categories of a specific type (disease_group, region_group, etc.).",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetCategoriesByType)

	huma.Register(api, huma.Operation{
		OperationID: "get-category-questions",
		Method:      http.MethodGet,
		Path:        "/api/categories/{id}/questions",
		Summary:     "Get category questions",
		Description: "Get paginated list of questions in a category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetCategoryQuestions)

	huma.Register(api, huma.Operation{
		OperationID: "add-question-to-category",
		Method:      http.MethodPost,
		Path:        "/api/categories/{id}/questions",
		Summary:     "Add question to category",
		Description: "Add a question to a category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.AddQuestionToCategory)

	huma.Register(api, huma.Operation{
		OperationID: "remove-question-from-category",
		Method:      http.MethodDelete,
		Path:        "/api/categories/{id}/questions/{question_id}",
		Summary:     "Remove question from category",
		Description: "Remove a question from a category.",
		Tags:        []string{"Categories"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.RemoveQuestionFromCategory)
}

// List Categories
type ListCategoriesInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Name    string `query:"name" maxLength:"255"`
	Type    string `query:"type" enum:"disease_group,region_group,specific_part,typical_group"`
}

type ListCategoriesOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *CategoryHandler) ListCategories(ctx context.Context, input *ListCategoriesInput) (*ListCategoriesOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	search := tables.CategorySearchRequest{
		Name: input.Name,
		Type: tables.CategoryType(input.Type),
	}

	result, err := h.categoryRepo.List(pagination, search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get categories", err)
	}

	return &ListCategoriesOutput{Body: *result}, nil
}

// Get Category
type GetCategoryInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetCategoryOutput struct {
	Body *tables.Category `json:"body"`
}

func (h *CategoryHandler) GetCategory(ctx context.Context, input *GetCategoryInput) (*GetCategoryOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	category, err := h.categoryRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Category not found")
	}

	return &GetCategoryOutput{Body: category}, nil
}

// Create Category
type CreateCategoryInput struct {
	Body tables.CategoryCreateRequest `json:"body"`
}

type CreateCategoryOutput struct {
	Body struct {
		Success  bool             `json:"success"`
		Message  string           `json:"message"`
		Category *tables.Category `json:"category,omitempty"`
	} `json:"body"`
}

func (h *CategoryHandler) CreateCategory(ctx context.Context, input *CreateCategoryInput) (*CreateCategoryOutput, error) {
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

	category := &tables.Category{
		Type:        string(input.Body.Type),
		Code:        input.Body.Code,
		Parent:      input.Body.Parent,
		Name:        input.Body.Name,
		Description: input.Body.Description,
		ClientID:    2, // Default client ID
	}

	err := h.categoryRepo.Create(category)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create category", err)
	}

	return &CreateCategoryOutput{
		Body: struct {
			Success  bool             `json:"success"`
			Message  string           `json:"message"`
			Category *tables.Category `json:"category,omitempty"`
		}{
			Success:  true,
			Message:  "Category created successfully",
			Category: category,
		},
	}, nil
}

// Update Category
type UpdateCategoryInput struct {
	ID   int                          `path:"id" minimum:"1"`
	Body tables.CategoryUpdateRequest `json:"body"`
}

type UpdateCategoryOutput struct {
	Body struct {
		Success  bool             `json:"success"`
		Message  string           `json:"message"`
		Category *tables.Category `json:"category,omitempty"`
	} `json:"body"`
}

func (h *CategoryHandler) UpdateCategory(ctx context.Context, input *UpdateCategoryInput) (*UpdateCategoryOutput, error) {
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

	category, err := h.categoryRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update category", err)
	}

	return &UpdateCategoryOutput{
		Body: struct {
			Success  bool             `json:"success"`
			Message  string           `json:"message"`
			Category *tables.Category `json:"category,omitempty"`
		}{
			Success:  true,
			Message:  "Category updated successfully",
			Category: category,
		},
	}, nil
}

// Delete Category
type DeleteCategoryInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteCategoryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *CategoryHandler) DeleteCategory(ctx context.Context, input *DeleteCategoryInput) (*DeleteCategoryOutput, error) {
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

	err := h.categoryRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete category", err)
	}

	return &DeleteCategoryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Category deleted successfully",
		},
	}, nil
}

// Get Categories by Type
type GetCategoriesByTypeInput struct {
	Type string `path:"type" enum:"disease_group,region_group,specific_part,typical_group"`
}

type GetCategoriesByTypeOutput struct {
	Body []tables.Category `json:"body"`
}

func (h *CategoryHandler) GetCategoriesByType(ctx context.Context, input *GetCategoriesByTypeInput) (*GetCategoriesByTypeOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	categories, err := h.categoryRepo.GetByType(tables.CategoryType(input.Type))
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get categories", err)
	}

	return &GetCategoriesByTypeOutput{Body: categories}, nil
}

// Get Category Questions
type GetCategoryQuestionsInput struct {
	ID      int `path:"id" minimum:"1"`
	Page    int `query:"page" default:"1" minimum:"1"`
	PerPage int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetCategoryQuestionsOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *CategoryHandler) GetCategoryQuestions(ctx context.Context, input *GetCategoryQuestionsInput) (*GetCategoryQuestionsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.categoryRepo.GetCategoryQuestions(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get category questions", err)
	}

	return &GetCategoryQuestionsOutput{Body: *result}, nil
}

// Add Question to Category
type AddQuestionToCategoryInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		QuestionID int `json:"question_id" required:"true" minimum:"1"`
	} `json:"body"`
}

type AddQuestionToCategoryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *CategoryHandler) AddQuestionToCategory(ctx context.Context, input *AddQuestionToCategoryInput) (*AddQuestionToCategoryOutput, error) {
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

	err := h.categoryRepo.AddQuestion(input.ID, input.Body.QuestionID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to add question to category", err)
	}

	return &AddQuestionToCategoryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Question added to category successfully",
		},
	}, nil
}

// Remove Question from Category
type RemoveQuestionFromCategoryInput struct {
	ID         int `path:"id" minimum:"1"`
	QuestionID int `path:"question_id" minimum:"1"`
}

type RemoveQuestionFromCategoryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *CategoryHandler) RemoveQuestionFromCategory(ctx context.Context, input *RemoveQuestionFromCategoryInput) (*RemoveQuestionFromCategoryOutput, error) {
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

	err := h.categoryRepo.RemoveQuestion(input.ID, input.QuestionID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to remove question from category", err)
	}

	return &RemoveQuestionFromCategoryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Question removed from category successfully",
		},
	}, nil
}
