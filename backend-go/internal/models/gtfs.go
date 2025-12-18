// Package models - GTFS Data Domain
// This file contains GTFS (General Transit Feed Specification) data structures.
package models

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
