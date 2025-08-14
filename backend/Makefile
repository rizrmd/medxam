.PHONY: help build run test clean dev install-deps lint fmt vet migrate docker-build docker-run

APP_NAME := medxamion
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "1.0.0")
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
GO_FILES := $(shell find . -name '*.go' -type f -not -path "./vendor/*")

help: ## Display this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the application binary
	@echo "Building $(APP_NAME)..."
	@go build -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)" -o bin/$(APP_NAME) .
	@echo "Binary built: bin/$(APP_NAME)"

run: ## Run the application
	@echo "Running $(APP_NAME)..."
	@go run main.go

dev: ## Run the application with live reload (requires air)
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Installing air for live reload..."; \
		go install github.com/cosmtrek/air@latest; \
		air; \
	fi

test: ## Run tests
	@echo "Running tests..."
	@go test -v -race -cover ./...

test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	@go test -v -race -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

bench: ## Run benchmarks
	@echo "Running benchmarks..."
	@go test -bench=. -benchmem ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/ coverage.* *.out
	@go clean
	@echo "Clean complete"

install-deps: ## Install dependencies
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy
	@echo "Dependencies installed"

lint: ## Run linter (requires golangci-lint)
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run ./...; \
	else \
		echo "Installing golangci-lint..."; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
		golangci-lint run ./...; \
	fi

fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...
	@gofmt -s -w $(GO_FILES)
	@echo "Code formatted"

vet: ## Run go vet
	@echo "Running go vet..."
	@go vet ./...
	@echo "Vet complete"

mod-update: ## Update dependencies
	@echo "Updating dependencies..."
	@go get -u ./...
	@go mod tidy
	@echo "Dependencies updated"

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t $(APP_NAME):$(VERSION) -t $(APP_NAME):latest .
	@echo "Docker image built: $(APP_NAME):$(VERSION)"

docker-run: ## Run application in Docker
	@echo "Running Docker container..."
	@docker run -p 8080:8080 --rm --name $(APP_NAME) $(APP_NAME):latest

migrate: ## Run database migrations (placeholder)
	@echo "Running database migrations..."
	@echo "TODO: Implement database migrations"

seed: ## Seed database with test data (placeholder)
	@echo "Seeding database..."
	@echo "TODO: Implement database seeding"

setup: install-deps ## Initial project setup
	@echo "Setting up project..."
	@cp .env.example .env 2>/dev/null || echo "No .env.example found, skipping..."
	@echo "Project setup complete"

check: fmt vet lint test ## Run all checks (format, vet, lint, test)
	@echo "All checks passed!"