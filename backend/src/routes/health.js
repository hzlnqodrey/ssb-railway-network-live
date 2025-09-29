const { Router } = require("express");
const gtfsService = require("../services/gtfsService");

const router = Router();

// Health check endpoint
router.get("/", (req, res) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    services: {
      gtfs_data: gtfsService.isDataLoaded() ? "operational" : "loading",
      api_server: "operational",
    },
  };

  res.json(healthStatus);
});

// Detailed health check
router.get("/detailed", (req, res) => {
  const detailed = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    nodejs: process.version,
    platform: process.platform,
    arch: process.arch,
    services: {
      gtfs_data: gtfsService.isDataLoaded() ? "operational" : "loading",
      api_server: "operational",
    },
    checks: {
      memory_usage: process.memoryUsage().heapUsed < 200 * 1024 * 1024, // 200MB threshold
      uptime: process.uptime() > 0,
      gtfs_loaded: gtfsService.isDataLoaded(),
    },
    gtfs_stats: gtfsService.isDataLoaded() ? gtfsService.getStats() : null,
  };

  const isHealthy = Object.values(detailed.checks).every(
    (check) => check === true
  );

  res.status(isHealthy ? 200 : 503).json({
    ...detailed,
    status: isHealthy ? "healthy" : "unhealthy",
  });
});

module.exports = router;
