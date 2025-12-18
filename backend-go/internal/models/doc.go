// Package models provides domain-specific data structures for the Swiss Railway API.
//
// This package is organized into microservice-style domains:
//
//   - station.go:   Station, Coordinate, Departure structures
//   - train.go:     Train, Position, TrainStop structures
//   - favorites.go: FavoriteStation, FavoriteTrain structures
//   - api.go:       APIResponse, APIError, Pagination structures
//   - gtfs.go:      GTFS data parsing structures
//   - health.go:    HealthResponse and system status
//
// Each domain file is self-contained and can be evolved independently.
package models
