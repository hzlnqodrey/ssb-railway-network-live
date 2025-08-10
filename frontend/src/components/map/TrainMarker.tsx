'use client'

import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Train } from '@/types/railway'
import { getTrainColor, formatDelay, formatSwissTime } from '@/lib/utils'
import { Clock, Users, Zap } from 'lucide-react'

interface TrainMarkerProps {
  train: Train
  isSelected?: boolean
  onClick?: () => void
}

// Create custom train icon based on train category and status
function createTrainIcon(train: Train, isSelected: boolean = false): L.DivIcon {
  const color = getTrainColor(train.category)
  const size = isSelected ? 32 : 24
  const delay = train.delay || 0
  const isDelayed = delay > 2
  
  return L.divIcon({
    html: `
      <div class="train-marker ${isSelected ? 'selected' : ''}" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 3px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size < 28 ? '10px' : '12px'};
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transform: ${train.direction ? `rotate(${train.direction}deg)` : 'none'};
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <span style="transform: ${train.direction ? `rotate(-${train.direction}deg)` : 'none'};">
          ${train.category}
        </span>
        ${isDelayed ? `
          <div style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 50%;
            border: 1px solid white;
          "></div>
        ` : ''}
      </div>
    `,
    className: 'train-marker-container',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

export function TrainMarker({ train, isSelected = false, onClick }: TrainMarkerProps) {
  if (!train.position) {
    return null
  }

  const icon = createTrainIcon(train, isSelected)

  return (
    <Marker
      position={[train.position.lat, train.position.lng]}
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup closeButton={false} className="train-popup">
        <div className="p-3 min-w-[250px]">
          {/* Train Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getTrainColor(train.category) }}
              >
                {train.category}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{train.name}</h3>
                <p className="text-sm text-gray-600">to {train.to}</p>
              </div>
            </div>
            {train.delay && train.delay > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {formatDelay(train.delay * 60)}
                </span>
              </div>
            )}
          </div>

          {/* Train Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operator:</span>
              <span className="font-medium">{train.operator}</span>
            </div>
            
            {train.speed && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Speed:</span>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="font-medium">{train.speed} km/h</span>
                </div>
              </div>
            )}

            {train.occupancy && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Occupancy:</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-green-500" />
                  <span className="font-medium">
                    {train.occupancy.firstClass || 0}% / {train.occupancy.secondClass || 0}%
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Update:</span>
              <span className="font-medium">
                {formatSwissTime(train.lastUpdate)}
              </span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
            {train.cancelled ? (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Cancelled
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                On Track
              </span>
            )}
            
            {train.delay && train.delay > 2 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Delayed
              </span>
            )}
          </div>

          {/* Click for details hint */}
          <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-100">
            Click marker for detailed information
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
