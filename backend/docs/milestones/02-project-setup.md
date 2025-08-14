# Milestone 2: Project Setup with sqlx

## Date: 2025-08-11
## Status: In Progress

## Technology Stack Chosen
- **Web Framework**: Huma v2 (OpenAPI-first framework)
- **Router**: Chi v5
- **Database**: PostgreSQL with sqlx (not an ORM, direct SQL control)
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt
- **Configuration**: Environment variables with godotenv

## Project Structure Created
```
backend/
├── cmd/api/              # Application entry points
├── internal/             # Private application code
│   ├── config/          # Configuration management
│   ├── database/        # Database connection with sqlx
│   ├── models/          # Data structures
│   ├── repository/      # Data access layer (SQL queries)
│   ├── handlers/        # HTTP handlers (Huma)
│   ├── services/        # Business logic
│   ├── middleware/      # HTTP middleware
│   └── utils/           # Utility functions
├── migrations/          # SQL migration files
├── docs/
│   └── milestones/      # Progress documentation
├── .env                 # Environment variables
└── go.mod              # Go dependencies
```

## Files Created So Far

### 1. go.mod - Dependencies
```go
module github.com/ionbec/backend
go 1.21

Dependencies:
- huma/v2: OpenAPI-first web framework
- chi/v5: HTTP router
- sqlx: Database toolkit (not ORM)
- pq: PostgreSQL driver
- jwt: Authentication tokens
- bcrypt: Password hashing
- godotenv: Environment variables
- cors: CORS middleware
- httprate: Rate limiting
```

### 2. .env - Configuration
```
DATABASE_URL=postgres://...
JWT_SECRET=your-secret-key-change-this-in-production
PORT=8080
ENV=development
```

### 3. internal/config/config.go
- Loads environment variables
- Provides typed configuration struct

### 4. internal/database/db.go
- sqlx database connection wrapper
- Connection pooling configuration
- Ping test on startup

### 5. internal/models/common.go
- Shared types and interfaces
- Pagination structures
- Enums (Gender, QuestionType, CategoryType)
- Common embedded structs (Timestamps, SoftDelete)
- NullTime JSON marshaling

## Why sqlx Instead of ORM

User requested sqlx specifically. Benefits:
1. **Full SQL Control**: Write exact queries needed
2. **Performance**: No ORM overhead
3. **Transparency**: See exactly what SQL runs
4. **Complex Queries**: Easier to write complex joins
5. **Existing Schema**: Works well with pre-existing database

## Next Implementation Steps

1. ✅ Database inspection completed
2. ⏳ Project structure setup
3. 📝 Create all data models
4. 📝 Implement database repositories
5. 📝 Build authentication system
6. 📝 Create API handlers
7. 📝 Add middleware
8. 📝 Test endpoints

## Current Todo List
- Set up Go project structure with Huma framework (IN PROGRESS)
- Create database models matching PostgreSQL schema
- Implement database connection with sqlx
- Create repository layer with SQL queries
- Implement authentication endpoints
- Implement user management endpoints
- Implement delivery management endpoints
- Implement exam management endpoints
- Implement question category endpoints
- Implement question set endpoints
- Implement group management endpoints
- Implement candidate registration endpoints
- Implement scoring configuration endpoints
- Implement results management endpoints
- Set up middleware
- Test database connectivity