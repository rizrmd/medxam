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
	"github.com/medxamion/medxamion/internal/repository"
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

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	groupRepo := repository.NewGroupRepository(db)
	takerRepo := repository.NewTakerRepository(db)
	examRepo := repository.NewExamRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	itemRepo := repository.NewItemRepository(db)
	deliveryRepo := repository.NewDeliveryRepository(db)
	attemptRepo := repository.NewAttemptRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, sessionRepo, cfg)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(authService, cfg)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	userHandler := handlers.NewUserHandler(userRepo)
	groupHandler := handlers.NewGroupHandler(groupRepo)
	takerHandler := handlers.NewTakerHandler(takerRepo)
	examHandler := handlers.NewExamHandler(examRepo)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo)
	itemHandler := handlers.NewItemHandler(itemRepo)
	deliveryHandler := handlers.NewDeliveryHandler(deliveryRepo)
	attemptHandler := handlers.NewAttemptHandler(attemptRepo)

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

	// Create Huma API
	api := humachi.New(router, huma.DefaultConfig("IoNbEc API", "1.0.0"))

	// Configure API documentation
	api.OpenAPI().Info.Description = "National Orthopaedic and Traumatology Board Examination API"
	api.OpenAPI().Info.Contact = &huma.Contact{
		Name: "IoNbEc Team",
	}

	// Register handlers
	authHandler.Register(api)
	
	// Register protected handlers (they have their own auth checks in handlers)
	userHandler.Register(api)
	groupHandler.Register(api)
	takerHandler.Register(api)
	examHandler.Register(api)
	categoryHandler.Register(api)
	itemHandler.Register(api)
	deliveryHandler.Register(api)
	attemptHandler.Register(api)

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

	// Start server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %d", cfg.Port)
		log.Printf("API documentation available at: http://localhost:%d/docs", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}