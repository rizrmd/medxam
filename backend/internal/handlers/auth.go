package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/config"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/services"
	"github.com/medxamion/medxamion/internal/tables"
)

type AuthHandler struct {
	authService *services.AuthService
	config      *config.Config
}

func NewAuthHandler(authService *services.AuthService, config *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		config:      config,
	}
}

func (h *AuthHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "login",
		Method:      http.MethodPost,
		Path:        "/api/auth/login",
		Summary:     "User login",
		Description: "Authenticate user with username and password. Creates a new session (replacing any existing session).",
		Tags:        []string{"Authentication"},
	}, h.Login)

	huma.Register(api, huma.Operation{
		OperationID: "logout",
		Method:      http.MethodPost,
		Path:        "/api/auth/logout",
		Summary:     "User logout",
		Description: "Logout current user and destroy session.",
		Tags:        []string{"Authentication"},
	}, h.Logout)

	huma.Register(api, huma.Operation{
		OperationID: "me",
		Method:      http.MethodGet,
		Path:        "/api/auth/me",
		Summary:     "Get current user",
		Description: "Get information about the currently authenticated user.",
		Tags:        []string{"Authentication"},
	}, h.GetCurrentUser)
}

type LoginInput struct {
	Body tables.LoginRequest `json:"body"`
}

type LoginOutput struct {
	Body tables.LoginResponse `json:"body"`
}

func (h *AuthHandler) Login(ctx context.Context, input *LoginInput) (*LoginOutput, error) {
	// For now, use placeholder values - we'll improve this later
	ipAddress := "127.0.0.1" // TODO: Get actual IP from context
	userAgent := "unknown"   // TODO: Get actual User-Agent from context

	// Attempt login
	session, user, err := h.authService.Login(
		input.Body.Username,
		input.Body.Password,
		ipAddress,
		userAgent,
	)
	if err != nil {
		fmt.Printf("DEBUG: Login handler error: %v\n", err)
		return &LoginOutput{
			Body: tables.LoginResponse{
				Success: false,
				Message: "Invalid username or password",
			},
		}, nil
	}

	// TODO: Set session cookie when we figure out how to access response in Huma v2
	// For now, return session ID in response body so we can test the login flow

	// Remove password from response
	user.Password = ""

	return &LoginOutput{
		Body: tables.LoginResponse{
			Success:   true,
			Message:   "Login successful",
			User:      user,
			SessionID: session.ID,
		},
	}, nil
}

type LogoutOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *AuthHandler) Logout(ctx context.Context, input *struct{}) (*LogoutOutput, error) {
	// TODO: Get session ID from cookie when we implement proper session handling
	// For now, just return success

	return &LogoutOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Logout successful",
		},
	}, nil
}

type CurrentUserOutput struct {
	Body struct {
		User        *tables.User        `json:"user"`
		SessionData *tables.SessionData `json:"session_data,omitempty"`
	} `json:"body"`
}

func (h *AuthHandler) GetCurrentUser(ctx context.Context, input *struct{}) (*CurrentUserOutput, error) {
	user := middleware.GetUserFromContext(ctx)
	sessionData := middleware.GetSessionDataFromContext(ctx)

	if user == nil {
		return nil, huma.Error401Unauthorized("Not authenticated")
	}

	// Remove password from response
	user.Password = ""

	return &CurrentUserOutput{
		Body: struct {
			User        *tables.User        `json:"user"`
			SessionData *tables.SessionData `json:"session_data,omitempty"`
		}{
			User:        user,
			SessionData: sessionData,
		},
	}, nil
}

func (h *AuthHandler) getClientIP(r *http.Request) string {
	// TODO: Implement when we have access to http.Request
	return "127.0.0.1"
}
