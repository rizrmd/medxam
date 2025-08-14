package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
)

type GroupHandler struct {
	groupRepo *repository.GroupRepository
}

func NewGroupHandler(groupRepo *repository.GroupRepository) *GroupHandler {
	return &GroupHandler{groupRepo: groupRepo}
}

func (h *GroupHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-groups",
		Method:      http.MethodGet,
		Path:        "/api/groups",
		Summary:     "List groups",
		Description: "Get a paginated list of groups with participant count.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListGroups)

	huma.Register(api, huma.Operation{
		OperationID: "get-group",
		Method:      http.MethodGet,
		Path:        "/api/groups/{id}",
		Summary:     "Get group by ID",
		Description: "Get detailed information about a specific group.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetGroup)

	huma.Register(api, huma.Operation{
		OperationID: "create-group",
		Method:      http.MethodPost,
		Path:        "/api/groups",
		Summary:     "Create new group",
		Description: "Create a new group for organizing candidates.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateGroup)

	huma.Register(api, huma.Operation{
		OperationID: "update-group",
		Method:      http.MethodPut,
		Path:        "/api/groups/{id}",
		Summary:     "Update group",
		Description: "Update group information.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateGroup)

	huma.Register(api, huma.Operation{
		OperationID: "delete-group",
		Method:      http.MethodDelete,
		Path:        "/api/groups/{id}",
		Summary:     "Delete group",
		Description: "Delete a group and all its associations.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteGroup)

	huma.Register(api, huma.Operation{
		OperationID: "get-group-takers",
		Method:      http.MethodGet,
		Path:        "/api/groups/{id}/takers",
		Summary:     "Get group takers",
		Description: "Get paginated list of takers in a group.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetGroupTakers)

	huma.Register(api, huma.Operation{
		OperationID: "add-taker-to-group",
		Method:      http.MethodPost,
		Path:        "/api/groups/{id}/takers",
		Summary:     "Add taker to group",
		Description: "Add a taker to a group with auto-generated code.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.AddTakerToGroup)

	huma.Register(api, huma.Operation{
		OperationID: "remove-taker-from-group",
		Method:      http.MethodDelete,
		Path:        "/api/groups/{id}/takers/{taker_id}",
		Summary:     "Remove taker from group",
		Description: "Remove a taker from a group.",
		Tags:        []string{"Groups"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.RemoveTakerFromGroup)
}

// List Groups
type ListGroupsInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Search  string `query:"search" maxLength:"255"`
}

type ListGroupsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *GroupHandler) ListGroups(ctx context.Context, input *ListGroupsInput) (*ListGroupsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.groupRepo.List(pagination, input.Search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get groups", err)
	}

	return &ListGroupsOutput{Body: *result}, nil
}

// Get Group
type GetGroupInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetGroupOutput struct {
	Body *models.Group `json:"body"`
}

func (h *GroupHandler) GetGroup(ctx context.Context, input *GetGroupInput) (*GetGroupOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	group, err := h.groupRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Group not found")
	}

	return &GetGroupOutput{Body: group}, nil
}

// Create Group
type CreateGroupInput struct {
	Body models.GroupCreateRequest `json:"body"`
}

type CreateGroupOutput struct {
	Body struct {
		Success bool          `json:"success"`
		Message string        `json:"message"`
		Group   *models.Group `json:"group,omitempty"`
	} `json:"body"`
}

func (h *GroupHandler) CreateGroup(ctx context.Context, input *CreateGroupInput) (*CreateGroupOutput, error) {
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

	group := &models.Group{
		Name:          input.Body.Name,
		Description:   input.Body.Description,
		Code:          input.Body.Code,
		LastTakerCode: 1, // Start from 1
		ClientID:      2, // Default client ID as seen in database
	}

	err := h.groupRepo.Create(group)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create group", err)
	}

	return &CreateGroupOutput{
		Body: struct {
			Success bool          `json:"success"`
			Message string        `json:"message"`
			Group   *models.Group `json:"group,omitempty"`
		}{
			Success: true,
			Message: "Group created successfully",
			Group:   group,
		},
	}, nil
}

// Update Group
type UpdateGroupInput struct {
	ID   int                      `path:"id" minimum:"1"`
	Body models.GroupUpdateRequest `json:"body"`
}

type UpdateGroupOutput struct {
	Body struct {
		Success bool          `json:"success"`
		Message string        `json:"message"`
		Group   *models.Group `json:"group,omitempty"`
	} `json:"body"`
}

func (h *GroupHandler) UpdateGroup(ctx context.Context, input *UpdateGroupInput) (*UpdateGroupOutput, error) {
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

	group, err := h.groupRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update group", err)
	}

	return &UpdateGroupOutput{
		Body: struct {
			Success bool          `json:"success"`
			Message string        `json:"message"`
			Group   *models.Group `json:"group,omitempty"`
		}{
			Success: true,
			Message: "Group updated successfully",
			Group:   group,
		},
	}, nil
}

// Delete Group
type DeleteGroupInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteGroupOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *GroupHandler) DeleteGroup(ctx context.Context, input *DeleteGroupInput) (*DeleteGroupOutput, error) {
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

	err := h.groupRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete group", err)
	}

	return &DeleteGroupOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Group deleted successfully",
		},
	}, nil
}

// Get Group Takers
type GetGroupTakersInput struct {
	ID      int `path:"id" minimum:"1"`
	Page    int `query:"page" default:"1" minimum:"1"`
	PerPage int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetGroupTakersOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *GroupHandler) GetGroupTakers(ctx context.Context, input *GetGroupTakersInput) (*GetGroupTakersOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.groupRepo.GetGroupTakers(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get group takers", err)
	}

	return &GetGroupTakersOutput{Body: *result}, nil
}

// Add Taker to Group
type AddTakerToGroupInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		TakerID int `json:"taker_id" required:"true" minimum:"1"`
	} `json:"body"`
}

type AddTakerToGroupOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Code    string `json:"code,omitempty"`
	} `json:"body"`
}

func (h *GroupHandler) AddTakerToGroup(ctx context.Context, input *AddTakerToGroupInput) (*AddTakerToGroupOutput, error) {
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

	// Generate next taker code
	code, err := h.groupRepo.GenerateNextTakerCode(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to generate taker code", err)
	}

	// Add taker to group
	err = h.groupRepo.AddTaker(input.ID, input.Body.TakerID, code)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to add taker to group", err)
	}

	return &AddTakerToGroupOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
			Code    string `json:"code,omitempty"`
		}{
			Success: true,
			Message: "Taker added to group successfully",
			Code:    code,
		},
	}, nil
}

// Remove Taker from Group
type RemoveTakerFromGroupInput struct {
	ID      int `path:"id" minimum:"1"`
	TakerID int `path:"taker_id" minimum:"1"`
}

type RemoveTakerFromGroupOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *GroupHandler) RemoveTakerFromGroup(ctx context.Context, input *RemoveTakerFromGroupInput) (*RemoveTakerFromGroupOutput, error) {
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

	err := h.groupRepo.RemoveTaker(input.ID, input.TakerID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to remove taker from group", err)
	}

	return &RemoveTakerFromGroupOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Taker removed from group successfully",
		},
	}, nil
}