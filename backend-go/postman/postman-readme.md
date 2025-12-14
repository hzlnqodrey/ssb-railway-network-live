# Swiss Railway API - Postman Collection

This directory contains Postman collections and environments for testing the Swiss Railway Network API.

## Files

| File | Description |
|------|-------------|
| `Swiss-Railway-API.postman_collection.json` | Complete API collection with all endpoints and tests |
| `Swiss-Railway-Local.postman_environment.json` | Environment variables for local development |

## Quick Start

### Import into Postman

1. Open Postman
2. Click **Import** button
3. Select both files:
   - `Swiss-Railway-API.postman_collection.json`
   - `Swiss-Railway-Local.postman_environment.json`
4. Select the "Swiss Railway - Local" environment from the dropdown

### Run Tests

1. Make sure the backend is running:
   ```bash
   cd backend-go
   go run cmd/server/main.go
   ```

2. In Postman, click on the collection → **Run collection**

3. Or run individual requests

## API Endpoints

### Health Checks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Main health check |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/live` | Kubernetes liveness probe |

### Stations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | Get all stations (paginated) |
| GET | `/api/stations/{id}` | Get station by ID |
| GET | `/api/stations/{id}/departures` | Get station departures |
| GET | `/api/stations/search/{query}` | Search stations |
| GET | `/api/stations/nearby/{lat}/{lng}` | Find nearby stations |

### Trains
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trains` | Get all trains |
| GET | `/api/trains/live` | Get live train positions |
| GET | `/api/trains/{id}` | Get train by ID |
| GET | `/api/trains/stats/summary` | Get train statistics |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8080/ws` | Real-time train updates |

## Running with Newman (CLI)

Install Newman:
```bash
npm install -g newman
```

Run tests:
```bash
# Run all tests
newman run Swiss-Railway-API.postman_collection.json \
  -e Swiss-Railway-Local.postman_environment.json

# Run with HTML report
newman run Swiss-Railway-API.postman_collection.json \
  -e Swiss-Railway-Local.postman_environment.json \
  -r html --reporter-html-export report.html

# Run specific folder
newman run Swiss-Railway-API.postman_collection.json \
  -e Swiss-Railway-Local.postman_environment.json \
  --folder "Health"
```

## Test Coverage

Each endpoint includes tests for:

- ✅ Response status codes (200, 400, 404)
- ✅ Response structure validation
- ✅ Required field presence
- ✅ Data type verification
- ✅ Performance benchmarks
- ✅ Error handling

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `baseUrl` | `http://localhost:8080` | API base URL |
| `wsUrl` | `ws://localhost:8080/ws` | WebSocket URL |
| `stationId` | (auto-populated) | Station ID for testing |
| `trainId` | (auto-populated) | Train ID for testing |

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start backend
        run: |
          cd backend-go
          go run cmd/server/main.go &
          sleep 10  # Wait for server to start
      
      - name: Install Newman
        run: npm install -g newman
      
      - name: Run API tests
        run: |
          cd backend-go/postman
          newman run Swiss-Railway-API.postman_collection.json \
            -e Swiss-Railway-Local.postman_environment.json \
            --reporters cli,junit \
            --reporter-junit-export results.xml
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: backend-go/postman/results.xml
```

## Troubleshooting

### Connection Refused
Make sure the backend is running on port 8080:
```bash
curl http://localhost:8080/health
```

### GTFS Data Not Loaded
Check if the GTFS data path is correct:
```bash
ls -la ../data-swiss/gtfs-out/
```

### Empty Results
The backend needs time to load GTFS data on startup. Wait for the "GTFS Status: LOADED ✅" message.
