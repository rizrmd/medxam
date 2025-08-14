package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
	"github.com/medxamion/medxamion/internal/utils"
)

type TakerHandler struct {
	takerRepo *repository.TakerRepository
}

func NewTakerHandler(takerRepo *repository.TakerRepository) *TakerHandler {
	return &TakerHandler{takerRepo: takerRepo}
}

func (h *TakerHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-takers",
		Method:      http.MethodGet,
		Path:        "/api/takers",
		Summary:     "List takers",
		Description: "Get a paginated list of candidates (takers) with optional search and group filtering.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListTakers)

	huma.Register(api, huma.Operation{
		OperationID: "get-taker",
		Method:      http.MethodGet,
		Path:        "/api/takers/{id}",
		Summary:     "Get taker by ID",
		Description: "Get detailed information about a specific candidate (taker).",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetTaker)

	huma.Register(api, huma.Operation{
		OperationID: "create-taker",
		Method:      http.MethodPost,
		Path:        "/api/takers",
		Summary:     "Create new taker",
		Description: "Register a new candidate (taker) for exams.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateTaker)

	huma.Register(api, huma.Operation{
		OperationID: "update-taker",
		Method:      http.MethodPut,
		Path:        "/api/takers/{id}",
		Summary:     "Update taker",
		Description: "Update candidate (taker) information.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateTaker)

	huma.Register(api, huma.Operation{
		OperationID: "delete-taker",
		Method:      http.MethodDelete,
		Path:        "/api/takers/{id}",
		Summary:     "Delete taker",
		Description: "Delete a candidate (taker) account.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteTaker)

	huma.Register(api, huma.Operation{
		OperationID: "verify-taker",
		Method:      http.MethodPost,
		Path:        "/api/takers/{id}/verify",
		Summary:     "Verify taker",
		Description: "Verify or unverify a candidate (taker) account.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.VerifyTaker)

	huma.Register(api, huma.Operation{
		OperationID: "get-taker-groups",
		Method:      http.MethodGet,
		Path:        "/api/takers/{id}/groups",
		Summary:     "Get taker groups",
		Description: "Get all groups that a taker belongs to.",
		Tags:        []string{"Takers"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetTakerGroups)
}

// List Takers
type ListTakersInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Search  string `query:"search" maxLength:"255"`
	GroupID int    `query:"group_id" default:"0" minimum:"0"`
}

type ListTakersOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *TakerHandler) ListTakers(ctx context.Context, input *ListTakersInput) (*ListTakersOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	var groupID *int
	if input.GroupID > 0 {
		groupID = &input.GroupID
	}
	
	result, err := h.takerRepo.List(pagination, input.Search, groupID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get takers", err)
	}

	return &ListTakersOutput{Body: *result}, nil
}

// Get Taker
type GetTakerInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetTakerOutput struct {
	Body struct {
		Taker  *models.Taker   `json:"taker"`
		Groups []models.Group `json:"groups"`
	} `json:"body"`
}

func (h *TakerHandler) GetTaker(ctx context.Context, input *GetTakerInput) (*GetTakerOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	taker, err := h.takerRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Taker not found")
	}

	groups, err := h.takerRepo.GetTakerGroups(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get taker groups", err)
	}

	// Remove password from response
	if taker.Password != nil {
		*taker.Password = ""
	}

	return &GetTakerOutput{
		Body: struct {
			Taker  *models.Taker   `json:"taker"`
			Groups []models.Group `json:"groups"`
		}{
			Taker:  taker,
			Groups: groups,
		},
	}, nil
}

// Create Taker
type CreateTakerInput struct {
	Body models.TakerCreateRequest `json:"body"`
}

type CreateTakerOutput struct {
	Body struct {
		Success bool          `json:"success"`
		Message string        `json:"message"`
		Taker   *models.Taker `json:"taker,omitempty"`
	} `json:"body"`
}

func (h *TakerHandler) CreateTaker(ctx context.Context, input *CreateTakerInput) (*CreateTakerOutput, error) {
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

	// Hash password if provided
	var hashedPassword *string
	if input.Body.Password != nil {
		hashed, err := utils.HashPassword(*input.Body.Password)
		if err != nil {
			return nil, huma.Error500InternalServerError("Failed to hash password", err)
		}
		hashedPassword = &hashed
	}

	clientID := 2 // Default client ID as seen in database
	taker := &models.Taker{
		Name:       input.Body.Name,
		Reg:        input.Body.Reg,
		Email:      input.Body.Email,
		Password:   hashedPassword,
		IsVerified: false,
		ClientID:   &clientID,
	}

	err := h.takerRepo.Create(taker)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create taker", err)
	}

	// Remove password from response
	if taker.Password != nil {
		*taker.Password = ""
	}

	return &CreateTakerOutput{
		Body: struct {
			Success bool          `json:"success"`
			Message string        `json:"message"`
			Taker   *models.Taker `json:"taker,omitempty"`
		}{
			Success: true,
			Message: "Taker created successfully",
			Taker:   taker,
		},
	}, nil
}

// Update Taker
type UpdateTakerInput struct {
	ID   int                       `path:"id" minimum:"1"`
	Body models.TakerUpdateRequest `json:"body"`
}

type UpdateTakerOutput struct {
	Body struct {
		Success bool          `json:"success"`
		Message string        `json:"message"`
		Taker   *models.Taker `json:"taker,omitempty"`
	} `json:"body"`
}

func (h *TakerHandler) UpdateTaker(ctx context.Context, input *UpdateTakerInput) (*UpdateTakerOutput, error) {
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

	taker, err := h.takerRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update taker", err)
	}

	// Remove password from response
	if taker.Password != nil {
		*taker.Password = ""
	}

	return &UpdateTakerOutput{
		Body: struct {
			Success bool          `json:"success"`
			Message string        `json:"message"`
			Taker   *models.Taker `json:"taker,omitempty"`
		}{
			Success: true,
			Message: "Taker updated successfully",
			Taker:   taker,
		},
	}, nil
}

// Delete Taker
type DeleteTakerInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteTakerOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *TakerHandler) DeleteTaker(ctx context.Context, input *DeleteTakerInput) (*DeleteTakerOutput, error) {
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

	err := h.takerRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete taker", err)
	}

	return &DeleteTakerOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Taker deleted successfully",
		},
	}, nil
}

// Verify Taker
type VerifyTakerInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		Verified bool `json:"verified"`
	} `json:"body"`
}

type VerifyTakerOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *TakerHandler) VerifyTaker(ctx context.Context, input *VerifyTakerInput) (*VerifyTakerOutput, error) {
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

	err := h.takerRepo.SetVerified(input.ID, input.Body.Verified)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update verification status", err)
	}

	message := "Taker verified successfully"
	if !input.Body.Verified {
		message = "Taker unverified successfully"
	}

	return &VerifyTakerOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: message,
		},
	}, nil
}

// Get Taker Groups
type GetTakerGroupsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetTakerGroupsOutput struct {
	Body []models.Group `json:"body"`
}

func (h *TakerHandler) GetTakerGroups(ctx context.Context, input *GetTakerGroupsInput) (*GetTakerGroupsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	groups, err := h.takerRepo.GetTakerGroups(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get taker groups", err)
	}

	return &GetTakerGroupsOutput{Body: groups}, nil
}