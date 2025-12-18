// Package handlers provides HTTP handlers for the Swiss Railway API.
// This file implements CRUD operations for favorite stations.
//
// LEARNING NOTES - HTTP Methods:
// - GET:    Retrieve resources (safe, idempotent)
// - POST:   Create new resource (not idempotent - each call creates new)
// - PUT:    Update/replace resource (idempotent - same result on repeat)
// - DELETE: Remove resource (idempotent - same result on repeat)
//
// SECURITY PRACTICES IMPLEMENTED:
// 1. Input validation (length limits, required fields)
// 2. Input sanitization (HTML/script stripping to prevent XSS)
// 3. Parameterized operations (no SQL injection as we use in-memory)
// 4. CSRF protection via SameSite cookies + custom headers
// 5. Content-Type validation
// 6. Rate limiting (handled by middleware)

package handlers

import (
	"encoding/json"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

// FavoritesHandler handles favorite station and train operations.
// Uses an in-memory store with mutex for thread safety.
type FavoritesHandler struct {
	gtfsService    *services.GTFSService
	favorites      map[string]*models.Favorite      // Key: favorite station ID
	favoriteTrains map[string]*models.FavoriteTrain // Key: favorite train ID
	mutex          sync.RWMutex                     // Thread-safe access
}

// NewFavoritesHandler creates a new favorites handler.
func NewFavoritesHandler(gtfsService *services.GTFSService) *FavoritesHandler {
	return &FavoritesHandler{
		gtfsService:    gtfsService,
		favorites:      make(map[string]*models.Favorite),
		favoriteTrains: make(map[string]*models.FavoriteTrain),
	}
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

// sanitizeString removes potentially dangerous HTML/script content.
// This prevents XSS (Cross-Site Scripting) attacks.
func sanitizeString(input string) string {
	// 1. Trim whitespace
	input = strings.TrimSpace(input)

	// 2. Escape HTML entities (prevents <script> injection)
	input = html.EscapeString(input)

	// 3. Remove any remaining script-like patterns
	scriptPattern := regexp.MustCompile(`(?i)(javascript:|data:|vbscript:|on\w+=)`)
	input = scriptPattern.ReplaceAllString(input, "")

	return input
}

// validateContentType ensures the request has JSON content type.
// This prevents CSRF attacks via form submissions.
func validateContentType(r *http.Request) bool {
	contentType := r.Header.Get("Content-Type")
	return strings.HasPrefix(contentType, "application/json")
}

// ============================================================================
// GET /api/favorites - Get all favorites
// ============================================================================

// GetFavorites returns all favorite stations.
// This is a safe, idempotent operation (HTTP GET).
func (h *FavoritesHandler) GetFavorites(w http.ResponseWriter, r *http.Request) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	// Convert map to slice
	favorites := make([]*models.Favorite, 0, len(h.favorites))
	for _, fav := range h.favorites {
		favorites = append(favorites, fav)
	}

	log.Debug().Int("count", len(favorites)).Msg("GET favorites")

	response := models.APIResponse{
		Data: favorites,
		Meta: &models.APIMeta{
			Total:     len(favorites),
			Count:     len(favorites),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_store",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetFavorite returns a specific favorite by ID.
func (h *FavoritesHandler) GetFavorite(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	h.mutex.RLock()
	favorite, exists := h.favorites[id]
	h.mutex.RUnlock()

	if !exists {
		sendError(w, http.StatusNotFound, "Not Found", "Favorite with ID "+id+" does not exist")
		return
	}

	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_store",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ============================================================================
// POST /api/favorites - Create a new favorite
// ============================================================================

// CreateFavorite adds a new station to favorites.
//
// LEARNING NOTES - POST Method:
// - Used to CREATE new resources
// - NOT idempotent: calling twice creates two resources
// - Request body contains the data to create
// - Returns 201 Created on success with the created resource
// - Returns 400 Bad Request for validation errors
// - Returns 409 Conflict if resource already exists
func (h *FavoritesHandler) CreateFavorite(w http.ResponseWriter, r *http.Request) {
	// SECURITY: Validate Content-Type to prevent CSRF via form submission
	if !validateContentType(r) {
		log.Warn().Str("content_type", r.Header.Get("Content-Type")).Msg("Invalid Content-Type")
		sendError(w, http.StatusUnsupportedMediaType, "Invalid Content-Type",
			"Content-Type must be application/json")
		return
	}

	// SECURITY: Limit request body size to prevent DoS
	r.Body = http.MaxBytesReader(w, r.Body, 1024*10) // 10KB max

	// Parse request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read request body")
		sendError(w, http.StatusBadRequest, "Bad Request", "Failed to read request body")
		return
	}

	var req models.CreateFavoriteRequest
	if err := json.Unmarshal(body, &req); err != nil {
		log.Error().Err(err).Msg("Failed to parse JSON")
		sendError(w, http.StatusBadRequest, "Bad Request", "Invalid JSON format")
		return
	}

	// VALIDATION: StationID is required
	if req.StationID == "" {
		sendError(w, http.StatusBadRequest, "Validation Error", "stationId is required")
		return
	}

	// VALIDATION: Check if station exists
	station := h.gtfsService.GetStationByID(req.StationID)
	if station == nil {
		sendError(w, http.StatusBadRequest, "Validation Error",
			"Station with ID "+req.StationID+" does not exist")
		return
	}

	// VALIDATION: Check for duplicates
	h.mutex.RLock()
	for _, fav := range h.favorites {
		if fav.StationID == req.StationID {
			h.mutex.RUnlock()
			sendError(w, http.StatusConflict, "Conflict",
				"Station is already in favorites")
			return
		}
	}
	h.mutex.RUnlock()

	// SECURITY: Sanitize user input to prevent XSS
	nickname := sanitizeString(req.Nickname)
	notes := sanitizeString(req.Notes)

	// VALIDATION: Length limits
	if len(nickname) > 100 {
		sendError(w, http.StatusBadRequest, "Validation Error",
			"Nickname must be 100 characters or less")
		return
	}
	if len(notes) > 500 {
		sendError(w, http.StatusBadRequest, "Validation Error",
			"Notes must be 500 characters or less")
		return
	}

	// Create the favorite
	now := time.Now().Format(time.RFC3339)
	favorite := &models.Favorite{
		ID:        uuid.New().String(), // Generate unique ID
		StationID: req.StationID,
		Station:   *station,
		Nickname:  nickname,
		Notes:     notes,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save to store
	h.mutex.Lock()
	h.favorites[favorite.ID] = favorite
	h.mutex.Unlock()

	log.Info().
		Str("id", favorite.ID).
		Str("stationId", favorite.StationID).
		Msg("Created favorite")

	// Return 201 Created with the new resource
	w.WriteHeader(http.StatusCreated)
	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: now,
			Source:    "favorites_store",
			Note:      "Favorite created successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ============================================================================
// PUT /api/favorites/{id} - Update a favorite
// ============================================================================

// UpdateFavorite modifies an existing favorite.
//
// LEARNING NOTES - PUT Method:
// - Used to UPDATE/REPLACE existing resources
// - IDEMPOTENT: calling twice with same data = same result
// - Request body contains the updated data
// - Returns 200 OK on success with updated resource
// - Returns 404 Not Found if resource doesn't exist
// - Returns 400 Bad Request for validation errors
func (h *FavoritesHandler) UpdateFavorite(w http.ResponseWriter, r *http.Request) {
	// SECURITY: Validate Content-Type
	if !validateContentType(r) {
		sendError(w, http.StatusUnsupportedMediaType, "Invalid Content-Type",
			"Content-Type must be application/json")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	// Check if favorite exists
	h.mutex.RLock()
	favorite, exists := h.favorites[id]
	h.mutex.RUnlock()

	if !exists {
		sendError(w, http.StatusNotFound, "Not Found",
			"Favorite with ID "+id+" does not exist")
		return
	}

	// SECURITY: Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, 1024*10)

	// Parse request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Failed to read request body")
		return
	}

	var req models.UpdateFavoriteRequest
	if err := json.Unmarshal(body, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Invalid JSON format")
		return
	}

	// SECURITY: Sanitize inputs
	nickname := sanitizeString(req.Nickname)
	notes := sanitizeString(req.Notes)

	// VALIDATION: Length limits
	if len(nickname) > 100 {
		sendError(w, http.StatusBadRequest, "Validation Error",
			"Nickname must be 100 characters or less")
		return
	}
	if len(notes) > 500 {
		sendError(w, http.StatusBadRequest, "Validation Error",
			"Notes must be 500 characters or less")
		return
	}

	// Update the favorite
	h.mutex.Lock()
	favorite.Nickname = nickname
	favorite.Notes = notes
	favorite.UpdatedAt = time.Now().Format(time.RFC3339)
	h.mutex.Unlock()

	log.Info().
		Str("id", id).
		Str("nickname", nickname).
		Msg("Updated favorite")

	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_store",
			Note:      "Favorite updated successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ============================================================================
// DELETE /api/favorites/{id} - Delete a favorite
// ============================================================================

// DeleteFavorite removes a favorite station.
//
// LEARNING NOTES - DELETE Method:
// - Used to REMOVE resources
// - IDEMPOTENT: deleting same resource twice = same result (resource gone)
// - Usually no request body needed
// - Returns 204 No Content on success (resource deleted)
// - Returns 404 Not Found if resource doesn't exist
// - Some APIs return 200 OK with deleted resource data
func (h *FavoritesHandler) DeleteFavorite(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	h.mutex.Lock()
	favorite, exists := h.favorites[id]
	if !exists {
		h.mutex.Unlock()
		sendError(w, http.StatusNotFound, "Not Found",
			"Favorite with ID "+id+" does not exist")
		return
	}

	// Delete the favorite
	delete(h.favorites, id)
	h.mutex.Unlock()

	log.Info().
		Str("id", id).
		Str("stationId", favorite.StationID).
		Msg("Deleted favorite")

	// Option 1: Return 204 No Content (most RESTful for DELETE)
	// w.WriteHeader(http.StatusNoContent)

	// Option 2: Return 200 OK with confirmation (more informative)
	response := models.APIResponse{
		Data: map[string]interface{}{
			"deleted": true,
			"id":      id,
		},
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_store",
			Note:      "Favorite deleted successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// ============================================================================
// FAVORITE TRAINS - With Auto-Follow Feature
// ============================================================================

// GetFavoriteTrains returns all favorite trains.
func (h *FavoritesHandler) GetFavoriteTrains(w http.ResponseWriter, r *http.Request) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	trains := make([]*models.FavoriteTrain, 0, len(h.favoriteTrains))
	for _, fav := range h.favoriteTrains {
		trains = append(trains, fav)
	}

	log.Debug().Int("count", len(trains)).Msg("GET favorite trains")

	response := models.APIResponse{
		Data: trains,
		Meta: &models.APIMeta{
			Total:     len(trains),
			Count:     len(trains),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_trains_store",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetFavoriteTrain returns a specific favorite train by ID.
func (h *FavoritesHandler) GetFavoriteTrain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	h.mutex.RLock()
	favorite, exists := h.favoriteTrains[id]
	h.mutex.RUnlock()

	if !exists {
		sendError(w, http.StatusNotFound, "Not Found", "Favorite train with ID "+id+" does not exist")
		return
	}

	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_trains_store",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// CreateFavoriteTrain adds a new train to favorites with auto-follow option.
func (h *FavoritesHandler) CreateFavoriteTrain(w http.ResponseWriter, r *http.Request) {
	if !validateContentType(r) {
		sendError(w, http.StatusUnsupportedMediaType, "Invalid Content-Type",
			"Content-Type must be application/json")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024*10)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Failed to read request body")
		return
	}

	var req models.CreateFavoriteTrainRequest
	if err := json.Unmarshal(body, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Invalid JSON format")
		return
	}

	if req.TrainID == "" {
		sendError(w, http.StatusBadRequest, "Validation Error", "trainId is required")
		return
	}

	// Check for duplicates
	h.mutex.RLock()
	for _, fav := range h.favoriteTrains {
		if fav.TrainID == req.TrainID {
			h.mutex.RUnlock()
			sendError(w, http.StatusConflict, "Conflict", "Train is already in favorites")
			return
		}
	}
	h.mutex.RUnlock()

	nickname := sanitizeString(req.Nickname)
	notes := sanitizeString(req.Notes)

	if len(nickname) > 100 {
		sendError(w, http.StatusBadRequest, "Validation Error", "Nickname must be 100 characters or less")
		return
	}
	if len(notes) > 500 {
		sendError(w, http.StatusBadRequest, "Validation Error", "Notes must be 500 characters or less")
		return
	}

	now := time.Now().Format(time.RFC3339)
	favorite := &models.FavoriteTrain{
		ID:         uuid.New().String(),
		TrainID:    req.TrainID,
		Train:      models.Train{ID: req.TrainID},
		Nickname:   nickname,
		Notes:      notes,
		AutoFollow: req.AutoFollow,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	h.mutex.Lock()
	h.favoriteTrains[favorite.ID] = favorite
	h.mutex.Unlock()

	log.Info().
		Str("id", favorite.ID).
		Str("trainId", favorite.TrainID).
		Bool("autoFollow", favorite.AutoFollow).
		Msg("Created favorite train")

	w.WriteHeader(http.StatusCreated)
	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: now,
			Source:    "favorites_trains_store",
			Note:      "Favorite train created successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// UpdateFavoriteTrain modifies an existing favorite train.
func (h *FavoritesHandler) UpdateFavoriteTrain(w http.ResponseWriter, r *http.Request) {
	if !validateContentType(r) {
		sendError(w, http.StatusUnsupportedMediaType, "Invalid Content-Type",
			"Content-Type must be application/json")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	h.mutex.RLock()
	favorite, exists := h.favoriteTrains[id]
	h.mutex.RUnlock()

	if !exists {
		sendError(w, http.StatusNotFound, "Not Found", "Favorite train with ID "+id+" does not exist")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024*10)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Failed to read request body")
		return
	}

	var req models.UpdateFavoriteTrainRequest
	if err := json.Unmarshal(body, &req); err != nil {
		sendError(w, http.StatusBadRequest, "Bad Request", "Invalid JSON format")
		return
	}

	nickname := sanitizeString(req.Nickname)
	notes := sanitizeString(req.Notes)

	if len(nickname) > 100 {
		sendError(w, http.StatusBadRequest, "Validation Error", "Nickname must be 100 characters or less")
		return
	}
	if len(notes) > 500 {
		sendError(w, http.StatusBadRequest, "Validation Error", "Notes must be 500 characters or less")
		return
	}

	h.mutex.Lock()
	favorite.Nickname = nickname
	favorite.Notes = notes
	if req.AutoFollow != nil {
		favorite.AutoFollow = *req.AutoFollow
	}
	favorite.UpdatedAt = time.Now().Format(time.RFC3339)
	h.mutex.Unlock()

	log.Info().
		Str("id", id).
		Bool("autoFollow", favorite.AutoFollow).
		Msg("Updated favorite train")

	response := models.APIResponse{
		Data: favorite,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_trains_store",
			Note:      "Favorite train updated successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// DeleteFavoriteTrain removes a favorite train.
func (h *FavoritesHandler) DeleteFavoriteTrain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	h.mutex.Lock()
	favorite, exists := h.favoriteTrains[id]
	if !exists {
		h.mutex.Unlock()
		sendError(w, http.StatusNotFound, "Not Found", "Favorite train with ID "+id+" does not exist")
		return
	}

	delete(h.favoriteTrains, id)
	h.mutex.Unlock()

	log.Info().
		Str("id", id).
		Str("trainId", favorite.TrainID).
		Msg("Deleted favorite train")

	response := models.APIResponse{
		Data: map[string]interface{}{
			"deleted": true,
			"id":      id,
		},
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "favorites_trains_store",
			Note:      "Favorite train deleted successfully",
		},
	}

	json.NewEncoder(w).Encode(response)
}
