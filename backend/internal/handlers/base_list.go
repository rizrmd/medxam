package handlers

import (
	"context"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/medxamion/medxamion/internal/middleware"
	"github.com/medxamion/medxamion/internal/tables"
)

// BaseListInput provides common list operation parameters
type BaseListInput struct {
	Page      int    `query:"page" default:"1" minimum:"1"`
	PerPage   int    `query:"per_page" default:"15" minimum:"1" maximum:"100"`
	Search    string `query:"search" maxLength:"255"`
	SortBy    string `query:"sort_by" default:"created_at"`
	SortOrder string `query:"sort_order" default:"desc" enum:"asc,desc"`

	// Date filtering
	DateFilterMode string `query:"date_filter_mode" enum:"exact,month,year,range"`
	DateField      string `query:"date_field" default:"created_at"`
	ExactDate      string `query:"exact_date" format:"date"`
	Month          string `query:"month" pattern:"^\\d{4}-\\d{2}$"`
	Year           string `query:"year" pattern:"^\\d{4}$"`
	StartDate      string `query:"start_date" format:"date"`
	EndDate        string `query:"end_date" format:"date"`
}

// DateFilter represents parsed date filter parameters
type DateFilter struct {
	Mode      string
	Field     string
	ExactDate *time.Time
	Month     *time.Time
	Year      *int
	StartDate *time.Time
	EndDate   *time.Time
}

// ParseDateFilter parses date filter parameters from input
func ParseDateFilter(input BaseListInput) (*DateFilter, error) {
	filter := &DateFilter{
		Mode:  input.DateFilterMode,
		Field: input.DateField,
	}

	if filter.Field == "" {
		filter.Field = "created_at"
	}

	switch input.DateFilterMode {
	case "exact":
		if input.ExactDate != "" {
			if t, err := time.Parse("2006-01-02", input.ExactDate); err == nil {
				filter.ExactDate = &t
			}
		}
	case "month":
		if input.Month != "" {
			if t, err := time.Parse("2006-01", input.Month); err == nil {
				filter.Month = &t
			}
		}
	case "year":
		if input.Year != "" {
			if t, err := time.Parse("2006", input.Year); err == nil {
				year := t.Year()
				filter.Year = &year
			}
		}
	case "range":
		if input.StartDate != "" {
			if t, err := time.Parse("2006-01-02", input.StartDate); err == nil {
				filter.StartDate = &t
			}
		}
		if input.EndDate != "" {
			if t, err := time.Parse("2006-01-02", input.EndDate); err == nil {
				// Set end date to end of day
				t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
				filter.EndDate = &t
			}
		}
	}

	return filter, nil
}

// GetDateRangeFromFilter converts date filter to start and end dates
func GetDateRangeFromFilter(filter *DateFilter) (startDate, endDate *time.Time) {
	if filter == nil {
		return nil, nil
	}

	switch filter.Mode {
	case "exact":
		if filter.ExactDate != nil {
			start := *filter.ExactDate
			end := start.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			return &start, &end
		}
	case "month":
		if filter.Month != nil {
			start := *filter.Month
			// Get last day of month
			year, month, _ := start.Date()
			end := time.Date(year, month+1, 0, 23, 59, 59, 999999999, start.Location())
			return &start, &end
		}
	case "year":
		if filter.Year != nil {
			start := time.Date(*filter.Year, 1, 1, 0, 0, 0, 0, time.UTC)
			end := time.Date(*filter.Year, 12, 31, 23, 59, 59, 999999999, time.UTC)
			return &start, &end
		}
	case "range":
		return filter.StartDate, filter.EndDate
	}

	return nil, nil
}

// ValidateListAccess checks if user has access to list resources
func ValidateListAccess(ctx context.Context, requiredRole string) error {
	sessionData := middleware.GetSessionDataFromContext(ctx)
	if sessionData == nil {
		return huma.Error401Unauthorized("Authentication required")
	}

	if requiredRole != "" {
		hasRole := false
		for _, role := range sessionData.Roles {
			if role.Name == requiredRole {
				hasRole = true
				break
			}
		}
		if !hasRole {
			return huma.Error403Forbidden("Insufficient permissions")
		}
	}

	return nil
}

// BuildPagination creates pagination struct from input
func BuildPagination(input BaseListInput) tables.Pagination {
	return tables.Pagination{
		Page:    input.Page,
		PerPage: input.PerPage,
	}
}

// ListHandler interface for generic list operations
type ListHandler interface {
	ValidateAccess(ctx context.Context) error
	ParseFilters(input interface{}) (interface{}, error)
	FetchData(pagination tables.Pagination, filters interface{}) (*tables.PaginatedResponse, error)
}

// GenericListResponse wraps paginated response
type GenericListResponse struct {
	Body tables.PaginatedResponse `json:"body"`
}

// HandleGenericList processes generic list requests
func HandleGenericList(ctx context.Context, handler ListHandler, input interface{}) (*GenericListResponse, error) {
	// Validate access
	if err := handler.ValidateAccess(ctx); err != nil {
		return nil, err
	}

	// Parse filters
	filters, err := handler.ParseFilters(input)
	if err != nil {
		return nil, huma.Error400BadRequest("Invalid filters", err)
	}

	// Build pagination from base input
	var pagination tables.Pagination
	if baseInput, ok := input.(*BaseListInput); ok {
		pagination = BuildPagination(*baseInput)
	} else {
		// Default pagination
		pagination = tables.Pagination{
			Page:    1,
			PerPage: 15,
		}
	}

	// Fetch data
	result, err := handler.FetchData(pagination, filters)
	if err != nil {
		return nil, huma.Error500InternalServerError("Failed to fetch data", err)
	}

	return &GenericListResponse{Body: *result}, nil
}
