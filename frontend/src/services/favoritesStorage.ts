/**
 * Favorites Storage Service
 * 
 * Provides localStorage-based persistence for favorites with optional backend sync.
 * This ensures favorites persist even when backend is unavailable.
 * 
 * Storage Strategy:
 * 1. Primary: localStorage (immediate, works offline)
 * 2. Secondary: Backend API (for cross-device sync, future Supabase integration)
 */

import { Station, Train, Favorite, FavoriteTrain } from '@/types/railway'

const STORAGE_KEYS = {
  STATIONS: 'swiss-railway-favorites-stations',
  TRAINS: 'swiss-railway-favorites-trains'
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get current timestamp
function getTimestamp(): string {
  return new Date().toISOString()
}

// ==================== Station Favorites ====================

export function getStoredStationFavorites(): Favorite[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATIONS)
    return stored ? JSON.parse(stored) : []
  } catch (err) {
    console.error('Error reading station favorites from localStorage:', err)
    return []
  }
}

export function saveStationFavorites(favorites: Favorite[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(favorites))
  } catch (err) {
    console.error('Error saving station favorites to localStorage:', err)
  }
}

export function addStationFavorite(
  station: Station,
  nickname?: string,
  notes?: string
): Favorite {
  const favorites = getStoredStationFavorites()
  
  // Check if already exists
  const existing = favorites.find(f => f.stationId === station.id)
  if (existing) {
    return existing
  }
  
  const newFavorite: Favorite = {
    id: generateId(),
    stationId: station.id,
    station: station,
    nickname: nickname?.trim() || undefined,
    notes: notes?.trim() || undefined,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  }
  
  favorites.push(newFavorite)
  saveStationFavorites(favorites)
  
  return newFavorite
}

export function updateStationFavorite(
  id: string,
  updates: { nickname?: string; notes?: string }
): Favorite | null {
  const favorites = getStoredStationFavorites()
  const index = favorites.findIndex(f => f.id === id)
  
  if (index === -1) return null
  
  favorites[index] = {
    ...favorites[index],
    nickname: updates.nickname?.trim() || undefined,
    notes: updates.notes?.trim() || undefined,
    updatedAt: getTimestamp()
  }
  
  saveStationFavorites(favorites)
  return favorites[index]
}

export function deleteStationFavorite(id: string): boolean {
  const favorites = getStoredStationFavorites()
  const filtered = favorites.filter(f => f.id !== id)
  
  if (filtered.length === favorites.length) return false
  
  saveStationFavorites(filtered)
  return true
}

export function isStationFavorited(stationId: string): boolean {
  const favorites = getStoredStationFavorites()
  return favorites.some(f => f.stationId === stationId)
}

// ==================== Train Favorites ====================

export function getStoredTrainFavorites(): FavoriteTrain[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TRAINS)
    return stored ? JSON.parse(stored) : []
  } catch (err) {
    console.error('Error reading train favorites from localStorage:', err)
    return []
  }
}

export function saveTrainFavorites(favorites: FavoriteTrain[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.TRAINS, JSON.stringify(favorites))
  } catch (err) {
    console.error('Error saving train favorites to localStorage:', err)
  }
}

export function addTrainFavorite(
  train: Train,
  nickname?: string,
  notes?: string,
  autoFollow: boolean = true
): FavoriteTrain {
  const favorites = getStoredTrainFavorites()
  
  // Check if already exists
  const existing = favorites.find(f => f.trainId === train.id)
  if (existing) {
    return existing
  }
  
  const newFavorite: FavoriteTrain = {
    id: generateId(),
    trainId: train.id,
    train: train,
    nickname: nickname?.trim() || undefined,
    notes: notes?.trim() || undefined,
    autoFollow: autoFollow,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp()
  }
  
  favorites.push(newFavorite)
  saveTrainFavorites(favorites)
  
  return newFavorite
}

export function updateTrainFavorite(
  id: string,
  updates: { nickname?: string; notes?: string; autoFollow?: boolean }
): FavoriteTrain | null {
  const favorites = getStoredTrainFavorites()
  const index = favorites.findIndex(f => f.id === id)
  
  if (index === -1) return null
  
  favorites[index] = {
    ...favorites[index],
    nickname: updates.nickname?.trim() || undefined,
    notes: updates.notes?.trim() || undefined,
    autoFollow: updates.autoFollow ?? favorites[index].autoFollow,
    updatedAt: getTimestamp()
  }
  
  saveTrainFavorites(favorites)
  return favorites[index]
}

export function deleteTrainFavorite(id: string): boolean {
  const favorites = getStoredTrainFavorites()
  const filtered = favorites.filter(f => f.id !== id)
  
  if (filtered.length === favorites.length) return false
  
  saveTrainFavorites(filtered)
  return true
}

export function isTrainFavorited(trainId: string): boolean {
  const favorites = getStoredTrainFavorites()
  return favorites.some(f => f.trainId === trainId)
}

// ==================== Utility Functions ====================

export function clearAllFavorites(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.STATIONS)
  localStorage.removeItem(STORAGE_KEYS.TRAINS)
}

export function exportFavorites(): { stations: Favorite[]; trains: FavoriteTrain[] } {
  return {
    stations: getStoredStationFavorites(),
    trains: getStoredTrainFavorites()
  }
}

export function importFavorites(data: { stations?: Favorite[]; trains?: FavoriteTrain[] }): void {
  if (data.stations) {
    saveStationFavorites(data.stations)
  }
  if (data.trains) {
    saveTrainFavorites(data.trains)
  }
}
