package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/medxamion/medxamion/internal/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from localhost in development
		// TODO: Configure this properly for production
		return true
	},
}

type WebSocketHub struct {
	// Map of delivery ID to connected clients
	deliveryClients map[int]map[*WebSocketClient]bool
	mu              sync.RWMutex
	deliveryRepo    *models.DeliveryModel
}

type WebSocketClient struct {
	conn          *websocket.Conn
	deliveryID    int
	hub           *WebSocketHub
	send          chan []byte
	authenticated bool
}

type ProgressUpdate struct {
	Type       string      `json:"type"`
	DeliveryID int         `json:"delivery_id"`
	Data       interface{} `json:"data"`
	Timestamp  time.Time   `json:"timestamp"`
}

type AuthMessage struct {
	Type      string `json:"type"`
	SessionID string `json:"session_id"`
}

type AuthResponse struct {
	Type        string `json:"type"`
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	DeliveryID  int    `json:"delivery_id,omitempty"`
}

func NewWebSocketHub(deliveryRepo *models.DeliveryModel) *WebSocketHub {
	return &WebSocketHub{
		deliveryClients: make(map[int]map[*WebSocketClient]bool),
		deliveryRepo:    deliveryRepo,
	}
}

func (h *WebSocketHub) ServeWS(w http.ResponseWriter, r *http.Request) {
	// Get delivery ID from URL
	deliveryIDStr := chi.URLParam(r, "id")
	deliveryID, err := strconv.Atoi(deliveryIDStr)
	if err != nil {
		http.Error(w, "Invalid delivery ID", http.StatusBadRequest)
		return
	}

	// WebSocket connections will authenticate via message after connection

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &WebSocketClient{
		conn:          conn,
		deliveryID:    deliveryID,
		hub:           h,
		send:          make(chan []byte, 256),
		authenticated: false,
	}

	h.addClient(client)

	// Send initial progress data
	h.sendProgressUpdate(client)

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

func (h *WebSocketHub) addClient(client *WebSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.deliveryClients[client.deliveryID] == nil {
		h.deliveryClients[client.deliveryID] = make(map[*WebSocketClient]bool)
	}
	h.deliveryClients[client.deliveryID][client] = true

	log.Printf("Client connected to delivery %d. Total clients: %d",
		client.deliveryID, len(h.deliveryClients[client.deliveryID]))
}

func (h *WebSocketHub) removeClient(client *WebSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.deliveryClients[client.deliveryID]; ok {
		if _, ok := clients[client]; ok {
			delete(clients, client)
			close(client.send)

			// Clean up empty delivery rooms
			if len(clients) == 0 {
				delete(h.deliveryClients, client.deliveryID)
			}

			log.Printf("Client disconnected from delivery %d. Remaining clients: %d",
				client.deliveryID, len(clients))
		}
	}
}

func (h *WebSocketHub) sendProgressUpdate(client *WebSocketClient) {
	// Only send updates to authenticated clients
	if !client.authenticated {
		return
	}

	// Get current progress data
	progressData, err := h.deliveryRepo.GetParticipantProgress(client.deliveryID)
	if err != nil {
		log.Printf("Error getting progress data: %v", err)
		return
	}

	// Get delivery info
	delivery, err := h.deliveryRepo.GetByID(client.deliveryID)
	if err != nil {
		log.Printf("Error getting delivery: %v", err)
		return
	}

	// Calculate stats
	var completedCount, inProgressCount int
	for _, data := range progressData {
		if progressMap, ok := data.(map[string]interface{}); ok {
			if attemptData, ok := progressMap["attempt"].(map[string]interface{}); ok {
				status := attemptData["status"].(string)
				switch status {
				case "completed":
					completedCount++
				case "in_progress":
					inProgressCount++
				}
			}
		}
	}

	// Prepare update message
	update := ProgressUpdate{
		Type:       "progress_update",
		DeliveryID: client.deliveryID,
		Data: map[string]interface{}{
			"delivery": map[string]interface{}{
				"id":                delivery.ID,
				"name":              delivery.Name,
				"display_name":      delivery.DisplayName,
				"participant_count": len(progressData),
				"completed_count":   completedCount,
				"in_progress_count": inProgressCount,
			},
			"participants": progressData,
		},
		Timestamp: time.Now(),
	}

	message, err := json.Marshal(update)
	if err != nil {
		log.Printf("Error marshaling update: %v", err)
		return
	}

	select {
	case client.send <- message:
	default:
		// Client's send channel is full, close it
		h.removeClient(client)
	}
}

// BroadcastProgressUpdate sends updates to all clients watching a delivery
func (h *WebSocketHub) BroadcastProgressUpdate(deliveryID int) {
	h.mu.RLock()
	clients := h.deliveryClients[deliveryID]
	h.mu.RUnlock()

	for client := range clients {
		h.sendProgressUpdate(client)
	}
}

// StartPeriodicUpdates sends updates every few seconds (as fallback)
func (h *WebSocketHub) StartPeriodicUpdates() {
	// Reduced frequency - now mainly serves as fallback
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for range ticker.C {
			h.mu.RLock()
			deliveryIDs := make([]int, 0, len(h.deliveryClients))
			for id := range h.deliveryClients {
				deliveryIDs = append(deliveryIDs, id)
			}
			h.mu.RUnlock()

			for _, deliveryID := range deliveryIDs {
				h.BroadcastProgressUpdate(deliveryID)
			}
		}
	}()
}

func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.removeClient(c)
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		// Read message from client
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle authentication messages
		var baseMessage map[string]interface{}
		if err := json.Unmarshal(messageBytes, &baseMessage); err != nil {
			log.Printf("Failed to parse WebSocket message: %v", err)
			continue
		}

		msgType, ok := baseMessage["type"].(string)
		if !ok {
			continue
		}

		switch msgType {
		case "auth":
			c.handleAuthMessage(messageBytes)
		case "ping":
			// Respond to ping with pong
			c.sendPong()
		}
	}
}

func (c *WebSocketClient) handleAuthMessage(messageBytes []byte) {
	var authMsg AuthMessage
	if err := json.Unmarshal(messageBytes, &authMsg); err != nil {
		log.Printf("Failed to parse auth message: %v", err)
		c.sendAuthResponse(false, "Invalid auth message format", 0)
		return
	}

	// Validate session using the auth service via middleware
	// For now, we'll accept any session_id and authenticate the client
	// In production, you would validate the session_id against your session store
	if authMsg.SessionID == "" {
		c.sendAuthResponse(false, "Session ID is required", 0)
		return
	}

	// Mark client as authenticated
	c.authenticated = true
	log.Printf("Client authenticated for delivery %d with session %s", c.deliveryID, authMsg.SessionID)
	
	// Send success response with delivery ID
	c.sendAuthResponse(true, "Authentication successful", c.deliveryID)
}

func (c *WebSocketClient) sendAuthResponse(success bool, message string, deliveryID int) {
	response := AuthResponse{
		Type:    "auth_response",
		Success: success,
		Message: message,
	}
	
	if success {
		response.DeliveryID = deliveryID
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("Failed to marshal auth response: %v", err)
		return
	}

	select {
	case c.send <- responseBytes:
	default:
		// Client's send channel is full, close it
		c.hub.removeClient(c)
	}
}

func (c *WebSocketClient) sendPong() {
	pongResponse := map[string]string{
		"type": "pong",
	}
	
	responseBytes, err := json.Marshal(pongResponse)
	if err != nil {
		log.Printf("Failed to marshal pong response: %v", err)
		return
	}

	select {
	case c.send <- responseBytes:
	default:
		// Client's send channel is full, close it
		c.hub.removeClient(c)
	}
}

func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			c.conn.WriteMessage(websocket.TextMessage, message)

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
