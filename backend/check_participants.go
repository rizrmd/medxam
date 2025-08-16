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

	// Check delivery_taker table
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM delivery_taker").Scan(&count)
	if err != nil {
		log.Printf("Error counting delivery_taker: %v", err)
	} else {
		fmt.Printf("Total rows in delivery_taker: %d\n", count)
	}

	// Check participants per delivery
	rows, err := db.Query(`
		SELECT d.id, d.name, COUNT(DISTINCT dt.taker_id) as participant_count 
		FROM deliveries d 
		LEFT JOIN delivery_taker dt ON d.id = dt.delivery_id 
		GROUP BY d.id, d.name 
		ORDER BY d.id
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("\nDelivery Participants:")
	fmt.Println("ID | Name | Participants")
	fmt.Println("----------------------------")
	for rows.Next() {
		var id int
		var name string
		var participantCount int
		err := rows.Scan(&id, &name, &participantCount)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("%d | %s | %d\n", id, name, participantCount)
	}

	// Check if we're using group_taker instead
	err = db.QueryRow("SELECT COUNT(*) FROM group_taker").Scan(&count)
	if err != nil {
		log.Printf("Error counting group_taker: %v", err)
	} else {
		fmt.Printf("\nTotal rows in group_taker: %d\n", count)
	}

	// Check participants through group association
	rows2, err := db.Query(`
		SELECT d.id, d.name, COUNT(DISTINCT gt.taker_id) as participant_count 
		FROM deliveries d 
		LEFT JOIN group_taker gt ON d.group_id = gt.group_id 
		GROUP BY d.id, d.name 
		ORDER BY d.id
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows2.Close()

	fmt.Println("\nDelivery Participants (via group_taker):")
	fmt.Println("ID | Name | Participants")
	fmt.Println("----------------------------")
	for rows2.Next() {
		var id int
		var name string
		var participantCount int
		err := rows2.Scan(&id, &name, &participantCount)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("%d | %s | %d\n", id, name, participantCount)
	}
}