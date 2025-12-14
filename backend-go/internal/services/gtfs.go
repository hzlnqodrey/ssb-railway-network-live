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

		// Get headsign - prefer trip_headsign, fallback to route_long_name
		headsign := trip["trip_headsign"]
		if headsign == "" {
			headsign = route["route_long_name"]
		}
		if headsign == "" {
			headsign = route["route_short_name"]
		}

		seq, _ := strconv.Atoi(st["stop_sequence"])

		departures = append(departures, models.Departure{
			TripID:        st["trip_id"],
			RouteName:     route["route_short_name"],
			RouteLongName: route["route_long_name"],
			Headsign:      headsign,
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

// parseTimeToMinutes converts HH:MM:SS to minutes from midnight
func parseTimeToMinutes(timeStr string) int {
	parts := strings.Split(timeStr, ":")
	if len(parts) < 2 {
		return -1
	}
	hours, _ := strconv.Atoi(parts[0])
	minutes, _ := strconv.Atoi(parts[1])
	return hours*60 + minutes
}

// GetLiveTrains returns real-time train positions based on GTFS timetable and current time.
func (s *GTFSService) GetLiveTrains() []models.Train {
	return s.GetLiveTrainsWithMultiplier(1.0)
}

// GetLiveTrainsWithMultiplier returns real-time train positions with time multiplier support.
func (s *GTFSService) GetLiveTrainsWithMultiplier(multiplier float64) []models.Train {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.trips) == 0 {
		return []models.Train{}
	}

	// Get current Swiss time
	loc, _ := time.LoadLocation("Europe/Zurich")
	now := time.Now().In(loc)

	// Apply time multiplier by offsetting minutes from midnight
	baseMinutes := now.Hour()*60 + now.Minute()
	effectiveMinutes := int(float64(baseMinutes)*multiplier) % (24 * 60)
	if effectiveMinutes < 0 {
		effectiveMinutes += 24 * 60
	}

	currentSeconds := now.Second()

	var trains []models.Train

	// Group stop_times by trip_id for efficient lookup
	tripStopTimes := make(map[string][]map[string]string)
	for _, st := range s.stopTimes {
		tripID := st["trip_id"]
		tripStopTimes[tripID] = append(tripStopTimes[tripID], st)
	}

	// Process each trip and find active trains
	trainCount := 0
	maxTrains := 30 // Limit for performance

	for tripID, tripStops := range tripStopTimes {
		if trainCount >= maxTrains {
			break
		}

		if len(tripStops) < 2 {
			continue
		}

		trip := s.tripsIndex[tripID]
		if trip == nil {
			continue
		}

		route := s.routesIndex[trip["route_id"]]
		if route == nil {
			continue
		}

		// Sort stops by sequence
		sort.Slice(tripStops, func(i, j int) bool {
			seqI, _ := strconv.Atoi(tripStops[i]["stop_sequence"])
			seqJ, _ := strconv.Atoi(tripStops[j]["stop_sequence"])
			return seqI < seqJ
		})

		// Get first departure time and last arrival time
		firstDeparture := tripStops[0]["departure_time"]
		lastArrival := tripStops[len(tripStops)-1]["arrival_time"]

		if firstDeparture == "" || lastArrival == "" {
			continue
		}

		tripStartMinutes := parseTimeToMinutes(firstDeparture)
		tripEndMinutes := parseTimeToMinutes(lastArrival)

		if tripStartMinutes < 0 || tripEndMinutes < 0 {
			continue
		}

		// Check if this train is currently active
		if effectiveMinutes < tripStartMinutes || effectiveMinutes > tripEndMinutes {
			continue
		}

		// Find current position between stops
		var fromStopIdx, toStopIdx int
		var fromMinutes, toMinutes int

		for i := 0; i < len(tripStops)-1; i++ {
			depTime := tripStops[i]["departure_time"]
			nextArrTime := tripStops[i+1]["arrival_time"]

			if depTime == "" {
				depTime = tripStops[i]["arrival_time"]
			}
			if nextArrTime == "" {
				nextArrTime = tripStops[i+1]["departure_time"]
			}

			fromMins := parseTimeToMinutes(depTime)
			toMins := parseTimeToMinutes(nextArrTime)

			if fromMins >= 0 && toMins >= 0 && effectiveMinutes >= fromMins && effectiveMinutes <= toMins {
				fromStopIdx = i
				toStopIdx = i + 1
				fromMinutes = fromMins
				toMinutes = toMins
				break
			}
		}

		// If we found a valid segment, interpolate position
		fromStop := s.stopsIndex[tripStops[fromStopIdx]["stop_id"]]
		toStop := s.stopsIndex[tripStops[toStopIdx]["stop_id"]]

		if fromStop == nil || toStop == nil {
			continue
		}

		fromLat, _ := strconv.ParseFloat(fromStop["stop_lat"], 64)
		fromLon, _ := strconv.ParseFloat(fromStop["stop_lon"], 64)
		toLat, _ := strconv.ParseFloat(toStop["stop_lat"], 64)
		toLon, _ := strconv.ParseFloat(toStop["stop_lon"], 64)

		// Calculate interpolation progress
		var progress float64
		segmentDuration := toMinutes - fromMinutes
		if segmentDuration > 0 {
			elapsedInSegment := effectiveMinutes - fromMinutes
			progress = float64(elapsedInSegment) / float64(segmentDuration)
			// Add second-level precision
			secondProgress := float64(currentSeconds) / 60.0 / float64(segmentDuration)
			progress += secondProgress
			if progress > 1.0 {
				progress = 1.0
			}
		}

		// Interpolate position
		currentLat := fromLat + (toLat-fromLat)*progress
		currentLon := fromLon + (toLon-fromLon)*progress

		// Calculate direction (bearing)
		direction := calculateBearing(fromLat, fromLon, toLat, toLon)

		// Calculate speed based on distance and time
		distance := haversineDistance(fromLat, fromLon, toLat, toLon)
		var speed int
		if segmentDuration > 0 {
			speed = int(distance / (float64(segmentDuration) / 60.0)) // km/h
		}
		if speed < 20 {
			speed = 60 + rand.Intn(40) // Default speed for short segments
		}
		if speed > 200 {
			speed = 160 + rand.Intn(40) // Cap high-speed trains
		}

		// Get first and last stops
		firstStop := s.stopsIndex[tripStops[0]["stop_id"]]
		lastStop := s.stopsIndex[tripStops[len(tripStops)-1]["stop_id"]]

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

		agencyName := "SBB"
		if agency := s.agenciesIndex[route["agency_id"]]; agency != nil {
			agencyName = agency["agency_name"]
		}

		// Build timetable with correct passed/current status based on effective time
		timetable := make([]models.TrainStop, len(tripStops))

		// Current effective time in seconds for precise comparison
		effectiveTimeSeconds := effectiveMinutes*60 + currentSeconds

		// First pass: mark all passed stations
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

			// Parse times
			stopArrMinutes := parseTimeToMinutes(ts["arrival_time"])
			stopDepMinutes := parseTimeToMinutes(ts["departure_time"])

			// For first stop, use departure time as arrival
			if stopArrMinutes < 0 && stopDepMinutes >= 0 {
				stopArrMinutes = stopDepMinutes
			}
			// For last stop, use arrival time as departure
			if stopDepMinutes < 0 && stopArrMinutes >= 0 {
				stopDepMinutes = stopArrMinutes
			}

			isPassed := false
			isCurrent := false

			// Determine status based on effective time
			if stopDepMinutes >= 0 {
				stopDepSeconds := stopDepMinutes * 60
				stopArrSeconds := stopArrMinutes * 60

				if effectiveTimeSeconds > stopDepSeconds {
					// Train has departed from this station
					isPassed = true
				} else if stopArrSeconds >= 0 && effectiveTimeSeconds >= stopArrSeconds && effectiveTimeSeconds <= stopDepSeconds {
					// Train is currently at this station (stopped at platform)
					isCurrent = true
				}
			}

			platform := strconv.Itoa((i % 10) + 1) // Deterministic platform based on index

			timetable[i] = models.TrainStop{
				Station:          station,
				ArrivalTime:      ts["arrival_time"],
				DepartureTime:    ts["departure_time"],
				Platform:         platform,
				IsCurrentStation: isCurrent,
				IsPassed:         isPassed,
				IsSkipped:        false,
			}
		}

		// Second pass: if no station is marked as current, mark the next upcoming station
		hasCurrentStation := false
		for _, stop := range timetable {
			if stop.IsCurrentStation {
				hasCurrentStation = true
				break
			}
		}

		if !hasCurrentStation {
			// Find the first non-passed station and mark it as current
			for i := range timetable {
				if !timetable[i].IsPassed {
					timetable[i].IsCurrentStation = true
					break
				}
			}
		}

		// Determine current station
		var currentStation *models.Station
		if progress < 0.5 {
			currentStation = timetable[fromStopIdx].Station
		} else {
			currentStation = timetable[toStopIdx].Station
		}

		// Generate consistent delay based on trip ID
		tripHash := 0
		for _, c := range tripID {
			tripHash += int(c)
		}
		delay := tripHash % 7 // 0-6 minutes delay

		trains = append(trains, models.Train{
			ID:             tripID,
			Name:           routeShortName,
			Category:       strings.Split(routeShortName, " ")[0],
			Number:         tripID,
			Operator:       agencyName,
			From:           fromName,
			To:             toName,
			Position:       &models.Position{Lat: currentLat, Lng: currentLon},
			CurrentStation: currentStation,
			Delay:          delay,
			Cancelled:      false,
			Speed:          speed,
			Direction:      direction,
			LastUpdate:     now.Format(time.RFC3339),
			DepartureTime:  tripStops[0]["departure_time"],
			ArrivalTime:    tripStops[len(tripStops)-1]["arrival_time"],
			Timetable:      timetable,
		})

		trainCount++
	}

	// Sort trains by name for consistent ordering
	sort.Slice(trains, func(i, j int) bool {
		return trains[i].Name < trains[j].Name
	})

	return trains
}

// calculateBearing calculates the bearing between two coordinates
func calculateBearing(lat1, lon1, lat2, lon2 float64) int {
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	y := math.Sin(dLon) * math.Cos(lat2Rad)
	x := math.Cos(lat1Rad)*math.Sin(lat2Rad) - math.Sin(lat1Rad)*math.Cos(lat2Rad)*math.Cos(dLon)

	bearing := math.Atan2(y, x) * 180 / math.Pi
	return int(math.Mod(bearing+360, 360))
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
