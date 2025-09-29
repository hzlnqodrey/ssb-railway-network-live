const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

class GTFSService {
  constructor() {
    this.gtfsData = {
      agencies: [],
      stops: [],
      routes: [],
      trips: [],
      stopTimes: [],
      calendar: [],
      calendarDates: [],
    };

    this.dataLoaded = false;
    this.dataPath = path.join(__dirname, "..", "..", "data");
  }

  // Helper function to read CSV files
  readCSV(filename) {
    return new Promise((resolve, reject) => {
      const results = [];
      const filePath = path.join(this.dataPath, filename);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ GTFS file not found: ${filePath}`);
        resolve([]);
        return;
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", reject);
    });
  }

  // Load all GTFS data
  async loadGTFSData() {
    try {
      console.log("🚂 Loading Swiss GTFS data...");

      const [
        agencies,
        stops,
        routes,
        trips,
        stopTimes,
        calendar,
        calendarDates,
      ] = await Promise.all([
        this.readCSV("agency.txt"),
        this.readCSV("stops.txt"),
        this.readCSV("routes.txt"),
        this.readCSV("trips.txt"),
        this.readCSV("stop_times.txt"),
        this.readCSV("calendar.txt"),
        this.readCSV("calendar_dates.txt"),
      ]);

      this.gtfsData = {
        agencies,
        stops,
        routes,
        trips,
        stopTimes,
        calendar,
        calendarDates,
      };

      this.dataLoaded = true;

      console.log("✅ Swiss GTFS data loaded successfully");
      console.log(`📍 Loaded ${this.gtfsData.stops.length} stops`);
      console.log(`🚂 Loaded ${this.gtfsData.routes.length} routes`);
      console.log(`🎫 Loaded ${this.gtfsData.trips.length} trips`);
      console.log(`⏰ Loaded ${this.gtfsData.stopTimes.length} stop times`);
    } catch (error) {
      console.error("❌ Error loading GTFS data:", error);
      throw error;
    }
  }

  // Get current Swiss time
  getCurrentSwissTime() {
    return new Date().toLocaleString("en-US", {
      timeZone: "Europe/Zurich",
      hour12: false,
    });
  }

  // Get today's service ID
  getTodayServiceId() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const activeServices = this.gtfsData.calendar.filter((service) => {
      return service[days[dayOfWeek]] === "1";
    });

    return activeServices.length > 0 ? activeServices[0].service_id : "1";
  }

  // Check if data is loaded
  isDataLoaded() {
    return this.dataLoaded;
  }

  // Get all agencies
  getAgencies() {
    return this.gtfsData.agencies;
  }

  // Get all stops/stations formatted for frontend
  getStations(limit = 50, offset = 0) {
    const start = parseInt(offset.toString());
    const end = start + parseInt(limit.toString());

    const stations = this.gtfsData.stops.slice(start, end).map((stop) => ({
      id: stop.stop_id,
      name: stop.stop_name,
      coordinate: {
        x: parseFloat(stop.stop_lon),
        y: parseFloat(stop.stop_lat),
      },
    }));

    return {
      data: stations,
      count: stations.length,
      total: this.gtfsData.stops.length,
      timestamp: this.getCurrentSwissTime(),
    };
  }

  // Get all routes
  getRoutes(agency_id) {
    let routes = this.gtfsData.routes;

    if (agency_id) {
      routes = routes.filter((route) => route.agency_id === agency_id);
    }

    return {
      data: routes,
      count: routes.length,
      timestamp: this.getCurrentSwissTime(),
    };
  }

  // Get trips by route
  getTripsByRoute(routeId) {
    const trips = this.gtfsData.trips.filter(
      (trip) => trip.route_id === routeId
    );

    return {
      data: trips,
      count: trips.length,
      timestamp: this.getCurrentSwissTime(),
    };
  }

  // Get departures from a station
  getStationDepartures(stopId) {
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      timeZone: "Europe/Zurich",
    });

    // Get all stop times for this station
    const departures = this.gtfsData.stopTimes
      .filter(
        (st) =>
          st.stop_id === stopId &&
          st.departure_time &&
          st.departure_time > currentTime
      )
      .slice(0, 20) // Next 20 departures
      .map((stopTime) => {
        const trip = this.gtfsData.trips.find(
          (t) => t.trip_id === stopTime.trip_id
        );
        const route = this.gtfsData.routes.find(
          (r) => r.route_id === trip?.route_id
        );
        const agency = this.gtfsData.agencies.find(
          (a) => a.agency_id === route?.agency_id
        );

        return {
          tripId: stopTime.trip_id,
          routeName: route?.route_short_name || "Unknown",
          routeLongName: route?.route_long_name || "",
          operator: agency?.agency_name || "Unknown",
          departureTime: stopTime.departure_time,
          arrivalTime: stopTime.arrival_time,
          sequence: parseInt(stopTime.stop_sequence),
        };
      })
      .sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    const station = this.gtfsData.stops.find((s) => s.stop_id === stopId);

    return {
      station: station
        ? {
            id: station.stop_id,
            name: station.stop_name,
            coordinate: {
              x: parseFloat(station.stop_lon),
              y: parseFloat(station.stop_lat),
            },
          }
        : null,
      departures,
      count: departures.length,
      timestamp: this.getCurrentSwissTime(),
    };
  }

  // Get live trains (simulated from GTFS data)
  getLiveTrains() {
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      timeZone: "Europe/Zurich",
    });

    // For demo purposes, show a selection of trips throughout the day
    // Get unique trips and simulate them as active
    const uniqueTrips = [
      ...new Set(this.gtfsData.stopTimes.map((st) => st.trip_id)),
    ].slice(0, 15); // Limit to 15 different trips

    const activeTrips = uniqueTrips
      .map((tripId) => {
        // Find the first stop time for this trip
        return this.gtfsData.stopTimes.find((st) => st.trip_id === tripId);
      })
      .filter(Boolean);

    const liveTrains = activeTrips.map((stopTime, index) => {
      const trip = this.gtfsData.trips.find(
        (t) => t.trip_id === stopTime.trip_id
      );
      const route = this.gtfsData.routes.find(
        (r) => r.route_id === trip?.route_id
      );
      const agency = this.gtfsData.agencies.find(
        (a) => a.agency_id === route?.agency_id
      );
      const currentStop = this.gtfsData.stops.find(
        (s) => s.stop_id === stopTime.stop_id
      );

      // Get the full trip stops
      const tripStops = this.gtfsData.stopTimes
        .filter((st) => st.trip_id === stopTime.trip_id)
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

      const lastStop = this.gtfsData.stops.find(
        (s) => s.stop_id === tripStops[tripStops.length - 1]?.stop_id
      );
      const firstStop = this.gtfsData.stops.find(
        (s) => s.stop_id === tripStops[0]?.stop_id
      );

      // Add some realistic movement simulation
      const now = Date.now();
      const routeProgress = (now % 120000) / 120000; // 2 minute cycle
      const currentStopIndex = Math.floor(routeProgress * tripStops.length);
      const actualCurrentStop = tripStops[currentStopIndex]
        ? this.gtfsData.stops.find(
            (s) => s.stop_id === tripStops[currentStopIndex].stop_id
          )
        : currentStop;

      return {
        id: `${trip?.trip_id}-${index}`,
        name: route?.route_short_name || "Train",
        category: route?.route_short_name?.split(" ")[0] || "RE",
        number: route?.route_short_name?.split(" ")[1] || trip?.trip_id,
        operator: agency?.agency_name || "SBB",
        from: firstStop?.stop_name || "Unknown",
        to: lastStop?.stop_name || "Unknown",
        position: actualCurrentStop
          ? {
              lat: parseFloat(actualCurrentStop.stop_lat),
              lng: parseFloat(actualCurrentStop.stop_lon),
            }
          : null,
        delay: Math.floor(Math.random() * 5), // Random delay 0-4 minutes
        cancelled: false,
        speed: 60 + Math.floor(Math.random() * 40), // Random speed 60-100 km/h
        direction: Math.floor(Math.random() * 360), // Random direction
        lastUpdate: new Date().toISOString(),
        departureTime: tripStops[0]?.departure_time,
        arrivalTime: tripStops[tripStops.length - 1]?.arrival_time,
        currentStation: actualCurrentStop
          ? {
              id: actualCurrentStop.stop_id,
              name: actualCurrentStop.stop_name,
              coordinate: {
                x: parseFloat(actualCurrentStop.stop_lon),
                y: parseFloat(actualCurrentStop.stop_lat),
              },
            }
          : null,
        timetable: tripStops.map((ts, idx) => {
          const stop = this.gtfsData.stops.find(
            (s) => s.stop_id === ts.stop_id
          );
          return {
            station: stop
              ? {
                  id: stop.stop_id,
                  name: stop.stop_name,
                  coordinate: {
                    x: parseFloat(stop.stop_lon),
                    y: parseFloat(stop.stop_lat),
                  },
                }
              : null,
            arrivalTime: ts.arrival_time,
            departureTime: ts.departure_time,
            platform: Math.floor(Math.random() * 10) + 1, // Random platform
            isCurrentStation:
              actualCurrentStop && ts.stop_id === actualCurrentStop.stop_id,
            isPassed: idx < currentStopIndex,
            isSkipped: false,
          };
        }),
      };
    });

    return {
      data: liveTrains,
      count: liveTrains.length,
      timestamp: this.getCurrentSwissTime(),
      serviceId: this.getTodayServiceId(),
    };
  }

  // Get statistics
  getStats() {
    return {
      agencies: this.gtfsData.agencies.length,
      stops: this.gtfsData.stops.length,
      routes: this.gtfsData.routes.length,
      trips: this.gtfsData.trips.length,
      stopTimes: this.gtfsData.stopTimes.length,
      dataLoaded: this.dataLoaded,
      timestamp: this.getCurrentSwissTime(),
    };
  }
}

// Export singleton instance
module.exports = new GTFSService();
