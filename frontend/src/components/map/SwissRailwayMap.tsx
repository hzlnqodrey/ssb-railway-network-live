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
import { mockTrainMovementService } from '@/services/mockTrainMovement'
import { realTimeTrainService } from '@/services/realTimeTrainService'
import { cn } from '@/lib/utils'

// Fix for default markers in Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Note: Mock stations for fallback - now using mock movement service for trains

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
  const [dataSource, setDataSource] = useState<'mock' | 'real' | 'api'>('real') // Default to real SBB data
  const [mockTrains, setMockTrains] = useState<Train[]>([])
  const [realTrains, setRealTrains] = useState<Train[]>([])
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null)

  // Use our custom Swiss Railway data hook
  const {
    stations,
    trains,
    stationsLoading,
    trainsLoading,
    hasError
  } = useSwissRailwayData({
    enableRealtime: isRealtimeEnabled,
    realtimeInterval: 30000, // 30 seconds to respect rate limits
    enableStations: showStations,
    enableTrains: showTrains,
    maxStations: 12
  })

  // Backwards compatibility for error handling
  const trainsError = hasError ? new Error('Failed to load railway data') : null

  // Data source management - handles mock, real SBB, and API data
  useEffect(() => {
    const setupDataSource = async () => {
      // Clean up previous intervals
      if (updateInterval) {
        clearInterval(updateInterval)
        setUpdateInterval(null)
      }
      
      // Stop all services
      mockTrainMovementService.stopMovement()
      realTimeTrainService.stopRealTimeService()
      setMockTrains([])
      setRealTrains([])
      
      if (!isRealtimeEnabled) return
      
      if (dataSource === 'mock') {
        console.log('🎭 Starting mock train movement...')
        
        // Start mock service
        mockTrainMovementService.startMovement(2000)
        
        // Update mock trains every 2 seconds
        const interval = setInterval(() => {
          const movingTrains = mockTrainMovementService.getMovingTrains()
          setMockTrains(movingTrains)
        }, 2000)
        
        setUpdateInterval(interval)
        
        // Get initial state
        setMockTrains(mockTrainMovementService.getMovingTrains())
        
      } else if (dataSource === 'real') {
        console.log('🚂 Starting real-time SBB train service...')
        
        try {
          // Start real-time service
          await realTimeTrainService.startRealTimeService(30000) // Update every 30 seconds
          
          // Update real trains every 10 seconds
          const interval = setInterval(() => {
            const movingTrains = realTimeTrainService.getMovingTrains()
            setRealTrains(movingTrains)
            console.log(`📍 Updated ${movingTrains.length} real trains`)
          }, 10000)
          
          setUpdateInterval(interval)
          
          // Get initial state
          setTimeout(() => {
            const initialTrains = realTimeTrainService.getMovingTrains()
            setRealTrains(initialTrains)
          }, 2000) // Wait for initial data fetch
          
        } catch (error) {
          console.error('Failed to start real-time service:', error)
        }
      }
      // For 'api' dataSource, we use the existing trains from useSwissRailwayData hook
    }
    
    setupDataSource()
    
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval)
      }
      mockTrainMovementService.stopMovement()
      realTimeTrainService.stopRealTimeService()
    }
  }, [dataSource, isRealtimeEnabled, updateInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval)
      }
      mockTrainMovementService.stopMovement()
      realTimeTrainService.stopRealTimeService()
    }
  }, [updateInterval])

  // Choose which trains to display based on data source
  const displayTrains = 
    dataSource === 'mock' ? mockTrains :
    dataSource === 'real' ? realTrains :
    trains // 'api' uses the hook's trains

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
        {showTrains && displayTrains.map((train) => (
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
        // trainsCount={trains.length}
        trainsCount={displayTrains.length}
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
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
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
        
        {/* Data Source Selector */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm bg-blue-100/90 dark:bg-blue-900/90 text-blue-800 dark:text-blue-200">
          <div className={cn(
            "w-2 h-2 rounded-full",
            dataSource === 'real' ? "bg-red-500 animate-pulse" :
            dataSource === 'mock' ? "bg-blue-500" :
            "bg-purple-500"
          )} />
          <select 
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as 'mock' | 'real' | 'api')}
            className="text-sm font-medium bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="real" className="text-gray-900">🚂 Real SBB Data</option>
            <option value="mock" className="text-gray-900">🎭 Mock Movement</option>
            <option value="api" className="text-gray-900">📡 API Approximation</option>
          </select>
        </div>
        
        {/* Train Count Indicator */}
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm bg-purple-100/90 dark:bg-purple-900/90 text-purple-800 dark:text-purple-200">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-medium">
            {displayTrains.length} Trains
          </span>
        </div>
      </div>
    </div>
  )
}
