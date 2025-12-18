# Changelog

All notable changes to this project.

Format: `[date] [scope] - description`

---

## 2024-12-18

### frontend/src/components/favorites/FloatingFavorites.tsx
- Rewrote to use localStorage instead of backend API
- Added proper TypeScript types (removed `any`)
- Consolidated favorites UI (removed FavoritesPanel.tsx duplicate)
- Added Database icon to show storage type in footer

### frontend/src/services/favoritesStorage.ts (new)
- localStorage-based favorites persistence
- Functions: get/add/update/delete for stations and trains
- Export/import utilities for backup

### frontend/src/components/map/MapControls.tsx
- Added zoom controls: ZoomIn, ZoomOut, Home (reset view)
- New props: onZoomIn, onZoomOut, onResetView

### frontend/src/components/map/SwissRailwayMap.tsx
- Added MapZoomController component inside MapContainer
- Pass zoom callbacks to MapControls
- Removed FavoritesPanel and toggle button
- Added trainToAddToFavorites state
- Added handleAddTrainToFavorites handler

### frontend/src/components/map/TrainDetails.tsx
- Added Star icon import
- Added onAddToFavorites prop
- Added favorite button in header

### deleted: frontend/src/components/favorites/FavoritesPanel.tsx
- Removed (consolidated into FloatingFavorites)

### deleted: frontend/src/components/favorites/FloatingFavoriteCard.tsx
- Removed (unused)

### docs/
- Added README.md (documentation index)
- Added DEV_GUID.md (developer reference)
- Added Supabase_Plan.md (future database plan)

---

## 2024-12-17

### frontend/src/hooks/useDraggable.ts (new)
- Reusable drag-and-drop hook
- Mouse and touch support
- localStorage position persistence

### frontend/src/components/map/SwissTimePanel.tsx (new)
- Extracted from SwissRailwayMap
- Made draggable using useDraggable hook

### frontend/src/components/map/MapControls.tsx
- Made draggable using useDraggable hook
- Added drag handle header

### frontend/src/components/favorites/FloatingFavorites.tsx
- Made draggable (inline implementation)
- Position persisted to localStorage

### backend-go/internal/models/
- Split models.go into domain files:
  - station.go, train.go, favorites.go
  - api.go, gtfs.go, health.go
- Kept models.go as monolith reference (renamed types with Monolith suffix)

### backend-go/internal/middleware/
- Split middleware.go into concern files:
  - logging.go, security.go, ratelimit.go
  - recovery.go, chain.go
- Kept middleware.go as monolith reference

### backend-go/internal/handlers/favorites.go
- Added FavoriteTrain CRUD handlers
- Routes: /api/favorites/trains

### backend-go/internal/models/favorites.go
- Added FavoriteTrain struct
- Added CreateFavoriteTrainRequest, UpdateFavoriteTrainRequest

### frontend/src/types/railway.ts
- Added FavoriteTrain interface
- Added CreateFavoriteTrainRequest, UpdateFavoriteTrainRequest

### frontend/src/services/favoritesApi.ts
- Added train favorites API functions

---

## 2024-12-16

### backend-go/internal/handlers/favorites.go (new)
- Station favorites CRUD with in-memory storage
- XSS prevention via html.EscapeString
- Content-Type validation for CSRF protection

### backend-go/internal/middleware/middleware.go
- Added CSRFProtection middleware
- Added ValidateRequestBody middleware (1MB limit)

### backend-go/cmd/server/main.go
- Added favorites routes
- Initialized FavoritesHandler

### frontend/src/components/favorites/FavoritesPanel.tsx (new)
- Full CRUD UI for station favorites
- Form validation
- HTTP method labels for learning

### frontend/src/services/favoritesApi.ts (new)
- Fetch-based API client
- Security headers (Content-Type, X-Requested-With)
- Custom error handling

### frontend/src/types/railway.ts
- Added Favorite interface
- Added CreateFavoriteRequest, UpdateFavoriteRequest

### frontend/src/components/map/StationMarker.tsx
- Added "Add to Favorites" button in popup

---

## Format Reference

```
[date]

### [file/scope]
- what changed (why if not obvious)
```

Keep it short. No fluff. Code speaks.
