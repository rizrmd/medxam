package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "Test123!"
	
	// Generate bcrypt hash
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("Error hashing password: %v\n", err)
		return
	}
	
	fmt.Println("Test Participant Credentials:")
	fmt.Println("=============================")
	fmt.Println("Registration Number: REG001")
	fmt.Println("Password: Test123!")
	fmt.Println("Test Code: TEST-CODE-001")
	fmt.Println()
	fmt.Println("Hashed Password for SQL:")
	fmt.Printf("%s\n", hashedPassword)
	fmt.Println()
	fmt.Println("SQL Command to create participant:")
	fmt.Printf(`
-- Create test participant
INSERT INTO takers (name, reg, email, password, is_verified, client_id, created_at, updated_at)
VALUES ('John Doe', 'REG001', 'john.doe@example.com', '%s', true, 2, NOW(), NOW())
ON CONFLICT (reg) DO UPDATE SET password = EXCLUDED.password, is_verified = true;

-- Create test group if not exists
INSERT INTO groups (name, description, code, last_taker_code, client_id, created_at, updated_at)
VALUES ('Test Group 2025', 'Group for testing', 'TEST-GROUP-2025', 1000, 2, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Add participant to group with test code
INSERT INTO group_taker (group_id, taker_id, code)
SELECT g.id, t.id, 'TEST-CODE-001'
FROM groups g, takers t
WHERE g.code = 'TEST-GROUP-2025' AND t.reg = 'REG001'
ON CONFLICT (group_id, taker_id) DO UPDATE SET code = 'TEST-CODE-001';
`, hashedPassword)
}