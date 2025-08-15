package models

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/medxamion/medxamion/internal/database"
	"github.com/medxamion/medxamion/internal/tables"
)

type DeliveryAssignmentModel struct {
	db *database.DB
}

func NewDeliveryAssignmentModel(db *database.DB) *DeliveryAssignmentModel {
	return &DeliveryAssignmentModel{db: db}
}

// AssignCommitteeToDelivery assigns committee members to a delivery
func (r *DeliveryAssignmentModel) AssignCommitteeToDelivery(deliveryID int, userIDs []int) error {
	if len(userIDs) == 0 {
		return nil
	}

	// First, deactivate all existing committee assignments
	_, err := r.db.Exec(
		"UPDATE delivery_committee SET is_active = FALSE WHERE delivery_id = $1",
		deliveryID,
	)
	if err != nil {
		return fmt.Errorf("failed to deactivate existing committee: %w", err)
	}

	// Insert new committee assignments
	for _, userID := range userIDs {
		_, err := r.db.Exec(`
			INSERT INTO delivery_committee (delivery_id, user_id, assigned_at, is_active)
			VALUES ($1, $2, $3, TRUE)
			ON CONFLICT (delivery_id, user_id)
			DO UPDATE SET is_active = TRUE, assigned_at = $3
		`, deliveryID, userID, time.Now())

		if err != nil {
			return fmt.Errorf("failed to assign committee member %d: %w", userID, err)
		}
	}

	return nil
}

// AssignScorerToDelivery assigns scorers to a delivery
func (r *DeliveryAssignmentModel) AssignScorerToDelivery(deliveryID int, userIDs []int) error {
	if len(userIDs) == 0 {
		return nil
	}

	// First, deactivate all existing scorer assignments
	_, err := r.db.Exec(
		"UPDATE delivery_scorer SET is_active = FALSE WHERE delivery_id = $1",
		deliveryID,
	)
	if err != nil {
		return fmt.Errorf("failed to deactivate existing scorers: %w", err)
	}

	// Insert new scorer assignments
	for _, userID := range userIDs {
		_, err := r.db.Exec(`
			INSERT INTO delivery_scorer (delivery_id, user_id, assigned_at, is_active)
			VALUES ($1, $2, $3, TRUE)
			ON CONFLICT (delivery_id, user_id)
			DO UPDATE SET is_active = TRUE, assigned_at = $3
		`, deliveryID, userID, time.Now())

		if err != nil {
			return fmt.Errorf("failed to assign scorer %d: %w", userID, err)
		}
	}

	return nil
}

// GetDeliveryCommittee gets all active committee members for a delivery
func (r *DeliveryAssignmentModel) GetDeliveryCommittee(deliveryID int) ([]tables.UserWithRole, error) {
	var users []tables.UserWithRole

	query := `
		SELECT u.id, u.avatar, u.name, u.username, u.email, u.email_verified_at,
			   u.gender, u.profile_photo_path, u.birthplace, u.birthday, u.last_login,
			   u.created_at, u.updated_at, dc.assigned_at, dc.is_active
		FROM users u
		JOIN delivery_committee dc ON u.id = dc.user_id
		WHERE dc.delivery_id = $1 AND dc.is_active = TRUE
		ORDER BY dc.assigned_at DESC`

	rows, err := r.db.Query(query, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery committee: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var userWithRole tables.UserWithRole
		err := rows.Scan(
			&userWithRole.User.ID, &userWithRole.User.Avatar, &userWithRole.User.Name,
			&userWithRole.User.Username, &userWithRole.User.Email, &userWithRole.User.EmailVerifiedAt,
			&userWithRole.User.Gender, &userWithRole.User.ProfilePhotoPath, &userWithRole.User.Birthplace,
			&userWithRole.User.Birthday, &userWithRole.User.LastLogin, &userWithRole.User.CreatedAt,
			&userWithRole.User.UpdatedAt, &userWithRole.AssignedAt, &userWithRole.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, userWithRole)
	}

	return users, nil
}

// GetDeliveryScorers gets all active scorers for a delivery
func (r *DeliveryAssignmentModel) GetDeliveryScorers(deliveryID int) ([]tables.UserWithRole, error) {
	var users []tables.UserWithRole

	query := `
		SELECT u.id, u.avatar, u.name, u.username, u.email, u.email_verified_at,
			   u.gender, u.profile_photo_path, u.birthplace, u.birthday, u.last_login,
			   u.created_at, u.updated_at, ds.assigned_at, ds.is_active
		FROM users u
		JOIN delivery_scorer ds ON u.id = ds.user_id
		WHERE ds.delivery_id = $1 AND ds.is_active = TRUE
		ORDER BY ds.assigned_at DESC`

	rows, err := r.db.Query(query, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get delivery scorers: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var userWithRole tables.UserWithRole
		err := rows.Scan(
			&userWithRole.User.ID, &userWithRole.User.Avatar, &userWithRole.User.Name,
			&userWithRole.User.Username, &userWithRole.User.Email, &userWithRole.User.EmailVerifiedAt,
			&userWithRole.User.Gender, &userWithRole.User.ProfilePhotoPath, &userWithRole.User.Birthplace,
			&userWithRole.User.Birthday, &userWithRole.User.LastLogin, &userWithRole.User.CreatedAt,
			&userWithRole.User.UpdatedAt, &userWithRole.AssignedAt, &userWithRole.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, userWithRole)
	}

	return users, nil
}

// GetUserDeliveries gets all deliveries assigned to a user as committee or scorer
func (r *DeliveryAssignmentModel) GetUserDeliveries(userID int, roleType string) ([]tables.DeliveryWithAssignments, error) {
	var deliveries []tables.DeliveryWithAssignments

	var query string
	switch roleType {
	case "committee":
		query = `
			SELECT DISTINCT d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration,
				   d.ended_at, d.is_anytime, d.automatic_start, d.is_finished, d.last_status,
				   d.display_name, d.started_at, d.created_at, d.updated_at
			FROM deliveries d
			JOIN delivery_committee dc ON d.id = dc.delivery_id
			WHERE dc.user_id = $1 AND dc.is_active = TRUE
			ORDER BY d.scheduled_at DESC`
	case "scorer":
		query = `
			SELECT DISTINCT d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration,
				   d.ended_at, d.is_anytime, d.automatic_start, d.is_finished, d.last_status,
				   d.display_name, d.started_at, d.created_at, d.updated_at
			FROM deliveries d
			JOIN delivery_scorer ds ON d.id = ds.delivery_id
			WHERE ds.user_id = $1 AND ds.is_active = TRUE
			ORDER BY d.scheduled_at DESC`
	default:
		// Get both committee and scorer deliveries
		query = `
			SELECT DISTINCT d.id, d.exam_id, d.group_id, d.name, d.scheduled_at, d.duration,
				   d.ended_at, d.is_anytime, d.automatic_start, d.is_finished, d.last_status,
				   d.display_name, d.started_at, d.created_at, d.updated_at
			FROM deliveries d
			LEFT JOIN delivery_committee dc ON d.id = dc.delivery_id
			LEFT JOIN delivery_scorer ds ON d.id = ds.delivery_id
			WHERE (dc.user_id = $1 AND dc.is_active = TRUE) 
				OR (ds.user_id = $1 AND ds.is_active = TRUE)
			ORDER BY d.scheduled_at DESC`
	}

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user deliveries: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var deliveryWithAssignments tables.DeliveryWithAssignments
		err := rows.Scan(
			&deliveryWithAssignments.Delivery.ID, &deliveryWithAssignments.Delivery.ExamID,
			&deliveryWithAssignments.Delivery.GroupID, &deliveryWithAssignments.Delivery.Name,
			&deliveryWithAssignments.Delivery.ScheduledAt, &deliveryWithAssignments.Delivery.Duration,
			&deliveryWithAssignments.Delivery.EndedAt, &deliveryWithAssignments.Delivery.IsAnytime,
			&deliveryWithAssignments.Delivery.AutomaticStart, &deliveryWithAssignments.Delivery.IsFinished,
			&deliveryWithAssignments.Delivery.LastStatus, &deliveryWithAssignments.Delivery.DisplayName,
			&deliveryWithAssignments.Delivery.StartedAt, &deliveryWithAssignments.Delivery.CreatedAt,
			&deliveryWithAssignments.Delivery.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan delivery: %w", err)
		}

		// Load committee and scorers for this delivery
		deliveryWithAssignments.Committee, _ = r.GetDeliveryCommittee(deliveryWithAssignments.Delivery.ID)
		deliveryWithAssignments.Scorers, _ = r.GetDeliveryScorers(deliveryWithAssignments.Delivery.ID)

		deliveries = append(deliveries, deliveryWithAssignments)
	}

	return deliveries, nil
}

// GetUsersWithRole gets all users with a specific role (for assignment purposes)
func (r *DeliveryAssignmentModel) GetUsersWithRole(roleName string) ([]tables.User, error) {
	var users []tables.User

	query := `
		SELECT u.id, u.avatar, u.name, u.username, u.email, u.email_verified_at,
			   u.gender, u.profile_photo_path, u.birthplace, u.birthday, u.last_login,
			   u.created_at, u.updated_at
		FROM users u
		JOIN user_role ur ON u.id = ur.user_id
		JOIN roles r ON ur.role_id = r.id
		WHERE r.name = $1 OR r.slug = $1
		ORDER BY u.name`

	rows, err := r.db.Query(query, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get users with role: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var user tables.User
		err := rows.Scan(
			&user.ID, &user.Avatar, &user.Name, &user.Username, &user.Email,
			&user.EmailVerifiedAt, &user.Gender, &user.ProfilePhotoPath, &user.Birthplace,
			&user.Birthday, &user.LastLogin, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// CheckUserDeliveryPermission checks if a user has permission to access a delivery
func (r *DeliveryAssignmentModel) CheckUserDeliveryPermission(userID, deliveryID int, permission string) (bool, error) {
	var count int

	switch permission {
	case "committee":
		err := r.db.QueryRow(
			"SELECT COUNT(*) FROM delivery_committee WHERE user_id = $1 AND delivery_id = $2 AND is_active = TRUE",
			userID, deliveryID,
		).Scan(&count)
		if err != nil && err != sql.ErrNoRows {
			return false, fmt.Errorf("failed to check committee permission: %w", err)
		}
	case "scorer":
		err := r.db.QueryRow(
			"SELECT COUNT(*) FROM delivery_scorer WHERE user_id = $1 AND delivery_id = $2 AND is_active = TRUE",
			userID, deliveryID,
		).Scan(&count)
		if err != nil && err != sql.ErrNoRows {
			return false, fmt.Errorf("failed to check scorer permission: %w", err)
		}
	default:
		// Check both committee and scorer permissions
		err := r.db.QueryRow(`
			SELECT COUNT(*) FROM (
				SELECT 1 FROM delivery_committee WHERE user_id = $1 AND delivery_id = $2 AND is_active = TRUE
				UNION
				SELECT 1 FROM delivery_scorer WHERE user_id = $1 AND delivery_id = $2 AND is_active = TRUE
			) combined`,
			userID, deliveryID,
		).Scan(&count)
		if err != nil && err != sql.ErrNoRows {
			return false, fmt.Errorf("failed to check delivery permission: %w", err)
		}
	}

	return count > 0, nil
}
