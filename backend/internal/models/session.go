package models

type Session struct {
	ID           string `db:"id" json:"id"`
	UserID       *int64 `db:"user_id" json:"user_id"`
	IPAddress    string `db:"ip_address" json:"ip_address"`
	UserAgent    string `db:"user_agent" json:"user_agent"`
	Payload      string `db:"payload" json:"-"`
	LastActivity int    `db:"last_activity" json:"last_activity"`
}

type SessionData struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Roles    []Role `json:"roles"`
}