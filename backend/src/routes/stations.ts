import { Router } from 'express'

const router = Router()

// Mock station data - this will be replaced with real SBB API integration
const mockStations = [
  {
    id: 'zurich-hb',
    name: 'Zürich HB',
    coordinate: { x: 8.5417, y: 47.3769 },
    distance: 0,
    type: 'major_hub',
    canton: 'ZH',
    facilities: ['wifi', 'shops', 'restaurants', 'parking', 'elevators']
  },
  {
    id: 'bern',
    name: 'Bern',
    coordinate: { x: 7.4474, y: 46.9481 },
    distance: 0,
    type: 'major_hub',
    canton: 'BE',
    facilities: ['wifi', 'shops', 'restaurants', 'parking', 'elevators']
  },
  {
    id: 'geneva',
    name: 'Genève',
    coordinate: { x: 6.1432, y: 46.2044 },
    distance: 0,
    type: 'major_hub',
    canton: 'GE',
    facilities: ['wifi', 'shops', 'restaurants', 'parking', 'elevators']
  },
  {
    id: 'basel-sbb',
    name: 'Basel SBB',
    coordinate: { x: 7.5893, y: 47.5479 },
    distance: 0,
    type: 'major_hub',
    canton: 'BS',
    facilities: ['wifi', 'shops', 'restaurants', 'parking', 'elevators']
  },
  {
    id: 'lausanne',
    name: 'Lausanne',
    coordinate: { x: 6.6323, y: 46.5197 },
    distance: 0,
    type: 'major_hub',
    canton: 'VD',
    facilities: ['wifi', 'shops', 'restaurants', 'parking', 'elevators']
  },
  {
    id: 'winterthur',
    name: 'Winterthur',
    coordinate: { x: 8.7233, y: 47.5022 },
    distance: 0,
    type: 'regional',
    canton: 'ZH',
    facilities: ['wifi', 'shops', 'parking']
  },
  {
    id: 'st-gallen',
    name: 'St. Gallen',
    coordinate: { x: 9.3767, y: 47.4236 },
    distance: 0,
    type: 'regional',
    canton: 'SG',
    facilities: ['wifi', 'shops', 'restaurants', 'parking']
  },
  {
    id: 'lucerne',
    name: 'Luzern',
    coordinate: { x: 8.3103, y: 47.0502 },
    distance: 0,
    type: 'regional',
    canton: 'LU',
    facilities: ['wifi', 'shops', 'restaurants', 'parking']
  }
]

// Mock departure board data
const generateDepartures = (stationId: string) => {
  const now = new Date()
  const departures = []
  
  for (let i = 0; i < 10; i++) {
    const departureTime = new Date(now.getTime() + (i * 15 + Math.random() * 10) * 60000)
    const delay = Math.random() < 0.3 ? Math.floor(Math.random() * 8) : 0
    
    departures.push({
      id: `dep-${stationId}-${i}`,
      name: `${['IC', 'S', 'RE', 'IR'][Math.floor(Math.random() * 4)]} ${Math.floor(Math.random() * 900) + 100}`,
      category: ['IC', 'S', 'RE', 'IR'][Math.floor(Math.random() * 4)],
      to: ['Zürich HB', 'Bern', 'Basel SBB', 'Genève', 'Lausanne', 'St. Gallen'][Math.floor(Math.random() * 6)],
      platform: `${Math.floor(Math.random() * 12) + 1}${Math.random() < 0.3 ? 'A' : ''}`,
      departure: departureTime.toISOString(),
      delay,
      cancelled: Math.random() < 0.05,
      operator: 'SBB'
    })
  }
  
  return departures.sort((a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime())
}

// Get all stations
router.get('/', (req, res) => {
  const { type, canton, facilities, limit } = req.query
  
  let filteredStations = [...mockStations]
  
  // Filter by type
  if (type && typeof type === 'string') {
    filteredStations = filteredStations.filter(station => 
      station.type === type
    )
  }
  
  // Filter by canton
  if (canton && typeof canton === 'string') {
    filteredStations = filteredStations.filter(station => 
      station.canton.toLowerCase() === canton.toLowerCase()
    )
  }
  
  // Filter by facilities
  if (facilities && typeof facilities === 'string') {
    const requiredFacilities = facilities.split(',')
    filteredStations = filteredStations.filter(station => 
      requiredFacilities.every(facility => station.facilities.includes(facility.trim()))
    )
  }
  
  // Limit results
  if (limit && typeof limit === 'string') {
    const limitNum = parseInt(limit, 10)
    if (!isNaN(limitNum) && limitNum > 0) {
      filteredStations = filteredStations.slice(0, limitNum)
    }
  }
  
  res.json({
    data: filteredStations,
    meta: {
      total: filteredStations.length,
      timestamp: new Date().toISOString(),
      source: 'mock_data',
      filters: { type, canton, facilities, limit }
    }
  })
})

// Get specific station by ID
router.get('/:id', (req, res) => {
  const { id } = req.params
  const station = mockStations.find(s => s.id === id)
  
  if (!station) {
    return res.status(404).json({
      error: 'Station not found',
      message: `Station with ID ${id} does not exist`,
      timestamp: new Date().toISOString()
    })
  }
  
  res.json({
    data: station,
    meta: {
      timestamp: new Date().toISOString(),
      source: 'mock_data'
    }
  })
})

// Get station departure board
router.get('/:id/departures', (req, res) => {
  const { id } = req.params
  const station = mockStations.find(s => s.id === id)
  
  if (!station) {
    return res.status(404).json({
      error: 'Station not found',
      message: `Station with ID ${id} does not exist`,
      timestamp: new Date().toISOString()
    })
  }
  
  const departures = generateDepartures(id)
  
  res.json({
    data: {
      station,
      departures
    },
    meta: {
      timestamp: new Date().toISOString(),
      source: 'mock_data',
      note: 'Real-time departure data simulation'
    }
  })
})

// Search stations by name or location
router.get('/search/:query', (req, res) => {
  const { query } = req.params
  const searchTerm = query.toLowerCase()
  
  const results = mockStations.filter(station => 
    station.name.toLowerCase().includes(searchTerm) ||
    station.id.toLowerCase().includes(searchTerm) ||
    station.canton.toLowerCase().includes(searchTerm)
  )
  
  res.json({
    data: results,
    meta: {
      query: searchTerm,
      total: results.length,
      timestamp: new Date().toISOString(),
      source: 'mock_data'
    }
  })
})

// Get stations by proximity (mock implementation)
router.get('/nearby/:lat/:lng', (req, res) => {
  const { lat, lng } = req.params
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : 10
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      message: 'Latitude and longitude must be valid numbers',
      timestamp: new Date().toISOString()
    })
  }
  
  // Simple distance calculation (Haversine formula approximation)
  const stationsWithDistance = mockStations.map(station => {
    const R = 6371 // Earth's radius in km
    const dLat = (station.coordinate.y - latitude) * Math.PI / 180
    const dLng = (station.coordinate.x - longitude) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(station.coordinate.y * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    
    return {
      ...station,
      distance: Math.round(distance * 100) / 100
    }
  })
  
  const nearbyStations = stationsWithDistance
    .filter(station => station.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
  
  res.json({
    data: nearbyStations,
    meta: {
      center: { lat: latitude, lng: longitude },
      radius,
      total: nearbyStations.length,
      timestamp: new Date().toISOString(),
      source: 'mock_data'
    }
  })
})

export default router
