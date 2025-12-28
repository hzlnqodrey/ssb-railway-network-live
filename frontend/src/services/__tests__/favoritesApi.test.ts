/**
 * Unit tests for favoritesApi service
 * Tests API communication for favorites functionality
 */

import {
  getFavorites,
  getFavorite,
  createFavorite,
  updateFavorite,
  deleteFavorite,
  isStationFavorited,
  getFavoriteByStationId,
  getFavoriteTrains,
  getFavoriteTrain,
  createFavoriteTrain,
  updateFavoriteTrain,
  deleteFavoriteTrain,
  isTrainFavorited,
  getFavoriteByTrainId,
  FavoritesApiError,
} from '../favoritesApi'
import { Station, Train, Favorite, FavoriteTrain } from '@/types/railway'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods
const consoleLog = console.log
beforeAll(() => {
  console.log = jest.fn()
})

afterAll(() => {
  console.log = consoleLog
})

describe('Station Favorites API', () => {
  const mockStation: Station = {
    id: '8507000',
    name: 'Zürich HB',
    latitude: 47.378177,
    longitude: 8.540192,
    score: 100,
  }

  const mockFavorite: Favorite = {
    id: 'fav-123',
    stationId: mockStation.id,
    station: mockStation,
    nickname: 'My Station',
    notes: 'My Notes',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  describe('getFavorites', () => {
    it('should fetch all favorites successfully', async () => {
      const mockResponse = {
        data: [mockFavorite],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavorites()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual([mockFavorite])
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        error: { error: 'ServerError', message: 'Internal server error', timestamp: '2024-01-01T00:00:00.000Z' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      } as Response)

      await expect(getFavorites()).rejects.toThrow(FavoritesApiError)
    })
  })

  describe('getFavorite', () => {
    it('should fetch specific favorite by ID', async () => {
      const mockResponse = {
        data: mockFavorite,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavorite('fav-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites/fav-123',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockFavorite)
    })

    it('should URL-encode the favorite ID', async () => {
      const mockResponse = {
        data: mockFavorite,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      await getFavorite('fav with spaces')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites/fav%20with%20spaces',
        expect.any(Object)
      )
    })
  })

  describe('createFavorite', () => {
    it('should create new favorite', async () => {
      const mockResponse = {
        data: mockFavorite,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Created' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      } as Response)

      const request = {
        stationId: mockStation.id,
        nickname: 'My Station',
        notes: 'My Notes',
      }

      const result = await createFavorite(request)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            stationId: mockStation.id,
            nickname: 'My Station',
            notes: 'My Notes',
          }),
        })
      )
      expect(result).toEqual(mockFavorite)
    })

    it('should validate stationId is present', async () => {
      await expect(createFavorite({ stationId: '' })).rejects.toThrow('stationId is required')
      await expect(createFavorite({ stationId: '   ' })).rejects.toThrow('stationId is required')
    })

    it('should validate nickname length', async () => {
      const longNickname = 'a'.repeat(101)

      await expect(
        createFavorite({ stationId: mockStation.id, nickname: longNickname })
      ).rejects.toThrow('Nickname must be 100 characters or less')
    })

    it('should validate notes length', async () => {
      const longNotes = 'a'.repeat(501)

      await expect(createFavorite({ stationId: mockStation.id, notes: longNotes })).rejects.toThrow(
        'Notes must be 500 characters or less'
      )
    })

    it('should trim whitespace from inputs', async () => {
      const mockResponse = {
        data: mockFavorite,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      } as Response)

      await createFavorite({
        stationId: '  8507000  ',
        nickname: '  My Station  ',
        notes: '  My Notes  ',
      })

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.stationId).toBe('8507000')
      expect(body.nickname).toBe('My Station')
      expect(body.notes).toBe('My Notes')
    })

    it('should handle conflict error (409)', async () => {
      const mockResponse = {
        error: { error: 'Conflict', message: 'Station is already in favorites', timestamp: '2024-01-01T00:00:00.000Z' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse,
      } as Response)

      await expect(createFavorite({ stationId: mockStation.id })).rejects.toThrow(FavoritesApiError)
    })
  })

  describe('updateFavorite', () => {
    it('should update existing favorite', async () => {
      const updatedFavorite = { ...mockFavorite, nickname: 'Updated Name' }
      const mockResponse = {
        data: updatedFavorite,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Updated' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await updateFavorite('fav-123', { nickname: 'Updated Name' })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites/fav-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ nickname: 'Updated Name', notes: '' }),
        })
      )
      expect(result.nickname).toBe('Updated Name')
    })

    it('should validate favorite ID', async () => {
      await expect(updateFavorite('', { nickname: 'Test' })).rejects.toThrow('Favorite ID is required')
      await expect(updateFavorite('   ', { nickname: 'Test' })).rejects.toThrow('Favorite ID is required')
    })

    it('should validate nickname length', async () => {
      const longNickname = 'a'.repeat(101)

      await expect(updateFavorite('fav-123', { nickname: longNickname })).rejects.toThrow(
        'Nickname must be 100 characters or less'
      )
    })

    it('should validate notes length', async () => {
      const longNotes = 'a'.repeat(501)

      await expect(updateFavorite('fav-123', { notes: longNotes })).rejects.toThrow(
        'Notes must be 500 characters or less'
      )
    })

    it('should handle not found error (404)', async () => {
      const mockResponse = {
        error: { error: 'Not Found', message: 'Favorite not found', timestamp: '2024-01-01T00:00:00.000Z' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockResponse,
      } as Response)

      await expect(updateFavorite('non-existent', { nickname: 'Test' })).rejects.toThrow(FavoritesApiError)
    })
  })

  describe('deleteFavorite', () => {
    it('should delete favorite', async () => {
      const mockResponse = {
        data: { deleted: true, id: 'fav-123' },
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Deleted' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await deleteFavorite('fav-123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites/fav-123',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result.deleted).toBe(true)
      expect(result.id).toBe('fav-123')
    })

    it('should validate favorite ID', async () => {
      await expect(deleteFavorite('')).rejects.toThrow('Favorite ID is required')
    })

    it('should handle not found error', async () => {
      const mockResponse = {
        error: { error: 'Not Found', message: 'Favorite not found', timestamp: '2024-01-01T00:00:00.000Z' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockResponse,
      } as Response)

      await expect(deleteFavorite('non-existent')).rejects.toThrow(FavoritesApiError)
    })
  })

  describe('isStationFavorited', () => {
    it('should return true when station is favorited', async () => {
      const mockResponse = {
        data: [mockFavorite],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await isStationFavorited(mockStation.id)

      expect(result).toBe(true)
    })

    it('should return false when station is not favorited', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, count: 0, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await isStationFavorited(mockStation.id)

      expect(result).toBe(false)
    })

    it('should return false on API error', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await isStationFavorited(mockStation.id)

      expect(result).toBe(false)
    })
  })

  describe('getFavoriteByStationId', () => {
    it('should return favorite when found', async () => {
      const mockResponse = {
        data: [mockFavorite],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavoriteByStationId(mockStation.id)

      expect(result).toEqual(mockFavorite)
    })

    it('should return null when not found', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, count: 0, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavoriteByStationId('non-existent')

      expect(result).toBeNull()
    })

    it('should return null on API error', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getFavoriteByStationId(mockStation.id)

      expect(result).toBeNull()
    })
  })
})

describe('Train Favorites API', () => {
  const mockTrain: Train = {
    id: 'IC-123',
    name: 'IC 123',
    category: 'IC',
    lastStopId: '8507000',
    runsForDate: '2024-01-01',
  }

  const mockFavoriteTrain: FavoriteTrain = {
    id: 'fav-train-123',
    trainId: mockTrain.id,
    train: mockTrain,
    nickname: 'My Train',
    notes: 'My Notes',
    autoFollow: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  describe('getFavoriteTrains', () => {
    it('should fetch all favorite trains', async () => {
      const mockResponse = {
        data: [mockFavoriteTrain],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavoriteTrains()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/favorites/trains',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual([mockFavoriteTrain])
    })
  })

  describe('createFavoriteTrain', () => {
    it('should create new favorite train', async () => {
      const mockResponse = {
        data: mockFavoriteTrain,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Created' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      } as Response)

      const request = {
        trainId: mockTrain.id,
        nickname: 'My Train',
        notes: 'My Notes',
        autoFollow: true,
      }

      const result = await createFavoriteTrain(request)

      expect(result).toEqual(mockFavoriteTrain)
    })

    it('should validate trainId is present', async () => {
      await expect(createFavoriteTrain({ trainId: '' })).rejects.toThrow('trainId is required')
    })

    it('should default autoFollow to true', async () => {
      const mockResponse = {
        data: mockFavoriteTrain,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      } as Response)

      await createFavoriteTrain({ trainId: mockTrain.id })

      const fetchCall = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.autoFollow).toBe(true)
    })
  })

  describe('updateFavoriteTrain', () => {
    it('should update existing favorite train', async () => {
      const updated = { ...mockFavoriteTrain, autoFollow: false }
      const mockResponse = {
        data: updated,
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Updated' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await updateFavoriteTrain('fav-train-123', { autoFollow: false })

      expect(result.autoFollow).toBe(false)
    })

    it('should validate favorite ID', async () => {
      await expect(updateFavoriteTrain('', { autoFollow: false })).rejects.toThrow('Favorite ID is required')
    })
  })

  describe('deleteFavoriteTrain', () => {
    it('should delete favorite train', async () => {
      const mockResponse = {
        data: { deleted: true, id: 'fav-train-123' },
        meta: { timestamp: '2024-01-01T00:00:00.000Z', source: 'test', note: 'Deleted' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await deleteFavoriteTrain('fav-train-123')

      expect(result.deleted).toBe(true)
    })
  })

  describe('isTrainFavorited', () => {
    it('should return true when train is favorited', async () => {
      const mockResponse = {
        data: [mockFavoriteTrain],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await isTrainFavorited(mockTrain.id)

      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await isTrainFavorited(mockTrain.id)

      expect(result).toBe(false)
    })
  })

  describe('getFavoriteByTrainId', () => {
    it('should return favorite when found', async () => {
      const mockResponse = {
        data: [mockFavoriteTrain],
        meta: { total: 1, count: 1, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavoriteByTrainId(mockTrain.id)

      expect(result).toEqual(mockFavoriteTrain)
    })

    it('should return null when not found', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, count: 0, timestamp: '2024-01-01T00:00:00.000Z', source: 'test' },
      }

      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await getFavoriteByTrainId('non-existent')

      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getFavoriteByTrainId(mockTrain.id)

      expect(result).toBeNull()
    })
  })
})
