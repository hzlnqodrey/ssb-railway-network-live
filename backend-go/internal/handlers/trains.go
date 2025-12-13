package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

// TrainsHandler handles train-related requests.
type TrainsHandler struct {
	gtfsService  *services.GTFSService
	swissService *services.SwissTransportService
	useSwissAPI  bool
}

// NewTrainsHandler creates a new trains handler.
func NewTrainsHandler(gtfsService *services.GTFSService, swissService *services.SwissTransportService, useSwissAPI bool) *TrainsHandler {
	return &TrainsHandler{
		gtfsService:  gtfsService,
		swissService: swissService,
		useSwissAPI:  useSwissAPI,
	}
}

// GetTrains returns all trains with optional filtering.
func (h *TrainsHandler) GetTrains(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	// Get query parameters for filtering
	category := r.URL.Query().Get("category")
	operator := r.URL.Query().Get("operator")
	delayedOnly := r.URL.Query().Get("delayed") == "true"
	limitStr := r.URL.Query().Get("limit")

	trains := h.gtfsService.GetLiveTrains()

	// Apply filters
	var filtered []models.Train
	for _, train := range trains {
		// Filter by category
		if category != "" && !strings.EqualFold(train.Category, category) {
			continue
		}

		// Filter by operator
		if operator != "" && !strings.EqualFold(train.Operator, operator) {
			continue
		}

		// Filter delayed trains only
		if delayedOnly && train.Delay <= 0 {
			continue
		}

		filtered = append(filtered, train)
	}

	// Apply limit
	if limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit < len(filtered) {
			filtered = filtered[:limit]
		}
	}

	response := models.APIResponse{
		Data: filtered,
		Meta: &models.APIMeta{
			Total:     len(filtered),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
			Filters: map[string]interface{}{
				"category": category,
				"operator": operator,
				"delayed":  delayedOnly,
				"limit":    limitStr,
			},
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetLiveTrains returns live train positions.
func (h *TrainsHandler) GetLiveTrains(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	trains := h.gtfsService.GetLiveTrains()

	response := models.APIResponse{
		Data: trains,
		Meta: &models.APIMeta{
			Timestamp:      time.Now().Format(time.RFC3339),
			Source:         "swiss_gtfs_data",
			UpdateInterval: 5000,
			Note:           "Live train positions from Swiss GTFS data",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetTrain returns a specific train by ID.
func (h *TrainsHandler) GetTrain(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	vars := mux.Vars(r)
	trainID := vars["id"]

	trains := h.gtfsService.GetLiveTrains()

	var found *models.Train
	for _, train := range trains {
		if train.ID == trainID {
			found = &train
			break
		}
	}

	if found == nil {
		sendError(w, http.StatusNotFound, "Train not found", "Train with ID "+trainID+" does not exist")
		return
	}

	response := models.APIResponse{
		Data: found,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetTrainStats returns train statistics summary.
func (h *TrainsHandler) GetTrainStats(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	stats := h.gtfsService.GetTrainStats()

	response := models.APIResponse{
		Data: stats,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
		},
	}

	json.NewEncoder(w).Encode(response)
}
