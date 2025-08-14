package models

import (
	"time"
)

type Attempt struct {
	ID            int        `db:"id" json:"id"`
	AttemptedBy   int        `db:"attempted_by" json:"attempted_by"`
	ExamID        int        `db:"exam_id" json:"exam_id"`
	DeliveryID    int        `db:"delivery_id" json:"delivery_id"`
	IPAddress     string     `db:"ip_address" json:"ip_address"`
	StartedAt     *time.Time `db:"started_at" json:"started_at"`
	EndedAt       *time.Time `db:"ended_at" json:"ended_at"`
	ExtraMinute   int        `db:"extra_minute" json:"extra_minute"`
	Score         float64    `db:"score" json:"score"`
	Progress      int        `db:"progress" json:"progress"`
	Penalty       int        `db:"penalty" json:"penalty"`
	FinishScoring bool       `db:"finish_scoring" json:"finish_scoring"`
	Timestamps
}

type AttemptQuestion struct {
	ID           int     `db:"id" json:"id"`
	AttemptID    int     `db:"attempt_id" json:"attempt_id"`
	QuestionID   int     `db:"question_id" json:"question_id"`
	Answer       *string `db:"answer" json:"answer"`
	Score        float64 `db:"score" json:"score"`
	IsCorrect    *bool   `db:"is_correct" json:"is_correct"`
	AnsweredAt   *time.Time `db:"answered_at" json:"answered_at"`
	TimeSpent    int     `db:"time_spent" json:"time_spent"`
	Timestamps
}

type AttemptCreateRequest struct {
	DeliveryID int    `json:"delivery_id" required:"true" minimum:"1"`
	IPAddress  string `json:"ip_address" required:"true"`
}

type AttemptAnswerRequest struct {
	QuestionID int     `json:"question_id" required:"true" minimum:"1"`
	Answer     *string `json:"answer,omitempty"`
	TimeSpent  int     `json:"time_spent" default:"0" minimum:"0"`
}

type AttemptWithDetails struct {
	Attempt
	Taker    Taker    `json:"taker"`
	Exam     Exam     `json:"exam"`
	Delivery Delivery `json:"delivery"`
}

type ScoringRequest struct {
	AttemptID int     `json:"attempt_id" required:"true" minimum:"1"`
	Score     float64 `json:"score" required:"true" minimum:"0"`
	Penalty   int     `json:"penalty" default:"0"`
}

type AttemptSearchRequest struct {
	TakerID    int   `json:"taker_id,omitempty"`
	DeliveryID int   `json:"delivery_id,omitempty"`
	ExamID     int   `json:"exam_id,omitempty"`
	IsFinished *bool `json:"is_finished,omitempty"`
}

type ResultSummary struct {
	AttemptID      int       `json:"attempt_id"`
	TakerCode      string    `json:"taker_code"`
	TakerName      string    `json:"taker_name"`
	ExamName       string    `json:"exam_name"`
	Score          float64   `json:"score"`
	TotalQuestions int       `json:"total_questions"`
	Answered       int       `json:"answered"`
	Correct        int       `json:"correct"`
	Wrong          int       `json:"wrong"`
	StartedAt      *time.Time `json:"started_at"`
	EndedAt        *time.Time `json:"ended_at"`
	Duration       int       `json:"duration"`
}