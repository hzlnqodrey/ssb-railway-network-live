'use client'

import { useState } from 'react'
import { 
  Train, 
  MapPin, 
  Play, 
  Pause, 
  Map, 
  Satellite, 
  Mountain,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapControlsProps {
  showStations: boolean
  setShowStations: (show: boolean) => void
  showTrains: boolean
  setShowTrains: (show: boolean) => void
  mapType: 'standard' | 'satellite' | 'terrain'
  setMapType: (type: 'standard' | 'satellite' | 'terrain') => void
  isRealtimeEnabled: boolean
  setIsRealtimeEnabled: (enabled: boolean) => void
  trainsCount: number
  stationsCount: number
}

export function MapControls({
  showStations,
  setShowStations,
  showTrains,
  setShowTrains,
  mapType,
  setMapType,
  isRealtimeEnabled,
  setIsRealtimeEnabled,
  trainsCount,
  stationsCount
}: MapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const mapTypeOptions = [
    { value: 'standard', label: 'Standard', icon: Map },
    { value: 'satellite', label: 'Satellite', icon: Satellite },
    { value: 'terrain', label: 'Terrain', icon: Mountain }
  ] as const

  return (
    <div className="absolute bottom-4 left-4 z-[1000]">
      {/* Main Controls Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Always Visible Controls */}
        <div className="p-3 space-y-3">
          {/* Real-time Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Real-time
            </span>
            <button
              onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
              className={cn(
                "flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors",
                isRealtimeEnabled
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              {isRealtimeEnabled ? (
                <Play className="w-3 h-3" />
              ) : (
                <Pause className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {isRealtimeEnabled ? 'Live' : 'Paused'}
              </span>
            </button>
          </div>

          {/* Quick Layer Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTrains(!showTrains)}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors",
                showTrains
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}
            >
              <Train className="w-3 h-3" />
              <span>{trainsCount}</span>
            </button>
            
            <button
              onClick={() => setShowStations(!showStations)}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors",
                showStations
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}
            >
              <MapPin className="w-3 h-3" />
              <span>{stationsCount}</span>
            </button>
          </div>
        </div>

        {/* Expandable Section */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-4">
            {/* Layer Visibility */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Layers
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Train className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Trains</span>
                  </div>
                  <button
                    onClick={() => setShowTrains(!showTrains)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showTrains ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Stations</span>
                  </div>
                  <button
                    onClick={() => setShowStations(!showStations)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showStations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Map Type Selection */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Map Type
              </h4>
              
              <div className="grid grid-cols-3 gap-1">
                {mapTypeOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setMapType(option.value)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg text-xs transition-colors",
                        mapType === option.value
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      <IconComponent className="w-4 h-4 mb-1" />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Statistics
              </h4>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="font-medium text-blue-600 dark:text-blue-400">{trainsCount}</div>
                  <div className="text-gray-600 dark:text-gray-400">Active Trains</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="font-medium text-green-600 dark:text-green-400">{stationsCount}</div>
                  <div className="text-gray-600 dark:text-gray-400">Stations</div>
                </div>
              </div>
            </div>

            {/* TODO: */}
            {/* Train Table - Arrival and Departure */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Train Table
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="font-medium text-center text-blue-600 dark:text-blue-400">Train</div>
                  <div className="text-center text-gray-600 dark:text-gray-400">Arrival</div>
                  <div className="text-center text-gray-600 dark:text-gray-400">Departure</div> 
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1"
        >
          <Settings className="w-3 h-3" />
          <span className="text-xs">
            {isExpanded ? 'Less' : 'More'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  )
}
