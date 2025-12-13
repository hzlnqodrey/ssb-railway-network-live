package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

// StationsHandler handles station-related requests.
type StationsHandler struct {
	gtfsService  *services.GTFSService
	swissService *services.SwissTransportService
	useSwissAPI  bool
}

// NewStationsHandler creates a new stations handler.
func NewStationsHandler(gtfsService *services.GTFSService, swissService *services.SwissTransportService, useSwissAPI bool) *StationsHandler {
	return &StationsHandler{
		gtfsService:  gtfsService,
		swissService: swissService,
		useSwissAPI:  useSwissAPI,
	}
}

// sendError sends an error response.
func sendError(w http.ResponseWriter, status int, errType, message string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(models.APIError{
		Error:     errType,
		Message:   message,
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

// sendServiceUnavailable sends a service unavailable response.
func sendServiceUnavailable(w http.ResponseWriter) {
	sendError(w, http.StatusServiceUnavailable, "Service Unavailable", "GTFS data is still loading. Please try again later.")
}

// GetStations returns all stations with pagination.
func (h *StationsHandler) GetStations(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	stations, total := h.gtfsService.GetStations(limit, offset)

	response := models.APIResponse{
		Data: stations,
		Meta: &models.APIMeta{
			Total:     total,
			Count:     len(stations),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
			Pagination: &models.Pagination{
				Limit:  limit,
				Offset: offset,
			},
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetStation returns a specific station by ID.
func (h *StationsHandler) GetStation(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	vars := mux.Vars(r)
	stationID := vars["id"]

	station := h.gtfsService.GetStationByID(stationID)
	if station == nil {
		sendError(w, http.StatusNotFound, "Station not found", "Station with ID "+stationID+" does not exist")
		return
	}

	response := models.APIResponse{
		Data: station,
		Meta: &models.APIMeta{
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetStationDepartures returns departures from a station.
func (h *StationsHandler) GetStationDepartures(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	vars := mux.Vars(r)
	stationID := vars["id"]

	departures := h.gtfsService.GetStationDepartures(stationID)
	if departures == nil || departures.Station == nil {
		sendError(w, http.StatusNotFound, "Station not found", "Station with ID "+stationID+" does not exist")
		return
	}

	response := models.APIResponse{
		Data: map[string]interface{}{
			"station":    departures.Station,
			"departures": departures.Departures,
		},
		Meta: &models.APIMeta{
			Count:     departures.Count,
			Timestamp: departures.Timestamp,
			Source:    "swiss_gtfs_data",
			Note:      "Real-time departure data from Swiss GTFS",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// SearchStations searches stations by name or ID.
func (h *StationsHandler) SearchStations(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	vars := mux.Vars(r)
	query := vars["query"]

	if len(query) < 2 {
		sendError(w, http.StatusBadRequest, "Invalid query", "Search query must be at least 2 characters")
		return
	}

	// Try Swiss Transport API first if enabled
	var results []models.Station
	if h.useSwissAPI && h.swissService != nil {
		var err error
		results, err = h.swissService.SearchStations(query)
		if err != nil {
			// Fall back to GTFS data
			results = h.gtfsService.SearchStations(query)
		}
	} else {
		results = h.gtfsService.SearchStations(query)
	}

	response := models.APIResponse{
		Data: results,
		Meta: &models.APIMeta{
			Total:     len(results),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
		},
	}

	json.NewEncoder(w).Encode(response)
}

// GetNearbyStations returns stations near a location.
func (h *StationsHandler) GetNearbyStations(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		sendServiceUnavailable(w)
		return
	}

	vars := mux.Vars(r)

	lat, err := strconv.ParseFloat(vars["lat"], 64)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid coordinates", "Latitude must be a valid number")
		return
	}

	lng, err := strconv.ParseFloat(vars["lng"], 64)
	if err != nil {
		sendError(w, http.StatusBadRequest, "Invalid coordinates", "Longitude must be a valid number")
		return
	}

	radius := 10.0
	if r.URL.Query().Get("radius") != "" {
		radius, _ = strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
		if radius <= 0 {
			radius = 10
		}
		if radius > 100 {
			radius = 100
		}
	}

	results := h.gtfsService.GetNearbyStations(lat, lng, radius)

	response := models.APIResponse{
		Data: results,
		Meta: &models.APIMeta{
			Total:     len(results),
			Timestamp: time.Now().Format(time.RFC3339),
			Source:    "swiss_gtfs_data",
		},
	}

	json.NewEncoder(w).Encode(response)
}
