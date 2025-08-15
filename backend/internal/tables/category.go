package tables

type Category struct {
	ID          int     `db:"id" json:"id"`
	Type        string  `db:"type" json:"type"`
	Code        *string `db:"code" json:"code"`
	Parent      int     `db:"parent" json:"parent"`
	Name        string  `db:"name" json:"name"`
	Description *string `db:"description" json:"description"`
	ClientID    int     `db:"client_id" json:"client_id"`
	Timestamps
}

type CategoryItem struct {
	CategoryID int `db:"category_id" json:"category_id"`
	ItemID     int `db:"item_id" json:"item_id"`
}

type CategoryQuestion struct {
	CategoryID int `db:"category_id" json:"category_id"`
	QuestionID int `db:"question_id" json:"question_id"`
}

type CategoryCreateRequest struct {
	Type        CategoryType `json:"type" required:"true" enum:"disease_group,region_group,specific_part,typical_group"`
	Code        *string      `json:"code,omitempty" maxLength:"255"`
	Parent      int          `json:"parent" default:"0"`
	Name        string       `json:"name" required:"true" minLength:"1" maxLength:"255"`
	Description *string      `json:"description,omitempty"`
}

type CategoryUpdateRequest struct {
	Type        *CategoryType `json:"type,omitempty" enum:"disease_group,region_group,specific_part,typical_group"`
	Code        *string       `json:"code,omitempty" maxLength:"255"`
	Parent      *int          `json:"parent,omitempty"`
	Name        *string       `json:"name,omitempty" minLength:"1" maxLength:"255"`
	Description *string       `json:"description,omitempty"`
}

type CategoryWithCount struct {
	Category
	QuestionCount int `db:"question_count" json:"question_count"`
}

type CategorySearchRequest struct {
	Name string       `query:"name" maxLength:"255"`
	Type CategoryType `query:"type" enum:"disease_group,region_group,specific_part,typical_group"`
	Pagination
}
