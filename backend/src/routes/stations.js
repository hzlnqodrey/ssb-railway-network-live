const { Router } = require("express");
const gtfsService = require("../services/gtfsService");

const router = Router();

// Get all stations
router.get("/", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { limit = "50", offset = "0" } = req.query;
    const stationsData = gtfsService.getStations(
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      data: stationsData.data,
      meta: {
        total: stationsData.total,
        count: stationsData.count,
        timestamp: stationsData.timestamp,
        source: "swiss_gtfs_data",
        pagination: { limit: parseInt(limit), offset: parseInt(offset) },
      },
    });
  } catch (error) {
    console.error("Error getting stations:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch station data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get specific station by ID
router.get("/:id", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const stationsData = gtfsService.getStations(1000, 0); // Get all stations to search
    const station = stationsData.data.find((s) => s.id === id);

    if (!station) {
      return res.status(404).json({
        error: "Station not found",
        message: `Station with ID ${id} does not exist`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      data: station,
      meta: {
        timestamp: stationsData.timestamp,
        source: "swiss_gtfs_data",
      },
    });
  } catch (error) {
    console.error("Error getting station by ID:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch station data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get station departure board
router.get("/:id/departures", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const departuresData = gtfsService.getStationDepartures(id);

    if (!departuresData.station) {
      return res.status(404).json({
        error: "Station not found",
        message: `Station with ID ${id} does not exist`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      data: {
        station: departuresData.station,
        departures: departuresData.departures,
      },
      meta: {
        count: departuresData.count,
        timestamp: departuresData.timestamp,
        source: "swiss_gtfs_data",
        note: "Real-time departure data from Swiss GTFS",
      },
    });
  } catch (error) {
    console.error("Error getting station departures:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch departure data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Search stations by name or location
router.get("/search/:query", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { query } = req.params;
    const searchTerm = query.toLowerCase();

    const stationsData = gtfsService.getStations(1000, 0); // Get all stations to search
    const results = stationsData.data.filter(
      (station) =>
        station.name.toLowerCase().includes(searchTerm) ||
        station.id.toLowerCase().includes(searchTerm)
    );

    res.json({
      data: results,
      meta: {
        query: searchTerm,
        total: results.length,
        timestamp: stationsData.timestamp,
        source: "swiss_gtfs_data",
      },
    });
  } catch (error) {
    console.error("Error searching stations:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to search stations",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get stations by proximity
router.get("/nearby/:lat/:lng", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { lat, lng } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = req.query.radius ? parseFloat(req.query.radius) : 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: "Invalid coordinates",
        message: "Latitude and longitude must be valid numbers",
        timestamp: new Date().toISOString(),
      });
    }

    const stationsData = gtfsService.getStations(1000, 0); // Get all stations to calculate distance

    // Simple distance calculation (Haversine formula approximation)
    const stationsWithDistance = stationsData.data.map((station) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((station.coordinate.y - latitude) * Math.PI) / 180;
      const dLng = ((station.coordinate.x - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((station.coordinate.y * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        ...station,
        distance: Math.round(distance * 100) / 100,
      };
    });

    const nearbyStations = stationsWithDistance
      .filter((station) => station.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      data: nearbyStations,
      meta: {
        center: { lat: latitude, lng: longitude },
        radius,
        total: nearbyStations.length,
        timestamp: stationsData.timestamp,
        source: "swiss_gtfs_data",
      },
    });
  } catch (error) {
    console.error("Error getting nearby stations:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch nearby stations",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
