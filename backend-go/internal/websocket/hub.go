// Package websocket provides WebSocket functionality for real-time updates.
package websocket

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate the origin
		return true
	},
}

// Client represents a WebSocket client connection.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub manages all WebSocket clients and broadcasts.
type Hub struct {
	mu sync.RWMutex

	// Registered clients
	clients map[*Client]bool

	// Channel for broadcasting to all clients
	broadcast chan []byte

	// Register channel
	register chan *Client

	// Unregister channel
	unregister chan *Client

	// GTFS service for data
	gtfsService *services.GTFSService

	// Update interval
	updateInterval time.Duration

	// Shutdown channel
	done chan struct{}
}

// NewHub creates a new WebSocket hub.
func NewHub(gtfsService *services.GTFSService, updateIntervalSec int) *Hub {
	return &Hub{
		clients:        make(map[*Client]bool),
		broadcast:      make(chan []byte, 256),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		gtfsService:    gtfsService,
		updateInterval: time.Duration(updateIntervalSec) * time.Second,
		done:           make(chan struct{}),
	}
}

// Run starts the hub's main loop.
func (h *Hub) Run() {
	ticker := time.NewTicker(h.updateInterval)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Info().Int("clients", len(h.clients)).Msg("WebSocket client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Info().Int("clients", len(h.clients)).Msg("WebSocket client disconnected")

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()

		case <-ticker.C:
			// Broadcast live train data periodically
			if h.gtfsService.IsDataLoaded() && len(h.clients) > 0 {
				h.broadcastLiveData()
			}

		case <-h.done:
			return
		}
	}
}

// Stop stops the hub.
func (h *Hub) Stop() {
	close(h.done)
}

// broadcastLiveData sends live train data to all connected clients.
func (h *Hub) broadcastLiveData() {
	trains := h.gtfsService.GetLiveTrains()

	msg := models.WebSocketMessage{
		Type:      "live_trains_update",
		Data:      trains,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal live data")
		return
	}

	h.broadcast <- data
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// HandleWebSocket handles WebSocket upgrade requests.
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}

	h.register <- client

	// Send welcome message
	welcomeMsg := models.WebSocketMessage{
		Type:      "connection",
		Message:   "Connected to Swiss Railway Network WebSocket",
		Timestamp: time.Now().Format(time.RFC3339),
		GTFSReady: h.gtfsService.IsDataLoaded(),
	}

	welcomeData, _ := json.Marshal(welcomeMsg)
	client.send <- welcomeData

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// readPump reads messages from the WebSocket connection.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Warn().Err(err).Msg("WebSocket read error")
			}
			break
		}

		// Handle incoming messages
		c.handleMessage(message)
	}
}

// handleMessage processes incoming WebSocket messages.
func (c *Client) handleMessage(message []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Warn().Err(err).Msg("Invalid WebSocket message")
		return
	}

	msgType, _ := msg["type"].(string)
	log.Debug().Str("type", msgType).Msg("Received WebSocket message")

	switch msgType {
	case "request_live_data":
		if c.hub.gtfsService.IsDataLoaded() {
			trains := c.hub.gtfsService.GetLiveTrains()
			response := models.WebSocketMessage{
				Type:      "live_trains",
				Data:      trains,
				Timestamp: time.Now().Format(time.RFC3339),
			}
			data, _ := json.Marshal(response)
			c.send <- data
		}

	case "ping":
		response := models.WebSocketMessage{
			Type:      "pong",
			Timestamp: time.Now().Format(time.RFC3339),
		}
		data, _ := json.Marshal(response)
		c.send <- data

	default:
		// Echo unknown messages
		response := models.WebSocketMessage{
			Type:      "echo",
			Data:      msg,
			Timestamp: time.Now().Format(time.RFC3339),
		}
		data, _ := json.Marshal(response)
		c.send <- data
	}
}

// writePump writes messages to the WebSocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second) // Ping interval
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Write queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
