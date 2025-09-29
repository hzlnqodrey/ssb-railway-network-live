'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Train } from '@/types/railway'
import { AnimatedTrainMarker } from './AnimatedTrainMarker'
import { StationMarker } from './StationMarker'
import { MapControls } from './MapControls'
import { TrainDetails } from './TrainDetails'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSwissRailwayData } from '@/hooks/useSwissRailwayData'
import { cn } from '@/lib/utils'

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

interface SwissRailwayMapProps {
  className?: string
}

// Mock data moved to useSwissRailwayData hook for better organization

// Map updater component to handle real-time updates
function MapUpdater({ trains }: { trains: Train[] }) {
  const map = useMap()
  
  useEffect(() => {
    // Auto-fit bounds to include all trains
    if (trains.length > 0) {
      const bounds = L.latLngBounds(
        trains.map(train => [train.position?.lat || 0, train.position?.lng || 0])
      )
      
      // Only update bounds if they're significantly different
      if (!map.getBounds().contains(bounds)) {
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    }
  }, [map, trains])

  return null
}

export default function SwissRailwayMap({ className }: SwissRailwayMapProps) {
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)
  const [showStations, setShowStations] = useState(true)
  const [showTrains, setShowTrains] = useState(true)
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'terrain'>('standard')
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Use our custom Swiss Railway data hook with mock data
  const {
    stations,
    trains,
    stationsLoading,
    trainsLoading,
    hasError
  } = useSwissRailwayData({
    enableRealtime: isRealtimeEnabled,
    realtimeInterval: 5000, // 5 seconds for smooth mock train movement
    enableStations: showStations,
    enableTrains: showTrains,
    maxStations: 12
  })

  // Backwards compatibility for error handling
  const trainsError = hasError ? new Error('Failed to load railway data') : null

  // Update current time every second for live clock display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getTileLayerUrl = useCallback(() => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  }, [mapType])

  const getTileLayerAttribution = useCallback(() => {
    switch (mapType) {
      case 'satellite':
        return '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      case 'terrain':
        return 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  }, [mapType])

  if (trainsError) {
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
      {(trainsLoading || stationsLoading) && (
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
        {/* Tile Layer */}
        <TileLayer
          url={getTileLayerUrl()}
          attribution={getTileLayerAttribution()}
          maxZoom={18}
        />

        {/* Map Updater for real-time updates */}
        <MapUpdater trains={trains} />

        {/* Station Markers */}
        {showStations && stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            onClick={() => console.log('Station clicked:', station.name)}
          />
        ))}

        {/* Animated Train Markers */}
        {showTrains && trains.map((train) => (
          <AnimatedTrainMarker
            key={train.id}
            train={train}
            isSelected={selectedTrain?.id === train.id}
            onClick={() => setSelectedTrain(train)}
            animationDuration={2000} // 2 second smooth animation
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
      />

      {/* Train Details Panel */}
      {selectedTrain && (
        <TrainDetails
          train={selectedTrain}
          onClose={() => setSelectedTrain(null)}
        />
      )}

      {/* Time Display and Train Counter - Similar to Romanian Railways */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
          {/* Current Time */}
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {currentTime.toLocaleTimeString('de-CH', { 
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          
          {/* Train Count */}
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
            {trains.length} trains
          </div>
          
          {/* Multiplier Controls */}
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            <span>multiply by </span>
            <select className="bg-transparent border-none text-xs font-medium">
              <option>1x</option>
              <option>5x</option>
              <option>10x</option>
              <option>20x</option>
              <option>50x</option>
              <option>100x</option>
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

          {/* Data Source */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            🇨🇭 Swiss GTFS
          </div>
        </div>
      </div>
    </div>
  )
}
