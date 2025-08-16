package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgres://postgres:6LP0Ojegy7IUU6kaX9lLkmZRUiAdAUNOltWyL3LegfYGR6rPQtB4DUSVqjdA78ES@107.155.75.50:5986/ionbec?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Check attempt 3842 details
	fmt.Println("Checking attempt 3842 details...")
	
	// Get attempt answers
	rows, err := db.Query(`
		SELECT aq.id, aq.question_id, aq.answer, aq.score, aq.is_correct
		FROM attempt_question aq
		WHERE aq.attempt_id = 3842
		ORDER BY aq.question_id
		LIMIT 10
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("\nAttempt 3842 Questions and Answers:")
	fmt.Println("=====================================")
	
	for rows.Next() {
		var aqID, questionID int
		var answer string
		var score float64
		var isCorrect bool
		
		err := rows.Scan(&aqID, &questionID, &answer, &score, &isCorrect)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		
		fmt.Printf("\nQuestion ID: %d\n", questionID)
		fmt.Printf("Answer ID: %d\n", aqID)
		fmt.Printf("Participant Answer: %s\n", answer)
		fmt.Printf("Score: %.2f\n", score)
		fmt.Printf("Is Correct: %v\n", isCorrect)
		fmt.Println("---")
	}
}