package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"

	"github.com/medxamion/medxamion/internal/config"
	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/handlers"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Successfully connected to database")

	// Initialize models
	userModel := models.NewUserModel(db)
	sessionModel := models.NewSessionModel(db)
	groupModel := models.NewGroupModel(db)
	participantModel := models.NewParticipantModel(db)
	examModel := models.NewExamModel(db)
	categoryModel := models.NewCategoryModel(db)
	itemModel := models.NewItemModel(db)
	deliveryModel := models.NewDeliveryModel(db)
	attemptModel := models.NewAttemptModel(db)
	deliveryAssignmentModel := models.NewDeliveryAssignmentModel(db)

	// Initialize handlers first
	examClientHandler := handlers.NewExamClientHandler()

	// Initialize services
	authService := services.NewAuthService(userModel, sessionModel, cfg)
	schedulerService := services.NewSchedulerService(deliveryModel, examClientHandler)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(authService, cfg)

	// Initialize other handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	userHandler := handlers.NewUserHandler(userModel)
	groupHandler := handlers.NewGroupHandler(groupModel)
	participantHandler := handlers.NewParticipantHandler(participantModel)
	examHandler := handlers.NewExamHandler(examModel)
	categoryHandler := handlers.NewCategoryHandler(categoryModel)
	itemHandler := handlers.NewItemHandler(itemModel)
	deliveryHandler := handlers.NewDeliveryHandler(deliveryModel)
	attemptHandler := handlers.NewAttemptHandler(attemptModel)
	deliveryAssignmentHandler := handlers.NewDeliveryAssignmentHandler(deliveryAssignmentModel, deliveryModel)

	// Initialize WebSocket hub
	wsHub := handlers.NewWebSocketHub(deliveryModel)
	wsHub.StartPeriodicUpdates()

	// Initialize live progress handler
	examClientLiveHandler := handlers.NewExamClientLiveHandler(deliveryModel, wsHub)

	// Setup router
	router := chi.NewRouter()

	// Setup CORS
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Configure properly for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Rate limiting
	router.Use(httprate.LimitByIP(100, 1*time.Minute))

	// Session middleware (applies to all routes)
	router.Use(authMiddleware.SessionMiddleware())

	// WebSocket endpoint (before Huma API to avoid middleware conflicts)
	router.HandleFunc("/api/deliveries/{id}/ws", wsHub.ServeWS)

	// Create Huma API
	api := humachi.New(router, huma.DefaultConfig("MedXam API", "1.0.0"))

	// Configure API documentation
	api.OpenAPI().Info.Description = "National Orthopaedic and Traumatology Board Examination API"
	api.OpenAPI().Info.Contact = &huma.Contact{
		Name: "MedXam Team",
	}

	// Register handlers
	authHandler.Register(api)

	// Register protected handlers (they have their own auth checks in handlers)
	userHandler.Register(api)
	groupHandler.Register(api)
	participantHandler.Register(api)
	examHandler.Register(api)
	categoryHandler.Register(api)
	itemHandler.Register(api)
	deliveryHandler.Register(api)
	attemptHandler.Register(api)
	examClientHandler.Register(api)
	deliveryAssignmentHandler.Register(api)
	examClientLiveHandler.Register(api)

	// Health check endpoint
	huma.Register(api, huma.Operation{
		OperationID: "health",
		Method:      http.MethodGet,
		Path:        "/health",
		Summary:     "Health check",
		Description: "Check if the API is running and database is accessible.",
		Tags:        []string{"System"},
	}, func(ctx context.Context, input *struct{}) (*struct {
		Body struct {
			Status   string    `json:"status"`
			Database string    `json:"database"`
			Time     time.Time `json:"time"`
		} `json:"body"`
	}, error) {
		// Test database connectivity
		dbStatus := "ok"
		if err := db.Ping(); err != nil {
			dbStatus = "error"
		}

		return &struct {
			Body struct {
				Status   string    `json:"status"`
				Database string    `json:"database"`
				Time     time.Time `json:"time"`
			} `json:"body"`
		}{
			Body: struct {
				Status   string    `json:"status"`
				Database string    `json:"database"`
				Time     time.Time `json:"time"`
			}{
				Status:   "ok",
				Database: dbStatus,
				Time:     time.Now(),
			},
		}, nil
	})

	// Start session cleanup goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if err := authService.CleanupExpiredSessions(); err != nil {
				log.Printf("Failed to cleanup expired sessions: %v", err)
			}
		}
	}()

	// Start delivery scheduler service
	schedulerCtx, cancelScheduler := context.WithCancel(context.Background())
	defer cancelScheduler()

	go func() {
		log.Println("Starting delivery scheduler service...")
		schedulerService.Start(schedulerCtx)
	}()

	// Start server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to signal when server is ready
	serverReady := make(chan struct{})

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %d", cfg.Port)
		log.Printf("API documentation available at: http://localhost:%d/docs", cfg.Port)

		// Signal that we're about to start listening
		close(serverReady)

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for server to be ready, then start built-in exam-client
	<-serverReady

	// Give the server a moment to actually start accepting connections
	time.Sleep(100 * time.Millisecond)

	builtinExamClient := services.NewExamClientService("http://localhost:8080", 0) // Built-in client with unlimited capacity
	builtinCtx, cancelBuiltinClient := context.WithCancel(context.Background())
	defer cancelBuiltinClient()

	go func() {
		log.Println("Starting built-in exam-client...")
		if err := builtinExamClient.Start(builtinCtx); err != nil {
			log.Printf("Built-in exam-client error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Stop services
	log.Println("Stopping built-in exam-client...")
	cancelBuiltinClient()
	builtinExamClient.Stop()

	log.Println("Stopping delivery scheduler service...")
	cancelScheduler()
	schedulerService.Stop()

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
