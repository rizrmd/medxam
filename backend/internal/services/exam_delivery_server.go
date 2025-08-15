package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// ExamDeliveryServer handles HTTP requests for a specific delivery
type ExamDeliveryServer struct {
	deliveryID     int
	port           int
	db             *ExamDeliveryDB
	server         *http.Server
	coordinatorURL string
	clientID       string
}

// ExamStartRequest represents a request to start an exam
type ExamStartRequest struct {
	ParticipantID  int `json:"participant_id"`
	TotalQuestions int `json:"total_questions"`
}

// AnswerSubmissionRequest represents an answer submission
type AnswerSubmissionRequest struct {
	AttemptID  int    `json:"attempt_id"`
	QuestionID int    `json:"question_id"`
	Answer     string `json:"answer"`
	Score      int    `json:"score"`
}

// ExamCompleteRequest represents exam completion
type ExamCompleteRequest struct {
	AttemptID int `json:"attempt_id"`
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// NewExamDeliveryServer creates a new HTTP server for a delivery
func NewExamDeliveryServer(deliveryID, port int, db *ExamDeliveryDB, coordinatorURL, clientID string) *ExamDeliveryServer {
	return &ExamDeliveryServer{
		deliveryID:     deliveryID,
		port:           port,
		db:             db,
		coordinatorURL: coordinatorURL,
		clientID:       clientID,
	}
}

// Start starts the HTTP server
func (eds *ExamDeliveryServer) Start() error {
	router := chi.NewRouter()

	// Middleware
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Configure properly for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Participant exam interface routes
	router.Route("/exam", func(r chi.Router) {
		r.Post("/start", eds.handleExamStart)
		r.Get("/question/{id}", eds.handleGetQuestion)
		r.Post("/answer", eds.handleAnswerSubmission)
		r.Get("/progress/{participant_id}", eds.handleGetParticipantProgress)
		r.Post("/complete", eds.handleExamComplete)
	})

	// Live progress API routes (for coordinator)
	router.Route("/api", func(r chi.Router) {
		r.Get("/progress", eds.handleLiveProgress)
		r.Get("/participants", eds.handleGetParticipants)
		r.Get("/delivery-stats", eds.handleGetDeliveryStats)
	})

	// Health check
	router.Get("/health", eds.handleHealthCheck)

	eds.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", eds.port),
		Handler: router,
	}

	log.Printf("Starting exam delivery server for delivery %d on port %d", eds.deliveryID, eds.port)
	return eds.server.ListenAndServe()
}

// Stop stops the HTTP server
func (eds *ExamDeliveryServer) Stop() error {
	if eds.server != nil {
		return eds.server.Close()
	}
	return nil
}

// Health check endpoint
func (eds *ExamDeliveryServer) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	response := APIResponse{
		Success: true,
		Message: "Exam delivery server is running",
		Data: map[string]interface{}{
			"delivery_id": eds.deliveryID,
			"port":        eds.port,
			"status":      "active",
		},
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle exam start
func (eds *ExamDeliveryServer) handleExamStart(w http.ResponseWriter, r *http.Request) {
	var req ExamStartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		eds.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	attemptID, err := eds.db.StartAttempt(req.ParticipantID, req.TotalQuestions)
	if err != nil {
		log.Printf("Failed to start attempt: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to start exam")
		return
	}

	// Push event to coordinator
	go eds.pushEventToCoordinator("participant_started", map[string]interface{}{
		"participant_id": req.ParticipantID,
		"attempt_id":     attemptID,
	})

	response := APIResponse{
		Success: true,
		Message: "Exam started successfully",
		Data: map[string]interface{}{
			"attempt_id": attemptID,
		},
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle get question (placeholder - would serve actual exam content)
func (eds *ExamDeliveryServer) handleGetQuestion(w http.ResponseWriter, r *http.Request) {
	questionIDStr := chi.URLParam(r, "id")
	questionID, err := strconv.Atoi(questionIDStr)
	if err != nil {
		eds.respondError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// TODO: Implement actual question serving from cached exam data
	response := APIResponse{
		Success: true,
		Message: "Question retrieved successfully",
		Data: map[string]interface{}{
			"question_id": questionID,
			"question":    "Sample question content would go here",
			"options":     []string{"Option A", "Option B", "Option C", "Option D"},
		},
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle answer submission
func (eds *ExamDeliveryServer) handleAnswerSubmission(w http.ResponseWriter, r *http.Request) {
	var req AnswerSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		eds.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := eds.db.SubmitAnswer(req.AttemptID, req.QuestionID, req.Answer, req.Score)
	if err != nil {
		log.Printf("Failed to submit answer: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to submit answer")
		return
	}

	// Get updated progress for event
	progress, err := eds.getParticipantProgress(req.AttemptID)
	if err == nil {
		// Push event to coordinator
		go eds.pushEventToCoordinator("answer_submitted", map[string]interface{}{
			"attempt_id":         req.AttemptID,
			"question_id":        req.QuestionID,
			"questions_answered": progress.QuestionsAnswered,
			"current_score":      progress.CurrentScore,
			"total_questions":    progress.TotalQuestions,
		})
	}

	response := APIResponse{
		Success: true,
		Message: "Answer submitted successfully",
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle get participant progress
func (eds *ExamDeliveryServer) handleGetParticipantProgress(w http.ResponseWriter, r *http.Request) {
	participantIDStr := chi.URLParam(r, "participant_id")
	participantID, err := strconv.Atoi(participantIDStr)
	if err != nil {
		eds.respondError(w, http.StatusBadRequest, "Invalid participant ID")
		return
	}

	// Get progress from database
	progress, err := eds.getParticipantProgressByID(participantID)
	if err != nil {
		log.Printf("Failed to get participant progress: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to get progress")
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Progress retrieved successfully",
		Data:    progress,
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle exam completion
func (eds *ExamDeliveryServer) handleExamComplete(w http.ResponseWriter, r *http.Request) {
	var req ExamCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		eds.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := eds.db.CompleteAttempt(req.AttemptID)
	if err != nil {
		log.Printf("Failed to complete attempt: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to complete exam")
		return
	}

	// Get final progress for event
	progress, err := eds.getParticipantProgress(req.AttemptID)
	if err == nil {
		// Push event to coordinator
		go eds.pushEventToCoordinator("participant_completed", map[string]interface{}{
			"attempt_id":      req.AttemptID,
			"final_score":     progress.CurrentScore,
			"total_questions": progress.TotalQuestions,
		})
	}

	response := APIResponse{
		Success: true,
		Message: "Exam completed successfully",
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle live progress (for coordinator)
func (eds *ExamDeliveryServer) handleLiveProgress(w http.ResponseWriter, r *http.Request) {
	progress, err := eds.db.GetLiveProgress()
	if err != nil {
		log.Printf("Failed to get live progress: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to get live progress")
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Live progress retrieved successfully",
		Data:    progress,
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle get participants
func (eds *ExamDeliveryServer) handleGetParticipants(w http.ResponseWriter, r *http.Request) {
	participants, err := eds.db.GetParticipants()
	if err != nil {
		log.Printf("Failed to get participants: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to get participants")
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Participants retrieved successfully",
		Data:    participants,
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Handle get delivery stats
func (eds *ExamDeliveryServer) handleGetDeliveryStats(w http.ResponseWriter, r *http.Request) {
	stats, err := eds.db.GetDeliveryStats()
	if err != nil {
		log.Printf("Failed to get delivery stats: %v", err)
		eds.respondError(w, http.StatusInternalServerError, "Failed to get delivery stats")
		return
	}

	response := APIResponse{
		Success: true,
		Message: "Delivery stats retrieved successfully",
		Data:    stats,
	}
	eds.respondJSON(w, http.StatusOK, response)
}

// Helper function to get participant progress by attempt ID
func (eds *ExamDeliveryServer) getParticipantProgress(attemptID int) (*ProgressData, error) {
	query := `
		SELECT p.questions_answered, p.total_questions, p.current_score, p.time_remaining, p.last_activity
		FROM progress p
		JOIN attempts a ON p.participant_id = a.participant_id
		WHERE a.id = ?
	`

	var progress ProgressData
	var lastActivity *time.Time
	err := eds.db.db.QueryRow(query, attemptID).Scan(
		&progress.QuestionsAnswered,
		&progress.TotalQuestions,
		&progress.CurrentScore,
		&progress.TimeRemaining,
		&lastActivity,
	)
	if err != nil {
		return nil, err
	}

	progress.LastActivity = lastActivity
	return &progress, nil
}

// Helper function to get participant progress by participant ID
func (eds *ExamDeliveryServer) getParticipantProgressByID(participantID int) (*ProgressData, error) {
	query := `
		SELECT questions_answered, total_questions, current_score, time_remaining, last_activity
		FROM progress 
		WHERE participant_id = ?
	`

	var progress ProgressData
	var lastActivity *time.Time
	err := eds.db.db.QueryRow(query, participantID).Scan(
		&progress.QuestionsAnswered,
		&progress.TotalQuestions,
		&progress.CurrentScore,
		&progress.TimeRemaining,
		&lastActivity,
	)
	if err != nil {
		return nil, err
	}

	progress.ParticipantID = participantID
	progress.LastActivity = lastActivity
	return &progress, nil
}

// Push event to coordinator
func (eds *ExamDeliveryServer) pushEventToCoordinator(eventType string, data map[string]interface{}) {
	event := map[string]interface{}{
		"event_type":  eventType,
		"delivery_id": eds.deliveryID,
		"client_id":   eds.clientID,
		"data":        data,
		"timestamp":   time.Now(),
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal event: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/internal/exam-clients/event", eds.coordinatorURL)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(eventJSON))
	if err != nil {
		log.Printf("Failed to push event to coordinator: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Event push failed with status: %d", resp.StatusCode)
	}
}

// Respond with JSON
func (eds *ExamDeliveryServer) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Respond with error
func (eds *ExamDeliveryServer) respondError(w http.ResponseWriter, status int, message string) {
	response := APIResponse{
		Success: false,
		Message: message,
	}
	eds.respondJSON(w, status, response)
}
