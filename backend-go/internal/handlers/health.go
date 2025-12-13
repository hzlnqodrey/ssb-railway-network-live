// Package handlers contains HTTP request handlers.
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/swiss-railway/backend-go/internal/models"
	"github.com/swiss-railway/backend-go/internal/services"
)

// HealthHandler handles health check requests.
type HealthHandler struct {
	startTime   time.Time
	gtfsService *services.GTFSService
}

// NewHealthHandler creates a new health handler.
func NewHealthHandler(gtfsService *services.GTFSService) *HealthHandler {
	return &HealthHandler{
		startTime:   time.Now(),
		gtfsService: gtfsService,
	}
}

// Health returns the health status of the API.
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(h.startTime).Round(time.Second).String()

	response := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    uptime,
		GTFSReady: h.gtfsService.IsDataLoaded(),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Ready returns readiness status (for Kubernetes probes).
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	if !h.gtfsService.IsDataLoaded() {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "not_ready",
			"message": "GTFS data is still loading",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ready",
	})
}

// Live returns liveness status (for Kubernetes probes).
func (h *HealthHandler) Live(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "alive",
	})
}
