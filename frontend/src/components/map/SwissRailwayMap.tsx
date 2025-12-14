'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Train, Station, RouteCoordinate } from '@/types/railway'
import { AnimatedTrainMarker } from './AnimatedTrainMarker'
import { StationMarker } from './StationMarker'
import { MapControls } from './MapControls'
import { TrainDetails } from './TrainDetails'
import { StationDetailsPanel } from './StationDetailsPanel'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSwissRailwayData } from '@/hooks/useSwissRailwayData'
import { cn, getTrainColor } from '@/lib/utils'

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Swiss coordinates center (Bern)
const SWISS_CENTER: [number, number] = [46.8182, 8.2275]
const DEFAULT_ZOOM = 8
const FOLLOW_ZOOM = 12

// Swiss timezone
const SWISS_TIMEZONE = 'Europe/Zurich'

// Format current time in Swiss timezone - returns formatted string
function formatSwissTimeNow(): string {
  return new Date().toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: SWISS_TIMEZONE
  })
}

// Format current date in Swiss timezone
function formatSwissDateNow(): string {
  return new Date().toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: SWISS_TIMEZONE
  })
}

interface SwissRailwayMapProps {
  className?: string
  forceExpandControls?: boolean
}

// Component to handle train following with zoom
function TrainFollower({ 
  followedTrainId, 
  trains,
  isFirstFollow
}: { 
  followedTrainId: string | null
  trains: Train[]
  isFirstFollow: boolean
}) {
  const map = useMap()
  const hasZoomedRef = useRef(false)
  
  useEffect(() => {
    if (!followedTrainId) {
      hasZoomedRef.current = false
      return
    }
    
    const train = trains.find(t => t.id === followedTrainId)
    if (train?.position) {
      // On first follow, zoom in to the train
      if (isFirstFollow && !hasZoomedRef.current) {
        map.flyTo([train.position.lat, train.position.lng], FOLLOW_ZOOM, {
          animate: true,
          duration: 1.5
        })
        hasZoomedRef.current = true
      } else {
        // Keep following without changing zoom
        map.setView([train.position.lat, train.position.lng], map.getZoom(), {
          animate: true,
          duration: 0.5
        })
      }
    }
  }, [followedTrainId, trains, map, isFirstFollow])

  return null
}

// Map updater component to handle initial bounds
function MapInitializer({ trains }: { trains: Train[] }) {
  const map = useMap()
  const initializedRef = useRef(false)
  
  useEffect(() => {
    if (!initializedRef.current && trains.length > 0) {
      const positions = trains
        .filter(t => t.position)
        .map(train => [train.position!.lat, train.position!.lng] as [number, number])
      
      if (positions.length > 0) {
        const bounds = L.latLngBounds(positions)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
        initializedRef.current = true
      }
    }
  }, [map, trains])

  return null
}

/**
 * Generate curved path between two points to simulate railway tracks
 * Uses quadratic bezier curve approximation with multiple intermediate points
 */
function generateCurvedPath(
  start: [number, number], 
  end: [number, number], 
  numPoints: number = 8
): [number, number][] {
  const points: [number, number][] = []
  
  // Calculate distance and midpoint
  const dx = end[1] - start[1]
  const dy = end[0] - start[0]
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // For short distances, just return straight line
  if (distance < 0.01) {
    return [start, end]
  }
  
  // Calculate control point offset (perpendicular to line, scaled by distance)
  // Railway tracks tend to curve around terrain, so we add a slight curve
  const curveFactor = Math.min(0.15, distance * 0.3) // Subtle curve
  const perpX = -dy * curveFactor
  const perpY = dx * curveFactor
  
  // Alternate curve direction based on position to create realistic path
  const curveDirection = (start[0] + start[1]) % 2 < 1 ? 1 : -1
  
  // Control point for quadratic bezier
  const controlX = (start[1] + end[1]) / 2 + perpX * curveDirection
  const controlY = (start[0] + end[0]) / 2 + perpY * curveDirection
  
  // Generate points along the bezier curve
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const invT = 1 - t
    
    // Quadratic bezier formula
    const lat = invT * invT * start[0] + 2 * invT * t * controlY + t * t * end[0]
    const lng = invT * invT * start[1] + 2 * invT * t * controlX + t * t * end[1]
    
    points.push([lat, lng])
  }
  
  return points
}

/**
 * Build a detailed route path from train timetable with curved segments
 */
function buildDetailedRoutePath(
  timetable: Train['timetable'],
  routeCoordinates?: RouteCoordinate[]
): [number, number][] {
  // If we have detailed route coordinates from the API, use them
  if (routeCoordinates && routeCoordinates.length >= 2) {
    return routeCoordinates.map(coord => [coord.lat, coord.lng] as [number, number])
  }
  
  // Otherwise, generate curved paths between stations
  if (!timetable || timetable.length < 2) return []
  
  const stationsWithCoords = timetable.filter(stop => stop.station?.coordinate)
  if (stationsWithCoords.length < 2) return []
  
  const detailedPath: [number, number][] = []
  
  for (let i = 0; i < stationsWithCoords.length - 1; i++) {
    const currentStop = stationsWithCoords[i]
    const nextStop = stationsWithCoords[i + 1]
    
    const start: [number, number] = [
      currentStop.station!.coordinate.y,
      currentStop.station!.coordinate.x
    ]
    const end: [number, number] = [
      nextStop.station!.coordinate.y,
      nextStop.station!.coordinate.x
    ]
    
    // Calculate appropriate number of curve points based on distance
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
    )
    const numPoints = Math.max(4, Math.min(12, Math.floor(distance * 100)))
    
    const curvedSegment = generateCurvedPath(start, end, numPoints)
    
    // Add all points except the last one (to avoid duplicates)
    if (i === 0) {
      detailedPath.push(...curvedSegment)
    } else {
      detailedPath.push(...curvedSegment.slice(1))
    }
  }
  
  return detailedPath
}

// Component to draw train route with curved paths
function TrainRoute({ train }: { train: Train | null }) {
  if (!train?.timetable || train.timetable.length < 2) return null

  const trainColor = getTrainColor(train.category)
  
  // Build detailed route with curves
  const detailedPath = buildDetailedRoutePath(train.timetable, train.routeCoordinates)
  
  if (detailedPath.length < 2) return null

  // Get station positions for splitting passed/upcoming
  const stationPositions = train.timetable
    .filter(stop => stop.station?.coordinate)
    .map(stop => ({
      position: [stop.station!.coordinate.y, stop.station!.coordinate.x] as [number, number],
      isPassed: stop.isPassed,
      isCurrentStation: stop.isCurrentStation
    }))

  // Find where to split the route (at current station)
  const currentStationIndex = stationPositions.findIndex(s => s.isCurrentStation)
  const passedStationsCount = currentStationIndex >= 0 
    ? currentStationIndex 
    : stationPositions.filter(s => s.isPassed).length

  // Calculate approximate split point in detailed path
  const totalStations = stationPositions.length
  const splitRatio = passedStationsCount / (totalStations - 1)
  const splitPointIndex = Math.floor(detailedPath.length * splitRatio)
  
  const passedPath = detailedPath.slice(0, splitPointIndex + 1)
  const upcomingPath = detailedPath.slice(splitPointIndex)

  return (
    <>
      {/* Railway track background (dark outline) */}
      <Polyline
        positions={detailedPath}
        pathOptions={{
          color: '#1f2937',
          weight: 8,
          opacity: 0.6,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />

      {/* Passed segment (faded with dashed style) */}
      {passedPath.length >= 2 && (
        <Polyline
          positions={passedPath}
          pathOptions={{
            color: trainColor,
            weight: 5,
            opacity: 0.4,
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}

      {/* Upcoming segment (solid bright line) */}
      {upcomingPath.length >= 2 && (
        <Polyline
          positions={upcomingPath}
          pathOptions={{
            color: trainColor,
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}

      {/* Station markers along the route */}
      {train.timetable.map((stop, index) => {
        if (!stop.station?.coordinate) return null
        
        const position: [number, number] = [
          stop.station.coordinate.y,
          stop.station.coordinate.x
        ]
        
        const isCurrentOrPassed = stop.isPassed || stop.isCurrentStation
        const isFinalStation = index === train.timetable!.length - 1
        const isFirstStation = index === 0
        
        return (
          <CircleMarker
            key={`route-stop-${stop.station.id}-${index}`}
            center={position}
            radius={stop.isCurrentStation ? 12 : (isFirstStation || isFinalStation ? 9 : 6)}
            pathOptions={{
              color: '#1f2937',
              fillColor: stop.isCurrentStation ? trainColor : (isCurrentOrPassed ? '#9CA3AF' : '#ffffff'),
              fillOpacity: 1,
              weight: 3
            }}
          >
            <Tooltip permanent={stop.isCurrentStation || isFirstStation || isFinalStation} direction="top" offset={[0, -10]}>
              <div className="text-xs font-medium">
                <div className="font-bold">{stop.station.name}</div>
                {stop.arrivalTime && <div>Arr: {stop.arrivalTime}</div>}
                {stop.departureTime && <div>Dep: {stop.departureTime}</div>}
                {stop.platform && <div className="text-gray-600">Platform {stop.platform}</div>}
                {stop.isPassed && <div className="text-gray-500">✓ Passed</div>}
                {stop.isCurrentStation && <div className="text-blue-600 font-bold">● Current</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}

// Component to draw multi-leg journey routes
function MultiLegRoute({ train }: { train: Train | null }) {
  if (!train?.journey?.legs || train.journey.legs.length === 0) return null

  const legColors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c']

  return (
    <>
      {train.journey.legs.map((leg, legIndex) => {
        const legColor = leg.color || legColors[legIndex % legColors.length]
        
        // Build path for this leg
        const legPath: [number, number][] = []
        
        // Add departure station
        if (leg.from?.coordinate) {
          legPath.push([leg.from.coordinate.y, leg.from.coordinate.x])
        }
        
        // Add intermediate stops with curves
        leg.stops.forEach(stop => {
          if (stop.station?.coordinate) {
            legPath.push([stop.station.coordinate.y, stop.station.coordinate.x])
          }
        })
        
        // Add arrival station
        if (leg.to?.coordinate) {
          legPath.push([leg.to.coordinate.y, leg.to.coordinate.x])
        }
        
        // Generate curved detailed path
        const detailedLegPath: [number, number][] = []
        for (let i = 0; i < legPath.length - 1; i++) {
          const curved = generateCurvedPath(legPath[i], legPath[i + 1], 6)
          if (i === 0) {
            detailedLegPath.push(...curved)
          } else {
            detailedLegPath.push(...curved.slice(1))
          }
        }
        
        if (detailedLegPath.length < 2) return null

        return (
          <div key={`leg-${legIndex}`}>
            {/* Leg route line */}
            <Polyline
              positions={detailedLegPath}
              pathOptions={{
                color: legColor,
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            
            {/* Leg start/end markers */}
            {leg.from?.coordinate && (
              <CircleMarker
                center={[leg.from.coordinate.y, leg.from.coordinate.x]}
                radius={10}
                pathOptions={{
                  color: legColor,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  weight: 3
                }}
              >
                <Tooltip direction="top">
                  <div className="text-xs">
                    <div className="font-bold">{leg.from.name}</div>
                    <div>{leg.trainName} → {leg.to?.name}</div>
                    <div>Dep: {leg.departureTime}</div>
                    {leg.platform && <div>Platform {leg.platform}</div>}
                  </div>
                </Tooltip>
              </CircleMarker>
            )}
          </div>
        )
      })}
    </>
  )
}

export default function SwissRailwayMap({ className, forceExpandControls = false }: SwissRailwayMapProps) {
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [followedTrainId, setFollowedTrainId] = useState<string | null>(null)
  const [routeTrainId, setRouteTrainId] = useState<string | null>(null)
  const [isFirstFollow, setIsFirstFollow] = useState(false)
  const [showStations, setShowStations] = useState(true)
  const [showTrains, setShowTrains] = useState(true)
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain' | 'dark'>('standard')
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true)
  const [timeMultiplier, setTimeMultiplier] = useState(1)
  const [swissTime, setSwissTime] = useState(() => formatSwissTimeNow())
  const [swissDate, setSwissDate] = useState(() => formatSwissDateNow())

  // Use our custom Swiss Railway data hook with time multiplier
  const {
    stations,
    trains,
    stationsLoading,
    trainsLoading,
    hasError
  } = useSwissRailwayData({
    enableRealtime: isRealtimeEnabled,
    realtimeInterval: Math.max(1000, 5000 / timeMultiplier),
    enableStations: showStations,
    enableTrains: showTrains,
    maxStations: 50,
    timeMultiplier
  })

  // Update current Swiss time
  useEffect(() => {
    const interval = setInterval(() => {
      setSwissTime(formatSwissTimeNow())
      setSwissDate(formatSwissDateNow())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Handle train follow with zoom
  const handleFollowTrain = useCallback((trainId: string) => {
    if (followedTrainId === trainId) {
      // Stop following
      setFollowedTrainId(null)
      setIsFirstFollow(false)
    } else {
      // Start following with zoom
      setFollowedTrainId(trainId)
      setIsFirstFollow(true)
    }
  }, [followedTrainId])

  // Reset first follow flag after initial zoom
  useEffect(() => {
    if (isFirstFollow && followedTrainId) {
      const timer = setTimeout(() => setIsFirstFollow(false), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isFirstFollow, followedTrainId])

  // Handle draw route toggle
  const handleDrawRoute = useCallback((trainId: string) => {
    setRouteTrainId(prev => prev === trainId ? null : trainId)
  }, [])

  // Handle train selection
  const handleTrainClick = useCallback((train: Train) => {
    setSelectedTrain(train)
    setSelectedStation(null) // Close station panel when selecting train
  }, [])

  // Handle station selection
  const handleStationClick = useCallback((station: Station) => {
    setSelectedStation(station)
    setSelectedTrain(null) // Close train panel when selecting station
  }, [])

  // Handle close train details
  const handleCloseTrainDetails = useCallback(() => {
    setSelectedTrain(null)
    setFollowedTrainId(null)
    setIsFirstFollow(false)
    // Keep route visible when closing details
  }, [])

  // Handle close station details
  const handleCloseStationDetails = useCallback(() => {
    setSelectedStation(null)
  }, [])

  // Update selected train with latest data
  const selectedTrainId = selectedTrain?.id
  useEffect(() => {
    if (selectedTrainId) {
      const updatedTrain = trains.find(t => t.id === selectedTrainId)
      if (updatedTrain) {
        setSelectedTrain(updatedTrain)
      }
    }
  }, [trains, selectedTrainId])

  // Get the train for route drawing
  const routeTrain = routeTrainId ? trains.find(t => t.id === routeTrainId) || null : null

  const getTileLayerUrl = useCallback(() => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  }, [mapType])

  const getTileLayerAttribution = useCallback(() => {
    switch (mapType) {
      case 'satellite':
        return '&copy; Esri'
      case 'terrain':
        return 'Map data: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap'
      case 'dark':
        return '&copy; OpenStreetMap &copy; CARTO'
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  }, [mapType])

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600">Failed to load train data</p>
          <p className="text-sm text-gray-500">Please check your connection and try again</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full w-full", className)}>

      {/* Loading Overlay */}
      {(trainsLoading || stationsLoading) && trains.length === 0 && (
        <div className="absolute inset-0 z-[1000] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <LoadingSpinner 
            text="Loading Swiss Railway Network..." 
            size="lg"
            className="h-full"
          />
        </div>
      )}

      {/* Map Container */}
      <MapContainer
        center={SWISS_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          url={getTileLayerUrl()}
          attribution={getTileLayerAttribution()}
          maxZoom={30}
        />

        <MapInitializer trains={trains} />
        <TrainFollower 
          followedTrainId={followedTrainId} 
          trains={trains} 
          isFirstFollow={isFirstFollow}
        />

        {/* Train Route (drawn below markers) */}
        <TrainRoute train={routeTrain} />
        
        {/* Multi-leg Journey Route (if available) */}
        {routeTrain?.journey && <MultiLegRoute train={routeTrain} />}

        {/* Station Markers */}
        {showStations && stations.map((station: Station) => (
          <StationMarker
            key={station.id}
            station={station}
            onClick={() => handleStationClick(station)}
            isSelected={selectedStation?.id === station.id}
          />
        ))}

        {/* Animated Train Markers */}
        {showTrains && trains.map((train: Train) => (
          <AnimatedTrainMarker
            key={train.id}
            train={train}
            isSelected={selectedTrain?.id === train.id}
            isFollowed={followedTrainId === train.id}
            onClick={() => handleTrainClick(train)}
            animationDuration={Math.max(500, 2000 / timeMultiplier)}
          />
        ))}
      </MapContainer>

      {/* Map Controls */}
      <MapControls
        showStations={showStations}
        setShowStations={setShowStations}
        showTrains={showTrains}
        setShowTrains={setShowTrains}
        mapType={mapType}
        setMapType={setMapType}
        isRealtimeEnabled={isRealtimeEnabled}
        setIsRealtimeEnabled={setIsRealtimeEnabled}
        trainsCount={trains.length}
        stationsCount={stations.length}
        forceExpanded={forceExpandControls}
      />

      {/* Train Details Panel */}
      {selectedTrain && (
        <TrainDetails
          train={selectedTrain}
          onClose={handleCloseTrainDetails}
          onFollow={() => handleFollowTrain(selectedTrain.id)}
          isFollowing={followedTrainId === selectedTrain.id}
          onDrawRoute={() => handleDrawRoute(selectedTrain.id)}
          isRouteDrawn={routeTrainId === selectedTrain.id}
        />
      )}

      {/* Station Details Panel */}
      {selectedStation && (
        <StationDetailsPanel
          station={selectedStation}
          onClose={handleCloseStationDetails}
        />
      )}

      {/* Time Display and Train Counter */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[140px]">
          {/* Current Swiss Time */}
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {swissTime}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            🇨🇭 {swissDate}
          </div>
          
          {/* Train Count */}
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
            {trains.length} trains
          </div>
          
          {/* Time Multiplier Control */}
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            <span>Speed: </span>
            <select 
              className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              value={timeMultiplier}
              onChange={(e) => setTimeMultiplier(Number(e.target.value))}
            >
              <option value={1}>1x (Real-time)</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
              <option value={20}>20x</option>
              <option value={50}>50x</option>
              <option value={100}>100x</option>
            </select>
          </div>

          {/* Live Status */}
          <div className={cn(
            "flex items-center justify-center space-x-1 mt-3 px-2 py-1 rounded-full text-xs font-medium",
            isRealtimeEnabled 
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isRealtimeEnabled ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
            <span>{isRealtimeEnabled ? 'Live' : 'Paused'}</span>
          </div>

          {/* Following Indicator */}
          {followedTrainId && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
              <span className="animate-pulse">📍</span>
              <span>Following</span>
            </div>
          )}

          {/* Route Indicator */}
          {routeTrainId && (
            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
              <span>🛤️</span>
              <span>Route shown</span>
            </div>
          )}

          {/* Data Source */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            🇨🇭 Swiss GTFS Timetable
          </div>
        </div>
      </div>
    </div>
  )
}
