-- Create a test participant with login credentials
-- Run this script to create a participant that can login for testing

-- Create a test participant (password is 'Test123!')
INSERT INTO takers (name, reg, email, password, is_verified, client_id, created_at, updated_at)
VALUES (
    'John Doe', 
    'REG001', 
    'john.doe@example.com', 
    '$2a$10$YourHashedPasswordHere', -- This should be the bcrypt hash of 'Test123!'
    true,  -- is_verified
    2,     -- client_id 
    NOW(), 
    NOW()
) ON CONFLICT (reg) DO NOTHING;

-- Get the participant ID
DO $$
DECLARE 
    taker_id_var INT;
    group_id_var INT;
BEGIN
    -- Get the taker ID
    SELECT id INTO taker_id_var FROM takers WHERE reg = 'REG001';
    
    -- Check if a test group exists, if not create one
    SELECT id INTO group_id_var FROM groups WHERE code = 'TEST-GROUP-2025';
    
    IF group_id_var IS NULL THEN
        INSERT INTO groups (name, description, code, last_taker_code, client_id, created_at, updated_at)
        VALUES (
            'Test Group 2025',
            'Group for testing participant login',
            'TEST-GROUP-2025',
            1000,
            2,
            NOW(),
            NOW()
        ) RETURNING id INTO group_id_var;
    END IF;
    
    -- Add participant to group with a test code
    INSERT INTO group_taker (group_id, taker_id, code)
    VALUES (group_id_var, taker_id_var, 'TEST-CODE-001')
    ON CONFLICT (group_id, taker_id) DO UPDATE SET code = 'TEST-CODE-001';
    
    -- Create a test exam if not exists
    INSERT INTO exams (name, exam_code, duration, question_count, client_id, created_at, updated_at)
    VALUES (
        'Sample Test Exam',
        'EXAM-001',
        120,  -- 2 hours
        50,   -- 50 questions
        2,
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Create a delivery for this group and exam
    INSERT INTO deliveries (exam_id, group_id, name, scheduled_at, duration, is_anytime, automatic_start, created_at, updated_at)
    SELECT 
        e.id,
        group_id_var,
        'Test Delivery 2025',
        NOW() + INTERVAL '1 day',
        120,
        true,  -- is_anytime
        true,  -- automatic_start
        NOW(),
        NOW()
    FROM exams e 
    WHERE e.exam_code = 'EXAM-001'
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Test participant created successfully!';
    RAISE NOTICE 'Registration Number: REG001';
    RAISE NOTICE 'Password: Test123! (you need to hash this)';
    RAISE NOTICE 'Test Code: TEST-CODE-001';
END $$;