'use client'

import { useState } from 'react'
import { 
  X, 
  Train, 
  Clock, 
  MapPin, 
  Users, 
  Zap, 
  Navigation,
  AlertTriangle,
  CheckCircle,
  Star
} from 'lucide-react'
import { Train as TrainType } from '@/types/railway'
import { cn, getTrainColor, formatDelay, getRelativeTime } from '@/lib/utils'

interface TrainDetailsProps {
  train: TrainType
  onClose: () => void
  onFollow?: () => void
  isFollowing?: boolean
  onDrawRoute?: () => void
  isRouteDrawn?: boolean
  onAddToFavorites?: () => void
}

export function TrainDetails({ train, onClose, onFollow, isFollowing = false, onDrawRoute, isRouteDrawn = false, onAddToFavorites }: TrainDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'route' | 'occupancy'>('overview')
  
  const isDelayed = (train.delay || 0) > 2
  const trainColor = getTrainColor(train.category)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Train },
    { id: 'route', label: 'Route', icon: MapPin },
    { id: 'occupancy', label: 'Occupancy', icon: Users }
  ] as const

  return (
    <div className="absolute top-4 left-4 z-[1000] w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div 
          className="px-4 py-3 text-white relative"
          style={{ backgroundColor: trainColor }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{train.name}</h2>
                <p className="text-sm opacity-90">to {train.to}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onAddToFavorites && (
                <button
                  onClick={onAddToFavorites}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Add to favorites"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-2 mt-3">
            {train.cancelled ? (
              <div className="flex items-center space-x-1 bg-red-500/80 px-2 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs font-medium">Cancelled</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 bg-green-500/80 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Operating</span>
              </div>
            )}
            
            {isDelayed && (
              <div className="flex items-center space-x-1 bg-orange-500/80 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-medium">
                  {formatDelay((train.delay || 0) * 60)}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-full">
              <span className="text-xs font-medium">
                {getRelativeTime(train.lastUpdate)}
              </span>
            </div>
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
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Train Header */}
              <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {train.name} ({train.number})
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">Operator:</span> {train.operator}
                </p>
                {train.departureTime && train.from && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Departing {train.from} at {train.departureTime}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button 
                  onClick={onFollow}
                  className={cn(
                    "flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors",
                    isFollowing 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {isFollowing ? '✓ Following' : 'Follow'}
                </button>
                <button 
                  onClick={onDrawRoute}
                  className={cn(
                    "flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors",
                    isRouteDrawn 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  )}
                >
                  {isRouteDrawn ? '✓ Route shown' : 'Draw route'}
                </button>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-600 dark:text-gray-400">Category</span>
                  <div className="font-medium">{train.category}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 dark:text-gray-400">Number</span>
                  <div className="font-medium">{train.number}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 dark:text-gray-400">From</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{train.from}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 dark:text-gray-400">To</span>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{train.to}</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Performance</h4>
                
                {train.speed && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Current Speed</span>
                    </div>
                    <span className="font-bold text-blue-600">{train.speed} km/h</span>
                  </div>
                )}

                {train.direction !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Navigation className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Direction</span>
                    </div>
                    <span className="font-bold text-green-600">{train.direction}°</span>
                  </div>
                )}

                {train.delay !== undefined && (
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    train.delay > 2 
                      ? "bg-red-50 dark:bg-red-900/20" 
                      : "bg-green-50 dark:bg-green-900/20"
                  )}>
                    <div className="flex items-center space-x-2">
                      <Clock className={cn(
                        "w-4 h-4",
                        train.delay > 2 ? "text-red-600" : "text-green-600"
                      )} />
                      <span className="text-sm font-medium">Status</span>
                    </div>
                    <span className={cn(
                      "font-bold",
                      train.delay > 2 ? "text-red-600" : "text-green-600"
                    )}>
                      {train.delay === 0 ? 'On Time' : formatDelay(train.delay * 60)}
                    </span>
                  </div>
                )}
              </div>

              {/* Position Information */}
              {train.position && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Current Position</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                        <div className="font-mono">{train.position.lat.toFixed(6)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                        <div className="font-mono">{train.position.lng.toFixed(6)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'route' && (
            <div className="space-y-4">
              {/* Train Header Information */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                      {train.name} - {train.operator}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {train.from} → {train.to}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Departing {train.from}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {train.departureTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timetable */}
              {train.timetable && train.timetable.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Timetable</h4>
                  
                  {/* Table Header */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-t-lg p-2">
                    <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <div className="col-span-1">#</div>
                      <div className="col-span-5">Station</div>
                      <div className="col-span-3">Arr.</div>
                      <div className="col-span-3">Dep.</div>
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden max-h-64 overflow-y-auto">
                    {train.timetable.map((stop, index) => {
                      if (!stop.station) return null
                      const hasDelay = (stop.arrivalDelay && stop.arrivalDelay > 0) || (stop.departureDelay && stop.departureDelay > 0)
                      
                      return (
                        <div 
                          key={`${stop.station.id}-${index}`}
                          className={cn(
                            "grid grid-cols-12 gap-1 p-2 text-sm border-b border-gray-100 dark:border-gray-800 last:border-b-0",
                            stop.isCurrentStation 
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                              : stop.isPassed 
                                ? "text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50" 
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          )}
                        >
                          {/* Station Number */}
                          <div className="col-span-1 flex items-center">
                            <span className={cn(
                              "text-xs font-medium",
                              stop.isCurrentStation ? "text-blue-600 dark:text-blue-400" : ""
                            )}>
                              {index + 1}.
                            </span>
                          </div>
                          
                          {/* Station Name */}
                          <div className="col-span-5 flex items-center">
                            <div>
                              <div className={cn(
                                "font-medium truncate",
                                stop.isCurrentStation ? "text-blue-900 dark:text-blue-100" : "",
                                stop.isPassed ? "line-through" : ""
                              )}>
                                {stop.station.name}
                              </div>
                              {stop.platform && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Platform {stop.platform}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrival Time */}
                          <div className="col-span-3 flex items-center">
                            {stop.arrivalTime ? (
                              <div className="text-center">
                                <div className={cn(
                                  "font-mono text-sm",
                                  hasDelay && stop.arrivalDelay ? "text-red-600 dark:text-red-400" : ""
                                )}>
                                  {stop.arrivalTime}
                                </div>
                                {stop.arrivalDelay && stop.arrivalDelay > 0 && (
                                  <div className="text-xs text-red-600 dark:text-red-400">
                                    +{stop.arrivalDelay}'
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                          
                          {/* Departure Time */}
                          <div className="col-span-3 flex items-center">
                            {stop.departureTime ? (
                              <div className="text-center">
                                <div className={cn(
                                  "font-mono text-sm",
                                  hasDelay && stop.departureDelay ? "text-red-600 dark:text-red-400" : ""
                                )}>
                                  {stop.departureTime}
                                </div>
                                {stop.departureDelay && stop.departureDelay > 0 && (
                                  <div className="text-xs text-red-600 dark:text-red-400">
                                    +{stop.departureDelay}'
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Timetable information not available</p>
                </div>
              )}

              {/* Multi-Leg Journey Display */}
              {train.journey && train.journey.legs.length > 1 && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Journey Legs</h4>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                      {train.journey.transfers} transfer{train.journey.transfers !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {train.journey.legs.map((leg, index) => (
                    <div 
                      key={leg.legId || index}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4"
                      style={{ borderLeftColor: leg.color || ['#dc2626', '#2563eb', '#16a34a', '#9333ea'][index % 4] }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            Leg {index + 1}
                          </span>
                          <span className="font-medium text-sm">{leg.trainName}</span>
                        </div>
                        <span className="text-xs text-gray-500">{leg.operator}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-gray-500">From</div>
                          <div className="font-medium">{leg.from?.name}</div>
                          <div className="text-blue-600">{leg.departureTime}</div>
                          {leg.platform && <div className="text-gray-500">Pl. {leg.platform}</div>}
                        </div>
                        <div>
                          <div className="text-gray-500">To</div>
                          <div className="font-medium">{leg.to?.name}</div>
                          <div className="text-blue-600">{leg.arrivalTime}</div>
                          {leg.exitPlatform && <div className="text-gray-500">Pl. {leg.exitPlatform}</div>}
                        </div>
                      </div>
                      
                      {leg.stops.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500">
                            {leg.stops.length} intermediate stop{leg.stops.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Total Journey Time */}
                  <div className="flex items-center justify-between text-sm p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-purple-700 dark:text-purple-300">Total Journey Time</span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {Math.floor(train.journey.totalDuration / 3600)}h {Math.floor((train.journey.totalDuration % 3600) / 60)}m
                    </span>
                  </div>
                </div>
              )}

              {/* Journey Summary */}
              {train.departureTime && train.arrivalTime && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Journey Duration:</span>
                      <span className="ml-2 font-medium">
                        {(() => {
                          const [depHour, depMin] = train.departureTime.split(':').map(Number)
                          const [arrHour, arrMin] = train.arrivalTime.split(':').map(Number)
                          const depMinutes = depHour * 60 + depMin
                          let arrMinutes = arrHour * 60 + arrMin
                          
                          // Handle next day arrivals
                          if (arrMinutes < depMinutes) {
                            arrMinutes += 24 * 60
                          }
                          
                          const duration = arrMinutes - depMinutes
                          const hours = Math.floor(duration / 60)
                          const minutes = duration % 60
                          
                          return `${hours}h ${minutes}m`
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Stops:</span>
                      <span className="ml-2 font-medium">{train.timetable?.length || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'occupancy' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Train Occupancy</h4>
              
              {train.occupancy ? (
                <div className="space-y-3">
                  {/* First Class */}
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">First Class</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {train.occupancy.firstClass}% full
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${train.occupancy.firstClass}%` }}
                      />
                    </div>
                  </div>

                  {/* Second Class */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Second Class</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {train.occupancy.secondClass}% full
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${train.occupancy.secondClass}%` }}
                      />
                    </div>
                  </div>

                  {/* Occupancy Legend */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                      <div className="font-medium text-green-800 dark:text-green-300">Low</div>
                      <div className="text-green-600 dark:text-green-400">0-30%</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                      <div className="font-medium text-yellow-800 dark:text-yellow-300">Medium</div>
                      <div className="text-yellow-600 dark:text-yellow-400">30-70%</div>
                    </div>
                    <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                      <div className="font-medium text-red-800 dark:text-red-300">High</div>
                      <div className="text-red-600 dark:text-red-400">70-100%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Occupancy data not available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
