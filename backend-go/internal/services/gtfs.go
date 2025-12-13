// Package services contains business logic for the Swiss Railway API.
package services

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/swiss-railway/backend-go/internal/models"
)

// GTFSService handles GTFS data loading and queries.
type GTFSService struct {
	mu sync.RWMutex

	agencies  []map[string]string
	stops     []map[string]string
	routes    []map[string]string
	trips     []map[string]string
	stopTimes []map[string]string
	calendar  []map[string]string

	dataLoaded bool
	dataPath   string

	// Indexed data for faster lookups
	stopsIndex    map[string]map[string]string
	tripsIndex    map[string]map[string]string
	routesIndex   map[string]map[string]string
	agenciesIndex map[string]map[string]string
}

// NewGTFSService creates a new GTFS service instance.
func NewGTFSService(dataPath string) *GTFSService {
	return &GTFSService{
		dataPath:      dataPath,
		agencies:      make([]map[string]string, 0),
		stops:         make([]map[string]string, 0),
		routes:        make([]map[string]string, 0),
		trips:         make([]map[string]string, 0),
		stopTimes:     make([]map[string]string, 0),
		calendar:      make([]map[string]string, 0),
		stopsIndex:    make(map[string]map[string]string),
		tripsIndex:    make(map[string]map[string]string),
		routesIndex:   make(map[string]map[string]string),
		agenciesIndex: make(map[string]map[string]string),
	}
}

// readCSV reads a CSV file and returns records as maps.
func (s *GTFSService) readCSV(filename string) ([]map[string]string, error) {
	filePath := filepath.Join(s.dataPath, filename)

	file, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Warn().Str("file", filePath).Msg("GTFS file not found")
			return []map[string]string{}, nil
		}
		return nil, fmt.Errorf("failed to open file %s: %w", filePath, err)
	}
	defer file.Close()

	reader := csv.NewReader(bufio.NewReader(file))
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// Read header
	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	// Trim BOM and whitespace from headers
	for i, h := range headers {
		headers[i] = strings.TrimPrefix(strings.TrimSpace(h), "\ufeff")
	}

	var results []map[string]string

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Error reading CSV line, skipping")
			continue
		}

		row := make(map[string]string)
		for i, value := range record {
			if i < len(headers) {
				row[headers[i]] = strings.TrimSpace(value)
			}
		}
		results = append(results, row)
	}

	return results, nil
}

// LoadData loads all GTFS data from CSV files.
func (s *GTFSService) LoadData() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Info().Str("path", s.dataPath).Msg("🚂 Loading Swiss GTFS data...")

	startTime := time.Now()

	// Load all GTFS files concurrently
	var wg sync.WaitGroup
	errChan := make(chan error, 7)

	loadFile := func(filename string, dest *[]map[string]string) {
		defer wg.Done()
		data, err := s.readCSV(filename)
		if err != nil {
			errChan <- err
			return
		}
		*dest = data
	}

	wg.Add(6)
	go loadFile("agency.txt", &s.agencies)
	go loadFile("stops.txt", &s.stops)
	go loadFile("routes.txt", &s.routes)
	go loadFile("trips.txt", &s.trips)
	go loadFile("stop_times.txt", &s.stopTimes)
	go loadFile("calendar.txt", &s.calendar)

	wg.Wait()
	close(errChan)

	// Check for errors
	for err := range errChan {
		if err != nil {
			return err
		}
	}

	// Build indexes for faster lookups
	s.buildIndexes()

	s.dataLoaded = true

	log.Info().
		Int("stops", len(s.stops)).
		Int("routes", len(s.routes)).
		Int("trips", len(s.trips)).
		Int("stopTimes", len(s.stopTimes)).
		Dur("duration", time.Since(startTime)).
		Msg("✅ Swiss GTFS data loaded successfully")

	return nil
}

// buildIndexes creates lookup maps for faster queries.
func (s *GTFSService) buildIndexes() {
	// Index stops by stop_id
	for _, stop := range s.stops {
		if id, ok := stop["stop_id"]; ok {
			s.stopsIndex[id] = stop
		}
	}

	// Index trips by trip_id
	for _, trip := range s.trips {
		if id, ok := trip["trip_id"]; ok {
			s.tripsIndex[id] = trip
		}
	}

	// Index routes by route_id
	for _, route := range s.routes {
		if id, ok := route["route_id"]; ok {
			s.routesIndex[id] = route
		}
	}

	// Index agencies by agency_id
	for _, agency := range s.agencies {
		if id, ok := agency["agency_id"]; ok {
			s.agenciesIndex[id] = agency
		}
	}
}

// IsDataLoaded returns whether GTFS data has been loaded.
func (s *GTFSService) IsDataLoaded() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.dataLoaded
}

// GetStats returns statistics about loaded GTFS data.
func (s *GTFSService) GetStats() models.GTFSStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return models.GTFSStats{
		Agencies:   len(s.agencies),
		Stops:      len(s.stops),
		Routes:     len(s.routes),
		Trips:      len(s.trips),
		StopTimes:  len(s.stopTimes),
		DataLoaded: s.dataLoaded,
		Timestamp:  s.getSwissTime(),
	}
}

// getSwissTime returns the current time in Swiss timezone.
func (s *GTFSService) getSwissTime() string {
	loc, err := time.LoadLocation("Europe/Zurich")
	if err != nil {
		return time.Now().Format(time.RFC3339)
	}
	return time.Now().In(loc).Format("1/2/2006, 15:04:05")
}

// GetStations returns paginated stations.
func (s *GTFSService) GetStations(limit, offset int) ([]models.Station, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.stops)
	if offset >= total {
		return []models.Station{}, total
	}

	end := offset + limit
	if end > total {
		end = total
	}

	stations := make([]models.Station, 0, end-offset)
	for i := offset; i < end; i++ {
		stop := s.stops[i]
		lat, _ := strconv.ParseFloat(stop["stop_lat"], 64)
		lon, _ := strconv.ParseFloat(stop["stop_lon"], 64)

		stations = append(stations, models.Station{
			ID:   stop["stop_id"],
			Name: stop["stop_name"],
			Coordinate: models.Coordinate{
				X: lon,
				Y: lat,
			},
		})
	}

	return stations, total
}

// GetStationByID returns a station by its ID.
func (s *GTFSService) GetStationByID(id string) *models.Station {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stop, exists := s.stopsIndex[id]
	if !exists {
		return nil
	}

	lat, _ := strconv.ParseFloat(stop["stop_lat"], 64)
	lon, _ := strconv.ParseFloat(stop["stop_lon"], 64)

	return &models.Station{
		ID:   stop["stop_id"],
		Name: stop["stop_name"],
		Coordinate: models.Coordinate{
			X: lon,
			Y: lat,
		},
	}
}

// SearchStations searches stations by name.
func (s *GTFSService) SearchStations(query string) []models.Station {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query = strings.ToLower(query)
	var results []models.Station

	for _, stop := range s.stops {
		name := strings.ToLower(stop["stop_name"])
		id := strings.ToLower(stop["stop_id"])

		if strings.Contains(name, query) || strings.Contains(id, query) {
			lat, _ := strconv.ParseFloat(stop["stop_lat"], 64)
			lon, _ := strconv.ParseFloat(stop["stop_lon"], 64)

			results = append(results, models.Station{
				ID:   stop["stop_id"],
				Name: stop["stop_name"],
				Coordinate: models.Coordinate{
					X: lon,
					Y: lat,
				},
			})
		}
	}

	return results
}

// GetNearbyStations returns stations within a radius (in km).
func (s *GTFSService) GetNearbyStations(lat, lon, radiusKm float64) []models.Station {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type stationWithDistance struct {
		Station  models.Station
		Distance float64
	}

	var results []stationWithDistance

	for _, stop := range s.stops {
		stopLat, _ := strconv.ParseFloat(stop["stop_lat"], 64)
		stopLon, _ := strconv.ParseFloat(stop["stop_lon"], 64)

		distance := haversineDistance(lat, lon, stopLat, stopLon)

		if distance <= radiusKm {
			dist := distance
			results = append(results, stationWithDistance{
				Station: models.Station{
					ID:   stop["stop_id"],
					Name: stop["stop_name"],
					Coordinate: models.Coordinate{
						X: stopLon,
						Y: stopLat,
					},
					Distance: &dist,
				},
				Distance: distance,
			})
		}
	}

	// Sort by distance
	sort.Slice(results, func(i, j int) bool {
		return results[i].Distance < results[j].Distance
	})

	stations := make([]models.Station, len(results))
	for i, r := range results {
		stations[i] = r.Station
	}

	return stations
}

// haversineDistance calculates the distance between two points in km.
func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in km

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return math.Round(R*c*100) / 100
}

// GetStationDepartures returns departures from a station.
func (s *GTFSService) GetStationDepartures(stopID string) *models.StationDepartures {
	s.mu.RLock()
	defer s.mu.RUnlock()

	station := s.GetStationByID(stopID)
	if station == nil {
		return nil
	}

	loc, _ := time.LoadLocation("Europe/Zurich")
	currentTime := time.Now().In(loc).Format("15:04:05")

	var departures []models.Departure

	for _, st := range s.stopTimes {
		if st["stop_id"] != stopID {
			continue
		}

		depTime := st["departure_time"]
		if depTime == "" || depTime <= currentTime {
			continue
		}

		trip := s.tripsIndex[st["trip_id"]]
		if trip == nil {
			continue
		}

		route := s.routesIndex[trip["route_id"]]
		if route == nil {
			continue
		}

		agencyName := "Unknown"
		if agency := s.agenciesIndex[route["agency_id"]]; agency != nil {
			agencyName = agency["agency_name"]
		}

		seq, _ := strconv.Atoi(st["stop_sequence"])

		departures = append(departures, models.Departure{
			TripID:        st["trip_id"],
			RouteName:     route["route_short_name"],
			RouteLongName: route["route_long_name"],
			Operator:      agencyName,
			DepartureTime: st["departure_time"],
			ArrivalTime:   st["arrival_time"],
			Sequence:      seq,
		})

		if len(departures) >= 20 {
			break
		}
	}

	// Sort by departure time
	sort.Slice(departures, func(i, j int) bool {
		return departures[i].DepartureTime < departures[j].DepartureTime
	})

	return &models.StationDepartures{
		Station:    station,
		Departures: departures,
		Count:      len(departures),
		Timestamp:  s.getSwissTime(),
	}
}

// GetLiveTrains returns simulated live train positions based on GTFS data.
func (s *GTFSService) GetLiveTrains() []models.Train {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.trips) == 0 {
		return []models.Train{}
	}

	// Get unique trip IDs (limit to 15 for demo)
	tripIDs := make(map[string]bool)
	var uniqueTripIDs []string
	for _, st := range s.stopTimes {
		if !tripIDs[st["trip_id"]] {
			tripIDs[st["trip_id"]] = true
			uniqueTripIDs = append(uniqueTripIDs, st["trip_id"])
			if len(uniqueTripIDs) >= 15 {
				break
			}
		}
	}

	now := time.Now()
	var trains []models.Train

	for idx, tripID := range uniqueTripIDs {
		trip := s.tripsIndex[tripID]
		if trip == nil {
			continue
		}

		route := s.routesIndex[trip["route_id"]]
		if route == nil {
			continue
		}

		agencyName := "SBB"
		if agency := s.agenciesIndex[route["agency_id"]]; agency != nil {
			agencyName = agency["agency_name"]
		}

		// Get all stops for this trip
		var tripStops []map[string]string
		for _, st := range s.stopTimes {
			if st["trip_id"] == tripID {
				tripStops = append(tripStops, st)
			}
		}

		if len(tripStops) == 0 {
			continue
		}

		// Sort by sequence
		sort.Slice(tripStops, func(i, j int) bool {
			seqI, _ := strconv.Atoi(tripStops[i]["stop_sequence"])
			seqJ, _ := strconv.Atoi(tripStops[j]["stop_sequence"])
			return seqI < seqJ
		})

		// Simulate train movement
		routeProgress := float64(now.UnixMilli()%120000) / 120000 // 2-minute cycle
		currentStopIdx := int(routeProgress * float64(len(tripStops)))
		if currentStopIdx >= len(tripStops) {
			currentStopIdx = len(tripStops) - 1
		}

		currentStopTime := tripStops[currentStopIdx]
		currentStop := s.stopsIndex[currentStopTime["stop_id"]]

		firstStop := s.stopsIndex[tripStops[0]["stop_id"]]
		lastStop := s.stopsIndex[tripStops[len(tripStops)-1]["stop_id"]]

		var position *models.Position
		var currentStation *models.Station

		if currentStop != nil {
			lat, _ := strconv.ParseFloat(currentStop["stop_lat"], 64)
			lon, _ := strconv.ParseFloat(currentStop["stop_lon"], 64)
			position = &models.Position{Lat: lat, Lng: lon}
			currentStation = &models.Station{
				ID:         currentStop["stop_id"],
				Name:       currentStop["stop_name"],
				Coordinate: models.Coordinate{X: lon, Y: lat},
			}
		}

		fromName := "Unknown"
		toName := "Unknown"
		if firstStop != nil {
			fromName = firstStop["stop_name"]
		}
		if lastStop != nil {
			toName = lastStop["stop_name"]
		}

		routeShortName := route["route_short_name"]
		if routeShortName == "" {
			routeShortName = "Train"
		}

		// Build timetable
		timetable := make([]models.TrainStop, len(tripStops))
		for i, ts := range tripStops {
			stop := s.stopsIndex[ts["stop_id"]]
			var station *models.Station
			if stop != nil {
				lat, _ := strconv.ParseFloat(stop["stop_lat"], 64)
				lon, _ := strconv.ParseFloat(stop["stop_lon"], 64)
				station = &models.Station{
					ID:         stop["stop_id"],
					Name:       stop["stop_name"],
					Coordinate: models.Coordinate{X: lon, Y: lat},
				}
			}
			timetable[i] = models.TrainStop{
				Station:          station,
				ArrivalTime:      ts["arrival_time"],
				DepartureTime:    ts["departure_time"],
				Platform:         strconv.Itoa(rand.Intn(10) + 1),
				IsCurrentStation: i == currentStopIdx,
				IsPassed:         i < currentStopIdx,
				IsSkipped:        false,
			}
		}

		trains = append(trains, models.Train{
			ID:             fmt.Sprintf("%s-%d", tripID, idx),
			Name:           routeShortName,
			Category:       strings.Split(routeShortName, " ")[0],
			Number:         tripID,
			Operator:       agencyName,
			From:           fromName,
			To:             toName,
			Position:       position,
			CurrentStation: currentStation,
			Delay:          rand.Intn(5),
			Cancelled:      false,
			Speed:          60 + rand.Intn(40),
			Direction:      rand.Intn(360),
			LastUpdate:     time.Now().Format(time.RFC3339),
			DepartureTime:  tripStops[0]["departure_time"],
			ArrivalTime:    tripStops[len(tripStops)-1]["arrival_time"],
			Timetable:      timetable,
		})
	}

	return trains
}

// GetTrainStats returns aggregated train statistics.
func (s *GTFSService) GetTrainStats() models.TrainStats {
	trains := s.GetLiveTrains()

	stats := models.TrainStats{
		Total:      len(trains),
		ByCategory: make(map[string]int),
		ByOperator: make(map[string]int),
	}

	var totalDelay, totalSpeed float64

	for _, train := range trains {
		stats.ByCategory[train.Category]++
		stats.ByOperator[train.Operator]++

		if train.Delay > 0 {
			stats.Delayed++
		} else {
			stats.OnTime++
		}

		if train.Cancelled {
			stats.Cancelled++
		}

		totalDelay += float64(train.Delay)
		totalSpeed += float64(train.Speed)
	}

	if len(trains) > 0 {
		stats.AverageDelay = totalDelay / float64(len(trains))
		stats.AverageSpeed = totalSpeed / float64(len(trains))
	}

	return stats
}
