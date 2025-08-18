#!/usr/bin/env node

/**
 * Simple WebSocket Server for Swiss Railway Network Live
 *
 * This server provides WebSocket connections for real-time train updates.
 * Run with: node websocket-server.js
 */

const WebSocket = require("ws");
const http = require("http");

const PORT = 8000;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

console.log(`🚀 Starting Swiss Railway WebSocket Server on port ${PORT}...`);

// Store connected clients
const clients = new Set();

// Mock train data for testing
const mockTrainUpdates = [
  {
    type: "train_update",
    data: {
      id: "IC-1-001",
      position: { lat: 47.3769, lng: 8.5417 },
      status: "on_time",
      delay: 0,
    },
  },
  {
    type: "station_update",
    data: {
      stationId: "zurich-hb",
      departures: 5,
      status: "normal",
    },
  },
  {
    type: "system_notification",
    message: "All systems operational",
  },
];

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`✅ Client connected from ${clientIp}`);

  clients.add(ws);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connection",
      message: "Connected to Swiss Railway WebSocket Server",
      timestamp: new Date().toISOString(),
    })
  );

  // Handle incoming messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Received from ${clientIp}:`, message);

      // Handle different message types
      switch (message.type) {
        case "heartbeat":
          // Respond to heartbeat
          ws.send(
            JSON.stringify({
              type: "heartbeat_response",
              timestamp: new Date().toISOString(),
            })
          );
          break;

        case "echo":
          // Echo message back
          ws.send(
            JSON.stringify({
              type: "echo_response",
              data: message.data,
              timestamp: new Date().toISOString(),
            })
          );
          break;

        default:
          console.log(`❓ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Failed to parse message from ${clientIp}:`, error);
    }
  });

  // Handle client disconnect
  ws.on("close", (code, reason) => {
    clients.delete(ws);
    console.log(`❌ Client ${clientIp} disconnected (${code}): ${reason}`);
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`🚫 WebSocket error from ${clientIp}:`, error);
    clients.delete(ws);
  });
});

// Broadcast mock data periodically (every 10 seconds)
setInterval(() => {
  if (clients.size > 0) {
    const randomUpdate =
      mockTrainUpdates[Math.floor(Math.random() * mockTrainUpdates.length)];
    const message = JSON.stringify({
      ...randomUpdate,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `📡 Broadcasting to ${clients.size} clients:`,
      randomUpdate.type
    );

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}, 10000);

// Handle server errors
wss.on("error", (error) => {
  console.error("🚫 WebSocket Server error:", error);
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(
    `✅ Swiss Railway WebSocket Server running on ws://localhost:${PORT}/ws`
  );
  console.log(`📡 Ready to accept connections from http://localhost:3000`);
  console.log(`🎭 Broadcasting mock train updates every 10 seconds`);
  console.log(`🔧 Ctrl+C to stop server`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down WebSocket server...");

  // Close all client connections
  clients.forEach((client) => {
    client.close(1000, "Server shutdown");
  });

  // Close the server
  server.close(() => {
    console.log("✅ WebSocket server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  server.close(() => {
    process.exit(0);
  });
});
