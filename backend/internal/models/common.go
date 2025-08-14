package models

import (
	"database/sql"
	"time"
)

type NullTime struct {
	sql.NullTime
}

func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return nt.Time.MarshalJSON()
}

type Pagination struct {
	Page    int `json:"page" query:"page" default:"1" minimum:"1"`
	PerPage int `json:"per_page" query:"per_page" default:"15" minimum:"1" maximum:"100"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	TotalPages int         `json:"total_pages"`
}

type Gender string

const (
	GenderMale   Gender = "male"
	GenderFemale Gender = "female"
	GenderOther  Gender = "other"
)

type QuestionType string

const (
	QuestionTypeSimple   QuestionType = "simple"
	QuestionTypeMCQ      QuestionType = "multiple_choice"
	QuestionTypeEssay    QuestionType = "essay"
	QuestionTypeInterview QuestionType = "interview"
)

type CategoryType string

const (
	CategoryTypeDiseaseGroup CategoryType = "disease_group"
	CategoryTypeRegionGroup  CategoryType = "region_group"
	CategoryTypeSpecificPart CategoryType = "specific_part"
	CategoryTypeTypicalGroup CategoryType = "typical_group"
)

type Timestamps struct {
	CreatedAt *time.Time `db:"created_at" json:"created_at"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at"`
}

type SoftDelete struct {
	DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}