package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../backend/.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("Connected to database successfully!")
	fmt.Println("===========================================")

	// Query participants
	fmt.Println("PARTICIPANTS:")
	rows, err := db.Query("SELECT id, name, reg, email, is_verified FROM takers ORDER BY id LIMIT 10")
	if err != nil {
		log.Fatalf("Failed to query participants: %v", err)
	}
	defer rows.Close()

	participantCount := 0
	for rows.Next() {
		var id int
		var name, reg, email string
		var isVerified bool
		
		if err := rows.Scan(&id, &name, &reg, &email, &isVerified); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		
		fmt.Printf("ID: %d, Name: %s, Reg: %s, Email: %s, Verified: %t\n", 
			id, name, reg, email, isVerified)
		participantCount++
	}

	if participantCount == 0 {
		fmt.Println("No participants found.")
	}

	fmt.Println("\n===========================================")

	// Query groups
	fmt.Println("GROUPS:")
	rows2, err := db.Query("SELECT id, name, code FROM groups ORDER BY id LIMIT 10")
	if err != nil {
		log.Fatalf("Failed to query groups: %v", err)
	}
	defer rows2.Close()

	groupCount := 0
	for rows2.Next() {
		var id int
		var name string
		var code *string
		
		if err := rows2.Scan(&id, &name, &code); err != nil {
			log.Printf("Error scanning group row: %v", err)
			continue
		}
		
		codeStr := "NULL"
		if code != nil {
			codeStr = *code
		}
		fmt.Printf("ID: %d, Name: %s, Code: %s\n", id, name, codeStr)
		groupCount++
	}

	if groupCount == 0 {
		fmt.Println("No groups found.")
	}

	fmt.Println("\n===========================================")

	// Check group_taker table structure first
	fmt.Println("GROUP_TAKER table structure:")
	rows3, err := db.Query(`
		SELECT column_name, data_type, is_nullable 
		FROM information_schema.columns 
		WHERE table_name = 'group_taker' 
		ORDER BY ordinal_position`)
	if err != nil {
		log.Printf("Failed to query table structure: %v", err)
	} else {
		defer rows3.Close()
		fmt.Println("Columns:")
		for rows3.Next() {
			var colName, dataType, nullable string
			if err := rows3.Scan(&colName, &dataType, &nullable); err == nil {
				fmt.Printf("  - %s (%s, nullable: %s)\n", colName, dataType, nullable)
			}
		}
	}

	// Query existing test codes using correct column name
	fmt.Println("\nEXISTING TEST CODES:")
	rows4, err := db.Query(`
		SELECT gt.taker_code, t.name, t.reg, g.name as group_name
		FROM group_taker gt
		JOIN takers t ON gt.taker_id = t.id
		JOIN groups g ON gt.group_id = g.id
		WHERE gt.taker_code IS NOT NULL AND gt.taker_code != ''
		ORDER BY gt.taker_code
		LIMIT 20`)
	if err != nil {
		log.Printf("Failed to query test codes: %v", err)
	} else {
		defer rows4.Close()
		testCodeCount := 0
		for rows4.Next() {
			var takerCode, participantName, participantReg, groupName string
			
			if err := rows4.Scan(&takerCode, &participantName, &participantReg, &groupName); err != nil {
				log.Printf("Error scanning test code row: %v", err)
				continue
			}
			
			fmt.Printf("Test Code: %s | Participant: %s (%s) | Group: %s\n", 
				takerCode, participantName, participantReg, groupName)
			testCodeCount++
		}
		
		if testCodeCount == 0 {
			fmt.Println("No test codes found.")
		} else {
			fmt.Printf("Found %d participants with test codes\n", testCodeCount)
		}
	}

	fmt.Printf("\nSummary: %d participants, %d groups found\n", 
		participantCount, groupCount)
}