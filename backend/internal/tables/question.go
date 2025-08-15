package tables

type Question struct {
	ID       int     `db:"id" json:"id"`
	ItemID   int     `db:"item_id" json:"item_id"`
	Type     string  `db:"type" json:"type"`
	Question *string `db:"question" json:"question"`
	IsRandom bool    `db:"is_random" json:"is_random"`
	Score    int     `db:"score" json:"score"`
	Order    int     `db:"order" json:"order"`
	Timestamps
}

type Answer struct {
	ID         int     `db:"id" json:"id"`
	QuestionID int     `db:"question_id" json:"question_id"`
	Answer     *string `db:"answer" json:"answer"`
	IsCorrect  bool    `db:"is_correct" json:"is_correct"`
	Order      int     `db:"order" json:"order"`
	Timestamps
}

type QuestionCreateRequest struct {
	ItemID   int                   `json:"item_id" required:"true" minimum:"1"`
	Type     string                `json:"type" required:"true" enum:"simple,multiple_choice,essay,interview" default:"simple"`
	Question *string               `json:"question,omitempty"`
	IsRandom bool                  `json:"is_random" default:"false"`
	Score    int                   `json:"score" default:"100" minimum:"0"`
	Order    int                   `json:"order" default:"0"`
	Answers  []AnswerCreateRequest `json:"answers,omitempty"`
}

type QuestionUpdateRequest struct {
	Type     *string `json:"type,omitempty" enum:"simple,multiple_choice,essay,interview"`
	Question *string `json:"question,omitempty"`
	IsRandom *bool   `json:"is_random,omitempty"`
	Score    *int    `json:"score,omitempty" minimum:"0"`
	Order    *int    `json:"order,omitempty"`
}

type AnswerCreateRequest struct {
	Answer    *string `json:"answer,omitempty"`
	IsCorrect bool    `json:"is_correct" default:"false"`
	Order     int     `json:"order" default:"0"`
}

type AnswerUpdateRequest struct {
	Answer    *string `json:"answer,omitempty"`
	IsCorrect *bool   `json:"is_correct,omitempty"`
	Order     *int    `json:"order,omitempty"`
}

type QuestionWithAnswers struct {
	Question
	Answers []Answer `json:"answers"`
}
