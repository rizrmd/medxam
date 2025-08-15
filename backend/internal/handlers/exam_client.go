package handlers

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/danielgtaylor/huma/v2"
)

// ExamClientHandler handles exam client registration and management
type ExamClientHandler struct {
	clients    map[string]*RegisteredClient
	clientsMux sync.RWMutex

	// Assignment queue
	pendingDeliveries chan *DeliveryAssignment
	assignmentMux     sync.Mutex
}

// RegisteredClient represents a registered exam client
type RegisteredClient struct {
	ClientID      string    `json:"client_id"`
	ClientIP      string    `json:"client_ip"`
	Port          int       `json:"port"`
	MaxDeliveries int       `json:"max_deliveries"`
	Version       string    `json:"version"`
	Capabilities  []string  `json:"capabilities"`
	RegisteredAt  time.Time `json:"registered_at"`
	LastSeen      time.Time `json:"last_seen"`
	Status        string    `json:"status"` // "active", "inactive", "offline"

	// Current status
	ActiveDeliveries int                 `json:"active_deliveries"`
	TotalProcessed   int                 `json:"total_processed"`
	Uptime           int64               `json:"uptime"`
	Deliveries       []*DeliveryInstance `json:"deliveries,omitempty"`
}

// DeliveryInstance represents a running delivery instance
type DeliveryInstance struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	StartedAt    time.Time `json:"started_at"`
	Participants int       `json:"participants"`
	Port         int       `json:"port"`
}

// DeliveryAssignment represents a delivery to be assigned to a client
type DeliveryAssignment struct {
	DeliveryID   int                    `json:"delivery_id"`
	DeliveryName string                 `json:"delivery_name"`
	ExamData     map[string]interface{} `json:"exam_data"`
	Config       map[string]interface{} `json:"config"`
	AssignedAt   time.Time              `json:"assigned_at"`
	ClientID     string                 `json:"client_id,omitempty"`
}

// Registration request/response types
type RegisterClientInput struct {
	Body struct {
		ClientID      string   `json:"client_id" required:"true"`
		ClientIP      string   `json:"client_ip" required:"true"`
		Port          int      `json:"port" required:"true"`
		MaxDeliveries int      `json:"max_deliveries" required:"true"`
		Version       string   `json:"version" required:"true"`
		Capabilities  []string `json:"capabilities" required:"true"`
	}
}

type RegisterClientOutput struct {
	Body struct {
		Success  bool   `json:"success"`
		Message  string `json:"message"`
		ClientID string `json:"client_id"`
	}
}

// Status update types
type UpdateClientStatusInput struct {
	ClientID string `path:"client_id" required:"true"`
	Body     struct {
		ClientID         string              `json:"client_id" required:"true"`
		ActiveDeliveries int                 `json:"active_deliveries"`
		MaxDeliveries    int                 `json:"max_deliveries"`
		TotalProcessed   int                 `json:"total_processed"`
		Uptime           int64               `json:"uptime"`
		Deliveries       []*DeliveryInstance `json:"deliveries"`
	}
}

type UpdateClientStatusOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
}

// Assignment request types
type GetAssignmentInput struct {
	ClientID string `path:"client_id" required:"true"`
}

type GetAssignmentOutput struct {
	Body *DeliveryAssignment `json:"body,omitempty"`
}

// List clients types
type ListClientsInput struct{}

type ListClientsOutput struct {
	Body struct {
		Clients []*RegisteredClient `json:"clients"`
		Total   int                 `json:"total"`
	}
}

// Unregister client types
type UnregisterClientInput struct {
	ClientID string `path:"client_id" required:"true"`
}

type UnregisterClientOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
}

// NewExamClientHandler creates a new exam client handler
func NewExamClientHandler() *ExamClientHandler {
	return &ExamClientHandler{
		clients:           make(map[string]*RegisteredClient),
		pendingDeliveries: make(chan *DeliveryAssignment, 100),
	}
}

// Register registers the exam client endpoints
func (h *ExamClientHandler) Register(api huma.API) {
	// Client registration
	huma.Register(api, huma.Operation{
		OperationID: "register-exam-client",
		Method:      "POST",
		Path:        "/api/internal/exam-clients/register",
		Summary:     "Register an exam client",
		Description: "Register a new exam client with the coordinator.",
		Tags:        []string{"Internal", "Exam Clients"},
	}, h.RegisterClient)

	// Status updates
	huma.Register(api, huma.Operation{
		OperationID: "update-client-status",
		Method:      "POST",
		Path:        "/api/internal/exam-clients/{client_id}/status",
		Summary:     "Update client status",
		Description: "Update the status and metrics of an exam client.",
		Tags:        []string{"Internal", "Exam Clients"},
	}, h.UpdateClientStatus)

	// Get assignments
	huma.Register(api, huma.Operation{
		OperationID: "get-client-assignment",
		Method:      "GET",
		Path:        "/api/internal/exam-clients/{client_id}/assignments",
		Summary:     "Get delivery assignment",
		Description: "Get a pending delivery assignment for the client.",
		Tags:        []string{"Internal", "Exam Clients"},
	}, h.GetAssignment)

	// List clients (admin endpoint)
	huma.Register(api, huma.Operation{
		OperationID: "list-exam-clients",
		Method:      "GET",
		Path:        "/api/internal/exam-clients",
		Summary:     "List exam clients",
		Description: "List all registered exam clients and their status.",
		Tags:        []string{"Internal", "Exam Clients"},
	}, h.ListClients)

	// Unregister client
	huma.Register(api, huma.Operation{
		OperationID: "unregister-exam-client",
		Method:      "DELETE",
		Path:        "/api/internal/exam-clients/{client_id}",
		Summary:     "Unregister exam client",
		Description: "Remove an exam client from the coordinator.",
		Tags:        []string{"Internal", "Exam Clients"},
	}, h.UnregisterClient)
}

// RegisterClient handles client registration
func (h *ExamClientHandler) RegisterClient(ctx context.Context, input *RegisterClientInput) (*RegisterClientOutput, error) {
	h.clientsMux.Lock()
	defer h.clientsMux.Unlock()

	clientID := input.Body.ClientID

	// Check if already registered
	if existingClient, exists := h.clients[clientID]; exists {
		log.Printf("Client %s re-registering (was last seen: %v)", clientID, existingClient.LastSeen)
	}

	// Create/update client record
	client := &RegisteredClient{
		ClientID:      clientID,
		ClientIP:      input.Body.ClientIP,
		Port:          input.Body.Port,
		MaxDeliveries: input.Body.MaxDeliveries,
		Version:       input.Body.Version,
		Capabilities:  input.Body.Capabilities,
		RegisteredAt:  time.Now(),
		LastSeen:      time.Now(),
		Status:        "active",
	}

	h.clients[clientID] = client

	log.Printf("Registered exam client: %s (%s:%d) - capacity: %d",
		clientID, client.ClientIP, client.Port, client.MaxDeliveries)

	return &RegisterClientOutput{
		Body: struct {
			Success  bool   `json:"success"`
			Message  string `json:"message"`
			ClientID string `json:"client_id"`
		}{
			Success:  true,
			Message:  "Client registered successfully",
			ClientID: clientID,
		},
	}, nil
}

// UpdateClientStatus handles status updates from clients
func (h *ExamClientHandler) UpdateClientStatus(ctx context.Context, input *UpdateClientStatusInput) (*UpdateClientStatusOutput, error) {
	h.clientsMux.Lock()
	defer h.clientsMux.Unlock()

	client, exists := h.clients[input.ClientID]
	if !exists {
		return &UpdateClientStatusOutput{
			Body: struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			}{
				Success: false,
				Message: "Client not found",
			},
		}, nil
	}

	// Update client status
	client.LastSeen = time.Now()
	client.Status = "active"
	client.ActiveDeliveries = input.Body.ActiveDeliveries
	client.TotalProcessed = input.Body.TotalProcessed
	client.Uptime = input.Body.Uptime
	client.Deliveries = input.Body.Deliveries

	return &UpdateClientStatusOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Status updated",
		},
	}, nil
}

// GetAssignment provides delivery assignments to clients
func (h *ExamClientHandler) GetAssignment(ctx context.Context, input *GetAssignmentInput) (*GetAssignmentOutput, error) {
	h.clientsMux.RLock()
	client, exists := h.clients[input.ClientID]
	h.clientsMux.RUnlock()

	if !exists {
		return &GetAssignmentOutput{}, fmt.Errorf("client not found")
	}

	// Check if client has capacity (0 means unlimited)
	if client.MaxDeliveries > 0 && client.ActiveDeliveries >= client.MaxDeliveries {
		// Return 204 No Content - client at capacity
		return &GetAssignmentOutput{}, nil
	}

	// Try to get pending assignment
	select {
	case assignment := <-h.pendingDeliveries:
		assignment.ClientID = input.ClientID
		assignment.AssignedAt = time.Now()

		log.Printf("Assigned delivery %d to client %s", assignment.DeliveryID, input.ClientID)

		return &GetAssignmentOutput{
			Body: assignment,
		}, nil
	default:
		// No pending assignments - return 204 No Content
		return &GetAssignmentOutput{}, nil
	}
}

// ListClients lists all registered clients
func (h *ExamClientHandler) ListClients(ctx context.Context, input *ListClientsInput) (*ListClientsOutput, error) {
	h.clientsMux.RLock()
	defer h.clientsMux.RUnlock()

	clients := make([]*RegisteredClient, 0, len(h.clients))

	// Mark clients as offline if not seen recently
	cutoff := time.Now().Add(-2 * time.Minute)

	for _, client := range h.clients {
		if client.LastSeen.Before(cutoff) {
			client.Status = "offline"
		}
		clients = append(clients, client)
	}

	return &ListClientsOutput{
		Body: struct {
			Clients []*RegisteredClient `json:"clients"`
			Total   int                 `json:"total"`
		}{
			Clients: clients,
			Total:   len(clients),
		},
	}, nil
}

// UnregisterClient removes a client
func (h *ExamClientHandler) UnregisterClient(ctx context.Context, input *UnregisterClientInput) (*UnregisterClientOutput, error) {
	h.clientsMux.Lock()
	defer h.clientsMux.Unlock()

	delete(h.clients, input.ClientID)

	log.Printf("Unregistered exam client: %s", input.ClientID)

	return &UnregisterClientOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Client unregistered successfully",
		},
	}, nil
}

// AssignDelivery queues a delivery for assignment to available clients
func (h *ExamClientHandler) AssignDelivery(deliveryID int, deliveryName string, examData map[string]interface{}) {
	assignment := &DeliveryAssignment{
		DeliveryID:   deliveryID,
		DeliveryName: deliveryName,
		ExamData:     examData,
		Config:       make(map[string]interface{}),
		AssignedAt:   time.Now(),
	}

	select {
	case h.pendingDeliveries <- assignment:
		log.Printf("Queued delivery %d (%s) for assignment", deliveryID, deliveryName)
	default:
		log.Printf("Assignment queue full - delivery %d not queued", deliveryID)
	}
}

// GetAvailableCapacity returns total available capacity across all clients
func (h *ExamClientHandler) GetAvailableCapacity() int {
	h.clientsMux.RLock()
	defer h.clientsMux.RUnlock()

	totalCapacity := 0
	cutoff := time.Now().Add(-2 * time.Minute) // Consider offline if not seen for 2+ minutes
	hasUnlimitedClient := false

	for _, client := range h.clients {
		if client.LastSeen.After(cutoff) { // Client is online
			if client.MaxDeliveries == 0 { // Unlimited capacity
				hasUnlimitedClient = true
			} else {
				available := client.MaxDeliveries - client.ActiveDeliveries
				if available > 0 {
					totalCapacity += available
				}
			}
		}
	}

	// If we have any unlimited client, return a large number to indicate capacity
	if hasUnlimitedClient {
		return 999999 // Large number to indicate unlimited capacity
	}

	return totalCapacity
}
