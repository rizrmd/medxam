package models

type Item struct {
	ID         int    `db:"id" json:"id"`
	Title      string `db:"title" json:"title"`
	Content    *string `db:"content" json:"content"`
	Type       string `db:"type" json:"type"`
	IsVignette bool   `db:"is_vignette" json:"is_vignette"`
	IsRandom   bool   `db:"is_random" json:"is_random"`
	Score      int    `db:"score" json:"score"`
	ClientID   *int   `db:"client_id" json:"client_id"`
	Timestamps
}

type ItemCreateRequest struct {
	Title      string  `json:"title" required:"true" minLength:"1" maxLength:"255"`
	Content    *string `json:"content,omitempty"`
	Type       string  `json:"type" required:"true" enum:"simple,multiple_choice,essay,interview" default:"simple"`
	IsVignette bool    `json:"is_vignette" default:"false"`
	IsRandom   bool    `json:"is_random" default:"false"`
	Score      int     `json:"score" default:"0" minimum:"0"`
}

type ItemUpdateRequest struct {
	Title      *string `json:"title,omitempty" minLength:"1" maxLength:"255"`
	Content    *string `json:"content,omitempty"`
	Type       *string `json:"type,omitempty" enum:"simple,multiple_choice,essay,interview"`
	IsVignette *bool   `json:"is_vignette,omitempty"`
	IsRandom   *bool   `json:"is_random,omitempty"`
	Score      *int    `json:"score,omitempty" minimum:"0"`
}

type ItemWithQuestions struct {
	Item
	Questions []Question `json:"questions"`
}

type ItemSearchRequest struct {
	Title      string `query:"title" maxLength:"255"`
	Type       string `query:"type" enum:"simple,multiple_choice,essay,interview"`
	IsVignette *bool  `query:"is_vignette"`
	Pagination
}