const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { config } = require("dotenv");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

// Import routes
const healthRoutes = require("./routes/health");
const trainsRoutes = require("./routes/trains");
const stationsRoutes = require("./routes/stations");

// Import GTFS service
const gtfsService = require("./services/gtfsService");

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Routes
app.use("/health", healthRoutes);
app.use("/api/trains", trainsRoutes);
app.use("/api/stations", stationsRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Swiss Railway Network API",
    version: "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    gtfs_loaded: gtfsService.isDataLoaded(),
    endpoints: {
      health: "/health",
      trains: "/api/trains",
      stations: "/api/stations",
      websocket: `ws://localhost:${PORT}/ws`,
    },
    stats: gtfsService.isDataLoaded() ? gtfsService.getStats() : null,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);

  res.status(500).json({
    error: "Internal Server Error",
    message: NODE_ENV === "development" ? err.message : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({
  server,
  path: "/ws",
});

wss.on("connection", (ws, req) => {
  console.log("WebSocket client connected from:", req.socket.remoteAddress);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connection",
      message: "Connected to Swiss Railway Network WebSocket",
      timestamp: new Date().toISOString(),
      gtfs_loaded: gtfsService.isDataLoaded(),
    })
  );

  // Handle client messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("Received message:", message);

      // Handle different message types
      if (message.type === "request_live_data" && gtfsService.isDataLoaded()) {
        const liveTrains = gtfsService.getLiveTrains();
        ws.send(
          JSON.stringify({
            type: "live_trains",
            data: liveTrains,
            timestamp: new Date().toISOString(),
          })
        );
      } else {
        // Echo message back
        ws.send(
          JSON.stringify({
            type: "echo",
            data: message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error("Invalid JSON message:", error);
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Broadcast live data every 5 seconds to connected clients
let liveDataInterval;
const startLiveDataBroadcast = () => {
  liveDataInterval = setInterval(() => {
    if (gtfsService.isDataLoaded() && wss.clients.size > 0) {
      const liveTrains = gtfsService.getLiveTrains();
      const message = JSON.stringify({
        type: "live_trains_update",
        data: liveTrains,
        timestamp: new Date().toISOString(),
      });

      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    }
  }, 5000); // Every 5 seconds
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (liveDataInterval) clearInterval(liveDataInterval);
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  if (liveDataInterval) clearInterval(liveDataInterval);
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Load GTFS data first
    console.log("🚂 Starting Swiss Railway Network API Server...");
    await gtfsService.loadGTFSData();

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚂 Swiss Railway Network API Server`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🚀 API Base: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`);
      console.log(`📊 Connected clients: ${wss.clients.size}`);
      console.log(
        `📈 GTFS Data: ${gtfsService.isDataLoaded() ? "LOADED" : "LOADING..."}`
      );

      // Start live data broadcast
      startLiveDataBroadcast();
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
