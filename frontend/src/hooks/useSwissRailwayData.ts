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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  getMajorStations, 
  getApproximateTrainPositions, 
  getStationBoard,
  getRateLimitStatus,
  searchStations
} from '@/services/swissTransportApi'
import { Train, Station, StationBoard } from '@/types/railway'

interface UseSwissRailwayDataOptions {
  enableRealtime?: boolean
  realtimeInterval?: number
  enableStations?: boolean
  enableTrains?: boolean
  maxStations?: number
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
  } = options

  const queryClient = useQueryClient()
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Update rate limit info periodically
  useEffect(() => {
    const updateRateLimit = () => {
      const info = getRateLimitStatus()
      setRateLimitInfo(info)
    }

    updateRateLimit()
    const interval = setInterval(updateRateLimit, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Fetch major Swiss railway stations
  const {
    data: stations = [],
    isLoading: stationsLoading,
    error: stationsError,
    refetch: refetchStations
  } = useQuery({
    queryKey: ['swiss-railway', 'stations', 'major'],
    queryFn: async () => {
      console.log('🚉 Fetching Swiss railway stations...')
      const stations = await getMajorStations()
      console.log(`✅ Fetched ${stations.length} stations`)
      return stations.slice(0, maxStations)
    },
    staleTime: 60 * 60 * 1000, // 1 hour (stations don't change)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: enableStations,
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error?.message?.includes('Rate limit')) return false
      return failureCount < 2
    }
  })

  // Fetch live train positions
  const {
    data: trains = [],
    isLoading: trainsLoading,
    error: trainsError,
    refetch: refetchTrains
  } = useQuery({
    queryKey: ['swiss-railway', 'trains', 'live', stations.length],
    queryFn: async () => {
      if (stations.length === 0) return []
      
      console.log('🚂 Fetching live train data...')
      const trains = await getApproximateTrainPositions(stations)
      console.log(`✅ Fetched ${trains.length} trains`)
      return trains
    },
    staleTime: realtimeInterval / 2, // Half of refetch interval
    gcTime: realtimeInterval * 2, // Double refetch interval
    refetchInterval: enableRealtime ? realtimeInterval : false,
    enabled: enableTrains && stations.length > 0 && (rateLimitInfo?.remaining || 0) > 10,
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error?.message?.includes('Rate limit')) return false
      return failureCount < 1 // Only retry once for live data
    }
  })

  // Function to get station departures on demand
  const getStationDepartures = async (stationId: string): Promise<StationBoard | null> => {
    const queryKey = ['swiss-railway', 'departures', stationId]
    
    // Check cache first
    const cached = queryClient.getQueryData<StationBoard>(queryKey)
    if (cached) return cached

    try {
      console.log(`🚉 Fetching departures for station: ${stationId}`)
      const departures = await getStationBoard(stationId, { limit: 10 })
      
      // Cache the result for 5 minutes
      queryClient.setQueryData(queryKey, departures, {
        updatedAt: Date.now()
      })
      
      return departures
    } catch (error) {
      console.error('Failed to fetch station departures:', error)
      return null
    }
  }

  // Function to search stations
  const searchStationsQuery = (query: string) => 
    useQuery({
      queryKey: ['swiss-railway', 'search', query],
      queryFn: () => searchStations(query),
      enabled: query.length > 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1
    })

  // Function to force refresh all data
  const refreshAllData = async () => {
    console.log('🔄 Refreshing all Swiss Railway data...')
    await Promise.all([
      refetchStations(),
      refetchTrains()
    ])
    
    // Clear departures cache
    queryClient.removeQueries({ 
      queryKey: ['swiss-railway', 'departures'],
      exact: false 
    })
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
    searchStationsQuery,
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
 * Hook for managing a specific station's data
 */
export function useStationData(stationId: string) {
  const queryClient = useQueryClient()
  
  const {
    data: stationBoard,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['swiss-railway', 'station-board', stationId],
    queryFn: () => getStationBoard(stationId, { limit: 10 }),
    enabled: !!stationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60000, // Refresh every minute
    retry: 1
  })

  const station = stationBoard?.station
  const departures = stationBoard?.stationboard || []

  return {
    station,
    departures,
    stationBoard,
    isLoading,
    error,
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
    queryKey: ['swiss-railway', 'search', debouncedQuery],
    queryFn: () => searchStations(debouncedQuery),
    enabled: debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000,
    retry: 1
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
