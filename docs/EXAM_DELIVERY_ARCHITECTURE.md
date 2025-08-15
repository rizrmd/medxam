# Exam Delivery Architecture

## Overview

The MedXamion exam delivery system uses a distributed architecture where exam-client services handle real-time exam delivery using local SQLite databases, while the main coordinator provides management and live monitoring capabilities.

## System Components

### 1. Coordinator (Main Backend API)
- **Technology**: Go + Huma v2 + PostgreSQL
- **Port**: 8080
- **Responsibilities**:
  - Exam and delivery management
  - User authentication and authorization
  - Committee/scorer dashboards
  - WebSocket hub for real-time updates
  - Final data storage and historical queries
  - Exam-client orchestration

### 2. Exam-Client Service
- **Technology**: Go + Local SQLite
- **Ports**: 8235+ (unique per delivery)
- **Responsibilities**:
  - Serve exam content to participants
  - Handle answer submissions in real-time
  - Track participant progress locally
  - Calculate scores immediately
  - Push events to coordinator
  - Provide live progress API
  - Transfer final results to coordinator

### 3. WebSocket Hub
- **Purpose**: Real-time updates for committee dashboards
- **Event-Driven**: No database polling
- **Sources**: Exam-client events + live progress queries

## Data Flow Architecture

```
┌─────────────────┐
│   Committee     │
│   Dashboard     │◄──── WebSocket ────┐
└─────────────────┘                    │
                                       │
                                       ▼
                            ┌──────────────────┐
                            │   Coordinator    │
                            │ (Main Backend)   │
                            │                  │
                            │ - WebSocket Hub  │
                            │ - Live Progress  │◄─── Query Live Data
                            │ - Final Storage  │
                            └──────────────────┘
                                       │
                                       │ Events + Final Transfer
                                       ▼
┌─────────────────┐         ┌──────────────────┐
│   Participant   │────────►│   Exam-Client    │
│   Takes Exam    │         │  (Delivery Host) │
└─────────────────┘         │                  │
                            │ - Local SQLite   │
                            │ - Serves Exam    │
                            │ - Live Progress  │
                            │ - Push Events    │
                            └──────────────────┘
                                       │
                                       │ Final Transfer
                                       ▼
                            ┌──────────────────┐
                            │   PostgreSQL     │
                            │ (Permanent Store)│
                            └──────────────────┘
```

## Database Strategy

### During Exam Delivery

#### Exam-Client Local SQLite
Each active delivery uses its own SQLite database:

```sql
-- File: delivery_{id}_{timestamp}.db

CREATE TABLE participants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    identifier TEXT NOT NULL,
    status TEXT DEFAULT 'not_started'
);

CREATE TABLE attempts (
    id INTEGER PRIMARY KEY,
    participant_id INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    current_question INTEGER DEFAULT 1,
    status TEXT DEFAULT 'in_progress',
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE TABLE answers (
    id INTEGER PRIMARY KEY,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);

CREATE TABLE progress (
    participant_id INTEGER PRIMARY KEY,
    questions_answered INTEGER DEFAULT 0,
    total_questions INTEGER NOT NULL,
    current_score INTEGER DEFAULT 0,
    time_remaining INTEGER,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);
```

#### Benefits of Local SQLite
- **Performance**: No network latency during exam
- **Reliability**: Works during network issues
- **Real-time**: Instant local updates
- **Isolation**: Each delivery is independent

### After Exam Completion

All SQLite data is transferred to PostgreSQL for permanent storage and historical analysis.

## API Endpoints

### Exam-Client APIs

#### Participant Exam Interface
```
GET  /exam/start                 - Initialize participant session
GET  /exam/question/{id}         - Get specific question
POST /exam/answer                - Submit answer
GET  /exam/progress              - Current progress
POST /exam/complete              - Finish exam
```

#### Live Progress API (for Coordinator)
```
GET /api/progress               - Current participant progress
GET /api/participants           - List all participants with status
GET /api/delivery-stats         - Aggregated delivery statistics
```

### Coordinator APIs

#### Live Progress Access
```
GET /api/deliveries/{id}/live-progress     - Query exam-client for live data
```

#### Event Receiving
```
POST /api/internal/exam-clients/event      - Receive real-time events
```

#### Final Data Transfer
```
POST /api/internal/exam-clients/{id}/final-results  - Complete data transfer
```

## Event-Driven Updates

### Event Types
Exam-client pushes these events to coordinator:

```json
{
  "event_type": "participant_started",
  "delivery_id": 123,
  "participant_id": 456,
  "timestamp": "2025-01-15T10:30:00Z"
}

{
  "event_type": "answer_submitted",
  "delivery_id": 123,
  "participant_id": 456,
  "progress": {
    "questions_answered": 15,
    "total_questions": 50,
    "current_score": 80,
    "time_remaining": 3600
  },
  "timestamp": "2025-01-15T10:30:00Z"
}

{
  "event_type": "participant_completed",
  "delivery_id": 123,
  "participant_id": 456,
  "final_score": 85,
  "timestamp": "2025-01-15T10:35:00Z"
}
```

### WebSocket Broadcasting
1. Exam-client pushes event → Coordinator receives
2. Coordinator triggers immediate WebSocket broadcast
3. Committee dashboards receive real-time updates
4. No database polling required

## Live Progress Query Flow

### For Active Deliveries
```
Committee Dashboard Request
         ↓
    Coordinator
         ↓
Query Exam-Client Live API
         ↓
Return Real-time Data
```

### For Completed Deliveries
```
Committee Dashboard Request
         ↓
    Coordinator
         ↓
Query PostgreSQL Historical Data
         ↓
Return Final Results
```

### Fallback Strategy
- If exam-client unreachable → Return last known state
- If delivery completed → Query PostgreSQL
- Cache live data briefly to reduce load

## Lifecycle Management

### 1. Delivery Assignment
1. Coordinator assigns delivery to exam-client
2. Exam-client creates local SQLite database
3. Exam-client downloads exam content and caches locally

### 2. During Exam
1. Participants access exam via exam-client
2. All operations use local SQLite for speed
3. Exam-client pushes events to coordinator
4. Committee monitors via live progress queries
5. WebSocket provides real-time updates

### 3. Exam Completion
1. Exam-client finalizes all participant data
2. Complete data export from SQLite to JSON
3. Transfer all data to coordinator
4. Coordinator validates and stores in PostgreSQL
5. Exam-client deletes local SQLite file

## Performance Characteristics

### During Exam
- **Participant Operations**: < 10ms (local SQLite)
- **Live Progress Queries**: < 100ms (exam-client → coordinator)
- **WebSocket Updates**: < 50ms (event-driven)

### Data Transfer
- **Real-time Events**: Immediate (< 100ms)
- **Final Transfer**: Batched, validated transfer
- **Cleanup**: Automatic after successful transfer

## Scalability

### Horizontal Scaling
- Multiple exam-client instances can run on different servers
- Each handles independent deliveries
- Coordinator orchestrates all exam-clients

### Load Distribution
- Exam content served from exam-client (not coordinator)
- Local SQLite eliminates database bottlenecks
- Event pushing reduces coordinator load

## Error Handling

### Network Issues
- Exam continues with local SQLite
- Events queued for later delivery
- Automatic reconnection and retry

### Exam-Client Failure
- Coordinator detects via health checks
- Can restart exam-client with SQLite recovery
- Participants can resume from last state

### Data Consistency
- Atomic final transfer process
- Validation before SQLite cleanup
- Rollback capability if transfer fails

## Security Considerations

### Exam Content Protection
- Exam data cached locally during delivery only
- Automatic cleanup after completion
- No persistent storage of exam content

### Participant Data
- Encrypted SQLite databases
- Secure transfer to coordinator
- Audit trail for all operations

### Access Control
- Participant authentication via coordinator
- Committee access through role-based permissions
- Exam-client validates participant tokens