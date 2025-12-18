// Package models - Train Domain
// This file contains all train-related data structures.
package models

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
