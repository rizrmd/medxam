package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
)

type DeliveryHandler struct {
	deliveryRepo *repository.DeliveryRepository
}

func NewDeliveryHandler(deliveryRepo *repository.DeliveryRepository) *DeliveryHandler {
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
	Body models.PaginatedResponse `json:"body"`
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
	search := models.DeliverySearchRequest{
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
	Body *models.Delivery `json:"body"`
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
	Body *models.DeliveryWithDetails `json:"body"`
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
	Body models.DeliveryCreateRequest `json:"body"`
}

type CreateDeliveryOutput struct {
	Body struct {
		Success  bool              `json:"success"`
		Message  string            `json:"message"`
		Delivery *models.Delivery `json:"delivery,omitempty"`
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

	delivery := &models.Delivery{
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
			Success  bool              `json:"success"`
			Message  string            `json:"message"`
			Delivery *models.Delivery `json:"delivery,omitempty"`
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
	Body models.DeliveryUpdateRequest `json:"body"`
}

type UpdateDeliveryOutput struct {
	Body struct {
		Success  bool              `json:"success"`
		Message  string            `json:"message"`
		Delivery *models.Delivery `json:"delivery,omitempty"`
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
			Success  bool              `json:"success"`
			Message  string            `json:"message"`
			Delivery *models.Delivery `json:"delivery,omitempty"`
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
	Body models.PaginatedResponse `json:"body"`
}

func (h *DeliveryHandler) GetDeliveryAttempts(ctx context.Context, input *GetDeliveryAttemptsInput) (*GetDeliveryAttemptsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	pagination := models.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}

	result, err := h.deliveryRepo.GetDeliveryAttempts(input.ID, pagination)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get delivery attempts", err)
	}

	return &GetDeliveryAttemptsOutput{Body: *result}, nil
}