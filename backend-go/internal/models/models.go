// Package models defines all data structures for the Swiss Railway API.
//
// ============================================================================
// MONOLITHIC VERSION - For Documentation & Comparison
// ============================================================================
// This file is kept for educational purposes to compare with the microservice
// approach where models are split into domain-specific files:
//   - station.go, train.go, favorites.go, api.go, gtfs.go, health.go
//
// In production, you can choose either approach:
// - Monolith: All models in one file (simpler, easier to navigate small projects)
// - Microservice: Split by domain (better for large teams, clearer boundaries)
// ============================================================================
package models

import "time"

// ============================================================================
// GEOGRAPHY DOMAIN
// ============================================================================

// Coordinate represents a geographic location.
type CoordinateMonolith struct {
	X float64 `json:"x"` // Longitude
	Y float64 `json:"y"` // Latitude
}

// Position represents a train's geographic position.
type PositionMonolith struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// ============================================================================
// STATION DOMAIN
// ============================================================================

// Station represents a railway station.
type StationMonolith struct {
	ID         string             `json:"id"`
	Name       string             `json:"name"`
	Coordinate CoordinateMonolith `json:"coordinate"`
	Distance   *float64           `json:"distance,omitempty"`
}

// Departure represents a scheduled departure from a station.
type DepartureMonolith struct {
	TripID        string `json:"tripId"`
	RouteName     string `json:"routeName"`
	RouteLongName string `json:"routeLongName"`
	Headsign      string `json:"headsign"`
	Operator      string `json:"operator"`
	DepartureTime string `json:"departureTime"`
	ArrivalTime   string `json:"arrivalTime"`
	Sequence      int    `json:"sequence"`
}

// StationDepartures contains a station and its upcoming departures.
type StationDeparturesMonolith struct {
	Station    *StationMonolith    `json:"station"`
	Departures []DepartureMonolith `json:"departures"`
	Count      int                 `json:"count"`
	Timestamp  string              `json:"timestamp"`
}

// ============================================================================
// TRAIN DOMAIN
// ============================================================================

// TrainStop represents a stop in a train's timetable.
type TrainStopMonolith struct {
	Station          *StationMonolith `json:"station,omitempty"`
	ArrivalTime      string           `json:"arrivalTime,omitempty"`
	DepartureTime    string           `json:"departureTime,omitempty"`
	ArrivalDelay     int              `json:"arrivalDelay,omitempty"`
	DepartureDelay   int              `json:"departureDelay,omitempty"`
	Platform         string           `json:"platform,omitempty"`
	IsCurrentStation bool             `json:"isCurrentStation,omitempty"`
	IsPassed         bool             `json:"isPassed,omitempty"`
	IsSkipped        bool             `json:"isSkipped,omitempty"`
}

// Train represents a train with its current status and position.
type TrainMonolith struct {
	ID             string              `json:"id"`
	Name           string              `json:"name"`
	Category       string              `json:"category"`
	Number         string              `json:"number"`
	Operator       string              `json:"operator"`
	From           string              `json:"from"`
	To             string              `json:"to"`
	Position       *PositionMonolith   `json:"position,omitempty"`
	CurrentStation *StationMonolith    `json:"currentStation,omitempty"`
	Delay          int                 `json:"delay"`
	Cancelled      bool                `json:"cancelled"`
	Speed          int                 `json:"speed"`
	Direction      int                 `json:"direction"`
	LastUpdate     string              `json:"lastUpdate"`
	DepartureTime  string              `json:"departureTime,omitempty"`
	ArrivalTime    string              `json:"arrivalTime,omitempty"`
	Timetable      []TrainStopMonolith `json:"timetable,omitempty"`
}

// TrainStats contains aggregated train statistics.
type TrainStatsMonolith struct {
	Total        int            `json:"total"`
	ByCategory   map[string]int `json:"byCategory"`
	ByOperator   map[string]int `json:"byOperator"`
	Delayed      int            `json:"delayed"`
	OnTime       int            `json:"onTime"`
	Cancelled    int            `json:"cancelled"`
	AverageDelay float64        `json:"averageDelay"`
	AverageSpeed float64        `json:"averageSpeed"`
}

// ============================================================================
// API RESPONSE DOMAIN
// ============================================================================

// Pagination holds pagination metadata.
type PaginationMonolith struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// APIMeta contains metadata for API responses.
type APIMetaMonolith struct {
	Total          int                 `json:"total,omitempty"`
	Count          int                 `json:"count,omitempty"`
	Timestamp      string              `json:"timestamp"`
	Source         string              `json:"source"`
	Pagination     *PaginationMonolith `json:"pagination,omitempty"`
	Filters        interface{}         `json:"filters,omitempty"`
	Note           string              `json:"note,omitempty"`
	UpdateInterval int                 `json:"updateInterval,omitempty"`
	TimeMultiplier float64             `json:"timeMultiplier,omitempty"`
}

// APIResponse is the standard response wrapper.
type APIResponseMonolith struct {
	Data  interface{}       `json:"data"`
	Meta  *APIMetaMonolith  `json:"meta,omitempty"`
	Error *APIErrorMonolith `json:"error,omitempty"`
}

// APIError represents an API error response.
type APIErrorMonolith struct {
	Error     string `json:"error"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

// ============================================================================
// HEALTH/SYSTEM DOMAIN
// ============================================================================

// GTFSStats contains statistics about loaded GTFS data.
type GTFSStatsMonolith struct {
	Agencies   int    `json:"agencies"`
	Stops      int    `json:"stops"`
	Routes     int    `json:"routes"`
	Trips      int    `json:"trips"`
	StopTimes  int    `json:"stopTimes"`
	DataLoaded bool   `json:"dataLoaded"`
	Timestamp  string `json:"timestamp"`
}

// HealthResponse represents the health check response.
type HealthResponseMonolith struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
	Uptime    string    `json:"uptime"`
	GTFSReady bool      `json:"gtfs_ready"`
}

// WebSocketMessage represents a WebSocket message.
type WebSocketMessageMonolith struct {
	Type      string      `json:"type"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp string      `json:"timestamp"`
	GTFSReady bool        `json:"gtfs_loaded,omitempty"`
}

// ============================================================================
// GTFS RAW DATA DOMAIN
// ============================================================================

// GTFSAgency represents an agency from agency.txt
type GTFSAgencyMonolith struct {
	AgencyID       string `csv:"agency_id"`
	AgencyName     string `csv:"agency_name"`
	AgencyURL      string `csv:"agency_url"`
	AgencyTimezone string `csv:"agency_timezone"`
}

// GTFSStop represents a stop from stops.txt
type GTFSStopMonolith struct {
	StopID   string `csv:"stop_id"`
	StopName string `csv:"stop_name"`
	StopLat  string `csv:"stop_lat"`
	StopLon  string `csv:"stop_lon"`
}

// GTFSRoute represents a route from routes.txt
type GTFSRouteMonolith struct {
	RouteID        string `csv:"route_id"`
	AgencyID       string `csv:"agency_id"`
	RouteShortName string `csv:"route_short_name"`
	RouteLongName  string `csv:"route_long_name"`
	RouteType      string `csv:"route_type"`
}

// GTFSTrip represents a trip from trips.txt
type GTFSTripMonolith struct {
	RouteID      string `csv:"route_id"`
	ServiceID    string `csv:"service_id"`
	TripID       string `csv:"trip_id"`
	TripHeadsign string `csv:"trip_headsign"`
	DirectionID  string `csv:"direction_id"`
}

// GTFSStopTime represents a stop time from stop_times.txt
type GTFSStopTimeMonolith struct {
	TripID        string `csv:"trip_id"`
	ArrivalTime   string `csv:"arrival_time"`
	DepartureTime string `csv:"departure_time"`
	StopID        string `csv:"stop_id"`
	StopSequence  string `csv:"stop_sequence"`
}

// GTFSCalendar represents a calendar entry from calendar.txt
type GTFSCalendarMonolith struct {
	ServiceID string `csv:"service_id"`
	Monday    string `csv:"monday"`
	Tuesday   string `csv:"tuesday"`
	Wednesday string `csv:"wednesday"`
	Thursday  string `csv:"thursday"`
	Friday    string `csv:"friday"`
	Saturday  string `csv:"saturday"`
	Sunday    string `csv:"sunday"`
	StartDate string `csv:"start_date"`
	EndDate   string `csv:"end_date"`
}

// ============================================================================
// FAVORITES DOMAIN
// ============================================================================

// FavoriteMonolith represents a user's favorite station with optional notes.
type FavoriteMonolith struct {
	ID        string          `json:"id"`
	StationID string          `json:"stationId"`
	Station   StationMonolith `json:"station"`
	Nickname  string          `json:"nickname,omitempty"`
	Notes     string          `json:"notes,omitempty"`
	CreatedAt string          `json:"createdAt"`
	UpdatedAt string          `json:"updatedAt,omitempty"`
}

// CreateFavoriteRequestMonolith is the request body for POST /api/favorites
type CreateFavoriteRequestMonolith struct {
	StationID string `json:"stationId"`
	Nickname  string `json:"nickname"`
	Notes     string `json:"notes"`
}

// UpdateFavoriteRequestMonolith is the request body for PUT /api/favorites/{id}
type UpdateFavoriteRequestMonolith struct {
	Nickname string `json:"nickname"`
	Notes    string `json:"notes"`
}

// FavoriteValidationErrorMonolith represents validation errors
type FavoriteValidationErrorMonolith struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}
