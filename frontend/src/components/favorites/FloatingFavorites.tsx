'use client'

/**
 * FloatingFavorites Component
 * 
 * A unified, draggable UI for managing favorite stations and trains.
 * Features:
 * - DRAGGABLE - Can be moved anywhere on screen
 * - Add/Remove stations and trains
 * - Auto-follow train when selected (if enabled)
 * - PERSISTENT - Saves to localStorage (works offline)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Star, Train, MapPin, X, GripVertical, RotateCcw, 
  Plus, Trash2, Edit2, Heart, RefreshCw, AlertTriangle, Database
} from 'lucide-react'
import { Station, Train as TrainType, Favorite, FavoriteTrain } from '@/types/railway'
import {
  getStoredStationFavorites,
  getStoredTrainFavorites,
  addStationFavorite,
  addTrainFavorite,
  updateStationFavorite,
  updateTrainFavorite,
  deleteStationFavorite,
  deleteTrainFavorite
} from '@/services/favoritesStorage'
import { cn } from '@/lib/utils'

interface FloatingFavoritesProps {
  onStationSelect?: (station: Station) => void
  onTrainSelect?: (trainId: string) => void
  onAutoFollowTrain?: (trainId: string) => void
  currentTrains?: TrainType[]
  stationToAdd?: Station | null
  trainToAdd?: TrainType | null
  onStationAdded?: () => void
  onTrainAdded?: () => void
}

interface Position {
  x: number
  y: number
}

// Get saved position from localStorage
function getSavedPosition(): Position {
  if (typeof window === 'undefined') return { x: 16, y: -1 }
  try {
    const saved = localStorage.getItem('floating-favorites-position')
    if (saved) {
      const pos = JSON.parse(saved)
      if (pos.x >= 0 && pos.y >= 0 && 
          pos.x < window.innerWidth - 100 && 
          pos.y < window.innerHeight - 100) {
        return pos
      }
    }
  } catch {}
  return { x: 16, y: -1 }
}

export function FloatingFavorites({
  onStationSelect,
  onTrainSelect,
  onAutoFollowTrain,
  currentTrains = [],
  stationToAdd,
  trainToAdd,
  onStationAdded,
  onTrainAdded
}: FloatingFavoritesProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'stations' | 'trains'>('stations')
  const [favoriteStations, setFavoriteStations] = useState<Favorite[]>([])
  const [favoriteTrains, setFavoriteTrains] = useState<FavoriteTrain[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ nickname: '', notes: '', autoFollow: true })
  const [isAdding, setIsAdding] = useState(false)
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nickname: '', notes: '', autoFollow: true })
  
  // Dragging state
  const [position, setPosition] = useState<Position>(() => getSavedPosition())
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize position
  useEffect(() => {
    if (position.y === -1) {
      setPosition({ x: 16, y: window.innerHeight - 60 })
    }
  }, [position.y])

  // Save position
  useEffect(() => {
    if (position.y !== -1) {
      localStorage.setItem('floating-favorites-position', JSON.stringify(position))
    }
  }, [position])

  // Reset position
  const resetPosition = useCallback(() => {
    const defaultPos = { x: 16, y: window.innerHeight - 60 }
    setPosition(defaultPos)
    localStorage.removeItem('floating-favorites-position')
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setIsDragging(true)
      e.preventDefault()
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && e.touches.length === 1) {
      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      setDragOffset({ x: touch.clientX - rect.left, y: touch.clientY - rect.top })
      setIsDragging(true)
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y))
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 100, touch.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 50, touch.clientY - dragOffset.y))
        })
      }
    }

    const handleEnd = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, dragOffset])

  // Load favorites from localStorage
  const loadFavorites = useCallback(() => {
    setIsLoading(true)
    setError(null)
    try {
      const stations = getStoredStationFavorites()
      const trains = getStoredTrainFavorites()
      setFavoriteStations(stations)
      setFavoriteTrains(trains)
    } catch (err) {
      console.error('Error loading favorites:', err)
      setError('Failed to load favorites')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load favorites on mount and when expanded
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  useEffect(() => {
    if (isExpanded) {
      loadFavorites()
    }
  }, [isExpanded, loadFavorites])

  // Handle incoming station to add
  useEffect(() => {
    if (stationToAdd) {
      setIsExpanded(true)
      setActiveTab('stations')
      setShowAddForm(true)
      setAddForm({ nickname: '', notes: '', autoFollow: true })
    }
  }, [stationToAdd])

  // Handle incoming train to add
  useEffect(() => {
    if (trainToAdd) {
      setIsExpanded(true)
      setActiveTab('trains')
      setShowAddForm(true)
      setAddForm({ nickname: '', notes: '', autoFollow: true })
    }
  }, [trainToAdd])

  // Add station to favorites (localStorage)
  const handleAddStation = () => {
    if (!stationToAdd) return
    setIsAdding(true)
    setError(null)
    try {
      const newFav = addStationFavorite(
        stationToAdd,
        addForm.nickname.trim(),
        addForm.notes.trim()
      )
      setFavoriteStations(prev => [...prev, newFav])
      setShowAddForm(false)
      setAddForm({ nickname: '', notes: '', autoFollow: true })
      onStationAdded?.()
    } catch (err) {
      console.error('Error adding station:', err)
      setError('Failed to add station')
    } finally {
      setIsAdding(false)
    }
  }

  // Add train to favorites (localStorage)
  const handleAddTrain = () => {
    if (!trainToAdd) return
    setIsAdding(true)
    setError(null)
    try {
      const newFav = addTrainFavorite(
        trainToAdd,
        addForm.nickname.trim(),
        addForm.notes.trim(),
        addForm.autoFollow
      )
      setFavoriteTrains(prev => [...prev, newFav])
      setShowAddForm(false)
      setAddForm({ nickname: '', notes: '', autoFollow: true })
      onTrainAdded?.()
    } catch (err) {
      console.error('Error adding train:', err)
      setError('Failed to add train')
    } finally {
      setIsAdding(false)
    }
  }

  // Delete station favorite (localStorage)
  const handleDeleteStation = (id: string) => {
    try {
      deleteStationFavorite(id)
      setFavoriteStations(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Error deleting station:', err)
      setError('Failed to delete')
    }
  }

  // Delete train favorite (localStorage)
  const handleDeleteTrain = (id: string) => {
    try {
      deleteTrainFavorite(id)
      setFavoriteTrains(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error('Error deleting train:', err)
      setError('Failed to delete')
    }
  }

  // Update station favorite (localStorage)
  const handleUpdateStation = (id: string) => {
    try {
      const updated = updateStationFavorite(id, {
        nickname: editForm.nickname.trim(),
        notes: editForm.notes.trim()
      })
      if (updated) {
        setFavoriteStations(prev => prev.map(f => f.id === id ? updated : f))
      }
      setEditingId(null)
    } catch (err) {
      console.error('Error updating station:', err)
      setError('Failed to update')
    }
  }

  // Update train favorite (localStorage)
  const handleUpdateTrain = (id: string) => {
    try {
      const updated = updateTrainFavorite(id, {
        nickname: editForm.nickname.trim(),
        notes: editForm.notes.trim(),
        autoFollow: editForm.autoFollow
      })
      if (updated) {
        setFavoriteTrains(prev => prev.map(f => f.id === id ? updated : f))
      }
      setEditingId(null)
    } catch (err) {
      console.error('Error updating train:', err)
      setError('Failed to update')
    }
  }

  // Handle train click with auto-follow
  const handleTrainClick = (fav: FavoriteTrain) => {
    onTrainSelect?.(fav.trainId)
    if (fav.autoFollow) {
      onAutoFollowTrain?.(fav.trainId)
    }
  }

  // Check if train is active
  const isTrainActive = (trainId: string) => currentTrains.some(t => t.id === trainId)

  const totalCount = favoriteStations.length + favoriteTrains.length

  if (position.y === -1) return null

  return (
    <div 
      ref={containerRef}
      className={cn("fixed z-[1000]", isDragging && "cursor-grabbing select-none")}
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
    >
      {/* Collapsed State */}
      {!isExpanded && (
        <div className="flex items-center gap-1">
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={cn(
              "p-1.5 rounded-l-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-white/80 cursor-grab",
              isDragging && "cursor-grabbing"
            )}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <button
            onClick={() => !isDragging && setIsExpanded(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-r-full shadow-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-xl transition-all"
          >
            <Star className="w-5 h-5 fill-current" />
            <span className="font-medium">Favorites</span>
            {totalCount > 0 && (
              <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full">{totalCount}</span>
            )}
          </button>
        </div>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 overflow-hidden">
          {/* Header */}
          <div 
            className={cn(
              "bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 flex items-center justify-between",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="flex items-center gap-2 text-white">
              <GripVertical className="w-4 h-4 opacity-60" />
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold">Favorites</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={resetPosition} onMouseDown={e => e.stopPropagation()} className="p-1 text-white/70 hover:text-white">
                <RotateCcw className="w-3 h-3" />
              </button>
              <button onClick={() => { setIsExpanded(false); setShowAddForm(false); onStationAdded?.(); onTrainAdded?.(); }} onMouseDown={e => e.stopPropagation()} className="p-1 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('stations')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === 'stations' ? "text-yellow-600 border-b-2 border-yellow-500" : "text-gray-500"
              )}
            >
              <MapPin className="w-4 h-4" />
              <span>Stations ({favoriteStations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('trains')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === 'trains' ? "text-yellow-600 border-b-2 border-yellow-500" : "text-gray-500"
              )}
            >
              <Train className="w-4 h-4" />
              <span>Trains ({favoriteTrains.length})</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (activeTab === 'stations' ? stationToAdd : trainToAdd) && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add {activeTab === 'stations' ? 'Station' : 'Train'}
                </span>
                <button onClick={() => { setShowAddForm(false); onStationAdded?.(); onTrainAdded?.(); }} className="text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-2 bg-white dark:bg-gray-800 rounded mb-2">
                <div className="font-medium text-sm">
                  {activeTab === 'stations' ? stationToAdd?.name : trainToAdd?.name || trainToAdd?.id}
                </div>
                <div className="text-xs text-gray-500">
                  ID: {activeTab === 'stations' ? stationToAdd?.id : trainToAdd?.id}
                </div>
              </div>

              <input
                type="text"
                placeholder="Nickname (optional)"
                value={addForm.nickname}
                onChange={e => setAddForm(p => ({ ...p, nickname: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg mb-2 dark:bg-gray-800 dark:border-gray-600"
                maxLength={100}
              />
              <textarea
                placeholder="Notes (optional)"
                value={addForm.notes}
                onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg mb-2 dark:bg-gray-800 dark:border-gray-600 resize-none"
                rows={2}
                maxLength={500}
              />
              
              {activeTab === 'trains' && (
                <label className="flex items-center gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={addForm.autoFollow}
                    onChange={e => setAddForm(p => ({ ...p, autoFollow: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Auto-follow when selected</span>
                </label>
              )}

              <button
                onClick={activeTab === 'stations' ? handleAddStation : handleAddTrain}
                disabled={isAdding}
                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                {isAdding ? 'Adding...' : 'Add to Favorites'}
              </button>
            </div>
          )}

          {/* Content */}
          <div className="max-h-64 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : activeTab === 'stations' ? (
              favoriteStations.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No favorite stations</p>
                  <p className="text-xs mt-1">Click ⭐ on a station to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteStations.map(fav => (
                    <div key={fav.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {editingId === fav.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.nickname}
                            onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                            placeholder="Nickname"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-600"
                          />
                          <textarea
                            value={editForm.notes}
                            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Notes"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-600 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateStation(fav.id)} className="flex-1 py-1 bg-yellow-500 text-white rounded text-xs">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => onStationSelect?.(fav.station)}>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="font-medium text-sm">{fav.nickname || fav.station?.name}</span>
                            </div>
                            {fav.nickname && <div className="text-xs text-gray-500">{fav.station?.name}</div>}
                            {fav.notes && <div className="text-xs text-gray-400 italic mt-1">{fav.notes}</div>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingId(fav.id); setEditForm({ nickname: fav.nickname || '', notes: fav.notes || '', autoFollow: true }); }} className="p-1 text-gray-400 hover:text-yellow-600">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteStation(fav.id)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              favoriteTrains.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No favorite trains</p>
                  <p className="text-xs mt-1">Click ⭐ on a train to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favoriteTrains.map(fav => (
                    <div key={fav.id} className={cn(
                      "p-2 rounded-lg",
                      isTrainActive(fav.trainId) ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gray-800"
                    )}>
                      {editingId === fav.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.nickname}
                            onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                            placeholder="Nickname"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-600"
                          />
                          <textarea
                            value={editForm.notes}
                            onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Notes"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-900 dark:border-gray-600 resize-none"
                            rows={2}
                          />
                          <label className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={editForm.autoFollow} onChange={e => setEditForm(p => ({ ...p, autoFollow: e.target.checked }))} />
                            Auto-follow
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateTrain(fav.id)} className="flex-1 py-1 bg-yellow-500 text-white rounded text-xs">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => handleTrainClick(fav)}>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="font-medium text-sm">{fav.nickname || fav.trainId}</span>
                              {fav.autoFollow && <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">auto</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {isTrainActive(fav.trainId) ? <span className="text-green-600">● Active</span> : 'Not visible'}
                            </div>
                            {fav.notes && <div className="text-xs text-gray-400 italic mt-1">{fav.notes}</div>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingId(fav.id); setEditForm({ nickname: fav.nickname || '', notes: fav.notes || '', autoFollow: fav.autoFollow }); }} className="p-1 text-gray-400 hover:text-yellow-600">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteTrain(fav.id)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Database className="w-3 h-3" />
              <span>localStorage</span>
            </div>
            <button onClick={loadFavorites} disabled={isLoading} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
              Reload
            </button>
          </div>
        </div>
      )}

      {isDragging && <div className="fixed inset-0 z-[-1] bg-black/5 pointer-events-none" />}
    </div>
  )
}
