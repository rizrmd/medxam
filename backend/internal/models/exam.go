package models

type Exam struct {
	ID          int     `db:"id" json:"id"`
	Code        string  `db:"code" json:"code"`
	Name        string  `db:"name" json:"name"`
	Description *string `db:"description" json:"description"`
	Options     *string `db:"options" json:"options"`
	IsMCQ       *bool   `db:"is_mcq" json:"is_mcq"`
	IsInterview bool    `db:"is_interview" json:"is_interview"`
	IsRandom    bool    `db:"is_random" json:"is_random"`
	ClientID    int     `db:"client_id" json:"client_id"`
	Timestamps
}

type ExamItem struct {
	ExamID int `db:"exam_id" json:"exam_id"`
	ItemID int `db:"item_id" json:"item_id"`
	Order  int `db:"order" json:"order"`
}

type ExamCreateRequest struct {
	Code        string  `json:"code" required:"true" minLength:"1" maxLength:"255"`
	Name        string  `json:"name" required:"true" minLength:"1" maxLength:"255"`
	Description *string `json:"description,omitempty"`
	IsMCQ       *bool   `json:"is_mcq,omitempty"`
	IsInterview bool    `json:"is_interview" default:"false"`
	IsRandom    bool    `json:"is_random" default:"false"`
}

type ExamUpdateRequest struct {
	Code        *string `json:"code,omitempty" minLength:"1" maxLength:"255"`
	Name        *string `json:"name,omitempty" minLength:"1" maxLength:"255"`
	Description *string `json:"description,omitempty"`
	IsMCQ       *bool   `json:"is_mcq,omitempty"`
	IsInterview *bool   `json:"is_interview,omitempty"`
	IsRandom    *bool   `json:"is_random,omitempty"`
}

type ExamWithItems struct {
	Exam
	Items []Item `json:"items"`
}

type ExamSearchRequest struct {
	Code string `query:"code" maxLength:"255"`
	Name string `query:"name" maxLength:"255"`
	Pagination
}