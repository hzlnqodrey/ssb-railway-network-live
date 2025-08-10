/**
 * Swiss Transport API Service
 * 
 * This service provides access to the Swiss Open Transport Data API
 * Documentation: https://transport.opendata.ch/docs.html
 * 
 * Key Features:
 * - Station information and search
 * - Real-time departures/arrivals
 * - Connection/route planning
 * - Live train positions (approximated)
 */

import { Station, Train, Connection, StationBoard, ApiResponse } from '@/types/railway'

const API_BASE_URL = 'https://transport.opendata.ch/v1'

// Rate limiting: 1000 requests per 24 hours
const RATE_LIMIT = {
  MAX_REQUESTS: 1000,
  TIME_WINDOW: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  requests: [] as number[]
}

/**
 * Check if we're within rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT.TIME_WINDOW
  
  // Remove requests outside the current window
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => time > windowStart)
  
  // Check if we can make another request
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.MAX_REQUESTS) {
    console.warn('Rate limit exceeded. Please try again later.')
    return false
  }
  
  // Record this request
  RATE_LIMIT.requests.push(now)
  return true
}

/**
 * Make API request with error handling and rate limiting
 */
async function apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }
  
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value)
  })
  
  try {
    console.log(`🚂 Fetching: ${url.toString()}`)
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SwissRailwayNetwork/1.0.0',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Swiss Transport API Error:', error)
    throw error
  }
}

/**
 * Search for stations by name or coordinates
 */
export async function searchStations(query: string, type?: string): Promise<Station[]> {
  try {
    const params: Record<string, string> = { query }
    if (type) params.type = type
    
    const response = await apiRequest<{ stations: any[] }>('/locations', params)
    
    return response.stations?.map(station => ({
      id: station.id,
      name: station.name,
      coordinate: {
        x: station.coordinate.x,
        y: station.coordinate.y
      },
      distance: station.distance
    })) || []
  } catch (error) {
    console.error('Error searching stations:', error)
    return []
  }
}

/**
 * Get station departures/arrivals (station board)
 */
export async function getStationBoard(
  stationId: string, 
  options: {
    limit?: number
    transportations?: string[]
    datetime?: string
  } = {}
): Promise<StationBoard | null> {
  try {
    const params: Record<string, string> = {
      station: stationId,
      limit: (options.limit || 10).toString()
    }
    
    if (options.transportations?.length) {
      params.transportations = options.transportations.join(',')
    }
    
    if (options.datetime) {
      params.datetime = options.datetime
    }
    
    const response = await apiRequest<{
      station: any
      stationboard: any[]
    }>('/stationboard', params)
    
    if (!response.station) return null
    
    const station: Station = {
      id: response.station.id,
      name: response.station.name,
      coordinate: {
        x: response.station.coordinate.x,
        y: response.station.coordinate.y
      }
    }
    
    const stationboard = response.stationboard?.map(departure => ({
      stop: {
        station: {
          id: departure.stop.station.id,
          name: departure.stop.station.name,
          coordinate: departure.stop.station.coordinate
        },
        arrival: departure.stop.arrival,
        departure: departure.stop.departure,
        delay: departure.stop.delay,
        platform: departure.stop.platform,
        prognosis: departure.stop.prognosis
      },
      name: departure.name,
      category: departure.category,
      subcategory: departure.subcategory,
      categoryCode: departure.categoryCode,
      number: departure.number,
      operator: departure.operator,
      to: departure.to,
      passList: departure.passList?.map((pass: any) => ({
        station: pass.station,
        arrival: pass.arrival,
        departure: pass.departure,
        delay: pass.delay,
        platform: pass.platform,
        prognosis: pass.prognosis
      })),
      capacity1st: departure.capacity1st,
      capacity2nd: departure.capacity2nd
    })) || []
    
    return { station, stationboard }
  } catch (error) {
    console.error('Error fetching station board:', error)
    return null
  }
}

/**
 * Get connections between two stations
 */
export async function getConnections(
  from: string,
  to: string,
  options: {
    via?: string
    date?: string
    time?: string
    isArrivalTime?: boolean
    transportations?: string[]
    limit?: number
  } = {}
): Promise<Connection[]> {
  try {
    const params: Record<string, string> = { from, to }
    
    if (options.via) params.via = options.via
    if (options.date) params.date = options.date
    if (options.time) params.time = options.time
    if (options.isArrivalTime) params.isArrivalTime = '1'
    if (options.transportations?.length) {
      params.transportations = options.transportations.join(',')
    }
    if (options.limit) params.limit = options.limit.toString()
    
    const response = await apiRequest<{ connections: any[] }>('/connections', params)
    
    return response.connections?.map(connection => ({
      from: {
        id: connection.from.station.id,
        name: connection.from.station.name,
        coordinate: connection.from.station.coordinate
      },
      to: {
        id: connection.to.station.id,
        name: connection.to.station.name,
        coordinate: connection.to.station.coordinate
      },
      departure: connection.from.departure,
      arrival: connection.to.arrival,
      duration: connection.duration,
      transfers: connection.transfers,
      products: connection.products || [],
      capacity1st: connection.capacity1st,
      capacity2nd: connection.capacity2nd
    })) || []
  } catch (error) {
    console.error('Error fetching connections:', error)
    return []
  }
}

/**
 * Get all major Swiss stations
 */
export async function getMajorStations(): Promise<Station[]> {
  const majorStationNames = [
    'Zürich HB',
    'Bern',
    'Basel SBB',
    'Genève',
    'Lausanne',
    'Winterthur',
    'St. Gallen',
    'Luzern',
    'Lugano',
    'Thun',
    'Olten',
    'Chur'
  ]
  
  try {
    const stations: Station[] = []
    
    // Search for each major station
    for (const stationName of majorStationNames) {
      try {
        const results = await searchStations(stationName, 'station')
        const exactMatch = results.find(s => 
          s.name.toLowerCase() === stationName.toLowerCase()
        )
        if (exactMatch) {
          stations.push(exactMatch)
        } else if (results.length > 0) {
          stations.push(results[0])
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.warn(`Failed to fetch station: ${stationName}`, error)
      }
    }
    
    return stations
  } catch (error) {
    console.error('Error fetching major stations:', error)
    return []
  }
}

/**
 * Simulate train positions based on connections and timetables
 * 
 * Note: The Swiss Transport API doesn't provide real-time GPS positions,
 * so we approximate positions based on scheduled connections and current time.
 */
export async function getApproximateTrainPositions(stations: Station[]): Promise<Train[]> {
  try {
    const trains: Train[] = []
    
    // Get departures from major stations
    for (const station of stations.slice(0, 5)) { // Limit to avoid rate limits
      try {
        const stationBoard = await getStationBoard(station.id, { 
          limit: 5,
          transportations: ['train'] 
        })
        
        if (stationBoard?.stationboard) {
          for (const departure of stationBoard.stationboard) {
            // Skip if no valid departure time
            if (!departure.stop.departure) continue
            
            const departureTime = new Date(departure.stop.departure)
            const now = new Date()
            const timeDiff = now.getTime() - departureTime.getTime()
            
            // Only include trains that have departed within the last 2 hours
            // and are scheduled to arrive within the next 4 hours
            if (timeDiff > -2 * 60 * 60 * 1000 && timeDiff < 4 * 60 * 60 * 1000) {
              // Approximate position between departure and destination
              const progress = Math.min(Math.max(timeDiff / (2 * 60 * 60 * 1000), 0), 1)
              
              // Simple linear interpolation for position
              const departureCoord = departure.stop.station.coordinate
              // For demo, use a random nearby position
              const approxLat = departureCoord.y + (Math.random() - 0.5) * 0.1
              const approxLng = departureCoord.x + (Math.random() - 0.5) * 0.1
              
              trains.push({
                id: `${departure.category}-${departure.number}-${station.id}`,
                name: departure.name,
                category: departure.category,
                number: departure.number || '',
                operator: departure.operator || 'SBB',
                to: departure.to,
                currentStation: station,
                position: {
                  lat: approxLat,
                  lng: approxLng
                },
                delay: departure.stop.delay || 0,
                cancelled: false,
                occupancy: {
                  firstClass: departure.capacity1st || Math.floor(Math.random() * 100),
                  secondClass: departure.capacity2nd || Math.floor(Math.random() * 100)
                },
                speed: 60 + Math.floor(Math.random() * 60), // Random speed 60-120 km/h
                direction: Math.floor(Math.random() * 360), // Random direction
                lastUpdate: new Date().toISOString()
              })
            }
          }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.warn(`Failed to get departures for station: ${station.name}`, error)
      }
    }
    
    return trains
  } catch (error) {
    console.error('Error getting approximate train positions:', error)
    return []
  }
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus() {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT.TIME_WINDOW
  const recentRequests = RATE_LIMIT.requests.filter(time => time > windowStart)
  
  return {
    used: recentRequests.length,
    limit: RATE_LIMIT.MAX_REQUESTS,
    remaining: RATE_LIMIT.MAX_REQUESTS - recentRequests.length,
    resetTime: new Date(windowStart + RATE_LIMIT.TIME_WINDOW)
  }
}
