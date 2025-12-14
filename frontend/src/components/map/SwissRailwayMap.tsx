'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Train, Station } from '@/types/railway'
import { AnimatedTrainMarker } from './AnimatedTrainMarker'
import { StationMarker } from './StationMarker'
import { MapControls } from './MapControls'
import { TrainDetails } from './TrainDetails'
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

// Component to draw train route
function TrainRoute({ train }: { train: Train | null }) {
  if (!train?.timetable || train.timetable.length < 2) return null

  const trainColor = getTrainColor(train.category)
  
  // Build route coordinates from timetable
  const routeCoords: [number, number][] = train.timetable
    .filter(stop => stop.station?.coordinate)
    .map(stop => [stop.station!.coordinate.y, stop.station!.coordinate.x])

  if (routeCoords.length < 2) return null

  // Find current position index
  const currentIndex = train.timetable.findIndex(stop => stop.isCurrentStation)
  const passedIndex = train.timetable.findIndex(stop => !stop.isPassed) - 1

  // Split route into passed and upcoming segments
  const splitIndex = Math.max(currentIndex, passedIndex, 0)
  
  const passedCoords = routeCoords.slice(0, splitIndex + 1)
  const upcomingCoords = routeCoords.slice(splitIndex)

  return (
    <>
      {/* Passed segment (faded) */}
      {passedCoords.length >= 2 && (
        <Polyline
          positions={passedCoords}
          pathOptions={{
            color: trainColor,
            weight: 4,
            opacity: 0.3,
            dashArray: '10, 10'
          }}
        />
      )}

      {/* Upcoming segment (solid) */}
      {upcomingCoords.length >= 2 && (
        <Polyline
          positions={upcomingCoords}
          pathOptions={{
            color: trainColor,
            weight: 5,
            opacity: 0.8,
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
            radius={stop.isCurrentStation ? 10 : (isFirstStation || isFinalStation ? 8 : 6)}
            pathOptions={{
              color: trainColor,
              fillColor: stop.isCurrentStation ? trainColor : (isCurrentOrPassed ? '#9CA3AF' : '#ffffff'),
              fillOpacity: 1,
              weight: 2
            }}
          >
            <Tooltip permanent={stop.isCurrentStation || isFirstStation || isFinalStation} direction="top" offset={[0, -10]}>
              <div className="text-xs font-medium">
                <div className="font-bold">{stop.station.name}</div>
                {stop.arrivalTime && <div>Arr: {stop.arrivalTime}</div>}
                {stop.departureTime && <div>Dep: {stop.departureTime}</div>}
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

export default function SwissRailwayMap({ className, forceExpandControls = false }: SwissRailwayMapProps) {
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)
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
  }, [])

  // Handle close train details
  const handleCloseDetails = useCallback(() => {
    setSelectedTrain(null)
    setFollowedTrainId(null)
    setIsFirstFollow(false)
    // Keep route visible when closing details
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

        {/* Station Markers */}
        {showStations && stations.map((station: Station) => (
          <StationMarker
            key={station.id}
            station={station}
            onClick={() => console.log('Station clicked:', station.name)}
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
          onClose={handleCloseDetails}
          onFollow={() => handleFollowTrain(selectedTrain.id)}
          isFollowing={followedTrainId === selectedTrain.id}
          onDrawRoute={() => handleDrawRoute(selectedTrain.id)}
          isRouteDrawn={routeTrainId === selectedTrain.id}
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
