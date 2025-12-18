// Package models - Health/System Domain
// This file contains health check and system status structures.
package models

import "time"

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
	Uptime    string    `json:"uptime"`
	GTFSReady bool      `json:"gtfs_ready"`
}
