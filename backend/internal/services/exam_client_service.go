package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// ExamClientService manages multiple exam deliveries on a worker node
type ExamClientService struct {
	coordinatorURL string
	clientID       string
	clientIP       string
	port           int
	maxDeliveries  int
	dataDir        string // Directory for SQLite databases

	// Running deliveries
	deliveries    map[int]*DeliveryInstance
	deliveriesMux sync.RWMutex

	// Communication
	httpClient *http.Client
	stopChan   chan struct{}

	// Stats
	totalProcessed int
	startTime      time.Time
}

// DeliveryInstance represents a running exam delivery
type DeliveryInstance struct {
	ID           int                `json:"id"`
	Name         string             `json:"name"`
	Status       string             `json:"status"`
	StartedAt    time.Time          `json:"started_at"`
	Participants int                `json:"participants"`
	Port         int                `json:"port"`
	Context      context.Context    `json:"-"`
	Cancel       context.CancelFunc `json:"-"`

	// New fields for SQLite database and HTTP server
	Database *ExamDeliveryDB     `json:"-"`
	Server   *ExamDeliveryServer `json:"-"`
	DataDir  string              `json:"-"`
}

// ClientRegistration represents the data sent when registering with coordinator
type ClientRegistration struct {
	ClientID      string   `json:"client_id"`
	ClientIP      string   `json:"client_ip"`
	Port          int      `json:"port"`
	MaxDeliveries int      `json:"max_deliveries"`
	Version       string   `json:"version"`
	Capabilities  []string `json:"capabilities"`
}

// ClientStatus represents current client status sent to coordinator
type ClientStatus struct {
	ClientID         string              `json:"client_id"`
	ActiveDeliveries int                 `json:"active_deliveries"`
	MaxDeliveries    int                 `json:"max_deliveries"`
	TotalProcessed   int                 `json:"total_processed"`
	Uptime           int64               `json:"uptime"`
	Deliveries       []*DeliveryInstance `json:"deliveries"`
}

// DeliveryAssignment represents a delivery assigned by the coordinator
type DeliveryAssignment struct {
	DeliveryID   int                    `json:"delivery_id"`
	DeliveryName string                 `json:"delivery_name"`
	ExamData     map[string]interface{} `json:"exam_data"`
	Config       map[string]interface{} `json:"config"`
}

// NewExamClientService creates a new exam client service
func NewExamClientService(coordinatorURL string, maxDeliveries int) *ExamClientService {
	hostname, _ := os.Hostname()
	clientID := fmt.Sprintf("exam-client-%s-%d", hostname, time.Now().Unix())

	// Create data directory for SQLite databases
	dataDir := "./exam_data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Printf("Warning: Failed to create data directory: %v", err)
		dataDir = "." // Fallback to current directory
	}

	return &ExamClientService{
		coordinatorURL: coordinatorURL,
		clientID:       clientID,
		clientIP:       getLocalIP(),
		port:           8234, // Default port for exam-client
		maxDeliveries:  maxDeliveries,
		dataDir:        dataDir,
		deliveries:     make(map[int]*DeliveryInstance),
		httpClient:     &http.Client{Timeout: 30 * time.Second},
		stopChan:       make(chan struct{}),
		startTime:      time.Now(),
	}
}

// Start begins the exam client service
func (s *ExamClientService) Start(ctx context.Context) error {
	log.Printf("Starting exam-client service: %s", s.clientID)
	log.Printf("Coordinator URL: %s", s.coordinatorURL)
	log.Printf("Max deliveries: %d", s.maxDeliveries)

	// Register with coordinator
	if err := s.registerWithCoordinator(); err != nil {
		return fmt.Errorf("failed to register with coordinator: %w", err)
	}

	// Start status reporting loop
	go s.statusReportingLoop(ctx)

	// Start work polling loop
	go s.workPollingLoop(ctx)

	// Wait for shutdown
	select {
	case <-ctx.Done():
		log.Println("Exam client shutting down due to context cancellation")
	case <-s.stopChan:
		log.Println("Exam client shutting down")
	}

	// Cleanup
	s.shutdownAllDeliveries()
	s.unregisterWithCoordinator()

	return nil
}

// Stop stops the exam client service
func (s *ExamClientService) Stop() {
	close(s.stopChan)
}

// registerWithCoordinator registers this client with the main coordinator
func (s *ExamClientService) registerWithCoordinator() error {
	registration := ClientRegistration{
		ClientID:      s.clientID,
		ClientIP:      s.clientIP,
		Port:          s.port,
		MaxDeliveries: s.maxDeliveries,
		Version:       "1.0.0",
		Capabilities:  []string{"mcq", "osce", "interview"},
	}

	data, err := json.Marshal(registration)
	if err != nil {
		return fmt.Errorf("failed to marshal registration: %w", err)
	}

	url := fmt.Sprintf("%s/api/internal/exam-clients/register", s.coordinatorURL)
	resp, err := s.httpClient.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("failed to register: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("registration failed with status: %d", resp.StatusCode)
	}

	log.Printf("Successfully registered with coordinator: %s", s.clientID)
	return nil
}

// statusReportingLoop periodically reports status to coordinator
func (s *ExamClientService) statusReportingLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second) // Report every 30 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.reportStatus()
		}
	}
}

// workPollingLoop polls coordinator for new work assignments
func (s *ExamClientService) workPollingLoop(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second) // Poll every 10 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopChan:
			return
		case <-ticker.C:
			s.pollForWork()
		}
	}
}

// reportStatus sends current status to coordinator
func (s *ExamClientService) reportStatus() {
	s.deliveriesMux.RLock()
	deliveries := make([]*DeliveryInstance, 0, len(s.deliveries))
	for _, delivery := range s.deliveries {
		deliveries = append(deliveries, delivery)
	}
	s.deliveriesMux.RUnlock()

	status := ClientStatus{
		ClientID:         s.clientID,
		ActiveDeliveries: len(deliveries),
		MaxDeliveries:    s.maxDeliveries,
		TotalProcessed:   s.totalProcessed,
		Uptime:           int64(time.Since(s.startTime).Seconds()),
		Deliveries:       deliveries,
	}

	data, err := json.Marshal(status)
	if err != nil {
		log.Printf("Failed to marshal status: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/internal/exam-clients/%s/status", s.coordinatorURL, s.clientID)
	resp, err := s.httpClient.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		log.Printf("Failed to report status: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Status report failed with status: %d", resp.StatusCode)
	}
}

// pollForWork checks coordinator for new delivery assignments
func (s *ExamClientService) pollForWork() {
	s.deliveriesMux.RLock()
	currentLoad := len(s.deliveries)
	s.deliveriesMux.RUnlock()

	// Check capacity (0 means unlimited)
	if s.maxDeliveries > 0 && currentLoad >= s.maxDeliveries {
		return // At capacity
	}

	url := fmt.Sprintf("%s/api/internal/exam-clients/%s/assignments", s.coordinatorURL, s.clientID)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		log.Printf("Failed to poll for work: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent {
		return // No work available
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Work polling failed with status: %d", resp.StatusCode)
		return
	}

	var assignment DeliveryAssignment
	if err := json.NewDecoder(resp.Body).Decode(&assignment); err != nil {
		log.Printf("Failed to decode assignment: %v", err)
		return
	}

	// Start the assigned delivery
	if err := s.startDelivery(&assignment); err != nil {
		log.Printf("Failed to start delivery %d: %v", assignment.DeliveryID, err)
	}
}

// startDelivery starts a new delivery instance
func (s *ExamClientService) startDelivery(assignment *DeliveryAssignment) error {
	s.deliveriesMux.Lock()
	defer s.deliveriesMux.Unlock()

	// Check if already running
	if _, exists := s.deliveries[assignment.DeliveryID]; exists {
		return fmt.Errorf("delivery %d already running", assignment.DeliveryID)
	}

	// Create SQLite database for this delivery
	db, err := NewExamDeliveryDB(assignment.DeliveryID, s.dataDir)
	if err != nil {
		return fmt.Errorf("failed to create delivery database: %w", err)
	}

	// Create delivery instance
	ctx, cancel := context.WithCancel(context.Background())
	deliveryPort := s.port + 1 + (assignment.DeliveryID % 100) // Unique port per delivery (8235+)

	delivery := &DeliveryInstance{
		ID:           assignment.DeliveryID,
		Name:         assignment.DeliveryName,
		Status:       "starting",
		StartedAt:    time.Now(),
		Participants: 0,
		Port:         deliveryPort,
		Context:      ctx,
		Cancel:       cancel,
		Database:     db,
		DataDir:      s.dataDir,
	}

	// Create HTTP server for this delivery
	server := NewExamDeliveryServer(assignment.DeliveryID, deliveryPort, db, s.coordinatorURL, s.clientID)
	delivery.Server = server

	s.deliveries[assignment.DeliveryID] = delivery

	// Load participants from assignment data
	if err := s.loadParticipants(delivery, assignment); err != nil {
		log.Printf("Warning: Failed to load participants for delivery %d: %v", assignment.DeliveryID, err)
	}

	// Start delivery in goroutine
	go s.runDelivery(delivery, assignment)

	log.Printf("Started delivery %d (%s) on port %d with SQLite database",
		delivery.ID, delivery.Name, delivery.Port)

	return nil
}

// runDelivery runs a single delivery instance
func (s *ExamClientService) runDelivery(delivery *DeliveryInstance, assignment *DeliveryAssignment) {
	defer func() {
		// Cleanup when delivery finishes
		if delivery.Server != nil {
			delivery.Server.Stop()
		}
		if delivery.Database != nil {
			// Export final data before closing
			if delivery.Status == "completed" {
				s.exportFinalData(delivery)
			}
			delivery.Database.Close()
			// TODO: Delete SQLite file after successful export
		}

		s.deliveriesMux.Lock()
		delete(s.deliveries, delivery.ID)
		s.totalProcessed++
		s.deliveriesMux.Unlock()

		log.Printf("Delivery %d (%s) finished with status: %s", delivery.ID, delivery.Name, delivery.Status)
	}()

	delivery.Status = "running"
	log.Printf("Starting HTTP server for delivery %d on port %d", delivery.ID, delivery.Port)

	// Start HTTP server in a goroutine
	go func() {
		if err := delivery.Server.Start(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error for delivery %d: %v", delivery.ID, err)
		}
	}()

	log.Printf("Delivery %d (%s) is now running and accepting participants", delivery.ID, delivery.Name)

	// Wait for delivery to complete or be cancelled
	select {
	case <-delivery.Context.Done():
		delivery.Status = "cancelled"
		log.Printf("Delivery %d cancelled", delivery.ID)
	case <-time.After(8 * time.Hour): // Maximum exam duration (8 hours)
		delivery.Status = "completed"
		log.Printf("Delivery %d completed due to timeout", delivery.ID)
	}
}

// shutdownAllDeliveries gracefully shuts down all running deliveries
func (s *ExamClientService) shutdownAllDeliveries() {
	s.deliveriesMux.Lock()
	defer s.deliveriesMux.Unlock()

	log.Printf("Shutting down %d active deliveries...", len(s.deliveries))

	for id, delivery := range s.deliveries {
		delivery.Cancel()
		log.Printf("Cancelled delivery %d", id)
	}
}

// unregisterWithCoordinator removes this client from coordinator
func (s *ExamClientService) unregisterWithCoordinator() {
	url := fmt.Sprintf("%s/api/internal/exam-clients/%s", s.coordinatorURL, s.clientID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		log.Printf("Failed to create unregister request: %v", err)
		return
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("Failed to unregister: %v", err)
		return
	}
	defer resp.Body.Close()

	log.Printf("Unregistered from coordinator: %s", s.clientID)
}

// loadParticipants loads participants from assignment data into the database
func (s *ExamClientService) loadParticipants(delivery *DeliveryInstance, assignment *DeliveryAssignment) error {
	// TODO: Extract participants from assignment.ExamData or assignment.Config
	// For now, create some sample participants for testing
	sampleParticipants := []ParticipantData{
		{ID: 1, Name: "John Doe", Email: "john@example.com", Identifier: "001", Status: "not_started"},
		{ID: 2, Name: "Jane Smith", Email: "jane@example.com", Identifier: "002", Status: "not_started"},
		{ID: 3, Name: "Bob Johnson", Email: "bob@example.com", Identifier: "003", Status: "not_started"},
	}

	for _, participant := range sampleParticipants {
		if err := delivery.Database.AddParticipant(participant); err != nil {
			return fmt.Errorf("failed to add participant %d: %w", participant.ID, err)
		}
	}

	delivery.Participants = len(sampleParticipants)
	log.Printf("Loaded %d participants for delivery %d", len(sampleParticipants), delivery.ID)
	return nil
}

// exportFinalData exports the final delivery data to the coordinator
func (s *ExamClientService) exportFinalData(delivery *DeliveryInstance) {
	log.Printf("Exporting final data for delivery %d", delivery.ID)

	data, err := delivery.Database.ExportAllData()
	if err != nil {
		log.Printf("Failed to export data for delivery %d: %v", delivery.ID, err)
		return
	}

	// Send to coordinator
	dataJSON, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to marshal export data: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/internal/exam-clients/%s/final-results", s.coordinatorURL, s.clientID)
	resp, err := s.httpClient.Post(url, "application/json", bytes.NewBuffer(dataJSON))
	if err != nil {
		log.Printf("Failed to send final data to coordinator: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("Successfully exported final data for delivery %d", delivery.ID)
	} else {
		log.Printf("Failed to export final data for delivery %d, status: %d", delivery.ID, resp.StatusCode)
	}
}

// getLocalIP gets the local IP address
func getLocalIP() string {
	// This is a simplified implementation
	// In production, you might want more sophisticated IP detection
	return "127.0.0.1" // Default to localhost for now
}
