'use client'

/**
 * SwissTimePanel Component
 * 
 * A draggable floating panel showing Swiss time, train count, and status.
 * Can be moved anywhere on the screen.
 */

import { GripVertical, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraggable } from '@/hooks/useDraggable'

interface SwissTimePanelProps {
  swissTime: string
  swissDate: string
  trainsCount: number
  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  isRealtimeEnabled: boolean
  followedTrainId: string | null
  routeTrainId: string | null
}

export function SwissTimePanel({
  swissTime,
  swissDate,
  trainsCount,
  timeMultiplier,
  setTimeMultiplier,
  isRealtimeEnabled,
  followedTrainId,
  routeTrainId
}: SwissTimePanelProps) {
  // Draggable functionality
  const {
    position,
    isDragging,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
    isInitialized
  } = useDraggable({
    storageKey: 'swiss-time-panel-position',
    defaultPosition: { x: 16, y: 16 },
    rightRelative: true
  })

  // Don't render until position is initialized
  if (!isInitialized) return null

  return (
    <div 
      ref={containerRef}
      className={cn(
        "fixed z-[1000]",
        isDragging && "cursor-grabbing select-none"
      )}
      style={{
        left: position.x,
        top: position.y,
        touchAction: 'none'
      }}
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[140px]">
        {/* Drag Handle Header */}
        <div 
          className={cn(
            "flex items-center justify-between px-3 py-1.5 bg-red-600 text-white",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 opacity-70" />
            <span className="text-xs font-medium">🇨🇭 Swiss Time</span>
          </div>
          <button
            onClick={resetPosition}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-0.5 text-white/70 hover:text-white transition-colors"
            title="Reset position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 text-center">
          {/* Current Swiss Time */}
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {swissTime}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {swissDate}
          </div>
          
          {/* Train Count */}
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
            {trainsCount} trains
          </div>
          
          {/* Time Multiplier Control */}
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            <span>Speed: </span>
            <select 
              className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              value={timeMultiplier}
              onChange={(e) => setTimeMultiplier(Number(e.target.value))}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <option value={1}>1x (Real-time)</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
              <option value={20}>20x</option>
              <option value={50}>50x</option>
              <option value={100}>100x</option>
            </select>
          </div>

          {/* Live Status */}
          <div className={cn(
            "flex items-center justify-center space-x-1 mt-3 px-2 py-1 rounded-full text-xs font-medium",
            isRealtimeEnabled 
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isRealtimeEnabled ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
            <span>{isRealtimeEnabled ? 'Live' : 'Paused'}</span>
          </div>

          {/* Following Indicator */}
          {followedTrainId && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
              <span className="animate-pulse">📍</span>
              <span>Following</span>
            </div>
          )}

          {/* Route Indicator */}
          {routeTrainId && (
            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
              <span>🛤️</span>
              <span>Route shown</span>
            </div>
          )}

          {/* Data Source */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            Swiss GTFS Timetable
          </div>
        </div>
      </div>

      {/* Drag indicator overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[-1] bg-black/5 pointer-events-none" />
      )}
    </div>
  )
}
