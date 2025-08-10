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
  ArrowRight,
  Calendar,
  Building
} from 'lucide-react'
import { Train as TrainType } from '@/types/railway'
import { cn, getTrainColor, formatDelay, formatSwissTime, getRelativeTime } from '@/lib/utils'

interface TrainDetailsProps {
  train: TrainType
  onClose: () => void
}

export function TrainDetails({ train, onClose }: TrainDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'route' | 'occupancy'>('overview')
  
  const isDelayed = (train.delay || 0) > 2
  const trainColor = getTrainColor(train.category)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Train },
    { id: 'route', label: 'Route', icon: MapPin },
    { id: 'occupancy', label: 'Occupancy', icon: Users }
  ] as const

  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] overflow-hidden">
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
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
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
        <div className="p-4 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-4">
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
                  <span className="text-gray-600 dark:text-gray-400">Operator</span>
                  <div className="flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span className="font-medium">{train.operator}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 dark:text-gray-400">Destination</span>
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
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Route Information</h4>
              
              {/* Current and Next Station */}
              <div className="space-y-3">
                {train.currentStation && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">Current Station</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {train.currentStation.name}
                      </div>
                    </div>
                  </div>
                )}

                {train.nextStation && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">Next Station</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {train.nextStation.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Destination */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">Final Destination</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {train.to}
                </div>
              </div>

              {/* Route visualization could go here */}
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Detailed route information coming soon</p>
              </div>
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
