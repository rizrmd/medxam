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

	// Check Test Agustus delivery details
	rows, err := db.Query(`
		SELECT d.id, d.name, d.last_status, d.is_finished, d.scheduled_at, 
		       COUNT(DISTINCT dt.taker_id) as participant_count
		FROM deliveries d 
		LEFT JOIN delivery_taker dt ON d.id = dt.delivery_id 
		WHERE d.name LIKE '%Test Agustus%' OR d.name LIKE '%test%agustus%'
		GROUP BY d.id, d.name, d.last_status, d.is_finished, d.scheduled_at
		ORDER BY d.id
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Test Agustus Delivery Details:")
	fmt.Println("ID | Name | Status | Is Finished | Scheduled At | Participants")
	fmt.Println("--------------------------------------------------------------")
	for rows.Next() {
		var id int
		var name string
		var status sql.NullString
		var isFinished sql.NullBool
		var scheduledAt sql.NullTime
		var participantCount int
		err := rows.Scan(&id, &name, &status, &isFinished, &scheduledAt, &participantCount)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		statusStr := "NULL"
		if status.Valid {
			statusStr = status.String
		}
		finishedStr := "NULL"
		if isFinished.Valid {
			finishedStr = fmt.Sprintf("%v", isFinished.Bool)
		}
		scheduledStr := "NULL"
		if scheduledAt.Valid {
			scheduledStr = scheduledAt.Time.Format("2006-01-02 15:04:05")
		}
		fmt.Printf("%d | %s | %s | %s | %s | %d\n", id, name, statusStr, finishedStr, scheduledStr, participantCount)
	}

	// Check all deliveries with status=finished or is_finished=true
	fmt.Println("\n\nDeliveries with status='finished' or is_finished=true:")
	rows2, err := db.Query(`
		SELECT d.id, d.name, d.last_status, d.is_finished, 
		       COUNT(DISTINCT dt.taker_id) as participant_count
		FROM deliveries d 
		LEFT JOIN delivery_taker dt ON d.id = dt.delivery_id 
		WHERE d.last_status = 'finished' OR d.is_finished = true
		GROUP BY d.id, d.name, d.last_status, d.is_finished
		ORDER BY d.id DESC
		LIMIT 10
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows2.Close()

	fmt.Println("ID | Name | Status | Is Finished | Participants")
	fmt.Println("--------------------------------------------------")
	for rows2.Next() {
		var id int
		var name string
		var status sql.NullString
		var isFinished sql.NullBool
		var participantCount int
		err := rows2.Scan(&id, &name, &status, &isFinished, &participantCount)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		statusStr := "NULL"
		if status.Valid {
			statusStr = status.String
		}
		finishedStr := "NULL"
		if isFinished.Valid {
			finishedStr = fmt.Sprintf("%v", isFinished.Bool)
		}
		fmt.Printf("%d | %s | %s | %s | %d\n", id, name, statusStr, finishedStr, participantCount)
	}
}