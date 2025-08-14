package models

import "time"

type Group struct {
	ID             int        `db:"id" json:"id"`
	Name           string     `db:"name" json:"name"`
	Description    *string    `db:"description" json:"description"`
	Code           *string    `db:"code" json:"code"`
	LastTakerCode  int        `db:"last_taker_code" json:"last_taker_code"`
	ClosedAt       *time.Time `db:"closed_at" json:"closed_at"`
	ClientID       int        `db:"client_id" json:"client_id"`
	Timestamps
}

type GroupTaker struct {
	GroupID int    `db:"group_id" json:"group_id"`
	TakerID int    `db:"taker_id" json:"taker_id"`
	Code    string `db:"code" json:"code"`
}

type GroupCreateRequest struct {
	Name        string  `json:"name" required:"true" minLength:"1" maxLength:"255"`
	Description *string `json:"description,omitempty"`
	Code        *string `json:"code,omitempty" maxLength:"255"`
}

type GroupUpdateRequest struct {
	Name        *string    `json:"name,omitempty" minLength:"1" maxLength:"255"`
	Description *string    `json:"description,omitempty"`
	Code        *string    `json:"code,omitempty" maxLength:"255"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
}

type GroupWithStats struct {
	ID               int        `db:"id" json:"id"`
	Name             string     `db:"name" json:"name"`
	Description      *string    `db:"description" json:"description"`
	Code             *string    `db:"code" json:"code"`
	LastTakerCode    int        `db:"last_taker_code" json:"last_taker_code"`
	ClosedAt         *time.Time `db:"closed_at" json:"closed_at"`
	ClientID         int        `db:"client_id" json:"client_id"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
	ParticipantCount int        `db:"participant_count" json:"participant_count"`
}

type GroupSearchRequest struct {
	Name        string `query:"name" maxLength:"255"`
	Description string `query:"description" maxLength:"255"`
	Pagination
}