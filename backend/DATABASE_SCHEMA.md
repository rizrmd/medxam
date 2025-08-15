# MedXamion Database Schema Reference

**IMPORTANT**: This document maps the actual database table names to prevent naming confusion in the Go code.

## Table Name Mappings

The Go code expects certain table names that differ from the actual database schema. Use this reference when writing SQL queries:

| Go Code Expects | Actual Database Table | Notes |
|----------------|----------------------|-------|
| `participants` | `takers` | ❌ **USE `takers`** |
| `participant_groups` | `group_taker` | ❌ **USE `group_taker`** |
| `attempts` | `attempts` | ✅ Matches |
| `attempt_answers` | `attempt_question` | ❌ **USE `attempt_question`** |
| `exam_items` | `exam_item` | ❌ **USE `exam_item`** (singular) |

## Key Column Mappings

### Takers (Participants)
```sql
-- Actual table structure with NULL handling
SELECT id, name, COALESCE(email, '') as email, COALESCE(reg, '') as identifier FROM takers;
```
- `reg` field maps to `identifier` in Go structs
- Foreign key references use `taker_id`, not `participant_id`
- **IMPORTANT**: Use `COALESCE()` for nullable columns (email, reg) to prevent scan errors

### Group Relationships
```sql
-- Junction table for taker-group relationships
SELECT * FROM group_taker WHERE taker_id = ? AND group_id = ?;
```

### Attempts
```sql
-- Attempts reference takers via attempted_by column
SELECT * FROM attempts WHERE attempted_by = taker_id AND delivery_id = ?;
```

### Question Answers
```sql
-- Question answers are stored in attempt_question table
SELECT COUNT(*) FROM attempt_question WHERE attempt_id = ?;
```

### Exam Items
```sql
-- Exam items junction (singular table name)
SELECT COUNT(*) FROM exam_item WHERE exam_id = ?;
```

## Fixed Query Example

The `GetParticipantProgress` function has been corrected to use proper table names:

```sql
SELECT 
    p.id, p.name, p.email, p.reg as identifier,
    a.id, a.started_at, a.ended_at, a.updated_at,
    COALESCE(
        (SELECT COUNT(*) FROM attempt_question aa WHERE aa.attempt_id = a.id), 
        0
    ) as questions_answered,
    COALESCE(
        (SELECT COUNT(*) FROM exam_item ei 
         JOIN exams e ON e.id = ei.exam_id 
         JOIN deliveries d ON d.exam_id = e.id 
         WHERE d.id = $1), 
        0
    ) as total_questions,
    CASE 
        WHEN a.ended_at IS NOT NULL THEN 'completed'
        WHEN a.started_at IS NOT NULL AND a.ended_at IS NULL THEN 'in_progress'
        WHEN a.started_at IS NOT NULL AND a.updated_at < NOW() - INTERVAL '30 minutes' THEN 'abandoned'
        ELSE 'not_started'
    END as status
FROM takers p
JOIN groups g ON g.id = (SELECT group_id FROM deliveries WHERE id = $1)
JOIN group_taker pg ON pg.group_id = g.id AND pg.taker_id = p.id
LEFT JOIN attempts a ON a.attempted_by = p.id AND a.delivery_id = $1
ORDER BY p.name
```

## Database Connection Details

- **Host**: 107.155.75.50:5986
- **Database**: ionbec
- **Schema**: public
- **Total Tables**: 34

## Common Errors to Avoid

1. ❌ `relation "participants" does not exist` → Use `takers`
2. ❌ `column "participant_id" does not exist` → Use `taker_id`
3. ❌ `relation "attempt_answers" does not exist` → Use `attempt_question`
4. ❌ `relation "exam_items" does not exist` → Use `exam_item`
5. ❌ `converting NULL to string is unsupported` → Use `COALESCE(column, '')` for nullable columns

---
**Last Updated**: 2025-08-15
**Fixed In**: `/backend/internal/models/delivery.go` - `GetParticipantProgress()` function