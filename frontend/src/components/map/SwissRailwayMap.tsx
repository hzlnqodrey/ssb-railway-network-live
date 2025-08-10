'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Train, Station } from '@/types/railway'
import { AnimatedTrainMarker } from './AnimatedTrainMarker'
import { StationMarker } from './StationMarker'
import { MapControls } from './MapControls'
import { TrainDetails } from './TrainDetails'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSwissRailwayData } from '@/hooks/useSwissRailwayData'
import { cn } from '@/lib/utils'

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
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

// Mock data for development - we'll replace this with real API calls
const mockTrains: Train[] = [
  {
    id: 'IC-1-001',
    name: 'IC 1',
    category: 'IC',
    number: '1',
    operator: 'SBB',
    to: 'St. Gallen',
    position: { lat: 47.3769, lng: 8.5417 }, // Zurich
    delay: 2,
    cancelled: false,
    speed: 85,
    direction: 45,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'S-3-002',
    name: 'S 3',
    category: 'S',
    number: '3',
    operator: 'SBB',
    to: 'Pfäffikon SZ',
    position: { lat: 46.9481, lng: 7.4474 }, // Bern
    delay: 0,
    cancelled: false,
    speed: 45,
    direction: 120,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'RE-456-003',
    name: 'RE 456',
    category: 'RE',
    number: '456',
    operator: 'SBB',
    to: 'Basel SBB',
    position: { lat: 46.5197, lng: 6.6323 }, // Lausanne
    delay: 5,
    cancelled: false,
    speed: 72,
    direction: 280,
    lastUpdate: new Date().toISOString()
  }
]

const mockStations: Station[] = [
  {
    id: 'zurich-hb',
    name: 'Zürich HB',
    coordinate: { x: 8.5417, y: 47.3769 }
  },
  {
    id: 'bern',
    name: 'Bern',
    coordinate: { x: 7.4474, y: 46.9481 }
  },
  {
    id: 'geneva',
    name: 'Genève',
    coordinate: { x: 6.1432, y: 46.2044 }
  },
  {
    id: 'basel',
    name: 'Basel SBB',
    coordinate: { x: 7.5893, y: 47.5479 }
  },
  {
    id: 'lausanne',
    name: 'Lausanne',
    coordinate: { x: 6.6323, y: 46.5197 }
  }
]

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

  // Use our custom Swiss Railway data hook
  const {
    stations,
    trains,
    isLoading,
    stationsLoading,
    trainsLoading,
    hasError,
    apiStatus,
    rateLimitInfo,
    stats,
    refreshAllData
  } = useSwissRailwayData({
    enableRealtime: isRealtimeEnabled,
    realtimeInterval: 30000, // 30 seconds to respect rate limits
    enableStations: showStations,
    enableTrains: showTrains,
    maxStations: 12
  })

  // Backwards compatibility for error handling
  const trainsError = hasError ? new Error('Failed to load railway data') : null

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

      {/* Real-time Status Indicator */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm",
          isRealtimeEnabled 
            ? "bg-green-100/90 dark:bg-green-900/90 text-green-800 dark:text-green-200"
            : "bg-gray-100/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRealtimeEnabled ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-sm font-medium">
            {isRealtimeEnabled ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  )
}
