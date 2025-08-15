package handlers

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/tables"
)

type DeliveryAssignmentHandler struct {
	assignmentRepo *models.DeliveryAssignmentModel
	deliveryRepo   *models.DeliveryModel
}

func NewDeliveryAssignmentHandler(assignmentRepo *models.DeliveryAssignmentModel, deliveryRepo *models.DeliveryModel) *DeliveryAssignmentHandler {
	return &DeliveryAssignmentHandler{
		assignmentRepo: assignmentRepo,
		deliveryRepo:   deliveryRepo,
	}
}

func (h *DeliveryAssignmentHandler) Register(api huma.API) {
	// Admin endpoints for assigning committee/scorers
	huma.Register(api, huma.Operation{
		OperationID: "assign-delivery-committee",
		Method:      http.MethodPost,
		Path:        "/api/deliveries/{id}/assign-committee",
		Summary:     "Assign committee to delivery",
		Description: "Assign committee members to a delivery. Only admins can perform this action.",
		Tags:        []string{"Delivery Assignments"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.AssignCommittee)

	huma.Register(api, huma.Operation{
		OperationID: "assign-delivery-scorers",
		Method:      http.MethodPost,
		Path:        "/api/deliveries/{id}/assign-scorers",
		Summary:     "Assign scorers to delivery",
		Description: "Assign scorers to a delivery. Only admins can perform this action.",
		Tags:        []string{"Delivery Assignments"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.AssignScorers)

	// Get delivery assignments
	huma.Register(api, huma.Operation{
		OperationID: "get-delivery-assignments",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}/assignments",
		Summary:     "Get delivery assignments",
		Description: "Get committee and scorer assignments for a delivery.",
		Tags:        []string{"Delivery Assignments"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetDeliveryAssignments)

	// Committee/Scorer endpoints
	huma.Register(api, huma.Operation{
		OperationID: "get-user-deliveries",
		Method:      http.MethodGet,
		Path:        "/api/my-deliveries",
		Summary:     "Get user's assigned deliveries",
		Description: "Get deliveries assigned to the current user as committee or scorer.",
		Tags:        []string{"Committee/Scorer"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetUserDeliveries)

	huma.Register(api, huma.Operation{
		OperationID: "control-delivery",
		Method:      http.MethodPost,
		Path:        "/api/deliveries/{id}/control",
		Summary:     "Control delivery (start/stop/pause)",
		Description: "Committee members can control delivery state.",
		Tags:        []string{"Committee/Scorer"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.ControlDelivery)

	// Get users with specific roles for assignment
	huma.Register(api, huma.Operation{
		OperationID: "get-scorer-users",
		Method:      http.MethodGet,
		Path:        "/api/users/scorer",
		Summary:     "Get scorer users",
		Description: "Get all users with scorer role for assignment purposes.",
		Tags:        []string{"Delivery Assignments"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetScorerUsers)
}

// Assign Committee
type AssignCommitteeInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		UserIDs []int `json:"user_ids" required:"true"`
	} `json:"body"`
}

type AssignCommitteeOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryAssignmentHandler) AssignCommittee(ctx context.Context, input *AssignCommitteeInput) (*AssignCommitteeOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "Administrator" || role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	err := h.assignmentRepo.AssignCommitteeToDelivery(input.ID, input.Body.UserIDs)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to assign committee", err)
	}

	return &AssignCommitteeOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Committee assigned successfully",
		},
	}, nil
}

// Assign Scorers
type AssignScorersInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		UserIDs []int `json:"user_ids" required:"true"`
	} `json:"body"`
}

type AssignScorersOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryAssignmentHandler) AssignScorers(ctx context.Context, input *AssignScorersInput) (*AssignScorersOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "Administrator" || role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	err := h.assignmentRepo.AssignScorerToDelivery(input.ID, input.Body.UserIDs)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to assign scorers", err)
	}

	return &AssignScorersOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Scorers assigned successfully",
		},
	}, nil
}

// Get Delivery Assignments
type GetDeliveryAssignmentsInput struct {
	ID int `path:"id" minimum:"1"`
}

type GetDeliveryAssignmentsOutput struct {
	Body struct {
		Committee []tables.UserWithRole `json:"committee"`
		Scorers   []tables.UserWithRole `json:"scorers"`
	} `json:"body"`
}

func (h *DeliveryAssignmentHandler) GetDeliveryAssignments(ctx context.Context, input *GetDeliveryAssignmentsInput) (*GetDeliveryAssignmentsOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	committee, err := h.assignmentRepo.GetDeliveryCommittee(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get committee", err)
	}

	scorers, err := h.assignmentRepo.GetDeliveryScorers(input.ID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get scorers", err)
	}

	return &GetDeliveryAssignmentsOutput{
		Body: struct {
			Committee []tables.UserWithRole `json:"committee"`
			Scorers   []tables.UserWithRole `json:"scorers"`
		}{
			Committee: committee,
			Scorers:   scorers,
		},
	}, nil
}

// Get User Deliveries
type GetUserDeliveriesInput struct {
	Role string `query:"role" enum:"committee,scorer" doc:"Filter by role type"`
}

type GetUserDeliveriesOutput struct {
	Body []tables.DeliveryWithAssignments `json:"body"`
}

func (h *DeliveryAssignmentHandler) GetUserDeliveries(ctx context.Context, input *GetUserDeliveriesInput) (*GetUserDeliveriesOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check if user has scorer/committee role
	hasScorerRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "Scorer / Committee" || role.Name == "scorer" {
			hasScorerRole = true
			break
		}
	}
	if !hasScorerRole {
		return nil, huma.Error403Forbidden("Scorer/Committee role required")
	}

	deliveries, err := h.assignmentRepo.GetUserDeliveries(sessionData.UserID, input.Role)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get user deliveries", err)
	}

	return &GetUserDeliveriesOutput{Body: deliveries}, nil
}

// Control Delivery
type ControlDeliveryInput struct {
	ID   int `path:"id" minimum:"1"`
	Body struct {
		Action string `json:"action" enum:"start,stop,pause,resume" required:"true"`
	} `json:"body"`
}

type ControlDeliveryOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

func (h *DeliveryAssignmentHandler) ControlDelivery(ctx context.Context, input *ControlDeliveryInput) (*ControlDeliveryOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check if user has committee permission for this delivery
	hasPermission, err := h.assignmentRepo.CheckUserDeliveryPermission(sessionData.UserID, input.ID, "committee")
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to check permissions", err)
	}

	if !hasPermission {
		return nil, huma.Error403Forbidden("Committee access required for this delivery")
	}

	// Implement delivery control logic based on action
	var message string
	var success bool = true

	switch input.Body.Action {
	case "start":
		// Start the delivery
		err = h.deliveryRepo.StartDelivery(input.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("Failed to start delivery", err)
		}
		message = "Delivery started successfully"

	case "stop":
		// Stop the delivery (mark as finished)
		err = h.deliveryRepo.StopDelivery(input.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("Failed to stop delivery", err)
		}
		message = "Delivery stopped successfully"

	case "pause":
		// Pause the delivery
		err = h.deliveryRepo.PauseDelivery(input.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("Failed to pause delivery", err)
		}
		message = "Delivery paused successfully"

	case "resume":
		// Resume the delivery
		err = h.deliveryRepo.ResumeDelivery(input.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("Failed to resume delivery", err)
		}
		message = "Delivery resumed successfully"

	default:
		return nil, huma.Error400BadRequest("Invalid action: " + input.Body.Action)
	}

	return &ControlDeliveryOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: success,
			Message: message,
		},
	}, nil
}

// Get Scorer Users
type GetScorerUsersOutput struct {
	Body []tables.User `json:"body"`
}

func (h *DeliveryAssignmentHandler) GetScorerUsers(ctx context.Context, input *struct{}) (*GetScorerUsersOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check admin role
	hasAdminRole := false
	for _, role := range sessionData.Roles {
		if role.Name == "Administrator" || role.Name == "administrator" {
			hasAdminRole = true
			break
		}
	}
	if !hasAdminRole {
		return nil, huma.Error403Forbidden("Admin role required")
	}

	users, err := h.assignmentRepo.GetUsersWithRole("scorer")
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get scorer users", err)
	}

	return &GetScorerUsersOutput{Body: users}, nil
}
