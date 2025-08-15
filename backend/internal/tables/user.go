package tables

import (
	"time"
)

type User struct {
	ID                     int        `db:"id" json:"id"`
	Avatar                 *string    `db:"avatar" json:"avatar"`
	Name                   string     `db:"name" json:"name"`
	Username               string     `db:"username" json:"username"`
	Email                  string     `db:"email" json:"email"`
	EmailVerifiedAt        *time.Time `db:"email_verified_at" json:"email_verified_at,omitempty"`
	Password               string     `db:"password" json:"-"`
	TwoFactorSecret        *string    `db:"two_factor_secret" json:"-"`
	TwoFactorRecoveryCodes *string    `db:"two_factor_recovery_codes" json:"-"`
	Gender                 Gender     `db:"gender" json:"gender"`
	ProfilePhotoPath       *string    `db:"profile_photo_path" json:"profile_photo_path"`
	Birthplace             *string    `db:"birthplace" json:"birthplace"`
	Birthday               *time.Time `db:"birthday" json:"birthday"`
	RememberToken          *string    `db:"remember_token" json:"-"`
	LastLogin              *time.Time `db:"last_login" json:"last_login"`
	Timestamps
	SoftDelete
}

type Role struct {
	ID          int    `db:"id" json:"id"`
	Name        string `db:"name" json:"name"`
	DisplayName string `db:"display_name" json:"display_name"`
	Description string `db:"description" json:"description"`
	Timestamps
}

type Permission struct {
	ID          int    `db:"id" json:"id"`
	Name        string `db:"name" json:"name"`
	DisplayName string `db:"display_name" json:"display_name"`
	Description string `db:"description" json:"description"`
	Timestamps
}

type UserRole struct {
	UserID int `db:"user_id" json:"user_id"`
	RoleID int `db:"role_id" json:"role_id"`
}

type RolePermission struct {
	RoleID       int `db:"role_id" json:"role_id"`
	PermissionID int `db:"permission_id" json:"permission_id"`
}

type UserPermission struct {
	UserID       int `db:"user_id" json:"user_id"`
	PermissionID int `db:"permission_id" json:"permission_id"`
}

type LoginRequest struct {
	Username string `json:"username" required:"true" minLength:"3" maxLength:"255" example:"admin"`
	Password string `json:"password" required:"true" minLength:"6" maxLength:"255" example:"password123"`
}

type LoginResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	User      *User  `json:"user,omitempty"`
	SessionID string `json:"session_id,omitempty"`
}

type UserCreateRequest struct {
	Name             string  `json:"name" required:"true" minLength:"3" maxLength:"255"`
	Username         string  `json:"username" required:"true" minLength:"3" maxLength:"255"`
	Email            string  `json:"email" required:"true" format:"email" maxLength:"255"`
	Password         string  `json:"password" required:"true" minLength:"6" maxLength:"255"`
	Gender           Gender  `json:"gender" enum:"male,female,other" default:"other"`
	Birthplace       *string `json:"birthplace,omitempty" maxLength:"255"`
	Birthday         *string `json:"birthday,omitempty" format:"date"`
	ProfilePhotoPath *string `json:"profile_photo_path,omitempty"`
}

type UserUpdateRequest struct {
	Name             *string `json:"name,omitempty" minLength:"3" maxLength:"255"`
	Email            *string `json:"email,omitempty" format:"email" maxLength:"255"`
	Gender           *Gender `json:"gender,omitempty" enum:"male,female,other"`
	Birthplace       *string `json:"birthplace,omitempty" maxLength:"255"`
	Birthday         *string `json:"birthday,omitempty" format:"date"`
	ProfilePhotoPath *string `json:"profile_photo_path,omitempty"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" required:"true"`
	NewPassword     string `json:"new_password" required:"true" minLength:"6" maxLength:"255"`
	ConfirmPassword string `json:"confirm_password" required:"true" minLength:"6" maxLength:"255"`
}
