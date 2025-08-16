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

	// List all tables related to participants/takers
	fmt.Println("Tables related to participants/takers:")
	rows, err := db.Query(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND (table_name LIKE '%participant%' OR table_name LIKE '%taker%' OR table_name LIKE '%user%')
		ORDER BY table_name
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var tableName string
		err := rows.Scan(&tableName)
		if err != nil {
			log.Printf("Error scanning: %v", err)
			continue
		}
		fmt.Printf("  - %s\n", tableName)
	}
}