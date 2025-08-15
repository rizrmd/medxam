package tables

type Participant struct {
	ID         int     `db:"id" json:"id"`
	Name       string  `db:"name" json:"name"`
	Reg        *string `db:"reg" json:"reg"`
	Email      *string `db:"email" json:"email"`
	Password   *string `db:"password" json:"-"`
	IsVerified bool    `db:"is_verified" json:"is_verified"`
	ClientID   *int    `db:"client_id" json:"client_id"`
	Timestamps
}

type ParticipantCreateRequest struct {
	Name     string  `json:"name" required:"true" minLength:"1" maxLength:"255"`
	Reg      *string `json:"reg,omitempty" maxLength:"255"`
	Email    *string `json:"email,omitempty" format:"email" maxLength:"255"`
	Password *string `json:"password,omitempty" minLength:"6" maxLength:"255"`
	GroupIDs []int   `json:"group_ids,omitempty"`
}

type ParticipantUpdateRequest struct {
	Name       *string `json:"name,omitempty" minLength:"1" maxLength:"255"`
	Reg        *string `json:"reg,omitempty" maxLength:"255"`
	Email      *string `json:"email,omitempty" format:"email" maxLength:"255"`
	IsVerified *bool   `json:"is_verified,omitempty"`
}

type ParticipantWithGroups struct {
	Participant
	Groups []Group `json:"groups"`
}

type ParticipantSearchRequest struct {
	Name    string `query:"name" maxLength:"255"`
	Email   string `query:"email" maxLength:"255"`
	GroupID *int   `query:"group_id"`
	Pagination
}
