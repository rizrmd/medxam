package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/medxamion/medxamion/internal/services"
)

func main() {
	// Command line flags
	var (
		coordinatorURL = flag.String("coordinator", "http://localhost:8080", "Coordinator server URL")
		maxDeliveries  = flag.Int("max-deliveries", 0, "Maximum concurrent deliveries (0 = unlimited)")
		envFile        = flag.String("env", ".env", "Environment file path")
	)
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(*envFile); err != nil {
		log.Printf("Warning: env file not found: %v", err)
	}

	// Override with environment variables if set
	if envCoordinator := os.Getenv("COORDINATOR_URL"); envCoordinator != "" {
		*coordinatorURL = envCoordinator
	}
	if envMaxDeliveries := os.Getenv("MAX_DELIVERIES"); envMaxDeliveries != "" {
		if parsed, err := strconv.Atoi(envMaxDeliveries); err == nil {
			*maxDeliveries = parsed
		} else {
			log.Printf("Warning: invalid MAX_DELIVERIES value '%s', using default", envMaxDeliveries)
		}
	}

	log.Printf("Starting exam-client...")
	log.Printf("Coordinator: %s", *coordinatorURL)
	if *maxDeliveries == 0 {
		log.Printf("Max deliveries: unlimited")
	} else {
		log.Printf("Max deliveries: %d", *maxDeliveries)
	}

	// Create exam client service
	examClient := services.NewExamClientService(*coordinatorURL, *maxDeliveries)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start exam client in goroutine
	go func() {
		if err := examClient.Start(ctx); err != nil {
			log.Fatalf("Exam client failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down exam-client...")

	// Stop exam client
	examClient.Stop()
	cancel()

	log.Println("Exam-client stopped")
}
