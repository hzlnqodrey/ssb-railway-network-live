# Swiss Railway Network GTFS Data

This directory contains GTFS (General Transit Feed Specification) data for the Swiss railway network, adapted from the Romanian railway data structure.

## Overview

The Swiss Railway Network data includes:
- **SBB (Schweizerische Bundesbahnen)** - Swiss Federal Railways
- **BLS AG** - Regional operator
- **Rhätische Bahn (RhB)** - Grisons railways
- **Various S-Bahn networks** - Urban rail systems
- **International connections** - ICE (DB), TGV (SNCF), EC (ÖBB)

## Data Files

### Core GTFS Files

- **agency.txt** - Transit agencies (SBB, BLS, RhB, etc.)
- **stops.txt** - Railway stations across Switzerland
- **routes.txt** - Train routes (IC, IR, S-Bahn, international)
- **trips.txt** - Individual trip instances
- **stop_times.txt** - Detailed timetables with arrival/departure times
- **calendar.txt** - Service schedules (weekdays, weekends, etc.)
- **calendar_dates.txt** - Holiday exceptions

### Route Types

- **IC (InterCity)** - Long-distance express trains
- **IR (InterRegio)** - Medium-distance trains
- **RE (RegionalExpress)** - Regional express services
- **S-Bahn** - Urban and suburban rail networks
- **International** - Cross-border services (ICE, TGV, EC)

## Key Stations Included

- Zürich HB (8503000) - Main hub
- Bern (8507000) - Capital station
- Basel SBB (8500010) - International gateway
- Genève (8501008) - International gateway
- St. Gallen (8506302) - Eastern terminus
- Chur (8509000) - Gateway to Grisons
- Lugano (8505300) - Southern gateway
- And 40+ additional stations

## Service Patterns

- **Daily Service** - IC/IR trains operate 7 days a week
- **Peak Hour Frequency** - S-Bahn every 15-30 minutes
- **International** - Limited daily departures
- **Holiday Adjustments** - Reduced service on Swiss national holidays

## Data Coverage

- **Geographic Scope** - All major Swiss railway corridors
- **Service Period** - December 2024 - December 2025
- **Update Frequency** - Based on Swiss timetable changes
- **Languages** - Station names in local languages (German/French/Italian)

## Technical Notes

- **Timezone** - Europe/Zurich for all services
- **Coordinates** - WGS84 decimal degrees
- **Route Type** - All marked as "2" (Rail) per GTFS standard
- **Service IDs** - Differentiate between daily, weekday, and weekend patterns

## Data Sources

This data structure is inspired by:
- [Romanian Railways GTFS](https://github.com/vasile/data.gov.ro-gtfs-exporter)
- Swiss Federal Railway timetables
- Regional operator schedules

## Usage

This GTFS data can be used with:
- Transit routing applications
- Real-time visualization systems
- Railway network analysis
- Mobile transit apps

## License

This dataset follows the same license terms as the original Romanian railway data.

---

*Generated for Swiss Railway Network Live Transit Map*
*Last Updated: December 2024*
