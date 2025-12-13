// Package services contains the Swiss Transport API integration.
package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/swiss-railway/backend-go/internal/models"
)

// SwissTransportService handles Swiss Open Transport API integration.
// API Documentation: https://transport.opendata.ch/docs.html
// Rate Limit: 1000 requests per 24 hours
type SwissTransportService struct {
	baseURL    string
	httpClient *http.Client

	// Rate limiting
	mu           sync.Mutex
	requestCount int
	windowStart  time.Time
}

// NewSwissTransportService creates a new Swiss Transport API service.
func NewSwissTransportService(baseURL string) *SwissTransportService {
	return &SwissTransportService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		windowStart: time.Now(),
	}
}

const (
	maxRequestsPerDay = 1000
	rateLimitWindow   = 24 * time.Hour
)

// checkRateLimit checks if we're within API rate limits.
func (s *SwissTransportService) checkRateLimit() bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Reset counter if window has passed
	if time.Since(s.windowStart) > rateLimitWindow {
		s.requestCount = 0
		s.windowStart = time.Now()
	}

	if s.requestCount >= maxRequestsPerDay {
		log.Warn().Msg("Swiss Transport API rate limit exceeded")
		return false
	}

	s.requestCount++
	return true
}

// GetRateLimitStatus returns current rate limit status.
func (s *SwissTransportService) GetRateLimitStatus() map[string]interface{} {
	s.mu.Lock()
	defer s.mu.Unlock()

	return map[string]interface{}{
		"used":       s.requestCount,
		"limit":      maxRequestsPerDay,
		"remaining":  maxRequestsPerDay - s.requestCount,
		"reset_time": s.windowStart.Add(rateLimitWindow).Format(time.RFC3339),
	}
}

// apiRequest makes a request to the Swiss Transport API.
func (s *SwissTransportService) apiRequest(endpoint string, params map[string]string) ([]byte, error) {
	if !s.checkRateLimit() {
		return nil, fmt.Errorf("rate limit exceeded, please try again later")
	}

	reqURL, err := url.Parse(s.baseURL + endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	q := reqURL.Query()
	for key, value := range params {
		q.Set(key, value)
	}
	reqURL.RawQuery = q.Encode()

	log.Debug().Str("url", reqURL.String()).Msg("🚂 Fetching from Swiss Transport API")

	req, err := http.NewRequest(http.MethodGet, reqURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "SwissRailwayNetwork-Go/1.0.0")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return body, nil
}

// LocationsResponse is the response from the /locations endpoint.
type LocationsResponse struct {
	Stations []struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		Coordinate struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"coordinate"`
		Distance float64 `json:"distance,omitempty"`
	} `json:"stations"`
}

// SearchStations searches for stations by name or coordinates.
func (s *SwissTransportService) SearchStations(query string) ([]models.Station, error) {
	params := map[string]string{"query": query}

	body, err := s.apiRequest("/locations", params)
	if err != nil {
		return nil, err
	}

	var resp LocationsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	stations := make([]models.Station, len(resp.Stations))
	for i, st := range resp.Stations {
		stations[i] = models.Station{
			ID:   st.ID,
			Name: st.Name,
			Coordinate: models.Coordinate{
				X: st.Coordinate.X,
				Y: st.Coordinate.Y,
			},
		}
		if st.Distance > 0 {
			dist := st.Distance
			stations[i].Distance = &dist
		}
	}

	return stations, nil
}

// StationBoardResponse is the response from the /stationboard endpoint.
type StationBoardResponse struct {
	Station struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		Coordinate struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"coordinate"`
	} `json:"station"`
	Stationboard []struct {
		Stop struct {
			Station struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				Coordinate struct {
					X float64 `json:"x"`
					Y float64 `json:"y"`
				} `json:"coordinate"`
			} `json:"station"`
			Arrival   *string `json:"arrival"`
			Departure *string `json:"departure"`
			Delay     int     `json:"delay"`
			Platform  string  `json:"platform"`
			Prognosis *struct {
				Platform  string  `json:"platform"`
				Arrival   *string `json:"arrival"`
				Departure *string `json:"departure"`
			} `json:"prognosis"`
		} `json:"stop"`
		Name         string `json:"name"`
		Category     string `json:"category"`
		Subcategory  string `json:"subcategory,omitempty"`
		CategoryCode int    `json:"categoryCode,omitempty"`
		Number       string `json:"number"`
		Operator     string `json:"operator"`
		To           string `json:"to"`
		PassList     []struct {
			Station struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				Coordinate struct {
					X float64 `json:"x"`
					Y float64 `json:"y"`
				} `json:"coordinate"`
			} `json:"station"`
			Arrival   *string `json:"arrival"`
			Departure *string `json:"departure"`
			Delay     int     `json:"delay"`
			Platform  string  `json:"platform"`
		} `json:"passList"`
		Capacity1st *int `json:"capacity1st,omitempty"`
		Capacity2nd *int `json:"capacity2nd,omitempty"`
	} `json:"stationboard"`
}

// GetStationBoard retrieves the departure board for a station.
func (s *SwissTransportService) GetStationBoard(stationID string, limit int) (*StationBoardResponse, error) {
	params := map[string]string{
		"station": stationID,
		"limit":   fmt.Sprintf("%d", limit),
	}

	body, err := s.apiRequest("/stationboard", params)
	if err != nil {
		return nil, err
	}

	var resp StationBoardResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse stationboard response: %w", err)
	}

	return &resp, nil
}

// ConnectionsResponse is the response from the /connections endpoint.
type ConnectionsResponse struct {
	Connections []struct {
		From struct {
			Station struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				Coordinate struct {
					X float64 `json:"x"`
					Y float64 `json:"y"`
				} `json:"coordinate"`
			} `json:"station"`
			Departure string `json:"departure"`
			Platform  string `json:"platform"`
		} `json:"from"`
		To struct {
			Station struct {
				ID         string `json:"id"`
				Name       string `json:"name"`
				Coordinate struct {
					X float64 `json:"x"`
					Y float64 `json:"y"`
				} `json:"coordinate"`
			} `json:"station"`
			Arrival  string `json:"arrival"`
			Platform string `json:"platform"`
		} `json:"to"`
		Duration  string   `json:"duration"`
		Transfers int      `json:"transfers"`
		Products  []string `json:"products"`
	} `json:"connections"`
}

// GetConnections retrieves connections between two stations.
func (s *SwissTransportService) GetConnections(from, to string, limit int) (*ConnectionsResponse, error) {
	params := map[string]string{
		"from":  from,
		"to":    to,
		"limit": fmt.Sprintf("%d", limit),
	}

	body, err := s.apiRequest("/connections", params)
	if err != nil {
		return nil, err
	}

	var resp ConnectionsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse connections response: %w", err)
	}

	return &resp, nil
}

// GetMajorStations returns Switzerland's major railway stations.
func (s *SwissTransportService) GetMajorStations() ([]models.Station, error) {
	majorStationNames := []string{
		"Zürich HB",
		"Bern",
		"Basel SBB",
		"Genève",
		"Lausanne",
		"Winterthur",
		"St. Gallen",
		"Luzern",
		"Lugano",
		"Thun",
		"Olten",
		"Chur",
	}

	var stations []models.Station

	for _, name := range majorStationNames {
		results, err := s.SearchStations(name)
		if err != nil {
			log.Warn().Str("station", name).Err(err).Msg("Failed to fetch major station")
			continue
		}

		if len(results) > 0 {
			// Try to find exact match, otherwise take first result
			found := false
			for _, st := range results {
				if st.Name == name {
					stations = append(stations, st)
					found = true
					break
				}
			}
			if !found {
				stations = append(stations, results[0])
			}
		}

		// Respect rate limits with small delay
		time.Sleep(100 * time.Millisecond)
	}

	return stations, nil
}

// GetLiveTrainPositions gets approximate train positions based on stationboard data.
// Note: Swiss Transport API doesn't provide real-time GPS, so positions are approximated.
func (s *SwissTransportService) GetLiveTrainPositions(majorStations []models.Station) ([]models.Train, error) {
	var trains []models.Train
	seenTrains := make(map[string]bool)

	// Limit stations to avoid rate limits
	stationsToCheck := majorStations
	if len(stationsToCheck) > 5 {
		stationsToCheck = stationsToCheck[:5]
	}

	for _, station := range stationsToCheck {
		board, err := s.GetStationBoard(station.ID, 5)
		if err != nil {
			log.Warn().Str("station", station.Name).Err(err).Msg("Failed to get stationboard")
			continue
		}

		for _, departure := range board.Stationboard {
			// Create unique ID for train
			trainID := fmt.Sprintf("%s-%s-%s", departure.Category, departure.Number, station.ID)
			if seenTrains[trainID] {
				continue
			}
			seenTrains[trainID] = true

			// Parse departure time
			var depTime string
			if departure.Stop.Departure != nil {
				depTime = *departure.Stop.Departure
			}

			// Calculate approximate position based on current time
			now := time.Now()
			position := &models.Position{
				Lat: departure.Stop.Station.Coordinate.Y,
				Lng: departure.Stop.Station.Coordinate.X,
			}

			// Add slight movement if train has departed
			if depTime != "" {
				parsedTime, err := time.Parse(time.RFC3339, depTime)
				if err == nil && now.After(parsedTime) {
					// Simulate movement along route if passlist is available
					if len(departure.PassList) > 1 {
						elapsed := now.Sub(parsedTime).Minutes()
						progress := elapsed / 60 // Assume 1 hour journey
						if progress > 1 {
							progress = 1
						}

						// Interpolate between first and second stop
						nextStop := departure.PassList[0]
						position.Lat = departure.Stop.Station.Coordinate.Y +
							(nextStop.Station.Coordinate.Y-departure.Stop.Station.Coordinate.Y)*progress
						position.Lng = departure.Stop.Station.Coordinate.X +
							(nextStop.Station.Coordinate.X-departure.Stop.Station.Coordinate.X)*progress
					}
				}
			}

			currentStation := &models.Station{
				ID:   departure.Stop.Station.ID,
				Name: departure.Stop.Station.Name,
				Coordinate: models.Coordinate{
					X: departure.Stop.Station.Coordinate.X,
					Y: departure.Stop.Station.Coordinate.Y,
				},
			}

			trains = append(trains, models.Train{
				ID:             trainID,
				Name:           departure.Name,
				Category:       departure.Category,
				Number:         departure.Number,
				Operator:       departure.Operator,
				From:           station.Name,
				To:             departure.To,
				Position:       position,
				CurrentStation: currentStation,
				Delay:          departure.Stop.Delay,
				Cancelled:      false,
				Speed:          60 + time.Now().Nanosecond()%60,
				Direction:      time.Now().Nanosecond() % 360,
				LastUpdate:     now.Format(time.RFC3339),
			})
		}

		// Respect rate limits
		time.Sleep(200 * time.Millisecond)
	}

	return trains, nil
}
