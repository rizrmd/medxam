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

	// Get columns for takers table
	fmt.Println("Columns in takers table:")
	rows, err := db.Query(`
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_name = 'takers' 
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var columnName, dataType string
		err := rows.Scan(&columnName, &dataType)
		if err != nil {
			log.Printf("Error scanning: %v", err)
			continue
		}
		fmt.Printf("  - %s (%s)\n", columnName, dataType)
	}
}