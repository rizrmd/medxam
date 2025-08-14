# Milestone 3: Authentication Strategy - Single Session

## Date: 2025-08-11
## Status: Planning

## Authentication Requirements
- **Session-based authentication** (not JWT)
- **Single session per user** - logging in from a new device/browser invalidates previous session
- Use existing `sessions` table in database
- Session stored in database, session ID in cookie

## Database Schema for Sessions
```sql
-- Existing sessions table structure
sessions:
  - id (session identifier)
  - user_id (references users table)
  - ip_address
  - user_agent
  - payload (session data)
  - last_activity
  - created_at
  - updated_at
```

## Authentication Flow

### 1. Login Process
```
1. User submits username/password
2. Validate credentials against users table
3. Check if user has existing session:
   - If yes: Delete old session from database
4. Generate new session ID (UUID or secure random)
5. Store session in database with:
   - session_id
   - user_id
   - ip_address
   - user_agent
   - last_activity (current time)
6. Set session cookie with:
   - HttpOnly: true (prevent JS access)
   - Secure: true (HTTPS only in production)
   - SameSite: Strict
   - Path: /
7. Return success response
```

### 2. Session Validation Middleware
```
1. Extract session ID from cookie
2. Query database for valid session:
   SELECT * FROM sessions WHERE id = ? AND last_activity > NOW() - INTERVAL '24 hours'
3. If session found:
   - Update last_activity timestamp
   - Load user data
   - Attach to request context
4. If no valid session:
   - Return 401 Unauthorized
   - Clear session cookie
```

### 3. Logout Process
```
1. Get session ID from cookie
2. Delete session from database
3. Clear session cookie
4. Return success response
```

### 4. Session Cleanup
```
- Periodic cleanup job to remove expired sessions
- Sessions expire after 24 hours of inactivity
- Can be configured via environment variable
```

## Implementation Files Needed

### 1. internal/models/session.go
```go
type Session struct {
    ID           string    `db:"id"`
    UserID       int       `db:"user_id"`
    IPAddress    string    `db:"ip_address"`
    UserAgent    string    `db:"user_agent"`
    Payload      string    `db:"payload"`
    LastActivity time.Time `db:"last_activity"`
    CreatedAt    time.Time `db:"created_at"`
    UpdatedAt    time.Time `db:"updated_at"`
}
```

### 2. internal/repository/session_repo.go
- CreateSession(session *Session) error
- GetSession(sessionID string) (*Session, error)
- UpdateLastActivity(sessionID string) error
- DeleteSession(sessionID string) error
- DeleteUserSessions(userID int) error
- CleanupExpiredSessions() error

### 3. internal/services/auth_service.go
- Login(username, password string) (*Session, error)
- Logout(sessionID string) error
- ValidateSession(sessionID string) (*User, error)

### 4. internal/middleware/session.go
- SessionMiddleware() - validates session on each request
- RequireAuth() - ensures user is authenticated
- RequireRole(roles ...string) - role-based access control

### 5. internal/handlers/auth.go
- POST /api/login - create new session
- POST /api/logout - destroy session
- GET /api/me - get current user info

## Security Considerations

1. **Session Hijacking Prevention**:
   - Bind session to IP address (optional, may cause issues with mobile)
   - Bind session to User-Agent
   - Use secure random session IDs
   - Regenerate session ID on privilege escalation

2. **Cookie Security**:
   - HttpOnly flag prevents XSS attacks
   - Secure flag ensures HTTPS only
   - SameSite prevents CSRF attacks

3. **Session Expiration**:
   - Absolute timeout (e.g., 24 hours)
   - Idle timeout (e.g., 2 hours of inactivity)
   - Configurable via environment variables

4. **Single Session Enforcement**:
   - On login, delete all existing sessions for user
   - Prevents concurrent sessions
   - User aware when logged out from another device

## Environment Variables
```
SESSION_LIFETIME=24h        # Absolute session lifetime
SESSION_IDLE_TIMEOUT=2h     # Idle timeout
SESSION_COOKIE_NAME=ionbec_session
SESSION_COOKIE_DOMAIN=
SESSION_COOKIE_SECURE=true  # Set false for local development
```

## Benefits of This Approach
1. **Security**: One session per user prevents session sharing
2. **Simplicity**: No JWT complexity, direct database lookups
3. **Control**: Easy to revoke sessions immediately
4. **Audit**: Can track all login activity
5. **Existing Infrastructure**: Uses existing sessions table

## Migration from JWT to Sessions
Since the initial plan mentioned JWT, we're now switching to sessions:
- Remove JWT dependencies
- Add session management code
- Update middleware to use sessions
- Modify login/logout endpoints