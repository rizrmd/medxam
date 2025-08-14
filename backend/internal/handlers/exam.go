package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
)

type ExamHandler struct {
	examRepo *repository.ExamRepository
}

func NewExamHandler(examRepo *repository.ExamRepository) *ExamHandler {
	return &ExamHandler{examRepo: examRepo}
}

func (h *ExamHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-exams",
		Method:      http.MethodGet,
		Path:        "/api/exams",
		Summary:     "List exams",
		Description: "Get a paginated list of exams with search functionality.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListExams)

	huma.Register(api, huma.Operation{
		OperationID: "get-exam",
		Method:      http.MethodGet,
		Path:        "/api/exams/{id}",
		Summary:     "Get exam by ID",
		Description: "Get detailed information about a specific exam.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetExam)

	huma.Register(api, huma.Operation{
		OperationID: "create-exam",
		Method:      http.MethodPost,
		Path:        "/api/exams",
		Summary:     "Create new exam",
		Description: "Create a new examination definition.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateExam)

	huma.Register(api, huma.Operation{
		OperationID: "update-exam",
		Method:      http.MethodPut,
		Path:        "/api/exams/{id}",
		Summary:     "Update exam",
		Description: "Update examination information.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateExam)

	huma.Register(api, huma.Operation{
		OperationID: "delete-exam",
		Method:      http.MethodDelete,
		Path:        "/api/exams/{id}",
		Summary:     "Delete exam",
		Description: "Delete an examination definition.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteExam)

	huma.Register(api, huma.Operation{
		OperationID: "get-exam-items",
		Method:      http.MethodGet,
		Path:        "/api/exams/{id}/items",
		Summary:     "Get exam items",
		Description: "Get paginated list of question sets in an exam.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetExamItems)

	huma.Register(api, huma.Operation{
		OperationID: "add-item-to-exam",
		Method:      http.MethodPost,
		Path:        "/api/exams/{id}/items",
		Summary:     "Add item to exam",
		Description: "Add a question set to an exam with specific order.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.AddItemToExam)

	huma.Register(api, huma.Operation{
		OperationID: "remove-item-from-exam",
		Method:      http.MethodDelete,
		Path:        "/api/exams/{id}/items/{item_id}",
		Summary:     "Remove item from exam",
		Description: "Remove a question set from an exam.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.RemoveItemFromExam)

	huma.Register(api, huma.Operation{
		OperationID: "update-exam-item-order",
		Method:      http.MethodPut,
		Path:        "/api/exams/{id}/items/{item_id}/order",
		Summary:     "Update item order",
		Description: "Update the order of a question set in an exam.",
		Tags:        []string{"Exams"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateItemOrder)
}

// List Exams
type ListExamsInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Code    string `query:"code" maxLength:"255"`
	Name    string `query:"name" maxLength:"255"`
}

type ListExamsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *ExamHandler) ListExams(ctx context.Context, input *ListExamsInput) (*ListExamsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	search := models.ExamSearchRequest{
		Code: input.Code,
		Name: input.Name,
	}

	result, err := h.examRepo.List(pagination, search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get exams", err)
	}

	return &ListExamsOutput{Body: *result}, nil
}

// Get Exam
type GetExamInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetExamOutput struct {
	Body *models.Exam `json:"body"`
}

func (h *ExamHandler) GetExam(ctx context.Context, input *GetExamInput) (*GetExamOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	exam, err := h.examRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Exam not found")
	}

	return &GetExamOutput{Body: exam}, nil
}

// Create Exam
type CreateExamInput struct {
	Body models.ExamCreateRequest `json:"body"`
}

type CreateExamOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Exam    *models.Exam `json:"exam,omitempty"`
	} `json:"body"`
}

func (h *ExamHandler) CreateExam(ctx context.Context, input *CreateExamInput) (*CreateExamOutput, error) {
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

	exam := &models.Exam{
		Code:        input.Body.Code,
		Name:        input.Body.Name,
		Description: input.Body.Description,
		IsMCQ:       input.Body.IsMCQ,
		IsInterview: input.Body.IsInterview,
		IsRandom:    input.Body.IsRandom,
		ClientID:    2, // Default client ID
	}

	err := h.examRepo.Create(exam)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create exam", err)
	}

	return &CreateExamOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			Exam    *models.Exam `json:"exam,omitempty"`
		}{
			Success: true,
			Message: "Exam created successfully",
			Exam:    exam,
		},
	}, nil
}

// Update Exam
type UpdateExamInput struct {
	ID   int                      `path:"id" minimum:"1"`
	Body models.ExamUpdateRequest `json:"body"`
}

type UpdateExamOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		Exam    *models.Exam `json:"exam,omitempty"`
	} `json:"body"`
}

func (h *ExamHandler) UpdateExam(ctx context.Context, input *UpdateExamInput) (*UpdateExamOutput, error) {
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

	exam, err := h.examRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update exam", err)
	}

	return &UpdateExamOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			Exam    *models.Exam `json:"exam,omitempty"`
		}{
			Success: true,
			Message: "Exam updated successfully",
			Exam:    exam,
		},
	}, nil
}

// Delete Exam
type DeleteExamInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteExamOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ExamHandler) DeleteExam(ctx context.Context, input *DeleteExamInput) (*DeleteExamOutput, error) {
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

	err := h.examRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete exam", err)
	}

	return &DeleteExamOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Exam deleted successfully",
		},
	}, nil
}

// Get Exam Items
type GetExamItemsInput struct {
	ID      int `path:"id" minimum:"1"`
	Page    int `query:"page" default:"1" minimum:"1"`
	PerPage int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetExamItemsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *ExamHandler) GetExamItems(ctx context.Context, input *GetExamItemsInput) (*GetExamItemsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.examRepo.GetExamItems(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get exam items", err)
	}

	return &GetExamItemsOutput{Body: *result}, nil
}

// Add Item to Exam
type AddItemToExamInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		ItemID int `json:"item_id" required:"true" minimum:"1"`
		Order  int `json:"order" default:"0" minimum:"0"`
	} `json:"body"`
}

type AddItemToExamOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ExamHandler) AddItemToExam(ctx context.Context, input *AddItemToExamInput) (*AddItemToExamOutput, error) {
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

	err := h.examRepo.AddItem(input.ID, input.Body.ItemID, input.Body.Order)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to add item to exam", err)
	}

	return &AddItemToExamOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Item added to exam successfully",
		},
	}, nil
}

// Remove Item from Exam
type RemoveItemFromExamInput struct {
	ID     int `path:"id" minimum:"1"`
	ItemID int `path:"item_id" minimum:"1"`
}

type RemoveItemFromExamOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ExamHandler) RemoveItemFromExam(ctx context.Context, input *RemoveItemFromExamInput) (*RemoveItemFromExamOutput, error) {
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

	err := h.examRepo.RemoveItem(input.ID, input.ItemID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to remove item from exam", err)
	}

	return &RemoveItemFromExamOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Item removed from exam successfully",
		},
	}, nil
}

// Update Item Order
type UpdateItemOrderInput struct {
	ID     int `path:"id" minimum:"1"`
	ItemID int `path:"item_id" minimum:"1"`
	Body   struct {
		Order int `json:"order" required:"true" minimum:"0"`
	} `json:"body"`
}

type UpdateItemOrderOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ExamHandler) UpdateItemOrder(ctx context.Context, input *UpdateItemOrderInput) (*UpdateItemOrderOutput, error) {
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

	err := h.examRepo.UpdateItemOrder(input.ID, input.ItemID, input.Body.Order)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update item order", err)
	}

	return &UpdateItemOrderOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Item order updated successfully",
		},
	}, nil
}