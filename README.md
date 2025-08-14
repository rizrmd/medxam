# MedXamion

National Orthopaedic and Traumatology Board Examination System

## Architecture

- **Backend**: Go API server with PostgreSQL database
- **Frontend**: React/TypeScript with Vite and Tailwind CSS

## Development Setup

### Prerequisites

- [mise](https://mise.jdx.dev/) - for managing Go version
- Node.js 18+ and npm
- PostgreSQL database (configured in backend/.env)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Go (using mise):
   ```bash
   mise install
   ```

3. Set up environment variables (already configured in `.env`)

4. Run the backend server:
   ```bash
   mise exec -- go run ./cmd/api
   ```
   
   The backend will start on port 8080
   - Health endpoint: http://localhost:8080/health
   - API documentation: http://localhost:8080/docs

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will start on http://localhost:5173 or http://localhost:5174 if 5173 is in use

## Development Notes

### Frontend-Backend Integration

The frontend is now properly connected to the backend API:

- **API Client**: `/frontend/src/lib/api.ts` - centralized API client with methods for all endpoints
- **Authentication**: `/frontend/src/store/authStore.ts` - updated to use real backend authentication
- **Proxy Configuration**: Vite development server proxies `/api/*` requests to the backend
- **Environment Variables**: Use `VITE_API_URL` to configure API URL in different environments

### API Endpoints

The backend exposes these main endpoints:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info
- `GET /api/health` - Health check
- Various CRUD endpoints for users, groups, exams, etc.

### Authentication Flow

1. User submits login form in frontend
2. Frontend calls API client login method
3. API client sends POST request to `/api/auth/login`
4. Backend validates credentials and creates session
5. Session cookie is automatically managed by browser
6. Subsequent API requests include session cookie for authentication

## Running Both Services

### Quick Start (Recommended)

Use the provided scripts to run both services:

```bash
# Simple method - runs both services in one terminal
./start-dev.sh

# Or with tmux for better process management
./start-dev-tmux.sh

# Stop all services
./stop-dev.sh
```

### Using npm scripts

```bash
# Start both services
npm run dev

# Start with tmux
npm run dev:tmux

# Stop all services
npm run stop

# Run individual services
npm run backend   # Start backend only
npm run frontend  # Start frontend only
```

### Manual Start

If you prefer to run services separately:

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   mise exec -- go run ./cmd/api
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

### Access Application

- Frontend: http://localhost:5173 or http://localhost:5174
- Backend API: http://localhost:8080
- API Docs: http://localhost:8080/docs

## Testing the Integration

You can test the API integration using curl:

```bash
# Test backend health
curl http://localhost:8080/health

# Test frontend proxy to backend
curl http://localhost:5174/api/health

# Test login (with proper password validation)
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}' \
  http://localhost:5174/api/auth/login
```

The frontend and backend are now fully integrated and ready for development.