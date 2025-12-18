// Package models - API Response Domain
// This file contains API response/error structures.
package models

// Pagination holds pagination metadata.
type Pagination struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// APIMeta contains metadata for API responses.
type APIMeta struct {
	Total          int         `json:"total,omitempty"`
	Count          int         `json:"count,omitempty"`
	Timestamp      string      `json:"timestamp"`
	Source         string      `json:"source"`
	Pagination     *Pagination `json:"pagination,omitempty"`
	Filters        interface{} `json:"filters,omitempty"`
	Note           string      `json:"note,omitempty"`
	UpdateInterval int         `json:"updateInterval,omitempty"`
	TimeMultiplier float64     `json:"timeMultiplier,omitempty"`
}

// APIResponse is the standard response wrapper.
type APIResponse struct {
	Data  interface{} `json:"data"`
	Meta  *APIMeta    `json:"meta,omitempty"`
	Error *APIError   `json:"error,omitempty"`
}

// APIError represents an API error response.
type APIError struct {
	Error     string `json:"error"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

// WebSocketMessage represents a WebSocket message.
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp string      `json:"timestamp"`
	GTFSReady bool        `json:"gtfs_loaded,omitempty"`
}
