package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/tables"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
)

type DeliveryHandler struct {
	deliveryRepo *models.DeliveryModel
}

func NewDeliveryHandler(deliveryRepo *models.DeliveryModel) *DeliveryHandler {
	return &DeliveryHandler{deliveryRepo: deliveryRepo}
}

func (h *DeliveryHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-deliveries",
		Method:      http.MethodGet,
		Path:        "/api/deliveries",
		Summary:     "List deliveries",
		Description: "Get a paginated list of exam deliveries with search and filtering.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ListDeliveries)

	huma.Register(api, huma.Operation{
		OperationID: "get-delivery",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}",
		Summary:     "Get delivery by ID",
		Description: "Get detailed information about a specific exam delivery.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "get-delivery-with-details",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}/details",
		Summary:     "Get delivery with exam and group details",
		Description: "Get delivery with complete exam and group information.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetDeliveryWithDetails)

	huma.Register(api, huma.Operation{
		OperationID: "create-delivery",
		Method:      http.MethodPost,
		Path:        "/api/deliveries",
		Summary:     "Create new delivery",
		Description: "Schedule a new exam delivery for a group.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.CreateDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "update-delivery",
		Method:      http.MethodPut,
		Path:        "/api/deliveries/{id}",
		Summary:     "Update delivery",
		Description: "Update delivery schedule and configuration.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.UpdateDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "delete-delivery",
		Method:      http.MethodDelete,
		Path:        "/api/deliveries/{id}",
		Summary:     "Delete delivery",
		Description: "Delete an exam delivery (only if not started).",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.DeleteDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "get-participant-progress",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}/participant-progress",
		Summary:     "Get participant progress",
		Description: "Get real-time progress of all participants in a delivery.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetParticipantProgress)

	huma.Register(api, huma.Operation{
		OperationID: "start-delivery",
		Method:      http.MethodPost,
		Path:        "/api/deliveries/{id}/start",
		Summary:     "Start delivery manually",
		Description: "Manually start a delivery that has automatic_start set to false.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.StartDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "finish-delivery",
		Method:      http.MethodPost,
		Path:        "/api/deliveries/{id}/finish",
		Summary:     "Finish delivery",
		Description: "Mark a delivery as finished.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.FinishDelivery)

	huma.Register(api, huma.Operation{
		OperationID: "get-delivery-attempts",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}/attempts",
		Summary:     "Get delivery attempts",
		Description: "Get paginated list of attempts for a delivery.",
		Tags:        []string{"Deliveries"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetDeliveryAttempts)
}

// List Deliveries
type ListDeliveriesInput struct {
	BaseListInput
	Name   string `query:"name" maxLength:"255"`
	Status string `query:"status" enum:"pending,ongoing,finished"`
}

type ListDeliveriesOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *DeliveryHandler) ListDeliveries(ctx context.Context, input *ListDeliveriesInput) (*ListDeliveriesOutput, error) {
	// Validate access
	if err := ValidateListAccess(ctx, ""); err != nil {
		return nil, err
	}

	// Build pagination
	pagination := BuildPagination(input.BaseListInput)

	// Parse date filter
	dateFilter, err := ParseDateFilter(input.BaseListInput)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid date filter", err)
	}

	// Get date range from filter
	startDate, endDate := GetDateRangeFromFilter(dateFilter)

	// Build search request
	search := tables.DeliverySearchRequest{
		Name:      input.Name,
		Status:    input.Status,
		StartDate: startDate,
		EndDate:   endDate,
	}

	// Override date field if specified
	if dateFilter.Field == "scheduled_at" {
		// For exact date, only set ScheduledAt to trigger DATE() comparison
		if dateFilter.Mode == "exact" && dateFilter.ExactDate != nil {
			search.ScheduledAt = dateFilter.ExactDate
			search.ScheduledAtEnd = nil
		} else {
			search.ScheduledAt = startDate
			search.ScheduledAtEnd = endDate
		}
	}

	result, err := h.deliveryRepo.List(pagination, search)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get deliveries", err)
	}

	return &ListDeliveriesOutput{Body: *result}, nil
}

// Get Delivery
type GetDeliveryInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetDeliveryOutput struct {
	Body *tables.Delivery `json:"body"`
}

func (h *DeliveryHandler) GetDelivery(ctx context.Context, input *GetDeliveryInput) (*GetDeliveryOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	delivery, err := h.deliveryRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Delivery not found")
	}

	return &GetDeliveryOutput{Body: delivery}, nil
}

// Get Delivery with Details
type GetDeliveryWithDetailsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetDeliveryWithDetailsOutput struct {
	Body *tables.DeliveryWithDetails `json:"body"`
}

func (h *DeliveryHandler) GetDeliveryWithDetails(ctx context.Context, input *GetDeliveryWithDetailsInput) (*GetDeliveryWithDetailsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	delivery, err := h.deliveryRepo.GetWithDetails(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Delivery not found")
	}

	return &GetDeliveryWithDetailsOutput{Body: delivery}, nil
}

// Create Delivery
type CreateDeliveryInput struct {
	Body tables.DeliveryCreateRequest `json:"body"`
}

type CreateDeliveryOutput struct {
	Body struct {
		Success  bool             `json:"success"`
		Message  string           `json:"message"`
		Delivery *tables.Delivery `json:"delivery,omitempty"`
	} `json:"body"`
}

func (h *DeliveryHandler) CreateDelivery(ctx context.Context, input *CreateDeliveryInput) (*CreateDeliveryOutput, error) {
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

	delivery := &tables.Delivery{
		ExamID:         input.Body.ExamID,
		GroupID:        input.Body.GroupID,
		Name:           input.Body.Name,
		ScheduledAt:    input.Body.ScheduledAt,
		Duration:       input.Body.Duration,
		IsAnytime:      input.Body.IsAnytime,
		AutomaticStart: input.Body.AutomaticStart,
		DisplayName:    input.Body.DisplayName,
	}

	err := h.deliveryRepo.Create(delivery)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to create delivery", err)
	}

	return &CreateDeliveryOutput{
		Body: struct {
			Success  bool             `json:"success"`
			Message  string           `json:"message"`
			Delivery *tables.Delivery `json:"delivery,omitempty"`
		}{
			Success:  true,
			Message:  "Delivery created successfully",
			Delivery: delivery,
		},
	}, nil
}

// Update Delivery
type UpdateDeliveryInput struct {
	ID   int                          `path:"id" minimum:"1"`
	Body tables.DeliveryUpdateRequest `json:"body"`
}

type UpdateDeliveryOutput struct {
	Body struct {
		Success  bool             `json:"success"`
		Message  string           `json:"message"`
		Delivery *tables.Delivery `json:"delivery,omitempty"`
	} `json:"body"`
}

func (h *DeliveryHandler) UpdateDelivery(ctx context.Context, input *UpdateDeliveryInput) (*UpdateDeliveryOutput, error) {
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

	delivery, err := h.deliveryRepo.Update(input.ID, &input.Body)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to update delivery", err)
	}

	return &UpdateDeliveryOutput{
		Body: struct {
			Success  bool             `json:"success"`
			Message  string           `json:"message"`
			Delivery *tables.Delivery `json:"delivery,omitempty"`
		}{
			Success:  true,
			Message:  "Delivery updated successfully",
			Delivery: delivery,
		},
	}, nil
}

// Delete Delivery
type DeleteDeliveryInput struct {
	ID int `path:"id" minimum:"1"`
}

type DeleteDeliveryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryHandler) DeleteDelivery(ctx context.Context, input *DeleteDeliveryInput) (*DeleteDeliveryOutput, error) {
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

	err := h.deliveryRepo.Delete(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to delete delivery", err)
	}

	return &DeleteDeliveryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Delivery deleted successfully",
		},
	}, nil
}

// Start Delivery
type StartDeliveryInput struct {
	ID int `path:"id" minimum:"1"`
}

type StartDeliveryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryHandler) StartDelivery(ctx context.Context, input *StartDeliveryInput) (*StartDeliveryOutput, error) {
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

	// Get delivery to check if it's manual start
	delivery, err := h.deliveryRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Delivery not found")
	}

	// Check if delivery is set for manual start
	if delivery.AutomaticStart {
		return nil, huma.Error400BadRequest("This delivery is configured for automatic start")
	}

	// Update delivery to mark it as started
	err = h.deliveryRepo.StartDelivery(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to start delivery", err)
	}

	return &StartDeliveryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Delivery started successfully",
		},
	}, nil
}

// Finish Delivery
type FinishDeliveryInput struct {
	ID int `path:"id" minimum:"1"`
}

type FinishDeliveryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryHandler) FinishDelivery(ctx context.Context, input *FinishDeliveryInput) (*FinishDeliveryOutput, error) {
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

	err := h.deliveryRepo.FinishDelivery(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to finish delivery", err)
	}

	return &FinishDeliveryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Delivery finished successfully",
		},
	}, nil
}

// Get Delivery Attempts
type GetDeliveryAttemptsInput struct {
	ID      int `path:"id" minimum:"1"`
	Page    int `query:"page" default:"1" minimum:"1"`
	PerPage int `query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type GetDeliveryAttemptsOutput struct {
	Body tables.PaginatedResponse `json:"body"`
}

func (h *DeliveryHandler) GetDeliveryAttempts(ctx context.Context, input *GetDeliveryAttemptsInput) (*GetDeliveryAttemptsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.deliveryRepo.GetDeliveryAttempts(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get delivery attempts", err)
	}

	return &GetDeliveryAttemptsOutput{Body: *result}, nil
}

// Get Participant Progress
type GetParticipantProgressInput struct {
	ID int `path:"id" minimum:"1"`
}

type ParticipantProgress struct {
	Participant struct {
		ID         int    `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		Identifier string `json:"identifier"`
	} `json:"participant"`
	Attempt *struct {
		ID                int        `json:"id"`
		StartedAt         *time.Time `json:"started_at"`
		EndedAt           *time.Time `json:"ended_at"`
		LastActivity      *time.Time `json:"last_activity"`
		QuestionsAnswered int        `json:"questions_answered"`
		TotalQuestions    int        `json:"total_questions"`
		Status            string     `json:"status"` // not_started, in_progress, completed, abandoned
	} `json:"attempt"`
}

type GetParticipantProgressOutput struct {
	Body struct {
		Delivery struct {
			ID               int    `json:"id"`
			Name             string `json:"name"`
			DisplayName      string `json:"display_name"`
			ParticipantCount int    `json:"participant_count"`
			CompletedCount   int    `json:"completed_count"`
			InProgressCount  int    `json:"in_progress_count"`
		} `json:"delivery"`
		Participants []ParticipantProgress `json:"participants"`
	} `json:"body"`
}

func (h *DeliveryHandler) GetParticipantProgress(ctx context.Context, input *GetParticipantProgressInput) (*GetParticipantProgressOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Get delivery details
	delivery, err := h.deliveryRepo.GetByID(input.ID)
	if err != nil {
		return nil, huma.Error404NotFound("Delivery not found")
	}

	// Get participant progress data
	progressData, err := h.deliveryRepo.GetParticipantProgress(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get participant progress", err)
	}

	// Convert to typed struct and calculate stats
	var participantProgress []ParticipantProgress
	var completedCount, inProgressCount int

	for _, data := range progressData {
		progressMap := data.(map[string]interface{})

		var progress ParticipantProgress

		// Extract participant data
		if participant, ok := progressMap["participant"].(map[string]interface{}); ok {
			progress.Participant.ID = participant["id"].(int)
			progress.Participant.Name = participant["name"].(string)
			progress.Participant.Email = participant["email"].(string)
			progress.Participant.Identifier = participant["identifier"].(string)
		}

		// Extract attempt data if exists
		if attemptData, ok := progressMap["attempt"].(map[string]interface{}); ok {
			attempt := &struct {
				ID                int        `json:"id"`
				StartedAt         *time.Time `json:"started_at"`
				EndedAt           *time.Time `json:"ended_at"`
				LastActivity      *time.Time `json:"last_activity"`
				QuestionsAnswered int        `json:"questions_answered"`
				TotalQuestions    int        `json:"total_questions"`
				Status            string     `json:"status"`
			}{}

			attempt.ID = attemptData["id"].(int)
			attempt.QuestionsAnswered = attemptData["questions_answered"].(int)
			attempt.TotalQuestions = attemptData["total_questions"].(int)
			attempt.Status = attemptData["status"].(string)

			if startedAt, ok := attemptData["started_at"].(time.Time); ok {
				attempt.StartedAt = &startedAt
			}
			if endedAt, ok := attemptData["ended_at"].(time.Time); ok {
				attempt.EndedAt = &endedAt
			}
			if lastActivity, ok := attemptData["last_activity"].(time.Time); ok {
				attempt.LastActivity = &lastActivity
			}

			progress.Attempt = attempt

			// Count stats
			switch attempt.Status {
			case "completed":
				completedCount++
			case "in_progress":
				inProgressCount++
			}
		}

		participantProgress = append(participantProgress, progress)
	}

	output := &GetParticipantProgressOutput{}
	output.Body.Delivery.ID = delivery.ID
	if delivery.Name != nil {
		output.Body.Delivery.Name = *delivery.Name
	}
	if delivery.DisplayName != nil {
		output.Body.Delivery.DisplayName = *delivery.DisplayName
	}
	output.Body.Delivery.ParticipantCount = len(participantProgress)
	output.Body.Delivery.CompletedCount = completedCount
	output.Body.Delivery.InProgressCount = inProgressCount
	output.Body.Participants = participantProgress

	return output, nil
}
