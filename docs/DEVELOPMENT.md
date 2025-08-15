# Development Setup

## Hot Reloading

The development environment now includes automated hot reloading for both frontend and backend:

### Frontend (Vite HMR)
- **Technology**: Vite Hot Module Replacement
- **Watches**: `frontend/src/**/*` files
- **Auto-reloads**: On TypeScript, React, CSS changes

### Backend (Air Hot Reload)
- **Technology**: Air (cosmtrek/air)
- **Watches**: `backend/**/*.go` files
- **Auto-reloads**: On Go source code changes
- **Build target**: `cmd/api`

## Starting Development

```bash
# Start both servers with hot reload
bun dev
```

This will start:
- Frontend: http://localhost:5173 (with Vite HMR)
- Backend: http://localhost:8080 (with Air hot reload)
- API Docs: http://localhost:8080/docs

## What Happens on File Changes

### Backend Changes
1. Air detects `.go` file changes
2. Automatically rebuilds `cmd/api`
3. Restarts the server
4. Updates visible in console with 🔄 indicators

### Frontend Changes  
1. Vite detects source file changes
2. Hot replaces modules in browser
3. No page refresh needed for most changes

## Configuration Files

- **Air**: `backend/.air.toml`
- **Vite**: `frontend/vite.config.ts`
- **Dev Script**: `scripts/dev.mjs`

## Troubleshooting

If hot reload isn't working:

1. **Check Air installation**: `which air`
2. **Check file permissions**: Ensure files are writable
3. **Check exclusions**: Review `.air.toml` exclude patterns
4. **Manual restart**: Stop and restart `bun dev`