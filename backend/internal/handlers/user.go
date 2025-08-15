package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/medxamion/medxamion/internal/tables"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/utils"
)

type UserHandler struct {
	userRepo *models.UserModel
}

func NewUserHandler(userRepo *models.UserModel) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-users",
		Method:      http.MethodGet,
		Path:        "/api/users",
		Summary:     "List users",
		Description: "Get a paginated list of users with optional search.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListUsers)

	huma.Register(api, huma.Operation{
		OperationID: "get-user",
		Method:      http.MethodGet,
		Path:        "/api/users/{id}",
		Summary:     "Get user by ID",
		Description: "Get detailed information about a specific user.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetUser)

	huma.Register(api, huma.Operation{
		OperationID: "create-user",
		Method:      http.MethodPost,
		Path:        "/api/users",
		Summary:     "Create new user",
		Description: "Create a new user account.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateUser)

	huma.Register(api, huma.Operation{
		OperationID: "update-user",
		Method:      http.MethodPut,
		Path:        "/api/users/{id}",
		Summary:     "Update user",
		Description: "Update user information.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateUser)

	huma.Register(api, huma.Operation{
		OperationID: "delete-user",
		Method:      http.MethodDelete,
		Path:        "/api/users/{id}",
		Summary:     "Delete user",
		Description: "Soft delete a user account.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteUser)

	huma.Register(api, huma.Operation{
		OperationID: "change-password",
		Method:      http.MethodPost,
		Path:        "/api/users/{id}/change-password",
		Summary:     "Change user password",
		Description: "Change password for a user.",
		Tags:        []string{"Users"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ChangePassword)
}

// List Users
type ListUsersInput struct {
	Page    int    `query:"page" default:"1" minimum:"1"`
	PerPage int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Search  string `query:"search" maxLength:"255"`
}

type ListUsersOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *UserHandler) ListUsers(ctx context.Context, input *ListUsersInput) (*ListUsersOutput, error) {
	// Check if user is authenticated
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.userRepo.List(pagination, input.Search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get users", err)
	}

	return &ListUsersOutput{Body: *result}, nil
}

// Get User
type GetUserInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetUserOutput struct {
	Body struct {
		User  *tables.User  `json:"user"`
		Roles []tables.Role `json:"roles"`
	} `json:"body"`
}

func (h *UserHandler) GetUser(ctx context.Context, input *GetUserInput) (*GetUserOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	user, err := h.userRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("User not found")
	}

	roles, err := h.userRepo.GetUserRoles(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get user roles", err)
	}

	// Remove password from response
	user.Password = ""

	return &GetUserOutput{
		Body: struct {
			User  *tables.User  `json:"user"`
			Roles []tables.Role `json:"roles"`
		}{
			User:  user,
			Roles: roles,
		},
	}, nil
}

// Create User
type CreateUserInput struct {
	Body tables.UserCreateRequest `json:"body"`
}

type CreateUserOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		User    *tables.User `json:"user,omitempty"`
	} `json:"body"`
}

func (h *UserHandler) CreateUser(ctx context.Context, input *CreateUserInput) (*CreateUserOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check if user has admin role (you can adjust this based on your requirements)
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

	// Hash password
	hashedPassword, err := utils.HashPassword(input.Body.Password)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to hash password", err)
	}

	// Convert birthday string to time.Time if provided
	var birthday *time.Time
	if input.Body.Birthday != nil {
		if parsedTime, err := time.Parse("2006-01-02", *input.Body.Birthday); err == nil {
			birthday = &parsedTime
		}
	}

	user := &tables.User{
		Name:             input.Body.Name,
		Username:         input.Body.Username,
		Email:            input.Body.Email,
		Password:         hashedPassword,
		Gender:           input.Body.Gender,
		Birthplace:       input.Body.Birthplace,
		Birthday:         birthday,
		ProfilePhotoPath: input.Body.ProfilePhotoPath,
	}

	err = h.userRepo.Create(user)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create user", err)
	}

	// Remove password from response
	user.Password = ""

	return &CreateUserOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			User    *tables.User `json:"user,omitempty"`
		}{
			Success: true,
			Message: "User created successfully",
			User:    user,
		},
	}, nil
}

// Update User
type UpdateUserInput struct {
	ID   int                      `path:"id" minimum:"1"`
	Body tables.UserUpdateRequest `json:"body"`
}

type UpdateUserOutput struct {
	Body struct {
		Success bool         `json:"success"`
		Message string       `json:"message"`
		User    *tables.User `json:"user,omitempty"`
	} `json:"body"`
}

func (h *UserHandler) UpdateUser(ctx context.Context, input *UpdateUserInput) (*UpdateUserOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Users can update their own profile, or admins can update any user
	isOwnProfile := sessionData.UserID == input.ID
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}

	if !isOwnProfile && !hasAdminRole {
		return nil, huma.Error403Forbidden("Permission denied")
	}

	user, err := h.userRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update user", err)
	}

	// Remove password from response
	user.Password = ""

	return &UpdateUserOutput{
		Body: struct {
			Success bool         `json:"success"`
			Message string       `json:"message"`
			User    *tables.User `json:"user,omitempty"`
		}{
			Success: true,
			Message: "User updated successfully",
			User:    user,
		},
	}, nil
}

// Delete User
type DeleteUserInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteUserOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *UserHandler) DeleteUser(ctx context.Context, input *DeleteUserInput) (*DeleteUserOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Only admins can delete users
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

	// Prevent self-deletion
	if sessionData.UserID == input.ID {
		return nil, huma.Error400BadRequest("Cannot delete your own account")
	}

	err := h.userRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete user", err)
	}

	return &DeleteUserOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "User deleted successfully",
		},
	}, nil
}

// Change Password
type ChangePasswordInput struct {
	ID   int                          `path:"id" minimum:"1"`
	Body tables.ChangePasswordRequest `json:"body"`
}

type ChangePasswordOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *UserHandler) ChangePassword(ctx context.Context, input *ChangePasswordInput) (*ChangePasswordOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Users can change their own password, or admins can change any user's password
	isOwnProfile := sessionData.UserID == input.ID
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}

	if !isOwnProfile && !hasAdminRole {
		return nil, huma.Error403Forbidden("Permission denied")
	}

	// Verify new password matches confirmation
	if input.Body.NewPassword != input.Body.ConfirmPassword {
		return nil, huma.Error400BadRequest("New password and confirmation do not match")
	}

	// If changing own password, verify current password
	if isOwnProfile {
		user, err := h.userRepo.GetByID(input.ID)
		if err != nil {
			return nil, huma.Error404NotFound("User not found")
		}

		if !utils.CheckPasswordHash(input.Body.CurrentPassword, user.Password) {
			return nil, huma.Error400BadRequest("Current password is incorrect")
		}
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(input.Body.NewPassword)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to hash password", err)
	}

	// Update password in database
	err = h.userRepo.UpdatePassword(input.ID, hashedPassword)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update password", err)
	}

	return &ChangePasswordOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Password changed successfully",
		},
	}, nil
}
