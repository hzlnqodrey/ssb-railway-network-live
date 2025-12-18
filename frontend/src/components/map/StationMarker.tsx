'use client'

import { useRef, useEffect } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Station } from '@/types/railway'
import { MapPin, Train, Clock, Star } from 'lucide-react'

interface StationMarkerProps {
  station: Station
  onClick?: () => void
  isSelected?: boolean
  onAddToFavorites?: () => void  // Callback for adding station to favorites (uses POST)
}

// Create custom station icon
function createStationIcon(isSelected: boolean = false): L.DivIcon {
  const size = isSelected ? 22 : 16
  const innerSize = isSelected ? 10 : 6
  const bgColor = isSelected ? '#2563eb' : '#1f2937'
  const borderWidth = isSelected ? 3 : 2
  
  return L.divIcon({
    html: `
      <div class="station-marker" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${bgColor};
        border: ${borderWidth}px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,${isSelected ? 0.4 : 0.2});
        cursor: pointer;
        transition: all 0.2s ease;
        ${isSelected ? 'animation: pulse 2s infinite;' : ''}
      ">
        <div style="
          width: ${innerSize}px;
          height: ${innerSize}px;
          background-color: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    className: 'station-marker-container',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

export function StationMarker({ station, onClick, isSelected = false, onAddToFavorites }: StationMarkerProps) {
  const icon = createStationIcon(isSelected)
  const markerRef = useRef<L.Marker>(null)

  // Convert Swiss coordinates to lat/lng if needed
  const position: [number, number] = [
    station.coordinate.y, // latitude
    station.coordinate.x  // longitude
  ]

  // Close popup and open details panel on click
  const handleClick = () => {
    // Close any open popup
    if (markerRef.current) {
      markerRef.current.closePopup()
    }
    // Trigger the onClick to open details panel
    onClick?.()
  }

  // Handle departures button click
  const handleDeparturesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (markerRef.current) {
      markerRef.current.closePopup()
    }
    onClick?.()
  }

  // Handle timetable button click  
  const handleTimetableClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (markerRef.current) {
      markerRef.current.closePopup()
    }
    onClick?.()
  }

  // Handle add to favorites button click (will use HTTP POST)
  const handleAddToFavoritesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (markerRef.current) {
      markerRef.current.closePopup()
    }
    onAddToFavorites?.()
  }

  // Update icon when selection changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createStationIcon(isSelected))
    }
  }, [isSelected])

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup closeButton={false} className="station-popup">
        <div className="p-3 min-w-[220px]">
          {/* Station Header */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{station.name}</h3>
              <p className="text-sm text-gray-600">Railway Station</p>
            </div>
          </div>

          {/* Station Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Station ID:</span>
              <span className="font-medium font-mono text-xs">{station.id}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Coordinates:</span>
              <span className="font-medium font-mono text-xs">
                {station.coordinate.y.toFixed(4)}, {station.coordinate.x.toFixed(4)}
              </span>
            </div>

            {station.distance && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{station.distance.toFixed(1)} km</span>
              </div>
            )}
          </div>

          {/* Action Buttons - Now functional! */}
          <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
            <button 
              onClick={handleDeparturesClick}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Train className="w-3 h-3" />
              <span>Departures</span>
            </button>
            <button 
              onClick={handleTimetableClick}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              <span>Timetable</span>
            </button>
          </div>

          {/* Add to Favorites Button (uses HTTP POST) */}
          {onAddToFavorites && (
            <button 
              onClick={handleAddToFavoritesClick}
              className="w-full mt-2 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              title="Add to favorites (uses HTTP POST)"
            >
              <Star className="w-3 h-3" />
              <span>Add to Favorites</span>
            </button>
          )}

          {/* Click for details hint */}
          <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-100">
            Click marker to view details • Star to add to favorites
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
