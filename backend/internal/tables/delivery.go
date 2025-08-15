package tables

import "time"

type Delivery struct {
	ID             int        `db:"id" json:"id"`
	ExamID         int        `db:"exam_id" json:"exam_id"`
	GroupID        int        `db:"group_id" json:"group_id"`
	Name           *string    `db:"name" json:"name"`
	ScheduledAt    *time.Time `db:"scheduled_at" json:"scheduled_at"`
	Duration       int        `db:"duration" json:"duration"`
	EndedAt        *time.Time `db:"ended_at" json:"ended_at"`
	IsAnytime      bool       `db:"is_anytime" json:"is_anytime"`
	AutomaticStart bool       `db:"automatic_start" json:"automatic_start"`
	IsFinished     *time.Time `db:"is_finished" json:"is_finished"`
	LastStatus     *string    `db:"last_status" json:"last_status"`
	DisplayName    *string    `db:"display_name" json:"display_name"`
	StartedAt      *time.Time `db:"started_at" json:"started_at"`
	Timestamps
}

type DeliveryTaker struct {
	DeliveryID int        `db:"delivery_id" json:"delivery_id"`
	TakerID    int        `db:"taker_id" json:"taker_id"`
	StartedAt  *time.Time `db:"started_at" json:"started_at"`
	EndedAt    *time.Time `db:"ended_at" json:"ended_at"`
}

type DeliveryCreateRequest struct {
	ExamID         int        `json:"exam_id" required:"true" minimum:"1"`
	GroupID        int        `json:"group_id" required:"true" minimum:"1"`
	Name           *string    `json:"name,omitempty" maxLength:"255"`
	ScheduledAt    *time.Time `json:"scheduled_at,omitempty"`
	Duration       int        `json:"duration" required:"true" minimum:"1" default:"60"`
	IsAnytime      bool       `json:"is_anytime" default:"false"`
	AutomaticStart bool       `json:"automatic_start" default:"true"`
	DisplayName    *string    `json:"display_name,omitempty" maxLength:"255"`
}

type DeliveryUpdateRequest struct {
	Name           *string    `json:"name,omitempty" maxLength:"255"`
	ScheduledAt    *time.Time `json:"scheduled_at,omitempty"`
	Duration       *int       `json:"duration,omitempty" minimum:"1"`
	IsAnytime      *bool      `json:"is_anytime,omitempty"`
	AutomaticStart *bool      `json:"automatic_start,omitempty"`
	DisplayName    *string    `json:"display_name,omitempty" maxLength:"255"`
}

type DeliveryWithDetails struct {
	Delivery
	Exam  Exam  `json:"exam"`
	Group Group `json:"group"`
}

type DeliverySearchRequest struct {
	Name           string     `query:"name" maxLength:"255"`
	ScheduledAt    *time.Time `query:"scheduled_at"`
	ScheduledAtEnd *time.Time `query:"scheduled_at_end"`
	StartDate      *time.Time `query:"start_date"`
	EndDate        *time.Time `query:"end_date"`
	Status         string     `query:"status" enum:"pending,ongoing,finished"`
	Pagination
}
