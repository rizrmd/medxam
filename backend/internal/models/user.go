package models

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type UserModel struct {
	db *database.DB
}

func NewUserModel(db *database.DB) *UserModel {
	return &UserModel{db: db}
}

func (r *UserModel) GetByUsername(username string) (*tables.User, error) {
	user := &tables.User{}
	query := `
		SELECT id, avatar, name, username, email, email_verified_at, password, 
			   two_factor_secret, two_factor_recovery_codes, gender, profile_photo_path, 
			   birthplace, birthday, remember_token, last_login, 
			   created_at, updated_at, deleted_at
		FROM users 
		WHERE username = $1 AND deleted_at IS NULL`

	err := r.db.Get(user, query, username)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

func (r *UserModel) GetByID(id int) (*tables.User, error) {
	user := &tables.User{}
	query := `
		SELECT id, avatar, name, username, email, email_verified_at, password, 
			   two_factor_secret, two_factor_recovery_codes, gender, profile_photo_path, 
			   birthplace, birthday, remember_token, last_login, 
			   created_at, updated_at, deleted_at
		FROM users 
		WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.Get(user, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

func (r *UserModel) Create(user *tables.User) error {
	query := `
		INSERT INTO users (avatar, name, username, email, password, gender, 
						  profile_photo_path, birthplace, birthday, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query, user.Avatar, user.Name, user.Username, user.Email,
		user.Password, user.Gender, user.ProfilePhotoPath, user.Birthplace,
		user.Birthday).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (r *UserModel) Update(id int, updates *tables.UserUpdateRequest) (*tables.User, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Email != nil {
		setParts = append(setParts, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *updates.Email)
		argIndex++
	}
	if updates.Gender != nil {
		setParts = append(setParts, fmt.Sprintf("gender = $%d", argIndex))
		args = append(args, *updates.Gender)
		argIndex++
	}
	if updates.Birthplace != nil {
		setParts = append(setParts, fmt.Sprintf("birthplace = $%d", argIndex))
		args = append(args, *updates.Birthplace)
		argIndex++
	}
	if updates.Birthday != nil {
		setParts = append(setParts, fmt.Sprintf("birthday = $%d", argIndex))
		args = append(args, *updates.Birthday)
		argIndex++
	}
	if updates.ProfilePhotoPath != nil {
		setParts = append(setParts, fmt.Sprintf("profile_photo_path = $%d", argIndex))
		args = append(args, *updates.ProfilePhotoPath)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetByID(id)
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = NOW()"))
	setClause := strings.Join(setParts, ", ")
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE users 
		SET %s 
		WHERE id = $%d AND deleted_at IS NULL`, setClause, argIndex)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return r.GetByID(id)
}

func (r *UserModel) UpdateLastLogin(id int) error {
	query := `UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}
	return nil
}

func (r *UserModel) List(pagination tables.Pagination, search string) (*tables.PaginatedResponse, error) {
	offset := (pagination.Page - 1) * pagination.PerPage

	whereClause := "WHERE deleted_at IS NULL"
	args := []interface{}{pagination.PerPage, offset}
	argIndex := 3

	if search != "" {
		whereClause += fmt.Sprintf(" AND (name ILIKE $%d OR username ILIKE $%d OR email ILIKE $%d)", argIndex, argIndex, argIndex)
		args = append(args, "%"+search+"%")
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	var total int
	err := r.db.Get(&total, countQuery, args[2:]...)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Get users
	query := fmt.Sprintf(`
		SELECT id, avatar, name, username, email, email_verified_at, 
			   gender, profile_photo_path, birthplace, birthday, last_login,
			   created_at, updated_at
		FROM users %s 
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, whereClause)

	users := []tables.User{}
	err = r.db.Select(&users, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	totalPages := (total + pagination.PerPage - 1) / pagination.PerPage

	return &tables.PaginatedResponse{
		Data:       users,
		Total:      total,
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		TotalPages: totalPages,
	}, nil
}

func (r *UserModel) Delete(id int) error {
	query := `UPDATE users SET deleted_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func (r *UserModel) GetUserRoles(userID int) ([]tables.Role, error) {
	roles := []tables.Role{}
	query := `
		SELECT r.id, r.name, r.created_at, r.updated_at
		FROM roles r
		JOIN role_user ru ON r.id = ru.role_id
		WHERE ru.user_id = $1`

	err := r.db.Select(&roles, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	return roles, nil
}

func (r *UserModel) UpdatePassword(userID int, hashedPassword string) error {
	query := `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, hashedPassword, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	return nil
}
