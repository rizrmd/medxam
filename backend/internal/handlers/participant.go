package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/tables"
	"github.com/medxamion/medxamion/internal/utils"
)

type ParticipantHandler struct {
	participantRepo *models.ParticipantModel
}

func NewParticipantHandler(participantRepo *models.ParticipantModel) *ParticipantHandler {
	return &ParticipantHandler{participantRepo: participantRepo}
}

func (h *ParticipantHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "participant-login",
		Method:      http.MethodPost,
		Path:        "/api/participant/login",
		Summary:     "Participant login",
		Description: "Authenticate a participant using registration number and password.",
		Tags:        []string{"Participant Auth"},
	}, h.ParticipantLogin)

	huma.Register(api, huma.Operation{
		OperationID: "participant-login-testcode",
		Method:      http.MethodPost,
		Path:        "/api/participant/login-testcode",
		Summary:     "Participant login with test code",
		Description: "Authenticate a participant using their unique test code for exam delivery.",
		Tags:        []string{"Participant Auth"},
	}, h.ParticipantLoginWithTestCode)

	huma.Register(api, huma.Operation{
		OperationID: "list-participants",
		Method:      http.MethodGet,
		Path:        "/api/participants",
		Summary:     "List participants",
		Description: "Get a paginated list of participants with optional search and group filtering.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListParticipants)

	huma.Register(api, huma.Operation{
		OperationID: "get-participant",
		Method:      http.MethodGet,
		Path:        "/api/participants/{id}",
		Summary:     "Get participant by ID",
		Description: "Get detailed information about a specific participant.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetParticipant)

	huma.Register(api, huma.Operation{
		OperationID: "create-participant",
		Method:      http.MethodPost,
		Path:        "/api/participants",
		Summary:     "Create new participant",
		Description: "Register a new participant for exams.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateParticipant)

	huma.Register(api, huma.Operation{
		OperationID: "update-participant",
		Method:      http.MethodPut,
		Path:        "/api/participants/{id}",
		Summary:     "Update participant",
		Description: "Update participant information.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateParticipant)

	huma.Register(api, huma.Operation{
		OperationID: "delete-participant",
		Method:      http.MethodDelete,
		Path:        "/api/participants/{id}",
		Summary:     "Delete participant",
		Description: "Delete a participant account.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteParticipant)

	huma.Register(api, huma.Operation{
		OperationID: "verify-participant",
		Method:      http.MethodPost,
		Path:        "/api/participants/{id}/verify",
		Summary:     "Verify participant",
		Description: "Verify or unverify a participant account.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.VerifyParticipant)

	huma.Register(api, huma.Operation{
		OperationID: "get-participant-groups",
		Method:      http.MethodGet,
		Path:        "/api/participants/{id}/groups",
		Summary:     "Get participant groups",
		Description: "Get all groups that a participant belongs to.",
		Tags:        []string{"Participants"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetParticipantGroups)
}

// Participant Login with Test Code
type ParticipantLoginWithTestCodeInput struct {
	Body struct {
		TestCode string `json:"test_code" minLength:"1" maxLength:"255"`
	} `json:"body"`
}

type ParticipantLoginWithTestCodeOutput struct {
	Body struct {
		Success     bool                `json:"success"`
		Message     string              `json:"message"`
		Participant *tables.Participant `json:"participant,omitempty"`
		Delivery    *tables.Delivery    `json:"delivery,omitempty"`
		Token       string              `json:"token,omitempty"`
		ExpiresAt   int64               `json:"expires_at,omitempty"`
	} `json:"body"`
}

func (h *ParticipantHandler) ParticipantLoginWithTestCode(ctx context.Context, input *ParticipantLoginWithTestCodeInput) (*ParticipantLoginWithTestCodeOutput, error) {
	// Find participant by test code in group_taker table
	participant, delivery, err := h.participantRepo.GetByTestCode(input.Body.TestCode)
	if err != nil || participant == nil {
		return nil, huma.Error401Unauthorized("Invalid test code")
	}

	// Check if participant is verified
	if !participant.IsVerified {
		return nil, huma.Error403Forbidden("Your account is not verified. Please contact the administrator.")
	}

	// TODO: Implement proper session management for test code login
	token := "temp-token-" + input.Body.TestCode
	var expiresAt int64 = 0

	// Remove password from response
	participant.Password = nil

	return &ParticipantLoginWithTestCodeOutput{
		Body: struct {
			Success     bool                `json:"success"`
			Message     string              `json:"message"`
			Participant *tables.Participant `json:"participant,omitempty"`
			Delivery    *tables.Delivery    `json:"delivery,omitempty"`
			Token       string              `json:"token,omitempty"`
			ExpiresAt   int64               `json:"expires_at,omitempty"`
		}{
			Success:     true,
			Message:     "Login successful",
			Participant: participant,
			Delivery:    delivery,
			Token:       token,
			ExpiresAt:   expiresAt,
		},
	}, nil
}

// Participant Login
type ParticipantLoginInput struct {
	Body struct {
		RegistrationNumber string `json:"registration_number" minLength:"1" maxLength:"255"`
		Password           string `json:"password" minLength:"1" maxLength:"255"`
	} `json:"body"`
}

type ParticipantLoginOutput struct {
	Body struct {
		Success     bool                `json:"success"`
		Message     string              `json:"message"`
		Participant *tables.Participant `json:"participant,omitempty"`
		Token       string              `json:"token,omitempty"`
		ExpiresAt   int64               `json:"expires_at,omitempty"`
	} `json:"body"`
}

func (h *ParticipantHandler) ParticipantLogin(ctx context.Context, input *ParticipantLoginInput) (*ParticipantLoginOutput, error) {
	// Find participant by registration number
	participant, err := h.participantRepo.GetByRegistrationNumber(input.Body.RegistrationNumber)
	if err != nil || participant == nil {
		return nil, huma.Error401Unauthorized("Invalid registration number or password")
	}

	// Check if participant is verified
	if !participant.IsVerified {
		return nil, huma.Error403Forbidden("Your account is not verified. Please contact the administrator.")
	}

	// Verify password
	if participant.Password == nil || *participant.Password == "" {
		return nil, huma.Error401Unauthorized("Invalid registration number or password")
	}

	if !utils.CheckPasswordHash(input.Body.Password, *participant.Password) {
		return nil, huma.Error401Unauthorized("Invalid registration number or password")
	}

	// TODO: Implement participant session management
	// This needs to be integrated with the existing session system
	// or create a separate participant session table
	token := "temp-token"
	var expiresAt int64 = 0

	// Remove password from response
	participant.Password = nil

	return &ParticipantLoginOutput{
		Body: struct {
			Success     bool                `json:"success"`
			Message     string              `json:"message"`
			Participant *tables.Participant `json:"participant,omitempty"`
			Token       string              `json:"token,omitempty"`
			ExpiresAt   int64               `json:"expires_at,omitempty"`
		}{
			Success:     true,
			Message:     "Login successful",
			Participant: participant,
			Token:       token,
			ExpiresAt:   expiresAt,
		},
	}, nil
}

// List Participants
type ListParticipantsInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Search  string `query:"search" maxLength:"255"`
	GroupID int    `query:"group_id" default:"0" minimum:"0"`
}

type ListParticipantsOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *ParticipantHandler) ListParticipants(ctx context.Context, input *ListParticipantsInput) (*ListParticipantsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	var groupID *int
	if input.GroupID > 0 {
		groupID = &input.GroupID
	}

	result, err := h.participantRepo.List(pagination, input.Search, groupID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get participants", err)
	}

	return &ListParticipantsOutput{Body: *result}, nil
}

// Get Participant
type GetParticipantInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetParticipantOutput struct {
	Body struct {
		Participant *tables.Participant `json:"participant"`
		Groups      []tables.Group      `json:"groups"`
	} `json:"body"`
}

func (h *ParticipantHandler) GetParticipant(ctx context.Context, input *GetParticipantInput) (*GetParticipantOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	participant, err := h.participantRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Participant not found")
	}

	groups, err := h.participantRepo.GetParticipantGroups(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get participant groups", err)
	}

	// Remove password from response
	if participant.Password != nil {
		*participant.Password = ""
	}

	return &GetParticipantOutput{
		Body: struct {
			Participant *tables.Participant `json:"participant"`
			Groups      []tables.Group      `json:"groups"`
		}{
			Participant: participant,
			Groups:      groups,
		},
	}, nil
}

// Create Participant
type CreateParticipantInput struct {
	Body tables.ParticipantCreateRequest `json:"body"`
}

type CreateParticipantOutput struct {
	Body struct {
		Success     bool                `json:"success"`
		Message     string              `json:"message"`
		Participant *tables.Participant `json:"participant,omitempty"`
	} `json:"body"`
}

func (h *ParticipantHandler) CreateParticipant(ctx context.Context, input *CreateParticipantInput) (*CreateParticipantOutput, error) {
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
	participant := &tables.Participant{
		Name:       input.Body.Name,
		Reg:        input.Body.Reg,
		Email:      input.Body.Email,
		Password:   hashedPassword,
		IsVerified: false,
		ClientID:   &clientID,
	}

	err := h.participantRepo.Create(participant)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create participant", err)
	}

	// Remove password from response
	if participant.Password != nil {
		*participant.Password = ""
	}

	return &CreateParticipantOutput{
		Body: struct {
			Success     bool                `json:"success"`
			Message     string              `json:"message"`
			Participant *tables.Participant `json:"participant,omitempty"`
		}{
			Success:     true,
			Message:     "Participant created successfully",
			Participant: participant,
		},
	}, nil
}

// Update Participant
type UpdateParticipantInput struct {
	ID   int                             `path:"id" minimum:"1"`
	Body tables.ParticipantUpdateRequest `json:"body"`
}

type UpdateParticipantOutput struct {
	Body struct {
		Success     bool                `json:"success"`
		Message     string              `json:"message"`
		Participant *tables.Participant `json:"participant,omitempty"`
	} `json:"body"`
}

func (h *ParticipantHandler) UpdateParticipant(ctx context.Context, input *UpdateParticipantInput) (*UpdateParticipantOutput, error) {
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

	participant, err := h.participantRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update participant", err)
	}

	// Remove password from response
	if participant.Password != nil {
		*participant.Password = ""
	}

	return &UpdateParticipantOutput{
		Body: struct {
			Success     bool                `json:"success"`
			Message     string              `json:"message"`
			Participant *tables.Participant `json:"participant,omitempty"`
		}{
			Success:     true,
			Message:     "Participant updated successfully",
			Participant: participant,
		},
	}, nil
}

// Delete Participant
type DeleteParticipantInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteParticipantOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ParticipantHandler) DeleteParticipant(ctx context.Context, input *DeleteParticipantInput) (*DeleteParticipantOutput, error) {
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

	err := h.participantRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete participant", err)
	}

	return &DeleteParticipantOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Participant deleted successfully",
		},
	}, nil
}

// Verify Participant
type VerifyParticipantInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		Verified bool `json:"verified"`
	} `json:"body"`
}

type VerifyParticipantOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *ParticipantHandler) VerifyParticipant(ctx context.Context, input *VerifyParticipantInput) (*VerifyParticipantOutput, error) {
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

	err := h.participantRepo.SetVerified(input.ID, input.Body.Verified)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update verification status", err)
	}

	message := "Participant verified successfully"
	if !input.Body.Verified {
		message = "Participant unverified successfully"
	}

	return &VerifyParticipantOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: message,
		},
	}, nil
}

// Get Participant Groups
type GetParticipantGroupsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetParticipantGroupsOutput struct {
	Body []tables.Group `json:"body"`
}

func (h *ParticipantHandler) GetParticipantGroups(ctx context.Context, input *GetParticipantGroupsInput) (*GetParticipantGroupsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	groups, err := h.participantRepo.GetParticipantGroups(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get participant groups", err)
	}

	return &GetParticipantGroupsOutput{Body: groups}, nil
}
