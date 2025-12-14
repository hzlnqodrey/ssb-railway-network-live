'use client'

import { useEffect, useState, useRef } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Train } from '@/types/railway'
import { getTrainColor, formatDelay, formatSwissTime } from '@/lib/utils'
import { Clock, Users, Zap, Navigation, TrendingUp } from 'lucide-react'

interface AnimatedTrainMarkerProps {
  train: Train
  isSelected?: boolean
  isFollowed?: boolean
  onClick?: () => void
  animationDuration?: number // in milliseconds
}

// Create animated train icon with smooth movement
function createAnimatedTrainIcon(
  train: Train, 
  isSelected: boolean = false,
  isMoving: boolean = false
): L.DivIcon {
  const color = getTrainColor(train.category)
  const size = isSelected ? 36 : 28
  const delay = train.delay || 0
  const isDelayed = delay > 2
  const speed = train.speed || 0
  
  return L.divIcon({
    html: `
      <div class="train-marker ${isSelected ? 'selected' : ''} ${isMoving ? 'moving' : ''}" style="
        --train-color: ${color};
        --train-size: ${size}px;
        --train-direction: ${train.direction || 0}deg;
        width: var(--train-size);
        height: var(--train-size);
        background-color: var(--train-color);
        border: 3px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.9)'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size < 30 ? '10px' : '12px'};
        font-weight: bold;
        color: white;
        box-shadow: 
          0 2px 8px rgba(0,0,0,0.3),
          ${isSelected ? '0 0 0 4px rgba(59, 130, 246, 0.3)' : 'none'};
        transform: rotate(var(--train-direction));
        position: relative;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: ${isSelected ? 1000 : 500};
      ">
        <span style="
          transform: rotate(calc(-1 * var(--train-direction)));
          transition: transform 0.3s ease;
        ">
          ${train.category}
        </span>
        
        ${isDelayed ? `
          <div class="delay-indicator" style="
            position: absolute;
            top: -3px;
            right: -3px;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 50%;
            border: 2px solid white;
            animation: pulse 2s infinite;
          "></div>
        ` : ''}
        
        ${speed > 0 ? `
          <div class="speed-indicator" style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(90deg, transparent, var(--train-color), transparent);
            height: 2px;
            width: ${Math.min(speed / 2, 20)}px;
            border-radius: 1px;
            opacity: 0.8;
            animation: speedPulse 1s ease-in-out infinite alternate;
          "></div>
        ` : ''}
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        
        @keyframes speedPulse {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
        
        .train-marker.moving {
          animation: trainMovement 2s ease-in-out infinite alternate;
        }
        
        @keyframes trainMovement {
          0% { transform: rotate(var(--train-direction)) translateX(0); }
          100% { transform: rotate(var(--train-direction)) translateX(1px); }
        }
        
        .train-marker:hover {
          transform: rotate(var(--train-direction)) scale(1.1);
          box-shadow: 
            0 4px 12px rgba(0,0,0,0.4),
            0 0 0 4px rgba(59, 130, 246, 0.2);
        }
        
        .train-marker.selected {
          animation: selectedPulse 2s ease-in-out infinite;
        }
        
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 4px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 6px rgba(59, 130, 246, 0.5); }
        }
      </style>
    `,
    className: 'animated-train-marker-container',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

export function AnimatedTrainMarker({ 
  train, 
  isSelected = false, 
  isFollowed = false,
  onClick,
  animationDuration = 1000
}: AnimatedTrainMarkerProps) {
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(() => [
    train.position?.lat || 0,
    train.position?.lng || 0
  ])
  const [isMoving, setIsMoving] = useState(false)
  const markerRef = useRef<L.Marker>(null)
  const previousPositionRef = useRef<[number, number]>(currentPosition)

  // Animate position changes
  useEffect(() => {
    if (!train.position) return

    const newPosition: [number, number] = [train.position.lat, train.position.lng]
    const prevPosition = previousPositionRef.current

    // Check if position actually changed
    const positionChanged = 
      Math.abs(newPosition[0] - prevPosition[0]) > 0.0001 ||
      Math.abs(newPosition[1] - prevPosition[1]) > 0.0001

    if (positionChanged) {
      setIsMoving(true)
      
      // Smooth position interpolation
      const steps = 20
      const stepDuration = animationDuration / steps
      
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => {
          const progress = i / steps
          // Use easing function for smooth animation
          const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
          
          const interpolatedLat = prevPosition[0] + (newPosition[0] - prevPosition[0]) * eased
          const interpolatedLng = prevPosition[1] + (newPosition[1] - prevPosition[1]) * eased
          
          setCurrentPosition([interpolatedLat, interpolatedLng])
          
          // Update marker position if ref exists
          if (markerRef.current) {
            markerRef.current.setLatLng([interpolatedLat, interpolatedLng])
          }
        }, stepDuration * (i - 1))
      }
      
      // Stop moving animation after completion
      setTimeout(() => {
        setIsMoving(false)
        previousPositionRef.current = newPosition
      }, animationDuration)
    }
  }, [train.position?.lat, train.position?.lng, animationDuration])

  // Update direction smoothly
  useEffect(() => {
    if (markerRef.current && train.direction !== undefined) {
      const marker = markerRef.current
      const icon = marker.getIcon()
      
      if (icon instanceof L.DivIcon) {
        // Update CSS custom property for smooth direction changes
        const element = marker.getElement()
        if (element) {
          element.style.setProperty('--train-direction', `${train.direction}deg`)
        }
      }
    }
  }, [train.direction])

  const icon = createAnimatedTrainIcon(train, isSelected || isFollowed, isMoving)

  return (
    <Marker
      ref={markerRef}
      position={currentPosition}
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup closeButton={false} className="animated-train-popup">
        <div className="p-4 min-w-[280px] max-w-[320px]">
          {/* Enhanced Train Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                style={{ backgroundColor: getTrainColor(train.category) }}
              >
                {train.category}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{train.name}</h3>
                <p className="text-sm text-gray-600">to {train.to}</p>
              </div>
            </div>
            {train.delay && train.delay > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-full">
                <Clock className="w-3 h-3 text-red-600" />
                <span className="text-xs font-medium text-red-600">
                  {formatDelay(train.delay * 60)}
                </span>
              </div>
            )}
          </div>

          {/* Enhanced Performance Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {train.speed && (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                <Zap className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-gray-600 text-xs">Speed</span>
                  <div className="font-bold text-blue-600">{train.speed} km/h</div>
                </div>
              </div>
            )}
            
            {train.direction !== undefined && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                <Navigation className="w-4 h-4 text-green-600" />
                <div>
                  <span className="text-gray-600 text-xs">Direction</span>
                  <div className="font-bold text-green-600">{train.direction}°</div>
                </div>
              </div>
            )}
            
            {train.occupancy && (
              <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg col-span-2">
                <Users className="w-4 h-4 text-purple-600" />
                <div className="flex-1">
                  <span className="text-gray-600 text-xs">Occupancy</span>
                  <div className="flex space-x-2 mt-1">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">1st Class</div>
                      <div className="font-bold text-purple-600">{train.occupancy.firstClass}%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">2nd Class</div>
                      <div className="font-bold text-purple-600">{train.occupancy.secondClass}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status and Update Info */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {train.cancelled ? (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  Cancelled
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  On Track
                </span>
              )}
              
              {isMoving && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium animate-pulse">
                  Moving
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              Updated {formatSwissTime(train.lastUpdate)}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
