# Swiss Railway Network API Documentation

## Overview

The Swiss Railway Network Live API provides real-time access to Swiss public transport data, including train positions, station information, and live departures. This API serves as a bridge between the Swiss Open Transport Data API and our frontend application.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-production-domain.com`

## Authentication

Currently, no authentication is required for public endpoints. Rate limiting is applied per IP address.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    // Additional error context
  }
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

## Endpoints

### Health Check

#### GET `/health`

Returns the health status of the API.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "database": "not_implemented",
    "cache": "not_implemented",
    "sbb_api": "healthy"
  }
}
```

#### GET `/health/detailed`

Returns detailed health information with additional metrics.

---

### Trains

#### GET `/api/trains`

Get all active trains with their current positions and status.

**Query Parameters:**
- `category` (optional) - Filter by train category (IC, S, RE, etc.)
- `operator` (optional) - Filter by operator (SBB, BLS, etc.)
- `delayed` (optional) - Filter delayed trains only (`true`/`false`)
- `limit` (optional) - Limit number of results (default: 50, max: 100)

**Example Request:**
```
GET /api/trains?category=IC&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "IC-1-001",
      "name": "IC 1",
      "category": "IC",
      "number": "1",
      "line": "IC1",
      "operator": "SBB",
      "to": "St. Gallen",
      "currentStation": {
        "id": "zurich-hb",
        "name": "Zürich HB",
        "coordinate": { "x": 8.5417, "y": 47.3769 }
      },
      "nextStation": {
        "id": "winterthur",
        "name": "Winterthur",
        "coordinate": { "x": 8.7233, "y": 47.5022 }
      },
      "position": {
        "lat": 47.3769,
        "lng": 8.5417
      },
      "delay": 2,
      "cancelled": false,
      "occupancy": {
        "firstClass": 35,
        "secondClass": 68
      },
      "speed": 85,
      "direction": 45,
      "lastUpdate": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api",
    "filters": {
      "category": "IC",
      "limit": "10"
    }
  }
}
```

#### GET `/api/trains/:id`

Get details for a specific train.

**Parameters:**
- `id` - Train ID

**Response:**
```json
{
  "data": {
    // Same structure as train object above
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api"
  }
}
```

#### GET `/api/trains/live`

Get real-time train positions with simulated movement updates.

**Response:**
```json
{
  "data": [
    // Array of train objects with updated positions
  ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api",
    "updateInterval": 30000,
    "note": "Use WebSocket /ws for real-time updates"
  }
}
```

#### GET `/api/trains/stats/summary`

Get statistics about current train operations.

**Response:**
```json
{
  "data": {
    "total": 150,
    "byCategory": {
      "IC": 25,
      "S": 80,
      "RE": 30,
      "IR": 15
    },
    "byOperator": {
      "SBB": 120,
      "BLS": 20,
      "SOB": 10
    },
    "delayed": 12,
    "onTime": 138,
    "cancelled": 0,
    "averageDelay": 1.2,
    "averageSpeed": 67.5
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api"
  }
}
```

---

### Stations

#### GET `/api/stations`

Get all major Swiss railway stations.

**Query Parameters:**
- `type` (optional) - Filter by station type (`major_hub`, `regional`, `local`)
- `canton` (optional) - Filter by Swiss canton (ZH, BE, GE, etc.)
- `facilities` (optional) - Filter by facilities (comma-separated: `wifi,shops,parking`)
- `limit` (optional) - Limit number of results

**Response:**
```json
{
  "data": [
    {
      "id": "zurich-hb",
      "name": "Zürich HB",
      "coordinate": { "x": 8.5417, "y": 47.3769 },
      "distance": 0,
      "type": "major_hub",
      "canton": "ZH",
      "facilities": ["wifi", "shops", "restaurants", "parking", "elevators"]
    }
  ],
  "meta": {
    "total": 1,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api"
  }
}
```

#### GET `/api/stations/:id`

Get details for a specific station.

#### GET `/api/stations/:id/departures`

Get live departure board for a station.

**Response:**
```json
{
  "data": {
    "station": {
      "id": "zurich-hb",
      "name": "Zürich HB",
      "coordinate": { "x": 8.5417, "y": 47.3769 }
    },
    "departures": [
      {
        "id": "dep-zurich-hb-1",
        "name": "IC 1 753",
        "category": "IC",
        "to": "St. Gallen",
        "platform": "7",
        "departure": "2024-01-15T10:45:00.000Z",
        "delay": 0,
        "cancelled": false,
        "operator": "SBB"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "source": "sbb_api"
  }
}
```

#### GET `/api/stations/search/:query`

Search stations by name or location.

#### GET `/api/stations/nearby/:lat/:lng`

Find stations near coordinates.

**Query Parameters:**
- `radius` (optional) - Search radius in kilometers (default: 10)

---

## WebSocket API

### Connection

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
```

### Message Format

All WebSocket messages follow this format:

```json
{
  "type": "message_type",
  "data": { /* message data */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Message Types

#### Connection Established
```json
{
  "type": "connection",
  "message": "Connected to Swiss Railway Network WebSocket",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Train Position Update
```json
{
  "type": "train_update",
  "data": {
    "trainId": "IC-1-001",
    "position": { "lat": 47.3769, "lng": 8.5417 },
    "speed": 85,
    "delay": 2
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Station Update
```json
{
  "type": "station_update",
  "data": {
    "stationId": "zurich-hb",
    "newDeparture": { /* departure object */ }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### System Notification
```json
{
  "type": "system_notification",
  "message": "Service disruption on IC1 line",
  "severity": "warning",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Heartbeat
Send periodically to keep connection alive:

```json
{
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Data Models

### Train Object

```typescript
interface Train {
  id: string                    // Unique train identifier
  name: string                  // Train name (e.g., "IC 1")
  category: string              // Train category (IC, S, RE, etc.)
  number: string                // Train number
  line?: string                 // Line designation
  operator: string              // Operating company
  to: string                    // Final destination
  currentStation?: Station      // Current station
  nextStation?: Station         // Next station
  position?: {                  // GPS coordinates
    lat: number
    lng: number
  }
  delay?: number                // Delay in minutes
  cancelled: boolean            // Cancellation status
  occupancy?: {                 // Car occupancy
    firstClass?: number         // 0-100%
    secondClass?: number        // 0-100%
  }
  speed?: number                // Current speed (km/h)
  direction?: number            // Direction in degrees
  lastUpdate: string            // ISO timestamp
}
```

### Station Object

```typescript
interface Station {
  id: string                    // Unique station identifier
  name: string                  // Station name
  coordinate: {                 // Swiss coordinates
    x: number                   // Longitude
    y: number                   // Latitude
  }
  distance?: number             // Distance from reference point
  type?: string                 // Station type
  canton?: string               // Swiss canton
  facilities?: string[]         // Available facilities
}
```

### Departure Object

```typescript
interface Departure {
  id: string                    // Unique departure identifier
  name: string                  // Train name
  category: string              // Train category
  to: string                    // Destination
  platform?: string            // Platform number
  departure: string             // Scheduled departure (ISO)
  delay: number                 // Delay in minutes
  cancelled: boolean            // Cancellation status
  operator: string              // Operating company
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `TRAIN_NOT_FOUND` | Specified train ID does not exist |
| `STATION_NOT_FOUND` | Specified station ID does not exist |
| `INVALID_COORDINATES` | Invalid latitude/longitude values |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SBB_API_ERROR` | Error from Swiss Transport API |
| `WEBSOCKET_ERROR` | WebSocket connection error |

---

## Examples

### JavaScript/TypeScript

```typescript
// Fetch all trains
const response = await fetch('/api/trains');
const { data: trains } = await response.json();

// Get station departures
const stationBoard = await fetch('/api/stations/zurich-hb/departures');
const { data } = await stationBoard.json();

// WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'train_update') {
    updateTrainPosition(message.data);
  }
};
```

### Python

```python
import requests
import websocket
import json

# Get trains
response = requests.get('http://localhost:8000/api/trains')
trains = response.json()['data']

# WebSocket
def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'train_update':
        print(f"Train {data['data']['trainId']} updated")

ws = websocket.WebSocketApp("ws://localhost:8000/ws",
                           on_message=on_message)
ws.run_forever()
```

---

## Support

For API support and questions:
- **GitHub Issues**: [Repository Issues](https://github.com/your-org/swiss-railway-network/issues)
- **Documentation**: [Project Wiki](https://github.com/your-org/swiss-railway-network/wiki)
- **Email**: support@swiss-railway-live.com

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Train tracking endpoints
- Station information endpoints
- WebSocket real-time updates
- Rate limiting implementation
- Comprehensive documentation
