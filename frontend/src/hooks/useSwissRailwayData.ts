/**
 * Custom React hook for managing Swiss Railway data
 * 
 * This hook provides a clean interface for fetching and managing:
 * - Railway stations
 * - Train positions and status (with real-time timetable-based simulation)
 * - Time multiplier for simulation speed
 * - API rate limiting
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Train, Station, StationBoard } from '@/types/railway'

// API Base URL - Change to 8080 for Go backend, 8000 for Node.js backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Mock stations for fallback
const mockStations: Station[] = [
  { id: 'zurich-hb', name: 'Zürich HB', coordinate: { x: 8.5417, y: 47.3769 } },
  { id: 'bern', name: 'Bern', coordinate: { x: 7.4474, y: 46.9481 } },
  { id: 'geneva', name: 'Genève', coordinate: { x: 6.1432, y: 46.2044 } },
  { id: 'basel', name: 'Basel SBB', coordinate: { x: 7.5893, y: 47.5479 } },
  { id: 'lausanne', name: 'Lausanne', coordinate: { x: 6.6323, y: 46.5197 } },
  { id: 'st-gallen', name: 'St. Gallen', coordinate: { x: 9.3767, y: 47.4245 } },
  { id: 'winterthur', name: 'Winterthur', coordinate: { x: 8.7233, y: 47.5022 } },
  { id: 'olten', name: 'Olten', coordinate: { x: 7.9085, y: 47.3499 } },
  { id: 'lucerne', name: 'Luzern', coordinate: { x: 8.3101, y: 47.0502 } },
  { id: 'thun', name: 'Thun', coordinate: { x: 7.6281, y: 46.7581 } },
  { id: 'interlaken-ost', name: 'Interlaken Ost', coordinate: { x: 7.8712, y: 46.6863 } },
  { id: 'chur', name: 'Chur', coordinate: { x: 9.5307, y: 46.8569 } },
  { id: 'lugano', name: 'Lugano', coordinate: { x: 8.9463, y: 46.0037 } },
]

interface UseSwissRailwayDataOptions {
  enableRealtime?: boolean
  realtimeInterval?: number
  enableStations?: boolean
  enableTrains?: boolean
  maxStations?: number
  timeMultiplier?: number
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
    realtimeInterval = 5000, // 5 seconds for smooth updates
    enableStations = true,
    enableTrains = true,
    maxStations = 20,
    timeMultiplier = 1
  } = options

  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [trainsInitialized, setTrainsInitialized] = useState(false)

  // Initialize rate limit info
  useEffect(() => {
    setRateLimitInfo({
      used: 0,
      limit: 1000,
      remaining: 1000,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
  }, [])

  // Fetch stations from backend API
  const {
    data: stationsResponse,
    isLoading: stationsLoading,
    error: stationsError,
    refetch: refetchStations
  } = useQuery({
    queryKey: ['swiss-railway', 'stations', maxStations],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/stations?limit=${maxStations}`)
      if (!response.ok) throw new Error('Failed to fetch stations')
      const data = await response.json()
      console.log('📍 Loaded stations from Swiss GTFS API:', data.meta?.count || data.data?.length)
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: enableStations,
    retry: 3
  })

  const stations: Station[] = stationsResponse || []

  // Fetch live trains with time multiplier support
  const {
    data: trainsResponse,
    isLoading: trainsLoading,
    error: trainsError,
    refetch: refetchTrains
  } = useQuery({
    queryKey: ['swiss-railway', 'trains', 'live', timeMultiplier],
    queryFn: async () => {
      const url = timeMultiplier !== 1 
        ? `${API_BASE_URL}/api/trains/live?multiplier=${timeMultiplier}`
        : `${API_BASE_URL}/api/trains/live`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch trains')
      const data = await response.json()
      
      if (!trainsInitialized && data.data?.length > 0) {
        console.log(`🚂 Live train system connected with ${data.data.length} trains (${timeMultiplier}x speed)`)
        setTrainsInitialized(true)
      }
      
      return data.data
    },
    staleTime: 0,
    gcTime: realtimeInterval * 2,
    refetchInterval: enableRealtime ? realtimeInterval : false,
    enabled: enableTrains,
    retry: 3
  })

  const trains: Train[] = trainsResponse || []

  // Fetch station departures from the API
  const getStationDepartures = async (stationId: string): Promise<StationBoard | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/departures`)
      if (!response.ok) {
        throw new Error('Failed to fetch station departures')
      }
      const data = await response.json()
      
      // Transform the API response to StationBoard format
      // API returns: tripId, routeName, routeLongName, headsign, operator, departureTime, arrivalTime, sequence
      const station = data.data?.station as Station
      const departures = data.data?.departures || []
      
      return {
        station,
        stationboard: departures.map((dep: {
          tripId?: string
          routeName?: string
          routeLongName?: string
          headsign?: string
          operator?: string
          departureTime?: string
          arrivalTime?: string
          sequence?: number
          platform?: string
          delay?: number
        }) => ({
          stop: {
            station,
            departure: dep.departureTime,
            platform: dep.platform,
            delay: dep.delay
          },
          name: dep.routeName || 'Train',
          category: dep.routeName || 'Train',
          number: dep.tripId?.split('_')[1],
          operator: dep.operator || 'SBB',
          to: dep.headsign || dep.routeLongName || dep.routeName || 'See timetable'
        }))
      }
    } catch (error) {
      console.error('Error fetching station departures:', error)
      return null
    }
  }

  // Search stations
  const createSearchStationsQuery = (query: string) => ({
    queryKey: ['swiss-railway', 'search', query],
    queryFn: () => mockStations.filter(station => 
        station.name.toLowerCase().includes(query.toLowerCase())
    ),
    enabled: query.length > 2,
    staleTime: Infinity,
    retry: false
  })

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([refetchStations(), refetchTrains()])
  }, [refetchStations, refetchTrains])

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
    lastUpdate: trains.length > 0 
      ? new Date(Math.max(...trains.map(t => new Date(t.lastUpdate).getTime()))) 
      : null
  }

  return {
    stations,
    trains,
    isLoading,
    stationsLoading,
    trainsLoading,
    hasError,
    stationsError,
    trainsError,
    getStationDepartures,
    createSearchStationsQuery,
    refreshAllData,
    refetchStations,
    refetchTrains,
    apiStatus,
    rateLimitInfo,
    stats,
    isRealtimeEnabled: enableRealtime,
    realtimeInterval,
    timeMultiplier
  }
}

/**
 * Hook for managing a specific station's data with live departures
 */
export function useStationData(stationId: string) {
  const {
    data: stationData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['swiss-railway', 'station', stationId, 'departures'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/stations/${stationId}/departures`)
      if (!response.ok) {
        throw new Error('Failed to fetch station data')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!stationId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    retry: 2
  })

  const station = stationData?.station as Station | undefined
  const departures = stationData?.departures || []
  
  return {
    station,
    departures,
    stationBoard: station ? { 
      station, 
      stationboard: departures.map((dep: {
        tripId?: string
        routeName?: string
        routeLongName?: string
        headsign?: string
        operator?: string
        departureTime?: string
        arrivalTime?: string
        sequence?: number
        platform?: string
        delay?: number
      }) => ({
        stop: {
          station,
          departure: dep.departureTime,
          platform: dep.platform,
          delay: dep.delay
        },
        name: dep.routeName || 'Train',
        category: dep.routeName || 'Train',
        number: dep.tripId?.split('_')[1],
        operator: dep.operator || 'SBB',
        to: dep.headsign || dep.routeLongName || dep.routeName || 'See timetable'
      }))
    } : null,
    isLoading,
    error: error as Error | null,
    refetch,
    isEmpty: !isLoading && departures.length === 0
  }
}

/**
 * Hook for searching stations with debouncing
 */
export function useStationSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const {
    data: results = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['swiss-railway', 'search', debouncedQuery],
    queryFn: () => mockStations.filter(station => 
        station.name.toLowerCase().includes(debouncedQuery.toLowerCase())
    ),
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
