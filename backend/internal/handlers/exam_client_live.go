package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
)

// ExamClientLiveHandler handles live progress queries to exam-clients
type ExamClientLiveHandler struct {
	deliveryModel *models.DeliveryModel
	wsHub         *WebSocketHub
	httpClient    *http.Client
}

// ExamClientEvent represents an event from exam-client
type ExamClientEvent struct {
	EventType  string                 `json:"event_type"`
	DeliveryID int                    `json:"delivery_id"`
	ClientID   string                 `json:"client_id"`
	Data       map[string]interface{} `json:"data"`
	Timestamp  time.Time              `json:"timestamp"`
}

// LiveProgressQuery represents a query for live progress
type LiveProgressQuery struct {
	DeliveryID int `path:"id" minimum:"1"`
}

// LiveProgressQueryOutput represents the response for live progress
type LiveProgressQueryOutput struct {
	Body struct {
		Success bool        `json:"success"`
		Message string      `json:"message"`
		Data    interface{} `json:"data,omitempty"`
		Source  string      `json:"source"` // "exam_client" or "database"
	} `json:"body"`
}

// EventReceiveInput represents an event from exam-client
type EventReceiveInput struct {
	Body ExamClientEvent `json:"body"`
}

// EventReceiveOutput represents the response for event receiving
type EventReceiveOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

// FinalResultsInput represents final results from exam-client
type FinalResultsInput struct {
	ClientID string                 `path:"client_id"`
	Body     map[string]interface{} `json:"body"`
}

// FinalResultsOutput represents the response for final results
type FinalResultsOutput struct {
	Body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	} `json:"body"`
}

// NewExamClientLiveHandler creates a new exam client live handler
func NewExamClientLiveHandler(deliveryModel *models.DeliveryModel, wsHub *WebSocketHub) *ExamClientLiveHandler {
	return &ExamClientLiveHandler{
		deliveryModel: deliveryModel,
		wsHub:         wsHub,
		httpClient:    &http.Client{Timeout: 10 * time.Second},
	}
}

// Register registers the live progress endpoints
func (h *ExamClientLiveHandler) Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "get-live-progress",
		Method:      http.MethodGet,
		Path:        "/api/deliveries/{id}/live-progress",
		Summary:     "Get live progress from exam-client",
		Description: "Query the active exam-client for real-time progress data.",
		Tags:        []string{"Live Progress"},
		Security:    []map[string][]string{{"session": {}}},
	}, h.GetLiveProgress)

	huma.Register(api, huma.Operation{
		OperationID: "receive-exam-client-event",
		Method:      http.MethodPost,
		Path:        "/api/internal/exam-clients/event",
		Summary:     "Receive event from exam-client",
		Description: "Receive real-time events from exam-client services.",
		Tags:        []string{"Internal"},
	}, h.ReceiveEvent)

	huma.Register(api, huma.Operation{
		OperationID: "receive-final-results",
		Method:      http.MethodPost,
		Path:        "/api/internal/exam-clients/{client_id}/final-results",
		Summary:     "Receive final results from exam-client",
		Description: "Receive complete exam results when delivery finishes.",
		Tags:        []string{"Internal"},
	}, h.ReceiveFinalResults)
}

// GetLiveProgress queries exam-client for live progress or falls back to database
func (h *ExamClientLiveHandler) GetLiveProgress(ctx context.Context, input *LiveProgressQuery) (*LiveProgressQueryOutput, error) {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return nil, huma.Error401Unauthorized("Authentication required")
	}

	// Check if delivery exists and get its details
	delivery, err := h.deliveryModel.GetByID(input.DeliveryID)
	if err != nil {
		return nil, huma.Error404NotFound("Delivery not found")
	}

	// Try to get live data from exam-client first
	liveData, err := h.queryExamClientProgress(input.DeliveryID)
	if err == nil && liveData != nil {
		// Successfully got live data from exam-client
		return &LiveProgressQueryOutput{
			Body: struct {
				Success bool        `json:"success"`
				Message string      `json:"message"`
				Data    interface{} `json:"data,omitempty"`
				Source  string      `json:"source"`
			}{
				Success: true,
				Message: "Live progress retrieved from exam-client",
				Data:    liveData,
				Source:  "exam_client",
			},
		}, nil
	}

	// Fallback to database query
	progressData, err := h.deliveryModel.GetParticipantProgress(input.DeliveryID)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to get progress data", err)
	}

	// Calculate stats
	var completedCount, inProgressCount int
	for _, data := range progressData {
		if progressMap, ok := data.(map[string]interface{}); ok {
			if attemptData, ok := progressMap["attempt"].(map[string]interface{}); ok {
				status := attemptData["status"].(string)
				switch status {
				case "completed":
					completedCount++
				case "in_progress":
					inProgressCount++
				}
			}
		}
	}

	fallbackData := map[string]interface{}{
		"delivery": map[string]interface{}{
			"id":                delivery.ID,
			"name":              delivery.Name,
			"display_name":      delivery.DisplayName,
			"participant_count": len(progressData),
			"completed_count":   completedCount,
			"in_progress_count": inProgressCount,
		},
		"participants": progressData,
	}

	return &LiveProgressQueryOutput{
		Body: struct {
			Success bool        `json:"success"`
			Message string      `json:"message"`
			Data    interface{} `json:"data,omitempty"`
			Source  string      `json:"source"`
		}{
			Success: true,
			Message: "Progress retrieved from database (exam-client unavailable)",
			Data:    fallbackData,
			Source:  "database",
		},
	}, nil
}

// ReceiveEvent handles events from exam-clients
func (h *ExamClientLiveHandler) ReceiveEvent(ctx context.Context, input *EventReceiveInput) (*EventReceiveOutput, error) {
	event := input.Body

	// Log the event
	fmt.Printf("Received event from exam-client: %s for delivery %d\n", event.EventType, event.DeliveryID)

	// Trigger WebSocket broadcast for this delivery
	h.wsHub.BroadcastProgressUpdate(event.DeliveryID)

	// TODO: Store event in database for audit trail if needed

	return &EventReceiveOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Event received and processed",
		},
	}, nil
}

// ReceiveFinalResults handles final results from exam-clients
func (h *ExamClientLiveHandler) ReceiveFinalResults(ctx context.Context, input *FinalResultsInput) (*FinalResultsOutput, error) {
	finalData := input.Body

	// Log the final data transfer
	fmt.Printf("Received final results from exam-client %s\n", input.ClientID)

	// TODO: Process and store the final results in PostgreSQL
	// This would involve:
	// 1. Validate the data structure
	// 2. Convert SQLite data format to PostgreSQL format
	// 3. Insert attempts, answers, and progress data
	// 4. Update delivery status
	// 5. Clean up any temporary state

	// For now, just log the data
	if deliveryID, ok := finalData["delivery_id"].(float64); ok {
		fmt.Printf("Processing final results for delivery %d\n", int(deliveryID))

		// Extract data components
		if participants, ok := finalData["participants"].([]interface{}); ok {
			fmt.Printf("  - %d participants\n", len(participants))
		}
		if attempts, ok := finalData["attempts"].([]interface{}); ok {
			fmt.Printf("  - %d attempts\n", len(attempts))
		}
		if answers, ok := finalData["answers"].([]interface{}); ok {
			fmt.Printf("  - %d answers\n", len(answers))
		}
		if progress, ok := finalData["progress"].([]interface{}); ok {
			fmt.Printf("  - %d progress records\n", len(progress))
		}
	}

	return &FinalResultsOutput{
		Body: struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}{
			Success: true,
			Message: "Final results received and processed",
		},
	}, nil
}

// queryExamClientProgress queries the exam-client directly for live progress
func (h *ExamClientLiveHandler) queryExamClientProgress(deliveryID int) (map[string]interface{}, error) {
	// TODO: Get exam-client URL from delivery assignment or registry
	// For now, assume standard port pattern
	examClientURL := fmt.Sprintf("http://localhost:%d", 8235+deliveryID%100)

	// Query live progress API
	url := fmt.Sprintf("%s/api/progress", examClientURL)
	resp, err := h.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to query exam-client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("exam-client returned status %d", resp.StatusCode)
	}

	var response struct {
		Success bool                     `json:"success"`
		Message string                   `json:"message"`
		Data    []map[string]interface{} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("exam-client reported error: %s", response.Message)
	}

	// Get delivery stats as well
	statsURL := fmt.Sprintf("%s/api/delivery-stats", examClientURL)
	statsResp, err := h.httpClient.Get(statsURL)
	if err != nil {
		return nil, fmt.Errorf("failed to query delivery stats: %w", err)
	}
	defer statsResp.Body.Close()

	var statsResponse struct {
		Success bool                   `json:"success"`
		Data    map[string]interface{} `json:"data"`
	}

	if statsResp.StatusCode == http.StatusOK {
		json.NewDecoder(statsResp.Body).Decode(&statsResponse)
	}

	// Combine progress and stats
	result := map[string]interface{}{
		"delivery": map[string]interface{}{
			"id":   deliveryID,
			"name": fmt.Sprintf("Delivery %d", deliveryID),
		},
		"participants": response.Data,
	}

	if statsResponse.Success {
		if deliveryData, ok := result["delivery"].(map[string]interface{}); ok {
			for key, value := range statsResponse.Data {
				deliveryData[key] = value
			}
		}
	}

	return result, nil
}
