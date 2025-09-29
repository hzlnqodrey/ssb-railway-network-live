const { Router } = require("express");
const gtfsService = require("../services/gtfsService");

const router = Router();

// Get all trains (live trains from GTFS data)
router.get("/", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const { category, operator, delayed, limit } = req.query;
    const liveTrainsData = gtfsService.getLiveTrains();
    let filteredTrains = [...liveTrainsData.data];

    // Filter by category
    if (category && typeof category === "string") {
      filteredTrains = filteredTrains.filter(
        (train) => train.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by operator
    if (operator && typeof operator === "string") {
      filteredTrains = filteredTrains.filter(
        (train) => train.operator.toLowerCase() === operator.toLowerCase()
      );
    }

    // Filter delayed trains
    if (delayed === "true") {
      filteredTrains = filteredTrains.filter((train) => train.delay > 0);
    }

    // Limit results
    if (limit && typeof limit === "string") {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredTrains = filteredTrains.slice(0, limitNum);
      }
    }

    res.json({
      data: filteredTrains,
      meta: {
        total: filteredTrains.length,
        timestamp: liveTrainsData.timestamp,
        source: "swiss_gtfs_data",
        filters: { category, operator, delayed, limit },
      },
    });
  } catch (error) {
    console.error("Error getting trains:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch train data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get live positions (real-time GTFS data) - MUST come before /:id route
router.get("/live", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const liveTrainsData = gtfsService.getLiveTrains();

    res.json({
      data: liveTrainsData.data,
      meta: {
        timestamp: liveTrainsData.timestamp,
        source: "swiss_gtfs_data",
        updateInterval: 5000,
        note: "Live train positions from Swiss GTFS data",
      },
    });
  } catch (error) {
    console.error("Error getting live trains:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch live train data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get train statistics - MUST come before /:id route
router.get("/stats/summary", (req, res) => {
  try {
    if (!gtfsService.isDataLoaded()) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "GTFS data is still loading. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    const liveTrainsData = gtfsService.getLiveTrains();
    const trains = liveTrainsData.data;

    const stats = {
      total: trains.length,
      byCategory: trains.reduce((acc, train) => {
        acc[train.category] = (acc[train.category] || 0) + 1;
        return acc;
      }, {}),
      byOperator: trains.reduce((acc, train) => {
        acc[train.operator] = (acc[train.operator] || 0) + 1;
        return acc;
      }, {}),
      delayed: trains.filter((train) => train.delay > 0).length,
      onTime: trains.filter((train) => train.delay === 0).length,
      cancelled: trains.filter((train) => train.cancelled).length,
      averageDelay:
        trains.length > 0
          ? trains.reduce((sum, train) => sum + train.delay, 0) / trains.length
          : 0,
      averageSpeed:
        trains.length > 0
          ? trains.reduce((sum, train) => sum + train.speed, 0) / trains.length
          : 0,
    };

    res.json({
      data: stats,
      meta: {
        timestamp: liveTrainsData.timestamp,
        source: "swiss_gtfs_data",
      },
    });
  } catch (error) {
    console.error("Error getting train stats:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch train statistics",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get specific train by ID - MUST come after specific routes
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
    const liveTrainsData = gtfsService.getLiveTrains();
    const train = liveTrainsData.data.find((t) => t.id === id);

    if (!train) {
      return res.status(404).json({
        error: "Train not found",
        message: `Train with ID ${id} does not exist`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      data: train,
      meta: {
        timestamp: liveTrainsData.timestamp,
        source: "swiss_gtfs_data",
      },
    });
  } catch (error) {
    console.error("Error getting train by ID:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch train data",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
