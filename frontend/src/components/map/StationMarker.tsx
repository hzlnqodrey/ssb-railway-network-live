'use client'

import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Station } from '@/types/railway'
import { MapPin, Train, Clock } from 'lucide-react'

interface StationMarkerProps {
  station: Station
  onClick?: () => void
}

// Create custom station icon
function createStationIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div class="station-marker" style="
        width: 16px;
        height: 16px;
        background-color: #1f2937;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        <div style="
          width: 6px;
          height: 6px;
          background-color: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'station-marker-container',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  })
}

export function StationMarker({ station, onClick }: StationMarkerProps) {
  const icon = createStationIcon()

  // Convert Swiss coordinates to lat/lng if needed
  const position: [number, number] = [
    station.coordinate.y, // latitude
    station.coordinate.x  // longitude
  ]

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup closeButton={false} className="station-popup">
        <div className="p-3 min-w-[200px]">
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
              <span className="font-medium font-mono">{station.id}</span>
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

          {/* Action Buttons */}
          <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
            <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
              <Train className="w-3 h-3" />
              <span>Departures</span>
            </button>
            <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Timetable</span>
            </button>
          </div>

          {/* Click for details hint */}
          <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t border-gray-100">
            Click station for live departures
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
