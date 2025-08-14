# Milestone 1: Database Schema Inspection

## Date: 2025-08-11
## Status: Completed

## Database Connection
```
DATABASE_URL="postgres://postgres:6LP0Ojegy7IUU6kaX9lLkmZRUiAdAUNOltWyL3LegfYGR6rPQtB4DUSVqjdA78ES@107.155.75.50:5986/ionbec"
```

## Tables Discovered (32 total)

### Core Tables
1. **users** - System users (admins, scorers)
   - id, avatar, name, username, email, password, gender, profile info
   - Has roles via role_user table
   - Has permissions via permission_user table

2. **takers** - Exam candidates
   - id, name, reg (registration number), email, password, is_verified
   - Linked to groups via group_taker

3. **exams** - Exam definitions
   - id, code, name, description, options, is_mcq, is_interview, is_random
   - Links to items via exam_item

4. **deliveries** - Scheduled exam instances
   - id, exam_id, group_id, name, scheduled_at, duration, ended_at
   - Links exams to groups with scheduling

5. **groups** - Candidate groups
   - id, name, description, code, last_taker_code, closed_at
   - Contains takers via group_taker

6. **items** - Question sets/vignettes
   - id, title, content, type, is_vignette, is_random, score
   - Parent container for questions

7. **questions** - Individual questions
   - id, item_id, type, question, is_random, score, order
   - Belongs to items (question sets)

8. **categories** - Question categorization
   - id, type (disease_group, region_group, etc.), code, name, description
   - Links to items and questions

9. **attempts** - Exam attempts by candidates
   - id, attempted_by (taker_id), exam_id, delivery_id, started_at, ended_at
   - score, progress, penalty, finish_scoring

10. **answers** - Answer options for questions
    - Links to questions

### Relationship Tables
- role_user (users ↔ roles)
- permission_user (users ↔ permissions)
- permission_role (roles ↔ permissions)
- group_taker (groups ↔ takers)
- delivery_taker (deliveries ↔ takers)
- exam_item (exams ↔ items)
- category_item (categories ↔ items)
- category_question (categories ↔ questions)
- attempt_question (attempts ↔ questions)

### Supporting Tables
- clients (multi-tenancy support)
- sessions (user sessions)
- attachments & attachables (file uploads)
- activity_log (audit trail)
- migrations (database migrations)
- failed_jobs (queue management)
- password_resets
- personal_access_tokens

## Key Relationships Identified

1. **Exam Flow**:
   - Exam → has many Items (question sets)
   - Item → has many Questions
   - Question → has many Answers
   - Question → belongs to many Categories

2. **Delivery Flow**:
   - Delivery → belongs to Exam
   - Delivery → belongs to Group
   - Group → has many Takers
   - Taker → creates Attempt for Delivery

3. **Scoring Flow**:
   - Attempt → belongs to Taker, Exam, Delivery
   - Attempt → has many attempt_question records
   - Each attempt tracks score, progress, penalty

4. **User Management**:
   - Users → have Roles → have Permissions
   - Separate takers table for candidates
   - Multi-tenancy via client_id

## Database Features Used
- Soft deletes (deleted_at columns)
- Timestamps (created_at, updated_at)
- PostgreSQL enums (users_gender)
- Foreign key constraints
- Indexes on foreign keys
- Unique constraints

## Next Steps
- Create Go models matching these tables
- Implement sqlx repositories for data access
- Build API endpoints for each resource