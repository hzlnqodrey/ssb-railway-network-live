'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Train, 
  Clock, 
  MapPin, 
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Calendar,
  ChevronRight
} from 'lucide-react'
import { Station } from '@/types/railway'
import { cn, formatSwissTime } from '@/lib/utils'

interface Departure {
  id: string
  trainName: string
  trainNumber: string
  category: string
  operator: string
  destination: string
  departureTime: string
  platform?: string
  delay?: number
}

interface StationDetailsPanelProps {
  station: Station
  onClose: () => void
  onTrainClick?: (trainId: string) => void
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function StationDetailsPanel({ station, onClose, onTrainClick }: StationDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<'departures' | 'timetable' | 'info'>('departures')
  const [departures, setDepartures] = useState<Departure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Fetch departures from API
  const fetchDepartures = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/stations/${station.id}/departures`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch departures')
      }
      
      const data = await response.json()
      
      // Transform API response to our Departure interface
      const transformedDepartures: Departure[] = (data.data?.departures || []).map((dep: {
        trip_id?: string
        train_name?: string
        train_number?: string
        route_short_name?: string
        category?: string
        agency_name?: string
        headsign?: string
        departureTime?: string
        platform?: string
        delay?: number
      }) => ({
        id: dep.trip_id || `${dep.train_number}-${dep.departureTime}`,
        trainName: dep.train_name || `${dep.route_short_name || ''} ${dep.train_number || ''}`.trim(),
        trainNumber: dep.train_number || '',
        category: dep.category || dep.route_short_name || 'Train',
        operator: dep.agency_name || 'SBB',
        destination: dep.headsign || 'Unknown',
        departureTime: dep.departureTime || '',
        platform: dep.platform,
        delay: dep.delay || 0
      }))
      
      setDepartures(transformedDepartures)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching departures:', err)
      setError('Failed to load departures. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch departures on mount and station change
  useEffect(() => {
    fetchDepartures()
  }, [station.id])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDepartures, 30000)
    return () => clearInterval(interval)
  }, [station.id])

  const tabs = [
    { id: 'departures', label: 'Departures', icon: Train },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'info', label: 'Info', icon: MapPin }
  ] as const

  const getCategoryColor = (category: string): string => {
    const upperCategory = category.toUpperCase()
    if (upperCategory.includes('IC') || upperCategory.includes('EC')) return 'bg-red-600'
    if (upperCategory.includes('IR')) return 'bg-red-500'
    if (upperCategory.includes('RE')) return 'bg-blue-600'
    if (upperCategory.includes('S')) return 'bg-blue-500'
    if (upperCategory.includes('R')) return 'bg-gray-600'
    return 'bg-gray-500'
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-800 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{station.name}</h2>
                <p className="text-sm opacity-90">Railway Station</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Last refresh indicator */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-full text-xs">
              <Clock className="w-3 h-3" />
              <span>Updated {formatSwissTime(lastRefresh.toISOString())}</span>
            </div>
            <button
              onClick={fetchDepartures}
              disabled={isLoading}
              className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full text-xs transition-colors"
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[28rem] overflow-y-auto">
          {activeTab === 'departures' && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    <span className="text-sm text-gray-500">Loading departures...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                    <button
                      onClick={fetchDepartures}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : departures.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <Train className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">No upcoming departures</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-3">
                    {departures.length} upcoming departures
                  </div>
                  {departures.map((departure) => (
                    <div
                      key={departure.id}
                      onClick={() => onTrainClick?.(departure.id)}
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      {/* Train Category Badge */}
                      <div className={cn(
                        "w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold mr-3",
                        getCategoryColor(departure.category)
                      )}>
                        {departure.category.slice(0, 4)}
                      </div>

                      {/* Train Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm truncate">
                            {departure.trainName}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {departure.destination}
                          </span>
                        </div>
                        {departure.platform && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Platform {departure.platform}
                          </div>
                        )}
                      </div>

                      {/* Departure Time */}
                      <div className="text-right ml-3">
                        <div className={cn(
                          "font-mono font-bold text-sm",
                          departure.delay && departure.delay > 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                        )}>
                          {departure.departureTime}
                        </div>
                        {departure.delay && departure.delay > 0 && (
                          <div className="text-xs text-red-600">
                            +{departure.delay}'
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Full Timetable</p>
                <p className="text-sm mt-1">
                  View all trains stopping at this station
                </p>
                <button
                  onClick={() => setActiveTab('departures')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  View Live Departures
                </button>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Station Information</h4>
              
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Station ID</div>
                  <div className="font-mono font-medium">{station.id}</div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Coordinates</div>
                  <div className="font-mono text-sm">
                    {station.coordinate.y.toFixed(6)}, {station.coordinate.x.toFixed(6)}
                  </div>
                </div>

                {station.distance && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Distance</div>
                    <div className="font-medium">{station.distance.toFixed(1)} km</div>
                  </div>
                )}
              </div>

              {/* Station Services */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Services</h5>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                    🚂 Railway
                  </span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                    🎫 Tickets
                  </span>
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                    ℹ️ Info
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
