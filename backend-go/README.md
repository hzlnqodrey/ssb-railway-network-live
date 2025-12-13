# Swiss Railway Network - Go Backend

A high-performance Go backend for the Swiss Railway Network Live application.

## Features

- 🚂 **GTFS Data Processing**: Load and query Swiss railway GTFS data
- 🔄 **Real-time Updates**: WebSocket support for live train positions
- 🌐 **Swiss Transport API**: Integration with Swiss Open Transport API
- 🛡️ **Security**: CORS, security headers, rate limiting
- 📊 **REST API**: Full REST API compatible with the frontend

## Architecture

```
backend-go/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── config/              # Configuration management
│   ├── handlers/            # HTTP request handlers
│   ├── middleware/          # HTTP middleware
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   └── websocket/           # WebSocket hub
├── go.mod                   # Go module definition
├── Dockerfile.dev           # Development Dockerfile
└── .air.toml               # Hot reload configuration
```

## Quick Start

### Prerequisites

- Go 1.22 or later
- GTFS data in `../data-swiss/gtfs-out/`

### Development

1. Copy environment config:
   ```bash
   cp env.config.example .env
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Run the server:
   ```bash
   go run ./cmd/server
   ```

4. For hot reload development:
   ```bash
   # Install air
   go install github.com/air-verse/air@latest
   
   # Run with hot reload
   air
   ```

### Docker

```bash
# Build development image
docker build -f Dockerfile.dev -t swiss-railway-go --target development .

# Run container
docker run -p 8080:8080 -v $(pwd):/app swiss-railway-go
```

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/ready` | Readiness probe (Kubernetes) |
| GET | `/health/live` | Liveness probe (Kubernetes) |

### Stations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List all stations (paginated) |
| GET | `/api/stations/:id` | Get station by ID |
| GET | `/api/stations/:id/departures` | Get station departures |
| GET | `/api/stations/search/:query` | Search stations by name |
| GET | `/api/stations/nearby/:lat/:lng` | Find nearby stations |

### Trains

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trains` | List all trains (with filters) |
| GET | `/api/trains/live` | Get live train positions |
| GET | `/api/trains/:id` | Get train by ID |
| GET | `/api/trains/stats/summary` | Get train statistics |

### WebSocket

Connect to `ws://localhost:8080/ws` for real-time train updates.

**Message Types:**
- `connection` - Connection established
- `live_trains_update` - Periodic train position updates
- `request_live_data` - Request immediate train data
- `ping/pong` - Keep-alive

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `ENVIRONMENT` | `development` | Environment (development/production) |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for CORS |
| `GTFS_DATA_PATH` | `../data-swiss/gtfs-out` | Path to GTFS data |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `ENABLE_SWISS_API` | `true` | Enable Swiss Transport API |
| `WS_UPDATE_INTERVAL` | `5` | WebSocket update interval (seconds) |

## Performance

- Concurrent GTFS file loading
- Indexed data structures for O(1) lookups
- Connection pooling for external APIs
- Rate limiting to prevent abuse

## Security

- CORS configuration with allowed origins
- Security headers (X-Frame-Options, CSP, etc.)
- Rate limiting per IP
- Request timeout handling
- Graceful shutdown

## License

MIT

