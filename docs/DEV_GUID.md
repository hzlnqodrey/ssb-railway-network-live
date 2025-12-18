# 🚂 Swiss Railway Network Live - Developer Guide

## Overview

This document provides comprehensive documentation for developing, running, and maintaining the Swiss Railway Network Live application.

**Tech Stack:**
- **Backend:** Go 1.21+ with gorilla/mux, zerolog
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet
- **Storage:** localStorage (browser), In-memory (backend)

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Quick Start](#quick-start)
3. [Backend Commands](#backend-commands)
4. [Frontend Commands](#frontend-commands)
5. [API Reference](#api-reference)
6. [localStorage Reference](#localstorage-reference)
7. [Key Files Reference](#key-files-reference)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Security Notes](#security-notes)

---

## Project Structure

```
Swiss-Railway-Network-Live/
├── backend-go/                    # Go REST API + WebSocket server
│   ├── cmd/
│   │   └── server/
│   │       └── main.go            # Entry point, routes, server config
│   ├── internal/
│   │   ├── handlers/              # HTTP request handlers
│   │   │   ├── favorites.go       # Favorites CRUD (POST/PUT/DELETE demo)
│   │   │   ├── stations.go        # Station endpoints
│   │   │   └── trains.go          # Train endpoints
│   │   ├── middleware/            # HTTP middleware
│   │   │   ├── middleware.go      # Monolith version (for comparison)
│   │   │   ├── logging.go         # Request logging
│   │   │   ├── security.go        # CORS, CSRF, headers
│   │   │   ├── ratelimit.go       # Rate limiting
│   │   │   ├── recovery.go        # Panic recovery
│   │   │   └── chain.go           # Middleware chaining
│   │   └── models/                # Data models
│   │       ├── models.go          # Monolith version (for comparison)
│   │       ├── station.go         # Station types
│   │       ├── train.go           # Train types
│   │       ├── favorites.go       # Favorite types
│   │       └── api.go             # API response types
│   ├── go.mod                     # Go module dependencies
│   └── go.sum                     # Dependency checksums
│
├── frontend/                      # Next.js React application
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── page.tsx           # Home page
│   │   ├── components/            # React components
│   │   │   ├── map/               # Map-related components
│   │   │   │   ├── SwissRailwayMap.tsx    # Main map container
│   │   │   │   ├── MapControls.tsx        # Zoom, layers, settings
│   │   │   │   ├── SwissTimePanel.tsx     # Time display (draggable)
│   │   │   │   ├── TrainDetails.tsx       # Train info panel
│   │   │   │   ├── StationMarker.tsx      # Station map markers
│   │   │   │   └── AnimatedTrainMarker.tsx # Animated train icons
│   │   │   ├── favorites/         # Favorites feature
│   │   │   │   └── FloatingFavorites.tsx  # Draggable favorites panel
│   │   │   └── ui/                # Reusable UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useDraggable.ts    # Drag-and-drop hook
│   │   │   └── useSwissRailwayData.ts # Data fetching hook
│   │   ├── services/              # API and storage services
│   │   │   ├── favoritesStorage.ts # localStorage persistence
│   │   │   ├── favoritesApi.ts    # Backend API calls
│   │   │   └── swissTransportApi.ts # Swiss Transport API
│   │   ├── types/                 # TypeScript type definitions
│   │   │   └── railway.ts         # Domain types
│   │   └── lib/                   # Utilities
│   │       └── utils.ts           # Helper functions
│   ├── public/                    # Static assets
│   ├── package.json               # Node.js dependencies
│   ├── tailwind.config.ts         # Tailwind CSS config
│   └── tsconfig.json              # TypeScript config
│
├── docs/                          # Documentation
│   ├── DEVELOPER_GUIDE.md         # This file
│   └── SUPABASE_INTEGRATION_PLAN.md # Future database plan
│
└── README.md                      # Project overview
```

---

## Quick Start

### Prerequisites

```bash
# Check Go version (requires 1.21+)
go version

# Check Node.js version (requires 18+)
node --version

# Check npm version
npm --version
```

### One-Command Start

```bash
# Terminal 1: Start Backend
cd /Users/hzlnqodrey/Developer/side-project/Swiss-Railway-Network-Live/backend-go && go run cmd/server/main.go

# Terminal 2: Start Frontend
cd /Users/hzlnqodrey/Developer/side-project/Swiss-Railway-Network-Live/frontend && npm run dev

# Open browser
open http://localhost:3000
```

### Verify Everything Works

```bash
# Check backend health
curl http://localhost:8080/health
# Expected: {"status":"ok","timestamp":"..."}

# Check frontend
curl -s http://localhost:3000 | head -1
# Expected: <!DOCTYPE html>
```

---

## Backend Commands

### Running the Server

```bash
cd /Users/hzlnqodrey/Developer/side-project/Swiss-Railway-Network-Live/backend-go

# Development (with hot reload - requires air)
# go install github.com/cosmtrek/air@latest
air

# Development (manual restart)
go run cmd/server/main.go

# Build binary
go build -o server cmd/server/main.go

# Run binary
./server

# Run with custom port
PORT=9090 ./server
```

### Dependency Management

```bash
cd backend-go

# Download dependencies
go mod download

# Tidy dependencies (remove unused)
go mod tidy

# Update all dependencies
go get -u ./...

# Add specific dependency
go get github.com/google/uuid
```

### Testing

```bash
cd backend-go

# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Linting

```bash
cd backend-go

# Install golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
golangci-lint run

# Fix auto-fixable issues
golangci-lint run --fix
```

---

## Frontend Commands

### Development

```bash
cd /Users/hzlnqodrey/Developer/side-project/Swiss-Railway-Network-Live/frontend

# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Start on different port
PORT=3001 npm run dev
```

### Building

```bash
cd frontend

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Fix lint errors
npm run lint -- --fix

# Build for production
npm run build

# Start production server
npm start
```

### Dependency Management

```bash
cd frontend

# Add dependency
npm install <package-name>

# Add dev dependency
npm install -D <package-name>

# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Cleaning

```bash
cd frontend

# Remove node_modules
rm -rf node_modules

# Remove Next.js cache
rm -rf .next

# Fresh install
rm -rf node_modules .next && npm install
```

---

## API Reference

### Base URL

```
http://localhost:8080
```

### Health Check

```bash
curl http://localhost:8080/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-12-18T10:30:00Z"
}
```

### Stations

```bash
# List all stations
curl http://localhost:8080/api/stations

# Get station by ID
curl http://localhost:8080/api/stations/8503000

# Get station departures
curl http://localhost:8080/api/stations/8503000/departures
```

### Trains

```bash
# List all trains
curl http://localhost:8080/api/trains

# Get train by ID
curl http://localhost:8080/api/trains/IC123
```

### Favorites (Stations)

```bash
# List favorites (GET)
curl http://localhost:8080/api/favorites

# Create favorite (POST)
curl -X POST http://localhost:8080/api/favorites \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "stationId": "8503000",
    "nickname": "My Home Station",
    "notes": "Closest to work"
  }'

# Update favorite (PUT)
curl -X PUT http://localhost:8080/api/favorites/<id> \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "nickname": "Updated Name",
    "notes": "Updated notes"
  }'

# Delete favorite (DELETE)
curl -X DELETE http://localhost:8080/api/favorites/<id> \
  -H "X-Requested-With: XMLHttpRequest"
```

### Favorites (Trains)

```bash
# List train favorites (GET)
curl http://localhost:8080/api/favorites/trains

# Create train favorite (POST)
curl -X POST http://localhost:8080/api/favorites/trains \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "trainId": "IC123",
    "nickname": "My Commute",
    "autoFollow": true
  }'

# Update train favorite (PUT)
curl -X PUT http://localhost:8080/api/favorites/trains/<id> \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{
    "nickname": "Updated",
    "autoFollow": false
  }'

# Delete train favorite (DELETE)
curl -X DELETE http://localhost:8080/api/favorites/trains/<id> \
  -H "X-Requested-With: XMLHttpRequest"
```

### WebSocket

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/ws')

ws.onopen = () => {
  console.log('Connected')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}
```

---

## localStorage Reference

### Keys Used

| Key | Type | Purpose |
|-----|------|---------|
| `swiss-railway-favorites-stations` | JSON Array | Saved station favorites |
| `swiss-railway-favorites-trains` | JSON Array | Saved train favorites |
| `floating-favorites-position` | JSON Object | Favorites panel position `{x, y}` |
| `map-controls-position` | JSON Object | Map controls position `{x, y}` |
| `swiss-time-panel-position` | JSON Object | Time panel position `{x, y}` |
| `swiss-railway-time-multiplier` | Number | Time speed (1, 5, 10, 20, 50, 100) |

### Inspect in Browser

```javascript
// Open browser DevTools (F12) → Console

// View all keys
Object.keys(localStorage)

// View station favorites
JSON.parse(localStorage.getItem('swiss-railway-favorites-stations'))

// View train favorites
JSON.parse(localStorage.getItem('swiss-railway-favorites-trains'))

// Clear all favorites
localStorage.removeItem('swiss-railway-favorites-stations')
localStorage.removeItem('swiss-railway-favorites-trains')

// Clear everything
localStorage.clear()
```

### Export/Import Favorites

```javascript
// Export
const backup = {
  stations: JSON.parse(localStorage.getItem('swiss-railway-favorites-stations') || '[]'),
  trains: JSON.parse(localStorage.getItem('swiss-railway-favorites-trains') || '[]')
}
console.log(JSON.stringify(backup, null, 2))
// Copy the output

// Import (paste your backup)
const restore = { /* your backup data */ }
localStorage.setItem('swiss-railway-favorites-stations', JSON.stringify(restore.stations))
localStorage.setItem('swiss-railway-favorites-trains', JSON.stringify(restore.trains))
location.reload()
```

---

## Key Files Reference

### Backend Files to Preserve

| File | Purpose | Notes |
|------|---------|-------|
| `go.mod` | Dependencies | Commit to git |
| `go.sum` | Dependency checksums | Commit to git |
| `cmd/server/main.go` | Entry point | All routes defined here |
| `internal/models/models.go` | Monolith models | Keep for documentation/comparison |
| `internal/middleware/middleware.go` | Monolith middleware | Keep for documentation/comparison |

### Frontend Files to Preserve

| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Dependencies | Commit to git |
| `package-lock.json` | Dependency locks | Commit to git |
| `tsconfig.json` | TypeScript config | Commit to git |
| `tailwind.config.ts` | Tailwind config | Commit to git |
| `.env.local` | Environment vars | **DO NOT COMMIT** |

### Files NOT to Commit

Add to `.gitignore`:

```gitignore
# Dependencies
node_modules/
vendor/

# Build outputs
.next/
out/
server

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage
coverage/
coverage.out
```

---

## Development Workflow

### Starting Fresh Development Session

```bash
# 1. Check for updates (optional)
cd /Users/hzlnqodrey/Developer/side-project/Swiss-Railway-Network-Live
git pull origin main

# 2. Start backend
cd backend-go
go run cmd/server/main.go &

# 3. Start frontend
cd ../frontend
npm run dev &

# 4. Open browser
open http://localhost:3000

# 5. Verify health
curl http://localhost:8080/health
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes...

# 3. Check for lint errors
cd frontend && npm run lint
cd ../backend-go && golangci-lint run

# 4. Run tests
cd frontend && npx tsc --noEmit
cd ../backend-go && go test ./...

# 5. Commit
git add .
git commit -m "feat: your feature description"

# 6. Push
git push origin feature/your-feature-name
```

### Stopping Servers

```bash
# Find processes
lsof -i :8080  # Backend
lsof -i :3000  # Frontend

# Kill by port
lsof -ti :8080 | xargs kill -9
lsof -ti :3000 | xargs kill -9

# Or kill all Go and Node processes (careful!)
pkill -f "go run"
pkill -f "next-server"
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port is in use
lsof -i :8080

# Kill existing process
lsof -ti :8080 | xargs kill -9

# Check for Go errors
go build ./...

# Verify dependencies
go mod tidy
```

### Frontend Won't Start

```bash
# Check if port is in use
lsof -i :3000

# Kill existing process
lsof -ti :3000 | xargs kill -9

# Clean and reinstall
rm -rf node_modules .next
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

### API Returns 404

```bash
# Verify backend is running
curl http://localhost:8080/health

# Check routes in main.go
grep -n "HandleFunc\|Handle" backend-go/cmd/server/main.go
```

### CORS Errors

Check `backend-go/cmd/server/main.go`:
```go
allowedOrigins := []string{"http://localhost:3000"}
```

Add your frontend URL if different.

### localStorage Not Persisting

1. Check browser is not in incognito/private mode
2. Check storage quota:
```javascript
navigator.storage.estimate().then(estimate => {
  console.log(`Quota: ${estimate.quota}`)
  console.log(`Usage: ${estimate.usage}`)
})
```

### TypeScript Error: "Cannot find type definition for 'minimatch'"

This is a known issue with the project config. The app works despite this error.

To fix:
```bash
npm install -D @types/minimatch
```

---

## Security Notes

### CSRF Protection

Backend requires one of:
- Header: `Content-Type: application/json`
- Header: `X-Requested-With: XMLHttpRequest`

For mutating requests (POST, PUT, DELETE, PATCH).

### XSS Prevention

- Backend: `html.EscapeString()` on user input
- Frontend: React auto-escapes by default

### Request Size Limits

Default: 1MB max request body

### Rate Limiting

Configure in middleware:
```go
limiter := middleware.NewRateLimiter(100, time.Minute) // 100 req/min
```

### Secrets Management

Never commit:
- API keys
- Database passwords
- JWT secrets
- OAuth credentials

Use `.env.local` for local development.

---

## Useful Resources

### Go
- [Go Documentation](https://go.dev/doc/)
- [Gorilla Mux](https://github.com/gorilla/mux)
- [Zerolog](https://github.com/rs/zerolog)

### React/Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Mapping
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React Leaflet](https://react-leaflet.js.org/)

### Swiss Transport
- [Swiss Transport API](https://transport.opendata.ch/)
- [Swiss GTFS Data](https://opentransportdata.swiss/)

---

*Last Updated: December 2024*
