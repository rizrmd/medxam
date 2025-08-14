package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
)

type AttemptHandler struct {
	attemptRepo *repository.AttemptRepository
}

func NewAttemptHandler(attemptRepo *repository.AttemptRepository) *AttemptHandler {
	return &AttemptHandler{attemptRepo: attemptRepo}
}

func (h *AttemptHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-attempts",
		Method:      http.MethodGet,
		Path:        "/api/attempts",
		Summary:     "List attempts",
		Description: "Get a paginated list of exam attempts with search and filtering.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListAttempts)

	huma.Register(api, huma.Operation{
		OperationID: "get-attempt",
		Method:      http.MethodGet,
		Path:        "/api/attempts/{id}",
		Summary:     "Get attempt by ID",
		Description: "Get detailed information about a specific exam attempt.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetAttempt)

	huma.Register(api, huma.Operation{
		OperationID: "get-attempt-with-details",
		Method:      http.MethodGet,
		Path:        "/api/attempts/{id}/details",
		Summary:     "Get attempt with full details",
		Description: "Get attempt with complete taker, exam, and delivery information.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetAttemptWithDetails)

	huma.Register(api, huma.Operation{
		OperationID: "start-attempt",
		Method:      http.MethodPost,
		Path:        "/api/attempts/start",
		Summary:     "Start exam attempt",
		Description: "Start a new exam attempt for a delivery.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.StartAttempt)

	huma.Register(api, huma.Operation{
		OperationID: "finish-attempt",
		Method:      http.MethodPost,
		Path:        "/api/attempts/{id}/finish",
		Summary:     "Finish exam attempt",
		Description: "Mark an exam attempt as finished.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.FinishAttempt)

	huma.Register(api, huma.Operation{
		OperationID: "save-answer",
		Method:      http.MethodPost,
		Path:        "/api/attempts/{id}/answer",
		Summary:     "Save answer to question",
		Description: "Save or update an answer to a question in an exam attempt.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.SaveAnswer)

	huma.Register(api, huma.Operation{
		OperationID: "get-attempt-answers",
		Method:      http.MethodGet,
		Path:        "/api/attempts/{id}/answers",
		Summary:     "Get attempt answers",
		Description: "Get all answers for an exam attempt.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetAttemptAnswers)

	huma.Register(api, huma.Operation{
		OperationID: "update-attempt-score",
		Method:      http.MethodPut,
		Path:        "/api/attempts/{id}/score",
		Summary:     "Update attempt score",
		Description: "Update the score and penalty for an exam attempt.",
		Tags:        []string{"Attempts"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateAttemptScore)

	huma.Register(api, huma.Operation{
		OperationID: "get-delivery-results",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{deliveryId}/results",
		Summary:     "Get delivery results summary",
		Description: "Get results summary for all attempts in a delivery.",
		Tags:        []string{"Results"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetDeliveryResults)
}

// List Attempts
type ListAttemptsInput struct {
	Page       int    `query:"page" default:"1" minimum:"1"`
	PerPage    int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	TakerID    int    `query:"taker_id" minimum:"1"`
	DeliveryID int    `query:"delivery_id" minimum:"1"`
	ExamID     int    `query:"exam_id" minimum:"1"`
	IsFinished string `query:"is_finished" enum:"true,false"`
}

type ListAttemptsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *AttemptHandler) ListAttempts(ctx context.Context, input *ListAttemptsInput) (*ListAttemptsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	var isFinished *bool
	if input.IsFinished == "true" {
		v := true
		isFinished = &v
	} else if input.IsFinished == "false" {
		v := false
		isFinished = &v
	}

	search := models.AttemptSearchRequest{
		TakerID:    input.TakerID,
		DeliveryID: input.DeliveryID,
		ExamID:     input.ExamID,
		IsFinished: isFinished,
	}

	result, err := h.attemptRepo.List(pagination, search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get attempts", err)
	}

	return &ListAttemptsOutput{Body: *result}, nil
}

// Get Attempt
type GetAttemptInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetAttemptOutput struct {
	Body *models.Attempt `json:"body"`
}

func (h *AttemptHandler) GetAttempt(ctx context.Context, input *GetAttemptInput) (*GetAttemptOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	attempt, err := h.attemptRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Attempt not found")
	}

	return &GetAttemptOutput{Body: attempt}, nil
}

// Get Attempt with Details
type GetAttemptWithDetailsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetAttemptWithDetailsOutput struct {
	Body *models.AttemptWithDetails `json:"body"`
}

func (h *AttemptHandler) GetAttemptWithDetails(ctx context.Context, input *GetAttemptWithDetailsInput) (*GetAttemptWithDetailsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	attempt, err := h.attemptRepo.GetWithDetails(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Attempt not found")
	}

	return &GetAttemptWithDetailsOutput{Body: attempt}, nil
}

// Start Attempt
type StartAttemptInput struct {
	Body models.AttemptCreateRequest `json:"body"`
}

type StartAttemptOutput struct {
	Body struct {
		Success bool            `json:"success"`
		Message string          `json:"message"`
		Attempt *models.Attempt `json:"attempt,omitempty"`
	} `json:"body"`
}

func (h *AttemptHandler) StartAttempt(ctx context.Context, input *StartAttemptInput) (*StartAttemptOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Use session user ID as the taker ID
	attempt, err := h.attemptRepo.StartAttempt(sessionData.UserID, input.Body.DeliveryID, input.Body.IPAddress)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to start attempt", err)
	}

	return &StartAttemptOutput{
		Body: struct {
			Success bool            `json:"success"`
			Message string          `json:"message"`
			Attempt *models.Attempt `json:"attempt,omitempty"`
		}{
			Success: true,
			Message: "Attempt started successfully",
			Attempt: attempt,
		},
	}, nil
}

// Finish Attempt
type FinishAttemptInput struct {
	ID int `path:"id" minimum:"1"`
}

type FinishAttemptOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *AttemptHandler) FinishAttempt(ctx context.Context, input *FinishAttemptInput) (*FinishAttemptOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	err := h.attemptRepo.FinishAttempt(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to finish attempt", err)
	}

	return &FinishAttemptOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Attempt finished successfully",
		},
	}, nil
}

// Save Answer
type SaveAnswerInput struct {
	ID   int                         `path:"id" minimum:"1"`
	Body models.AttemptAnswerRequest `json:"body"`
}

type SaveAnswerOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *AttemptHandler) SaveAnswer(ctx context.Context, input *SaveAnswerInput) (*SaveAnswerOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	attemptQuestion := &models.AttemptQuestion{
		AttemptID:  input.ID,
		QuestionID: input.Body.QuestionID,
		Answer:     input.Body.Answer,
		TimeSpent:  input.Body.TimeSpent,
	}

	err := h.attemptRepo.SaveAnswer(attemptQuestion)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to save answer", err)
	}

	return &SaveAnswerOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Answer saved successfully",
		},
	}, nil
}

// Get Attempt Answers
type GetAttemptAnswersInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetAttemptAnswersOutput struct {
	Body []models.AttemptQuestion `json:"body"`
}

func (h *AttemptHandler) GetAttemptAnswers(ctx context.Context, input *GetAttemptAnswersInput) (*GetAttemptAnswersOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	answers, err := h.attemptRepo.GetAttemptAnswers(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get attempt answers", err)
	}

	return &GetAttemptAnswersOutput{Body: answers}, nil
}

// Update Attempt Score
type UpdateAttemptScoreInput struct {
	ID   int                    `path:"id" minimum:"1"`
	Body models.ScoringRequest `json:"body"`
}

type UpdateAttemptScoreOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *AttemptHandler) UpdateAttemptScore(ctx context.Context, input *UpdateAttemptScoreInput) (*UpdateAttemptScoreOutput, error) {
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

	err := h.attemptRepo.UpdateScore(input.ID, input.Body.Score, input.Body.Penalty)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update attempt score", err)
	}

	return &UpdateAttemptScoreOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Attempt score updated successfully",
		},
	}, nil
}

// Get Delivery Results
type GetDeliveryResultsInput struct {
	DeliveryID int `path:"deliveryId" minimum:"1"`
	Page       int `query:"page" default:"1" minimum:"1"`
	PerPage    int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetDeliveryResultsOutput struct {
	Body models.PaginatedResponse `json:"body"`
}

func (h *AttemptHandler) GetDeliveryResults(ctx context.Context, input *GetDeliveryResultsInput) (*GetDeliveryResultsOutput, error) {
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

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.attemptRepo.GetResultsSummary(input.DeliveryID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get delivery results", err)
	}

	return &GetDeliveryResultsOutput{Body: *result}, nil
}