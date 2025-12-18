// Package models - Station Domain
// This file contains all station-related data structures.
package models

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

// Departure represents a scheduled departure from a station.
type Departure struct {
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
type StationDepartures struct {
	Station    *Station    `json:"station"`
	Departures []Departure `json:"departures"`
	Count      int         `json:"count"`
	Timestamp  string      `json:"timestamp"`
}
