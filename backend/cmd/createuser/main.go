package main

import (
	"fmt"
	"log"
	"os"
	
	"github.com/joho/godotenv"
	"github.com/medxamion/medxamion/internal/config"
	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/models"
	"github.com/medxamion/medxamion/internal/repository"
	"github.com/medxamion/medxamion/internal/utils"
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

	// Initialize repository
	userRepo := repository.NewUserRepository(db)

	// Get username and password from command line args
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run main.go <username> <password>")
		fmt.Println("Example: go run main.go testuser password123")
		os.Exit(1)
	}

	username := os.Args[1]
	password := os.Args[2]

	// Check if user already exists
	existingUser, _ := userRepo.GetByUsername(username)
	if existingUser != nil {
		fmt.Printf("User '%s' already exists\n", username)
		os.Exit(1)
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Create new user
	user := &models.User{
		Name:     username,
		Username: username,
		Email:    fmt.Sprintf("%s@example.com", username),
		Password: hashedPassword,
		Gender:   models.GenderOther,
	}

	// Save user to database
	if err := userRepo.Create(user); err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("Successfully created user '%s' with ID %d\n", username, user.ID)
	fmt.Printf("You can now login with:\n")
	fmt.Printf("  Username: %s\n", username)
	fmt.Printf("  Password: %s\n", password)
}