/**
 * Favorites API Service
 * 
 * This service demonstrates safe HTTP POST, PUT, and DELETE operations
 * with proper security practices implemented.
 * 
 * LEARNING NOTES - HTTP Methods:
 * ================================
 * 
 * GET (Read):
 * - Safe: Doesn't modify data
 * - Idempotent: Same result on repeat calls
 * - Cacheable: Results can be cached
 * 
 * POST (Create):
 * - NOT Safe: Creates new data
 * - NOT Idempotent: Each call creates a new resource
 * - Use for: Creating new resources, form submissions
 * 
 * PUT (Update/Replace):
 * - NOT Safe: Modifies data
 * - Idempotent: Same data = same result on repeat
 * - Use for: Full update of existing resource
 * 
 * DELETE (Remove):
 * - NOT Safe: Removes data
 * - Idempotent: Deleting twice = resource still deleted
 * - Use for: Removing resources
 * 
 * SECURITY PRACTICES:
 * ===================
 * 1. Always use application/json Content-Type (prevents CSRF via forms)
 * 2. Include X-Requested-With header (signals this is an AJAX request)
 * 3. Validate inputs before sending
 * 4. Sanitize displayed data to prevent XSS
 * 5. Handle errors gracefully
 */

import { 
  Favorite, 
  CreateFavoriteRequest, 
  UpdateFavoriteRequest,
  FavoriteTrain,
  CreateFavoriteTrainRequest,
  UpdateFavoriteTrainRequest
} from '@/types/railway'

// API base URL - uses environment variable or falls back to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * Standard headers for all API requests.
 * 
 * SECURITY NOTES:
 * - Content-Type: application/json prevents CSRF attacks via form POST
 * - X-Requested-With signals this is an XMLHttpRequest (AJAX), not a form
 * - Accept specifies we expect JSON response
 */
const getHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest', // CSRF protection - forms can't set this
})

/**
 * API Response wrapper matching backend structure
 */
interface ApiResponse<T> {
  data: T
  meta?: {
    timestamp: string
    source: string
    note?: string
    total?: number
    count?: number
  }
  error?: {
    error: string
    message: string
    timestamp: string
  }
}

/**
 * Custom error class for API errors
 */
export class FavoritesApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'FavoritesApiError'
  }
}

/**
 * Handle API response and errors consistently
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json() as ApiResponse<T>
  
  if (!response.ok) {
    const errorMessage = data.error?.message || `HTTP ${response.status}`
    const errorCode = data.error?.error || 'UnknownError'
    throw new FavoritesApiError(response.status, errorCode, errorMessage)
  }
  
  return data.data
}

// ============================================================================
// GET - Read operations (safe, idempotent)
// ============================================================================

/**
 * Get all favorite stations.
 * 
 * HTTP Method: GET
 * - Safe operation (doesn't modify data)
 * - Idempotent (same result every time)
 * - Cacheable
 */
export async function getFavorites(): Promise<Favorite[]> {
  console.log('📥 GET /api/favorites - Fetching all favorites')
  
  const response = await fetch(`${API_BASE_URL}/api/favorites`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  return handleResponse<Favorite[]>(response)
}

/**
 * Get a specific favorite by ID.
 */
export async function getFavorite(id: string): Promise<Favorite> {
  console.log(`📥 GET /api/favorites/${id} - Fetching favorite`)
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  return handleResponse<Favorite>(response)
}

// ============================================================================
// POST - Create operation (not idempotent)
// ============================================================================

/**
 * Create a new favorite station.
 * 
 * HTTP Method: POST
 * - NOT safe (creates new data)
 * - NOT idempotent (each call creates a new resource)
 * - Returns 201 Created on success
 * - Returns 400 Bad Request for validation errors
 * - Returns 409 Conflict if station already favorited
 * 
 * SECURITY:
 * - Validates input before sending
 * - Uses JSON content type (CSRF protection)
 * - Includes X-Requested-With header
 * 
 * @example
 * const favorite = await createFavorite({
 *   stationId: '8507000',
 *   nickname: 'My Home Station',
 *   notes: 'Main station for daily commute'
 * })
 */
export async function createFavorite(request: CreateFavoriteRequest): Promise<Favorite> {
  console.log('📤 POST /api/favorites - Creating favorite', request)
  
  // CLIENT-SIDE VALIDATION (first line of defense)
  if (!request.stationId || request.stationId.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'stationId is required')
  }
  
  // Validate length limits
  if (request.nickname && request.nickname.length > 100) {
    throw new FavoritesApiError(400, 'ValidationError', 'Nickname must be 100 characters or less')
  }
  
  if (request.notes && request.notes.length > 500) {
    throw new FavoritesApiError(400, 'ValidationError', 'Notes must be 500 characters or less')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites`, {
    method: 'POST',  // <-- POST method for creating
    headers: getHeaders(),
    body: JSON.stringify({
      stationId: request.stationId.trim(),
      nickname: request.nickname?.trim() || '',
      notes: request.notes?.trim() || '',
    }),
  })
  
  return handleResponse<Favorite>(response)
}

// ============================================================================
// PUT - Update operation (idempotent)
// ============================================================================

/**
 * Update an existing favorite.
 * 
 * HTTP Method: PUT
 * - NOT safe (modifies data)
 * - Idempotent (same input = same result on repeat)
 * - Returns 200 OK on success
 * - Returns 404 Not Found if favorite doesn't exist
 * - Returns 400 Bad Request for validation errors
 * 
 * SECURITY:
 * - Validates input before sending
 * - Uses JSON content type (CSRF protection)
 * - ID is URL-encoded to prevent injection
 * 
 * @example
 * const updated = await updateFavorite('abc-123', {
 *   nickname: 'Updated Name',
 *   notes: 'New notes here'
 * })
 */
export async function updateFavorite(id: string, request: UpdateFavoriteRequest): Promise<Favorite> {
  console.log(`📝 PUT /api/favorites/${id} - Updating favorite`, request)
  
  // CLIENT-SIDE VALIDATION
  if (!id || id.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'Favorite ID is required')
  }
  
  if (request.nickname && request.nickname.length > 100) {
    throw new FavoritesApiError(400, 'ValidationError', 'Nickname must be 100 characters or less')
  }
  
  if (request.notes && request.notes.length > 500) {
    throw new FavoritesApiError(400, 'ValidationError', 'Notes must be 500 characters or less')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(id)}`, {
    method: 'PUT',  // <-- PUT method for updating
    headers: getHeaders(),
    body: JSON.stringify({
      nickname: request.nickname?.trim() || '',
      notes: request.notes?.trim() || '',
    }),
  })
  
  return handleResponse<Favorite>(response)
}

// ============================================================================
// DELETE - Remove operation (idempotent)
// ============================================================================

/**
 * Delete a favorite station.
 * 
 * HTTP Method: DELETE
 * - NOT safe (removes data)
 * - Idempotent (deleting twice = resource still gone)
 * - Returns 200 OK on success (with confirmation)
 * - Returns 404 Not Found if favorite doesn't exist
 * - Usually no request body needed
 * 
 * SECURITY:
 * - ID is URL-encoded to prevent injection
 * - Uses JSON content type for consistency
 * - Includes X-Requested-With header
 * 
 * @example
 * await deleteFavorite('abc-123')
 */
export async function deleteFavorite(id: string): Promise<{ deleted: boolean; id: string }> {
  console.log(`🗑️ DELETE /api/favorites/${id} - Deleting favorite`)
  
  // CLIENT-SIDE VALIDATION
  if (!id || id.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'Favorite ID is required')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(id)}`, {
    method: 'DELETE',  // <-- DELETE method for removing
    headers: getHeaders(),
    // Note: DELETE typically doesn't need a body
  })
  
  return handleResponse<{ deleted: boolean; id: string }>(response)
}

// ============================================================================
// UTILITY: Check if a station is already favorited
// ============================================================================

/**
 * Check if a station is already in favorites.
 * Useful for UI to show/hide "Add to Favorites" button.
 */
export async function isStationFavorited(stationId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites()
    return favorites.some(fav => fav.stationId === stationId)
  } catch {
    return false
  }
}

/**
 * Get favorite by station ID (if exists).
 */
export async function getFavoriteByStationId(stationId: string): Promise<Favorite | null> {
  try {
    const favorites = await getFavorites()
    return favorites.find(fav => fav.stationId === stationId) || null
  } catch {
    return null
  }
}

// ============================================================================
// FAVORITE TRAINS API - With Auto-Follow Feature
// ============================================================================

/**
 * Get all favorite trains.
 */
export async function getFavoriteTrains(): Promise<FavoriteTrain[]> {
  console.log('📥 GET /api/favorites/trains - Fetching all favorite trains')
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/trains`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  return handleResponse<FavoriteTrain[]>(response)
}

/**
 * Get a specific favorite train by ID.
 */
export async function getFavoriteTrain(id: string): Promise<FavoriteTrain> {
  console.log(`📥 GET /api/favorites/trains/${id} - Fetching favorite train`)
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/trains/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  return handleResponse<FavoriteTrain>(response)
}

/**
 * Create a new favorite train.
 * 
 * @param request - Train favorite details including auto-follow setting
 * @returns The created favorite train
 * 
 * @example
 * const favorite = await createFavoriteTrain({
 *   trainId: 'IC-123',
 *   nickname: 'My Commute Train',
 *   autoFollow: true  // Will auto-follow when selected
 * })
 */
export async function createFavoriteTrain(request: CreateFavoriteTrainRequest): Promise<FavoriteTrain> {
  console.log('📤 POST /api/favorites/trains - Creating favorite train', request)
  
  if (!request.trainId || request.trainId.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'trainId is required')
  }
  
  if (request.nickname && request.nickname.length > 100) {
    throw new FavoritesApiError(400, 'ValidationError', 'Nickname must be 100 characters or less')
  }
  
  if (request.notes && request.notes.length > 500) {
    throw new FavoritesApiError(400, 'ValidationError', 'Notes must be 500 characters or less')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/trains`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      trainId: request.trainId.trim(),
      nickname: request.nickname?.trim() || '',
      notes: request.notes?.trim() || '',
      autoFollow: request.autoFollow ?? true, // Default to true for trains
    }),
  })
  
  return handleResponse<FavoriteTrain>(response)
}

/**
 * Update an existing favorite train.
 */
export async function updateFavoriteTrain(id: string, request: UpdateFavoriteTrainRequest): Promise<FavoriteTrain> {
  console.log(`📝 PUT /api/favorites/trains/${id} - Updating favorite train`, request)
  
  if (!id || id.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'Favorite ID is required')
  }
  
  if (request.nickname && request.nickname.length > 100) {
    throw new FavoritesApiError(400, 'ValidationError', 'Nickname must be 100 characters or less')
  }
  
  if (request.notes && request.notes.length > 500) {
    throw new FavoritesApiError(400, 'ValidationError', 'Notes must be 500 characters or less')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/trains/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      nickname: request.nickname?.trim() || '',
      notes: request.notes?.trim() || '',
      autoFollow: request.autoFollow,
    }),
  })
  
  return handleResponse<FavoriteTrain>(response)
}

/**
 * Delete a favorite train.
 */
export async function deleteFavoriteTrain(id: string): Promise<{ deleted: boolean; id: string }> {
  console.log(`🗑️ DELETE /api/favorites/trains/${id} - Deleting favorite train`)
  
  if (!id || id.trim() === '') {
    throw new FavoritesApiError(400, 'ValidationError', 'Favorite ID is required')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/favorites/trains/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  return handleResponse<{ deleted: boolean; id: string }>(response)
}

/**
 * Check if a train is already favorited.
 */
export async function isTrainFavorited(trainId: string): Promise<boolean> {
  try {
    const favorites = await getFavoriteTrains()
    return favorites.some(fav => fav.trainId === trainId)
  } catch {
    return false
  }
}

/**
 * Get favorite by train ID (if exists).
 */
export async function getFavoriteByTrainId(trainId: string): Promise<FavoriteTrain | null> {
  try {
    const favorites = await getFavoriteTrains()
    return favorites.find(fav => fav.trainId === trainId) || null
  } catch {
    return null
  }
}
