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
import { Train, Station, StationBoard, TrainStop } from '@/types/railway'

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
  },
  {
    id: 'winterthur',
    name: 'Winterthur',
    coordinate: { x: 8.7233, y: 47.5022 }
  },
  {
    id: 'olten',
    name: 'Olten',
    coordinate: { x: 7.9085, y: 47.3499 }
  },
  {
    id: 'lucerne',
    name: 'Luzern',
    coordinate: { x: 8.3101, y: 47.0502 }
  },
  {
    id: 'thun',
    name: 'Thun',
    coordinate: { x: 7.6281, y: 46.7581 }
  },
  {
    id: 'interlaken-ost',
    name: 'Interlaken Ost',
    coordinate: { x: 7.8712, y: 46.6863 }
  },
  {
    id: 'montreux',
    name: 'Montreux',
    coordinate: { x: 6.9116, y: 46.4312 }
  },
  {
    id: 'neuchatel',
    name: 'Neuchâtel',
    coordinate: { x: 6.9311, y: 47.0008 }
  },
  {
    id: 'chur',
    name: 'Chur',
    coordinate: { x: 9.5307, y: 46.8569 }
  },
  {
    id: 'lugano',
    name: 'Lugano',
    coordinate: { x: 8.9463, y: 46.0037 }
  },
  {
    id: 'sion',
    name: 'Sion',
    coordinate: { x: 7.3606, y: 46.2277 }
  }
]

// Helper function to get station by ID
const getStationById = (id: string): Station | undefined => {
  return mockStations.find(station => station.id === id)
}

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

// Function to calculate moving train positions with timetables
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
      from: 'Zürich HB',
      to: 'St. Gallen',
      position: getInterpolatedPosition('IC-1-001', now, cycleDuration),
      delay: Math.floor(Math.random() * 5),
      cancelled: false,
      speed: 85 + Math.floor(Math.random() * 20),
      direction: 45,
      lastUpdate: new Date().toISOString(),
      departureTime: '08:32',
      arrivalTime: '09:45',
      timetable: [
        {
          station: getStationById('zurich-hb')!,
          departureTime: '08:32',
          platform: '3',
          isPassed: true
        },
        {
          station: getStationById('winterthur')!,
          arrivalTime: '08:54',
          departureTime: '08:56',
          arrivalDelay: 2,
          departureDelay: 2,
          platform: '2',
          isCurrentStation: true
        },
        {
          station: getStationById('st-gallen')!,
          arrivalTime: '09:45',
          platform: '4',
          isPassed: false
        }
      ]
    },
    {
      id: 'S-3-002',
      name: 'S 3',
      category: 'S',
      number: '3',
      operator: 'SBB',
      from: 'Zürich HB',
      to: 'Luzern',
      position: getInterpolatedPosition('S-3-002', now + 30000, cycleDuration),
      delay: Math.floor(Math.random() * 3),
      cancelled: false,
      speed: 45 + Math.floor(Math.random() * 15),
      direction: 120,
      lastUpdate: new Date().toISOString(),
      departureTime: '09:15',
      arrivalTime: '10:22',
      timetable: [
        {
          station: getStationById('zurich-hb')!,
          departureTime: '09:15',
          platform: '31',
          isPassed: true
        },
        {
          station: getStationById('olten')!,
          arrivalTime: '09:52',
          departureTime: '09:54',
          platform: '1',
          isCurrentStation: true
        },
        {
          station: getStationById('lucerne')!,
          arrivalTime: '10:22',
          platform: '2',
          isPassed: false
        }
      ]
    },
    {
      id: 'RE-456-003',
      name: 'RE 456',
      category: 'RE',
      number: '456',
      operator: 'SBB',
      from: 'Genève',
      to: 'Basel SBB',
      position: getInterpolatedPosition('RE-456-003', now + 60000, cycleDuration),
      delay: Math.floor(Math.random() * 8),
      cancelled: false,
      speed: 72 + Math.floor(Math.random() * 18),
      direction: 280,
      lastUpdate: new Date().toISOString(),
      departureTime: '07:42',
      arrivalTime: '11:13',
      timetable: [
        {
          station: getStationById('geneva')!,
          departureTime: '07:42',
          platform: '5',
          isPassed: true
        },
        {
          station: getStationById('lausanne')!,
          arrivalTime: '08:33',
          departureTime: '08:36',
          platform: '2',
          isPassed: true
        },
        {
          station: getStationById('neuchatel')!,
          arrivalTime: '09:18',
          departureTime: '09:20',
          platform: '3',
          isPassed: true
        },
        {
          station: getStationById('bern')!,
          arrivalTime: '10:05',
          departureTime: '10:08',
          arrivalDelay: 5,
          departureDelay: 5,
          platform: '6',
          isCurrentStation: true
        },
        {
          station: getStationById('olten')!,
          arrivalTime: '10:33',
          departureTime: '10:35',
          platform: '4',
          isPassed: false
        },
        {
          station: getStationById('basel')!,
          arrivalTime: '11:13',
          platform: '8',
          isPassed: false
        }
      ]
    },
    {
      id: 'ICE-74-004',
      name: 'ICE 74',
      category: 'ICE',
      number: '74',
      operator: 'DB',
      from: 'Basel SBB',
      to: 'Hamburg Hbf',
      position: getInterpolatedPosition('ICE-74-004', now + 90000, cycleDuration),
      delay: Math.floor(Math.random() * 12),
      cancelled: false,
      speed: 95 + Math.floor(Math.random() * 25),
      direction: 15,
      lastUpdate: new Date().toISOString(),
      departureTime: '06:57',
      arrivalTime: '14:26',
      timetable: [
        {
          station: getStationById('basel')!,
          departureTime: '06:57',
          platform: '3',
          isPassed: true
        },
        {
          station: getStationById('zurich-hb')!,
          arrivalTime: '07:56',
          departureTime: '08:02',
          arrivalDelay: 8,
          departureDelay: 8,
          platform: '4',
          isCurrentStation: true
        },
        {
          station: {
            id: 'frankfurt-hbf',
            name: 'Frankfurt (Main) Hbf',
            coordinate: { x: 8.6628, y: 50.1066 }
          },
          arrivalTime: '11:24',
          departureTime: '11:26',
          platform: '7',
          isPassed: false
        },
        {
          station: {
            id: 'hamburg-hbf',
            name: 'Hamburg Hbf',
            coordinate: { x: 10.0067, y: 53.5528 }
          },
          arrivalTime: '14:26',
          platform: '12',
          isPassed: false
        }
      ]
    },
    {
      id: 'IR-15-005',
      name: 'IR 15',
      category: 'IR',
      number: '15',
      operator: 'SBB',
      from: 'Genève Aéroport',
      to: 'Chur',
      position: getInterpolatedPosition('IR-15-005', now + 45000, cycleDuration),
      delay: Math.floor(Math.random() * 6),
      cancelled: false,
      speed: 68 + Math.floor(Math.random() * 22),
      direction: 90,
      lastUpdate: new Date().toISOString(),
      departureTime: '11:04',
      arrivalTime: '15:39',
      timetable: [
        {
          station: {
            id: 'geneva-airport',
            name: 'Genève-Aéroport',
            coordinate: { x: 6.1092, y: 46.2384 }
          },
          departureTime: '11:04',
          platform: '1',
          isPassed: true
        },
        {
          station: getStationById('geneva')!,
          arrivalTime: '11:11',
          departureTime: '11:13',
          platform: '3',
          isPassed: true
        },
        {
          station: getStationById('lausanne')!,
          arrivalTime: '12:04',
          departureTime: '12:07',
          platform: '1',
          isPassed: true
        },
        {
          station: getStationById('bern')!,
          arrivalTime: '13:25',
          departureTime: '13:27',
          platform: '2',
          isCurrentStation: true
        },
        {
          station: getStationById('zurich-hb')!,
          arrivalTime: '14:27',
          departureTime: '14:32',
          platform: '13',
          isPassed: false
        },
        {
          station: getStationById('chur')!,
          arrivalTime: '15:39',
          platform: '3',
          isPassed: false
        }
      ]
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
