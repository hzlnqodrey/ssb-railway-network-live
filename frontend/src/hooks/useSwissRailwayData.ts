/**
 * Custom React hook for managing Swiss Railway data
 * 
 * This hook provides a clean interface for fetching and managing:
 * - Railway stations
 * - Train positions and status
 * - Station departures
 * - API rate limiting
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Train, Station, StationBoard } from '@/types/railway'

// Mock data for fallback when API is unavailable
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
  },
  {
    id: 'st-gallen',
    name: 'St. Gallen',
    coordinate: { x: 9.3767, y: 47.4245 }
  }
]

// Mock train routes with waypoints for realistic movement
const mockTrainRoutes = {
  'IC-1-001': [
    { lat: 47.3769, lng: 8.5417 }, // Zurich HB
    { lat: 47.4245, lng: 9.3767 }, // St. Gallen
    { lat: 47.3769, lng: 8.5417 }, // Back to Zurich
  ],
  'S-3-002': [
    { lat: 46.9481, lng: 7.4474 }, // Bern
    { lat: 47.2092, lng: 8.5498 }, // Pfäffikon SZ
    { lat: 46.9481, lng: 7.4474 }, // Back to Bern
  ],
  'RE-456-003': [
    { lat: 46.5197, lng: 6.6323 }, // Lausanne
    { lat: 47.5479, lng: 7.5893 }, // Basel SBB
    { lat: 46.5197, lng: 6.6323 }, // Back to Lausanne
  ],
  'ICE-74-004': [
    { lat: 47.5479, lng: 7.5893 }, // Basel SBB
    { lat: 47.3769, lng: 8.5417 }, // Zurich HB
    { lat: 46.9481, lng: 7.4474 }, // Bern
    { lat: 47.5479, lng: 7.5893 }, // Back to Basel
  ],
  'IR-15-005': [
    { lat: 46.2044, lng: 6.1432 }, // Geneva
    { lat: 46.5197, lng: 6.6323 }, // Lausanne
    { lat: 46.9481, lng: 7.4474 }, // Bern
    { lat: 46.2044, lng: 6.1432 }, // Back to Geneva
  ]
}

// Function to interpolate between two points
function interpolate(start: { lat: number; lng: number }, end: { lat: number; lng: number }, factor: number) {
  return {
    lat: start.lat + (end.lat - start.lat) * factor,
    lng: start.lng + (end.lng - start.lng) * factor
  }
}

// Function to calculate moving train positions
function getMovingTrainPositions(): Train[] {
  const now = Date.now()
  const cycleDuration = 120000 // 2 minutes per full route cycle
  
  return [
    {
      id: 'IC-1-001',
      name: 'IC 1',
      category: 'IC',
      number: '1',
      operator: 'SBB',
      to: 'St. Gallen',
      position: getInterpolatedPosition('IC-1-001', now, cycleDuration),
      delay: Math.floor(Math.random() * 5),
      cancelled: false,
      speed: 85 + Math.floor(Math.random() * 20),
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
      position: getInterpolatedPosition('S-3-002', now + 30000, cycleDuration), // Offset by 30 seconds
      delay: Math.floor(Math.random() * 3),
      cancelled: false,
      speed: 45 + Math.floor(Math.random() * 15),
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
      position: getInterpolatedPosition('RE-456-003', now + 60000, cycleDuration), // Offset by 1 minute
      delay: Math.floor(Math.random() * 8),
      cancelled: false,
      speed: 72 + Math.floor(Math.random() * 18),
      direction: 280,
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'ICE-74-004',
      name: 'ICE 74',
      category: 'ICE',
      number: '74',
      operator: 'DB',
      to: 'Frankfurt',
      position: getInterpolatedPosition('ICE-74-004', now + 90000, cycleDuration), // Offset by 1.5 minutes
      delay: Math.floor(Math.random() * 12),
      cancelled: false,
      speed: 95 + Math.floor(Math.random() * 25),
      direction: 15,
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'IR-15-005',
      name: 'IR 15',
      category: 'IR',
      number: '15',
      operator: 'SBB',
      to: 'Bern',
      position: getInterpolatedPosition('IR-15-005', now + 45000, cycleDuration), // Offset by 45 seconds
      delay: Math.floor(Math.random() * 6),
      cancelled: false,
      speed: 68 + Math.floor(Math.random() * 22),
      direction: 90,
      lastUpdate: new Date().toISOString()
    }
  ]
}

function getInterpolatedPosition(trainId: keyof typeof mockTrainRoutes, currentTime: number, cycleDuration: number) {
  const route = mockTrainRoutes[trainId]
  const progress = (currentTime % cycleDuration) / cycleDuration
  const totalSegments = route.length - 1
  const currentSegment = Math.floor(progress * totalSegments)
  const segmentProgress = (progress * totalSegments) % 1
  
  const start = route[currentSegment]
  const end = route[(currentSegment + 1) % route.length]
  
  return interpolate(start, end, segmentProgress)
}

interface UseSwissRailwayDataOptions {
  enableRealtime?: boolean
  realtimeInterval?: number
  enableStations?: boolean
  enableTrains?: boolean
  maxStations?: number
  // Note: Currently hardcoded to use mock data only
}

interface RateLimitInfo {
  used: number
  limit: number
  remaining: number
  resetTime: Date
}

export function useSwissRailwayData(options: UseSwissRailwayDataOptions = {}) {
  const {
    enableRealtime = true,
    realtimeInterval = 30000, // 30 seconds
    enableStations = true,
    enableTrains = true,
    maxStations = 12
    // Note: Currently hardcoded to use mock data only
  } = options

  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Mock rate limit info (not used but kept for compatibility)
  useEffect(() => {
    setRateLimitInfo({
      used: 0,
      limit: 1000,
      remaining: 1000,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    })
  }, [])

  // Fetch major Swiss railway stations (mock only)
  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
    refetch: refetchStations
  } = useQuery({
    queryKey: ['swiss-railway', 'stations', 'mock'],
    queryFn: () => {
      console.log('🎭 Loaded mock Swiss railway stations')
      return mockStations.slice(0, maxStations)
    },
    staleTime: Infinity, // Never refetch stations
    gcTime: Infinity,
    enabled: enableStations,
    retry: false
  })

  // Track if trains have been initialized
  const [trainsInitialized, setTrainsInitialized] = useState(false)

  // Fetch moving train positions (mock only)
  const {
    data: trains = [],
    isLoading: trainsLoading,
    error: trainsError,
    refetch: refetchTrains
  } = useQuery({
    queryKey: ['swiss-railway', 'trains', 'moving'], // Removed Date.now() to prevent infinite queries
    queryFn: () => {
      // Generate fresh train positions silently
      const movingTrains = getMovingTrainPositions()
      
      // Log only once when trains are first initialized
      if (!trainsInitialized && movingTrains.length > 0) {
        console.log(`🚂 Mock train system started with ${movingTrains.length} trains`)
        setTrainsInitialized(true)
      }
      
      return movingTrains
    },
    staleTime: 0, // Always fetch fresh positions
    gcTime: realtimeInterval * 2,
    refetchInterval: enableRealtime ? realtimeInterval : false,
    enabled: enableTrains && stations.length > 0,
    retry: false
  })

  // Mock station departures (disabled for now)
  const getStationDepartures = async (/* stationId: string */): Promise<StationBoard | null> => {
    // Mock departures not implemented yet
    return null
  }

  // Mock search stations (returns filtered mock data)
  const createSearchStationsQuery = (query: string) => ({
    queryKey: ['swiss-railway', 'search', query],
    queryFn: () => {
      // Search stations silently
      return mockStations.filter(station => 
        station.name.toLowerCase().includes(query.toLowerCase())
      )
    },
    enabled: query.length > 2,
    staleTime: Infinity,
    retry: false
  })

  // Function to refresh mock data
  const refreshAllData = async () => {
    // Refresh all data silently
    await Promise.all([
      refetchStations(),
      refetchTrains()
    ])
  }

  // Calculate loading state
  const isLoading = stationsLoading || trainsLoading
  const hasError = stationsError || trainsError
  
  // API health status
  const apiStatus = {
    healthy: !hasError && stations.length > 0,
    rateLimited: (rateLimitInfo?.remaining || 0) < 10,
    error: hasError
  }

  // Statistics
  const stats = {
    stationsLoaded: stations.length,
    trainsActive: trains.length,
    delayedTrains: trains.filter(train => (train.delay || 0) > 0).length,
    onTimeTrains: trains.filter(train => (train.delay || 0) === 0).length,
    averageDelay: trains.length > 0 
      ? trains.reduce((sum, train) => sum + (train.delay || 0), 0) / trains.length 
      : 0,
    lastUpdate: trains.length > 0 ? new Date(Math.max(...trains.map(t => new Date(t.lastUpdate).getTime()))) : null
  }

  return {
    // Data
    stations,
    trains,
    
    // Loading states
    isLoading,
    stationsLoading,
    trainsLoading,
    
    // Error states
    hasError,
    stationsError,
    trainsError,
    
    // Functions
    getStationDepartures,
    createSearchStationsQuery,
    refreshAllData,
    refetchStations,
    refetchTrains,
    
    // Status
    apiStatus,
    rateLimitInfo,
    stats,
    
    // Config
    isRealtimeEnabled: enableRealtime,
    realtimeInterval
  }
}

/**
 * Hook for managing a specific station's data (mock version)
 */
export function useStationData(stationId: string) {
  const station = mockStations.find(s => s.id === stationId)
  
  return {
    station,
    departures: [],
    stationBoard: station ? { station, stationboard: [] } : null,
    isLoading: false,
    error: null,
    refetch: async () => {},
    isEmpty: true
  }
}

/**
 * Hook for searching stations with debouncing (mock version)
 */
export function useStationSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const {
    data: results = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['swiss-railway', 'search', 'mock', debouncedQuery],
    queryFn: () => {
      console.log(`🎭 Mock station search for: ${debouncedQuery}`)
      return mockStations.filter(station => 
        station.name.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    },
    enabled: debouncedQuery.length > 2,
    staleTime: Infinity,
    retry: false
  })

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasResults: results.length > 0,
    isEmpty: !isLoading && debouncedQuery.length > 2 && results.length === 0
  }
}
