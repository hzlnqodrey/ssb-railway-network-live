// Package models - Favorites Domain
// This file contains favorite station and train data structures.
// Demonstrates HTTP POST/PUT/DELETE operations.
package models

// ============================================================================
// FAVORITE STATION - For learning HTTP methods
// ============================================================================

// FavoriteStation represents a user's favorite station with optional notes.
type FavoriteStation struct {
	ID        string  `json:"id"`                  // Unique favorite ID (UUID)
	StationID string  `json:"stationId"`           // Reference to station
	Station   Station `json:"station"`             // Embedded station data
	Nickname  string  `json:"nickname,omitempty"`  // User-defined nickname
	Notes     string  `json:"notes,omitempty"`     // User notes (max 500 chars)
	CreatedAt string  `json:"createdAt"`           // ISO8601 timestamp
	UpdatedAt string  `json:"updatedAt,omitempty"` // ISO8601 timestamp
}

// CreateFavoriteStationRequest is the request body for POST /api/favorites/stations
type CreateFavoriteStationRequest struct {
	StationID string `json:"stationId"` // Required: station ID to favorite
	Nickname  string `json:"nickname"`  // Optional: custom name (max 100 chars)
	Notes     string `json:"notes"`     // Optional: notes (max 500 chars)
}

// UpdateFavoriteStationRequest is the request body for PUT /api/favorites/stations/{id}
type UpdateFavoriteStationRequest struct {
	Nickname string `json:"nickname"` // Optional: update nickname
	Notes    string `json:"notes"`    // Optional: update notes
}

// ============================================================================
// FAVORITE TRAIN - For learning HTTP methods + auto-follow
// ============================================================================

// FavoriteTrain represents a user's favorite train with auto-follow settings.
type FavoriteTrain struct {
	ID         string `json:"id"`                  // Unique favorite ID (UUID)
	TrainID    string `json:"trainId"`             // Reference to train
	Train      Train  `json:"train"`               // Embedded train data (snapshot)
	Nickname   string `json:"nickname,omitempty"`  // User-defined nickname
	Notes      string `json:"notes,omitempty"`     // User notes (max 500 chars)
	AutoFollow bool   `json:"autoFollow"`          // Auto-follow when selected
	CreatedAt  string `json:"createdAt"`           // ISO8601 timestamp
	UpdatedAt  string `json:"updatedAt,omitempty"` // ISO8601 timestamp
}

// CreateFavoriteTrainRequest is the request body for POST /api/favorites/trains
type CreateFavoriteTrainRequest struct {
	TrainID    string `json:"trainId"`    // Required: train ID to favorite
	Nickname   string `json:"nickname"`   // Optional: custom name
	Notes      string `json:"notes"`      // Optional: notes
	AutoFollow bool   `json:"autoFollow"` // Optional: auto-follow on select
}

// UpdateFavoriteTrainRequest is the request body for PUT /api/favorites/trains/{id}
type UpdateFavoriteTrainRequest struct {
	Nickname   string `json:"nickname"`   // Optional: update nickname
	Notes      string `json:"notes"`      // Optional: update notes
	AutoFollow *bool  `json:"autoFollow"` // Optional: update auto-follow (pointer to distinguish from false)
}

// ============================================================================
// LEGACY SUPPORT - Keep old Favorite type for backwards compatibility
// ============================================================================

// Favorite is an alias for FavoriteStation (backwards compatibility)
type Favorite = FavoriteStation

// CreateFavoriteRequest is an alias (backwards compatibility)
type CreateFavoriteRequest = CreateFavoriteStationRequest

// UpdateFavoriteRequest is an alias (backwards compatibility)
type UpdateFavoriteRequest = UpdateFavoriteStationRequest

// ============================================================================
// VALIDATION
// ============================================================================

// FavoriteValidationError represents validation errors for favorite operations
type FavoriteValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
