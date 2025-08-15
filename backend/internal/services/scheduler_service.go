package services

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/medxamion/medxamion/internal/models"
)

// ExamClientAssigner interface for assigning deliveries to exam clients
type ExamClientAssigner interface {
	AssignDelivery(deliveryID int, deliveryName string, examData map[string]interface{})
	GetAvailableCapacity() int
}

// SchedulerService handles automatic delivery scheduling
type SchedulerService struct {
	deliveryModel      *models.DeliveryModel
	examClientAssigner ExamClientAssigner
	checkInterval      time.Duration
	stopChan           chan struct{}
}

// NewSchedulerService creates a new scheduler service
func NewSchedulerService(deliveryModel *models.DeliveryModel, examClientAssigner ExamClientAssigner) *SchedulerService {
	return &SchedulerService{
		deliveryModel:      deliveryModel,
		examClientAssigner: examClientAssigner,
		checkInterval:      1 * time.Minute, // Check every minute
		stopChan:           make(chan struct{}),
	}
}

// Start begins the scheduler background process
func (s *SchedulerService) Start(ctx context.Context) {
	ticker := time.NewTicker(s.checkInterval)
	defer ticker.Stop()

	// Run initial check
	s.checkAndStartDeliveries(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("Stopping delivery scheduler service due to context cancellation")
			return
		case <-s.stopChan:
			log.Println("Stopping delivery scheduler service")
			return
		case <-ticker.C:
			s.checkAndStartDeliveries(ctx)
		}
	}
}

// Stop stops the scheduler service
func (s *SchedulerService) Stop() {
	close(s.stopChan)
}

// checkAndStartDeliveries checks for deliveries that need to be automatically started
func (s *SchedulerService) checkAndStartDeliveries(ctx context.Context) {
	now := time.Now()

	// Get deliveries that should be automatically started
	deliveries, err := s.deliveryModel.GetDeliveriesForAutoStart(now)
	if err != nil {
		log.Printf("Error fetching deliveries for auto start: %v", err)
		return
	}

	if len(deliveries) == 0 {
		return // No deliveries to start
	}

	// Check available capacity from exam clients
	availableCapacity := s.examClientAssigner.GetAvailableCapacity()
	if availableCapacity == 0 {
		log.Printf("Found %d deliveries to start but no exam client capacity available", len(deliveries))
		return
	}

	log.Printf("Found %d deliveries to automatically start (available capacity: %d)",
		len(deliveries), availableCapacity)

	started := 0
	for _, delivery := range deliveries {
		if started >= availableCapacity {
			log.Printf("Reached capacity limit (%d) - remaining deliveries will be processed in next cycle", availableCapacity)
			break
		}

		err := s.startDelivery(ctx, delivery)
		if err != nil {
			// Check if it's an "already started" error - this is expected and not a real error
			if strings.Contains(err.Error(), "already started") || strings.Contains(err.Error(), "already finished") {
				log.Printf("Delivery %d (%s) already started/finished - skipping",
					delivery.ID, delivery.DisplayName)
			} else {
				log.Printf("Failed to auto-start delivery %d (%s): %v",
					delivery.ID, delivery.DisplayName, err)
			}
		} else {
			log.Printf("Successfully queued delivery %d (%s) for exam client assignment",
				delivery.ID, delivery.DisplayName)
			started++
		}
	}
}

// startDelivery starts a single delivery by assigning it to an exam client
func (s *SchedulerService) startDelivery(ctx context.Context, delivery *models.DeliveryListItem) error {
	// First, mark delivery as started in database to prevent double start
	err := s.deliveryModel.StartDelivery(delivery.ID)
	if err != nil {
		return err
	}

	// Create exam data for the assignment
	examData := map[string]interface{}{
		"delivery_id":  delivery.ID,
		"exam_id":      delivery.ExamID,
		"group_id":     delivery.GroupID,
		"scheduled_at": delivery.ScheduledAt,
		"duration":     delivery.Duration,
		"is_anytime":   delivery.IsAnytime,
		"exam_title":   delivery.ExamTitle,
		"group_name":   delivery.GroupName,
	}

	// Assign to exam client
	s.examClientAssigner.AssignDelivery(delivery.ID, delivery.DisplayName, examData)

	log.Printf("Assigned delivery to exam client: ID=%d, Name='%s', ScheduledAt=%v",
		delivery.ID, delivery.DisplayName, delivery.ScheduledAt)

	return nil
}

// SetCheckInterval allows customizing the check interval for testing
func (s *SchedulerService) SetCheckInterval(interval time.Duration) {
	s.checkInterval = interval
}
