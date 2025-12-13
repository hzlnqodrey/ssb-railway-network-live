// Package models defines all data structures for the Swiss Railway API.
// These models are designed to be compatible with the frontend expectations.
package models

import "time"

// Coordinate represents a geographic location.
type Coordinate struct {
	X float64 `json:"x"` // Longitude
	Y float64 `json:"y"` // Latitude
}

// Station represents a railway station.
type Station struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Coordinate Coordinate `json:"coordinate"`
	Distance   *float64   `json:"distance,omitempty"`
}

// Position represents a train's geographic position.
type Position struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// TrainStop represents a stop in a train's timetable.
type TrainStop struct {
	Station          *Station `json:"station,omitempty"`
	ArrivalTime      string   `json:"arrivalTime,omitempty"`
	DepartureTime    string   `json:"departureTime,omitempty"`
	ArrivalDelay     int      `json:"arrivalDelay,omitempty"`
	DepartureDelay   int      `json:"departureDelay,omitempty"`
	Platform         string   `json:"platform,omitempty"`
	IsCurrentStation bool     `json:"isCurrentStation,omitempty"`
	IsPassed         bool     `json:"isPassed,omitempty"`
	IsSkipped        bool     `json:"isSkipped,omitempty"`
}

// Train represents a train with its current status and position.
type Train struct {
	ID             string      `json:"id"`
	Name           string      `json:"name"`
	Category       string      `json:"category"`
	Number         string      `json:"number"`
	Operator       string      `json:"operator"`
	From           string      `json:"from"`
	To             string      `json:"to"`
	Position       *Position   `json:"position,omitempty"`
	CurrentStation *Station    `json:"currentStation,omitempty"`
	Delay          int         `json:"delay"`
	Cancelled      bool        `json:"cancelled"`
	Speed          int         `json:"speed"`
	Direction      int         `json:"direction"`
	LastUpdate     string      `json:"lastUpdate"`
	DepartureTime  string      `json:"departureTime,omitempty"`
	ArrivalTime    string      `json:"arrivalTime,omitempty"`
	Timetable      []TrainStop `json:"timetable,omitempty"`
}

// Departure represents a scheduled departure from a station.
type Departure struct {
	TripID        string `json:"tripId"`
	RouteName     string `json:"routeName"`
	RouteLongName string `json:"routeLongName"`
	Operator      string `json:"operator"`
	DepartureTime string `json:"departureTime"`
	ArrivalTime   string `json:"arrivalTime"`
	Sequence      int    `json:"sequence"`
}

// StationDepartures contains a station and its upcoming departures.
type StationDepartures struct {
	Station    *Station    `json:"station"`
	Departures []Departure `json:"departures"`
	Count      int         `json:"count"`
	Timestamp  string      `json:"timestamp"`
}

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

// GTFSStats contains statistics about loaded GTFS data.
type GTFSStats struct {
	Agencies   int    `json:"agencies"`
	Stops      int    `json:"stops"`
	Routes     int    `json:"routes"`
	Trips      int    `json:"trips"`
	StopTimes  int    `json:"stopTimes"`
	DataLoaded bool   `json:"dataLoaded"`
	Timestamp  string `json:"timestamp"`
}

// TrainStats contains aggregated train statistics.
type TrainStats struct {
	Total        int            `json:"total"`
	ByCategory   map[string]int `json:"byCategory"`
	ByOperator   map[string]int `json:"byOperator"`
	Delayed      int            `json:"delayed"`
	OnTime       int            `json:"onTime"`
	Cancelled    int            `json:"cancelled"`
	AverageDelay float64        `json:"averageDelay"`
	AverageSpeed float64        `json:"averageSpeed"`
}

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
	Uptime    string    `json:"uptime"`
	GTFSReady bool      `json:"gtfs_ready"`
}

// WebSocketMessage represents a WebSocket message.
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp string      `json:"timestamp"`
	GTFSReady bool        `json:"gtfs_loaded,omitempty"`
}

// GTFS Raw Data Structures (for CSV parsing)

// GTFSAgency represents an agency from agency.txt
type GTFSAgency struct {
	AgencyID       string `csv:"agency_id"`
	AgencyName     string `csv:"agency_name"`
	AgencyURL      string `csv:"agency_url"`
	AgencyTimezone string `csv:"agency_timezone"`
}

// GTFSStop represents a stop from stops.txt
type GTFSStop struct {
	StopID   string `csv:"stop_id"`
	StopName string `csv:"stop_name"`
	StopLat  string `csv:"stop_lat"`
	StopLon  string `csv:"stop_lon"`
}

// GTFSRoute represents a route from routes.txt
type GTFSRoute struct {
	RouteID        string `csv:"route_id"`
	AgencyID       string `csv:"agency_id"`
	RouteShortName string `csv:"route_short_name"`
	RouteLongName  string `csv:"route_long_name"`
	RouteType      string `csv:"route_type"`
}

// GTFSTrip represents a trip from trips.txt
type GTFSTrip struct {
	RouteID      string `csv:"route_id"`
	ServiceID    string `csv:"service_id"`
	TripID       string `csv:"trip_id"`
	TripHeadsign string `csv:"trip_headsign"`
	DirectionID  string `csv:"direction_id"`
}

// GTFSStopTime represents a stop time from stop_times.txt
type GTFSStopTime struct {
	TripID        string `csv:"trip_id"`
	ArrivalTime   string `csv:"arrival_time"`
	DepartureTime string `csv:"departure_time"`
	StopID        string `csv:"stop_id"`
	StopSequence  string `csv:"stop_sequence"`
}

// GTFSCalendar represents a calendar entry from calendar.txt
type GTFSCalendar struct {
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
