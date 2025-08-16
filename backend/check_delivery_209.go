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

	// Check delivery 209 details
	fmt.Println("Checking delivery 209 details...")
	var id int
	var name string
	var status sql.NullString
	var isFinished sql.NullBool
	err = db.QueryRow(`
		SELECT id, name, last_status, is_finished
		FROM deliveries
		WHERE id = 209
	`).Scan(&id, &name, &status, &isFinished)
	if err != nil {
		log.Fatal("Error fetching delivery:", err)
	}
	
	statusStr := "NULL"
	if status.Valid {
		statusStr = status.String
	}
	finishedStr := "NULL"
	if isFinished.Valid {
		finishedStr = fmt.Sprintf("%v", isFinished.Bool)
	}
	
	fmt.Printf("Delivery: ID=%d, Name=%s, Status=%s, IsFinished=%s\n\n", id, name, statusStr, finishedStr)

	// Check participants via delivery_taker
	fmt.Println("Checking participants via delivery_taker table...")
	rows, err := db.Query(`
		SELECT dt.taker_id, t.name, t.email, t.reg
		FROM delivery_taker dt
		JOIN takers t ON dt.taker_id = t.id
		WHERE dt.delivery_id = 209
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	participantCount := 0
	fmt.Println("Participants:")
	for rows.Next() {
		var takerId int
		var name, email, reg sql.NullString
		err := rows.Scan(&takerId, &name, &email, &reg)
		if err != nil {
			log.Printf("Error scanning participant: %v", err)
			continue
		}
		participantCount++
		nameStr := "NULL"
		if name.Valid {
			nameStr = name.String
		}
		emailStr := "NULL"
		if email.Valid {
			emailStr = email.String
		}
		regStr := "NULL"
		if reg.Valid {
			regStr = reg.String
		}
		fmt.Printf("  - ID: %d, Name: %s, Email: %s, Reg: %s\n", takerId, nameStr, emailStr, regStr)
	}
	fmt.Printf("\nTotal participants in delivery_taker: %d\n\n", participantCount)

	// Check attempts for this delivery
	fmt.Println("Checking attempts for delivery 209...")
	rows2, err := db.Query(`
		SELECT a.id, a.attempted_by, t.name, a.started_at, a.ended_at, a.score
		FROM attempts a
		LEFT JOIN takers t ON a.attempted_by = t.id
		WHERE a.delivery_id = 209
		ORDER BY a.id
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows2.Close()

	attemptCount := 0
	fmt.Println("Attempts:")
	for rows2.Next() {
		var attemptId, attemptedBy int
		var name sql.NullString
		var startedAt, endedAt sql.NullTime
		var score sql.NullFloat64
		err := rows2.Scan(&attemptId, &attemptedBy, &name, &startedAt, &endedAt, &score)
		if err != nil {
			log.Printf("Error scanning attempt: %v", err)
			continue
		}
		attemptCount++
		nameStr := "NULL"
		if name.Valid {
			nameStr = name.String
		}
		scoreStr := "NULL"
		if score.Valid {
			scoreStr = fmt.Sprintf("%.2f", score.Float64)
		}
		fmt.Printf("  - Attempt ID: %d, By: %d (%s), Score: %s\n", attemptId, attemptedBy, nameStr, scoreStr)
	}
	fmt.Printf("\nTotal attempts: %d\n", attemptCount)
}