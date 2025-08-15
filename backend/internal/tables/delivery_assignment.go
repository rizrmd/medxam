package tables

import "time"

// DeliveryCommittee represents committee members assigned to a delivery
type DeliveryCommittee struct {
	ID         int       `db:"id" json:"id"`
	DeliveryID int       `db:"delivery_id" json:"delivery_id"`
	UserID     int       `db:"user_id" json:"user_id"`
	AssignedAt time.Time `db:"assigned_at" json:"assigned_at"`
	IsActive   bool      `db:"is_active" json:"is_active"`
}

// DeliveryScorer represents scorers assigned to a delivery
type DeliveryScorer struct {
	ID         int       `db:"id" json:"id"`
	DeliveryID int       `db:"delivery_id" json:"delivery_id"`
	UserID     int       `db:"user_id" json:"user_id"`
	AssignedAt time.Time `db:"assigned_at" json:"assigned_at"`
	IsActive   bool      `db:"is_active" json:"is_active"`
}

// DeliveryAssignmentRequest for creating assignments
type DeliveryAssignmentRequest struct {
	DeliveryID     int   `json:"delivery_id" required:"true" minimum:"1"`
	CommitteeUsers []int `json:"committee_users"`
	ScorerUsers    []int `json:"scorer_users"`
}

// DeliveryWithAssignments includes delivery info with assigned committee/scorers
type DeliveryWithAssignments struct {
	Delivery  Delivery       `json:"delivery"`
	Committee []UserWithRole `json:"committee"`
	Scorers   []UserWithRole `json:"scorers"`
}

// UserWithRole represents a user with their role information
type UserWithRole struct {
	User       User      `json:"user"`
	AssignedAt time.Time `json:"assigned_at"`
	IsActive   bool      `json:"is_active"`
}
