# 🚂 Swiss Transport API - Complete Documentation

**Base URL:** `https://transport.opendata.ch/v1`

**Official Documentation:** [https://transport.opendata.ch/docs.html](https://transport.opendata.ch/docs.html)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication & Rate Limiting](#authentication--rate-limiting)
3. [API Endpoints](#api-endpoints)
   - [Locations (Search Stations)](#1-locations---search-stations)
   - [Connections (Journey Planning)](#2-connections---journey-planning)
   - [Stationboard (Departures/Arrivals)](#3-stationboard---departuresarrivals)
4. [Data Types & Models](#data-types--models)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Overview

The Swiss Transport API provides access to Swiss public transport data. It is a **read-only API** that supports only **GET** requests.

| Property | Value |
|----------|-------|
| **Protocol** | HTTPS |
| **Base URL** | `https://transport.opendata.ch/v1` |
| **Response Format** | JSON |
| **HTTP Methods** | GET only (no POST/PUT/DELETE) |
| **Authentication** | None required (public API) |
| **Rate Limit** | 1,000 requests per 24 hours |
| **Data Source** | SBB (Swiss Federal Railways) timetable data |

---

## Authentication & Rate Limiting

### Authentication

The API is **free and open** - no API key or authentication required.

### Rate Limiting

| Limit | Value |
|-------|-------|
| Requests per 24 hours | **1,000** |
| Requests per minute | No explicit limit (be reasonable) |
| Recommended delay | 100-200ms between requests |

**Best Practice:** Implement client-side rate limiting:

```bash
# Check current API status
curl -s "https://transport.opendata.ch/v1/" | jq
```

**Response:**

```json
{
  "date": "2025-12-13T08:27:26+01:00",
  "author": "Opendata.ch",
  "version": "1.0"
}
```

---

## API Endpoints

### 1. Locations - Search Stations

Search for stations, addresses, or points of interest.

| Property | Value |
|----------|-------|
| **Endpoint** | `/locations` |
| **Method** | `GET` |
| **Use Case** | Find station IDs, search by name or coordinates |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes* | Station name or address (e.g., "Zürich HB") |
| `x` | float | Yes* | Longitude (WGS84, e.g., 8.540192) |
| `y` | float | Yes* | Latitude (WGS84, e.g., 47.378177) |
| `type` | string | No | Filter type: `all`, `station`, `poi`, `address` |

*Either `query` OR (`x` and `y`) is required

#### cURL Examples

**Search by station name:**

```bash
curl -s "https://transport.opendata.ch/v1/locations?query=Z%C3%BCrich%20HB" | jq
```

**Search by coordinates (near Bern):**

```bash
curl -s "https://transport.opendata.ch/v1/locations?x=7.439122&y=46.948825" | jq
```

**Filter to stations only:**

```bash
curl -s "https://transport.opendata.ch/v1/locations?query=Basel&type=station" | jq
```

#### Response Structure

```json
{
  "stations": [
    {
      "id": "8503000",
      "name": "Zürich HB",
      "score": 100,
      "coordinate": {
        "type": "WGS84",
        "x": 8.540192,
        "y": 47.378177
      },
      "distance": null
    },
    {
      "id": "8503006",
      "name": "Zürich Flughafen",
      "score": 98,
      "coordinate": {
        "type": "WGS84",
        "x": 8.562778,
        "y": 47.450017
      },
      "distance": 8.2
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique station identifier (use for other API calls) |
| `name` | string | Human-readable station name |
| `score` | int | Relevance score (0-100) |
| `coordinate.x` | float | Longitude (WGS84) |
| `coordinate.y` | float | Latitude (WGS84) |
| `distance` | float | Distance in km (when searching by coordinates) |

---

### 2. Connections - Journey Planning

Find connections between two locations.

| Property | Value |
|----------|-------|
| **Endpoint** | `/connections` |
| **Method** | `GET` |
| **Use Case** | Route planning, timetable lookup |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | **Yes** | Departure station (name or ID) |
| `to` | string | **Yes** | Arrival station (name or ID) |
| `via` | string | No | Intermediate station |
| `date` | string | No | Date (format: `YYYY-MM-DD`) |
| `time` | string | No | Time (format: `HH:MM`) |
| `isArrivalTime` | int | No | `1` = time is arrival, `0` = departure (default) |
| `transportations[]` | array | No | Filter: `ice_tgv_rj`, `ec_ic`, `ir`, `re_d`, `ship`, `s_sn_r`, `bus`, `cableway`, `arz_ext`, `tramway_underground` |
| `limit` | int | No | Number of connections (1-16, default: 4) |
| `page` | int | No | Pagination (0-10) |
| `direct` | int | No | `1` = only direct connections |
| `sleeper` | int | No | `1` = only night trains |
| `couchette` | int | No | `1` = only couchette trains |
| `bike` | int | No | `1` = only bike-friendly trains |

#### cURL Examples

**Basic connection search:**

```bash
curl -s "https://transport.opendata.ch/v1/connections?from=Z%C3%BCrich&to=Bern" | jq
```

**With date and time:**

```bash
curl -s "https://transport.opendata.ch/v1/connections?from=8503000&to=8507000&date=2025-12-15&time=09:00" | jq
```

**Via intermediate station:**

```bash
curl -s "https://transport.opendata.ch/v1/connections?from=Geneva&to=Zurich&via=Bern&limit=3" | jq
```

**Direct trains only:**

```bash
curl -s "https://transport.opendata.ch/v1/connections?from=Basel&to=Lugano&direct=1" | jq
```

**Specific transport types (IC/EC trains):**

```bash
curl -s "https://transport.opendata.ch/v1/connections?from=Zurich&to=Geneva&transportations[]=ec_ic" | jq
```

#### Response Structure

```json
{
  "connections": [
    {
      "from": {
        "station": {
          "id": "8503000",
          "name": "Zürich HB",
          "coordinate": { "x": 8.540192, "y": 47.378177 }
        },
        "arrival": null,
        "departure": "2025-12-13T09:32:00+0100",
        "delay": 0,
        "platform": "7",
        "prognosis": {
          "platform": "7",
          "departure": "2025-12-13T09:32:00+0100"
        }
      },
      "to": {
        "station": {
          "id": "8507000",
          "name": "Bern",
          "coordinate": { "x": 7.439122, "y": 46.948825 }
        },
        "arrival": "2025-12-13T10:28:00+0100",
        "departure": null,
        "delay": 0,
        "platform": "3"
      },
      "duration": "00d00:56:00",
      "transfers": 0,
      "products": ["IC 1"],
      "capacity1st": 1,
      "capacity2nd": 2,
      "sections": [
        {
          "journey": {
            "name": "IC 1 753",
            "category": "IC",
            "categoryCode": 1,
            "number": "753",
            "operator": "SBB",
            "to": "Bern",
            "passList": []
          },
          "walk": null,
          "departure": {},
          "arrival": {}
        }
      ]
    }
  ],
  "from": { "id": "8503000", "name": "Zürich HB" },
  "to": { "id": "8507000", "name": "Bern" }
}
```

#### Key Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `duration` | string | Journey duration (format: `00d00:56:00`) |
| `transfers` | int | Number of transfers/changes |
| `products` | array | Train types used (e.g., `["IC 1", "S3"]`) |
| `capacity1st` | int | 1st class capacity: `0`=unknown, `1`=high, `2`=medium, `3`=low |
| `capacity2nd` | int | 2nd class capacity (same scale) |
| `sections` | array | Individual journey segments |
| `delay` | int | Delay in minutes |
| `platform` | string | Platform number |
| `prognosis` | object | Real-time predictions |

---

### 3. Stationboard - Departures/Arrivals

Get departure or arrival board for a station.

| Property | Value |
|----------|-------|
| **Endpoint** | `/stationboard` |
| **Method** | `GET` |
| **Use Case** | Display departures, real-time station info |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station` | string | **Yes** | Station name or ID |
| `id` | string | No | Station ID (alternative to `station`) |
| `limit` | int | No | Number of results (default: 40) |
| `transportations[]` | array | No | Filter by transport type |
| `datetime` | string | No | Date/time (ISO 8601) |
| `type` | string | No | `departure` (default) or `arrival` |

#### cURL Examples

**Get departures from Zürich HB:**

```bash
curl -s "https://transport.opendata.ch/v1/stationboard?station=Z%C3%BCrich%20HB&limit=10" | jq
```

**Using station ID:**

```bash
curl -s "https://transport.opendata.ch/v1/stationboard?id=8503000&limit=5" | jq
```

**Get arrivals instead:**

```bash
curl -s "https://transport.opendata.ch/v1/stationboard?station=Bern&type=arrival&limit=5" | jq
```

**Filter to specific transport types:**

```bash
curl -s "https://transport.opendata.ch/v1/stationboard?station=Basel&transportations[]=ec_ic&transportations[]=ir" | jq
```

**Specific date/time:**

```bash
curl -s "https://transport.opendata.ch/v1/stationboard?station=Geneva&datetime=2025-12-15T14:00:00" | jq
```

#### Response Structure

```json
{
  "station": {
    "id": "8503000",
    "name": "Zürich HB",
    "coordinate": { "x": 8.540192, "y": 47.378177 }
  },
  "stationboard": [
    {
      "stop": {
        "station": {
          "id": "8503000",
          "name": "Zürich HB",
          "coordinate": { "x": 8.540192, "y": 47.378177 }
        },
        "arrival": null,
        "departure": "2025-12-13T09:32:00+0100",
        "delay": 2,
        "platform": "7",
        "prognosis": {
          "platform": "7",
          "departure": "2025-12-13T09:34:00+0100"
        }
      },
      "name": "IC 1 753",
      "category": "IC",
      "subcategory": null,
      "categoryCode": 1,
      "number": "753",
      "operator": "SBB",
      "to": "Bern",
      "passList": [
        {
          "station": { "id": "8507000", "name": "Bern" },
          "arrival": "2025-12-13T10:28:00+0100",
          "departure": null,
          "delay": 2,
          "platform": "3"
        }
      ],
      "capacity1st": 1,
      "capacity2nd": 2
    }
  ]
}
```

#### Key Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full train name (e.g., "IC 1 753") |
| `category` | string | Train category: `IC`, `IR`, `RE`, `S`, `ICE`, etc. |
| `categoryCode` | int | Category code: 1=ICE/IC, 2=IR, 3=RE, 4=S, etc. |
| `number` | string | Train number |
| `operator` | string | Operating company (e.g., "SBB", "BLS") |
| `to` | string | Final destination |
| `passList` | array | All stops on the route |
| `delay` | int | Delay in minutes |
| `prognosis` | object | Real-time prediction |

---

## Data Types & Models

### Location/Station Object

```json
{
  "id": "8503000",
  "name": "Zürich HB",
  "score": 100,
  "coordinate": {
    "type": "WGS84",
    "x": 8.540192,
    "y": 47.378177
  },
  "distance": null
}
```

### Checkpoint Object (Departure/Arrival Point)

```json
{
  "station": { "id": "8503000", "name": "Zürich HB", "coordinate": {} },
  "arrival": "2025-12-13T10:28:00+0100",
  "departure": "2025-12-13T09:32:00+0100",
  "delay": 2,
  "platform": "7",
  "prognosis": {
    "platform": "7",
    "arrival": "2025-12-13T10:30:00+0100",
    "departure": "2025-12-13T09:34:00+0100"
  }
}
```

### Train Categories

| Category | Code | Description |
|----------|------|-------------|
| `ICE` | 1 | InterCity Express (high-speed) |
| `IC` | 1 | InterCity |
| `EC` | 1 | EuroCity |
| `IR` | 2 | InterRegio |
| `RE` | 3 | RegioExpress |
| `R` | 4 | Regional |
| `S` | 5 | S-Bahn (commuter rail) |
| `Bus` | 6 | Bus |
| `Tram` | 7 | Tram |
| `Ship` | 8 | Ship/Ferry |

### Transport Type Filters

Use these values with the `transportations[]` parameter:

| Value | Description |
|-------|-------------|
| `ice_tgv_rj` | ICE, TGV, Railjet (high-speed) |
| `ec_ic` | EuroCity, InterCity |
| `ir` | InterRegio |
| `re_d` | RegioExpress, Direct |
| `s_sn_r` | S-Bahn, RegioS, Regio |
| `bus` | Bus |
| `ship` | Ship/Ferry |
| `cableway` | Cable cars, funiculars |
| `tramway_underground` | Tram, Metro |

### Capacity Indicators

| Value | Meaning | Color |
|-------|---------|-------|
| `0` | Unknown | Gray |
| `1` | High availability (many seats) | Green |
| `2` | Medium availability | Yellow |
| `3` | Low availability (almost full) | Red |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response |
| `400` | Bad Request | Check parameters |
| `404` | Not Found | Station/connection doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded, wait |
| `500` | Server Error | Retry later |
| `503` | Service Unavailable | API maintenance |

### Error Response Example

```json
{
  "errors": [
    {
      "message": "Parameter 'from' is required"
    }
  ]
}
```

### Handling Errors (cURL)

```bash
# Check for errors
response=$(curl -s -w "\n%{http_code}" "https://transport.opendata.ch/v1/connections?from=Invalid")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  echo "Error: HTTP $http_code"
  echo "$body" | jq .errors
fi
```

---

## Best Practices

### 1. Use Station IDs Instead of Names

```bash
# ❌ Bad: Uses name (slower, less reliable)
curl "https://transport.opendata.ch/v1/connections?from=Zürich&to=Bern"

# ✅ Good: Uses station IDs (faster, more reliable)
curl "https://transport.opendata.ch/v1/connections?from=8503000&to=8507000"
```

### 2. Implement Client-Side Caching

Cache station search results for at least 24 hours since they rarely change.

### 3. Respect Rate Limits

```bash
# Add delay between requests
for station in "Zurich" "Bern" "Basel"; do
  curl -s "https://transport.opendata.ch/v1/locations?query=$station"
  sleep 0.2  # 200ms delay
done
```

### 4. Handle Real-Time vs Scheduled Data

```bash
# The 'prognosis' field contains real-time predictions
# Compare with scheduled times to detect delays
```

### 5. Use Appropriate Limits

```bash
# Don't fetch more data than needed
curl "https://transport.opendata.ch/v1/stationboard?station=Bern&limit=5"
```

---

## Quick Reference Card

| Task | Endpoint | Key Params |
|------|----------|------------|
| Find a station | `/locations` | `query` |
| Plan a journey | `/connections` | `from`, `to` |
| Get departures | `/stationboard` | `station`, `type=departure` |
| Get arrivals | `/stationboard` | `station`, `type=arrival` |
| Filter by train type | Any | `transportations[]` |
| Set date/time | `/connections`, `/stationboard` | `date`, `time`, `datetime` |

---

## Example: Complete Workflow

```bash
# Step 1: Find station ID for "Zurich"
curl -s "https://transport.opendata.ch/v1/locations?query=Zurich%20HB&type=station" | jq '.stations[0].id'
# Returns: "8503000"

# Step 2: Find connections to Bern
curl -s "https://transport.opendata.ch/v1/connections?from=8503000&to=8507000&limit=3" | \
  jq '.connections[] | {departure: .from.departure, arrival: .to.arrival, duration: .duration, trains: .products}'

# Step 3: Get live departures from Zurich HB
curl -s "https://transport.opendata.ch/v1/stationboard?id=8503000&limit=5" | \
  jq '.stationboard[] | {train: .name, to: .to, departure: .stop.departure, delay: .stop.delay, platform: .stop.platform}'
```

---

## Major Swiss Stations (Reference)

| Station | ID | Coordinates (x, y) |
|---------|----|--------------------|
| Zürich HB | 8503000 | 8.540192, 47.378177 |
| Bern | 8507000 | 7.439122, 46.948825 |
| Basel SBB | 8500010 | 7.589548, 47.547408 |
| Genève | 8501008 | 6.142456, 46.210307 |
| Lausanne | 8501120 | 6.635093, 46.516968 |
| Luzern | 8505000 | 8.310171, 47.050166 |
| St. Gallen | 8506302 | 9.37044, 47.423317 |
| Winterthur | 8505213 | 8.724224, 47.501678 |
| Lugano | 8505300 | 8.946233, 46.004421 |
| Chur | 8509000 | 9.526918, 46.85237 |

---

## Additional Resources

- **Official Documentation:** [https://transport.opendata.ch/docs.html](https://transport.opendata.ch/docs.html)
- **API Status:** [https://transport.opendata.ch/v1/](https://transport.opendata.ch/v1/)
- **Data Provider:** [Opendata.ch](https://opendata.ch/)
- **SBB Timetable:** [https://www.sbb.ch](https://www.sbb.ch)

---

*Last updated: December 2025*

