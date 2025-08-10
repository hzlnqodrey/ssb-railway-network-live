import { Router } from 'express'

const router = Router()

// Mock train data - this will be replaced with real SBB API integration
const mockTrains = [
  {
    id: 'IC-1-001',
    name: 'IC 1',
    category: 'IC',
    number: '1',
    line: 'IC1',
    operator: 'SBB',
    to: 'St. Gallen',
    currentStation: {
      id: 'zurich-hb',
      name: 'Zürich HB',
      coordinate: { x: 8.5417, y: 47.3769 }
    },
    nextStation: {
      id: 'winterthur',
      name: 'Winterthur',
      coordinate: { x: 8.7233, y: 47.5022 }
    },
    position: { lat: 47.3769, lng: 8.5417 },
    delay: 2,
    cancelled: false,
    occupancy: {
      firstClass: 35,
      secondClass: 68
    },
    speed: 85,
    direction: 45,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'S-3-002',
    name: 'S 3',
    category: 'S',
    number: '3',
    line: 'S3',
    operator: 'SBB',
    to: 'Pfäffikon SZ',
    currentStation: {
      id: 'bern',
      name: 'Bern',
      coordinate: { x: 7.4474, y: 46.9481 }
    },
    position: { lat: 46.9481, lng: 7.4474 },
    delay: 0,
    cancelled: false,
    occupancy: {
      firstClass: 15,
      secondClass: 42
    },
    speed: 45,
    direction: 120,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'RE-456-003',
    name: 'RE 456',
    category: 'RE',
    number: '456',
    operator: 'SBB',
    to: 'Basel SBB',
    currentStation: {
      id: 'lausanne',
      name: 'Lausanne',
      coordinate: { x: 6.6323, y: 46.5197 }
    },
    nextStation: {
      id: 'morges',
      name: 'Morges',
      coordinate: { x: 6.4987, y: 46.5119 }
    },
    position: { lat: 46.5197, lng: 6.6323 },
    delay: 5,
    cancelled: false,
    occupancy: {
      firstClass: 28,
      secondClass: 73
    },
    speed: 72,
    direction: 280,
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'ICE-374-004',
    name: 'ICE 374',
    category: 'ICE',
    number: '374',
    operator: 'DB',
    to: 'München Hbf',
    currentStation: {
      id: 'basel-sbb',
      name: 'Basel SBB',
      coordinate: { x: 7.5893, y: 47.5479 }
    },
    position: { lat: 47.5479, lng: 7.5893 },
    delay: 0,
    cancelled: false,
    occupancy: {
      firstClass: 41,
      secondClass: 59
    },
    speed: 120,
    direction: 45,
    lastUpdate: new Date().toISOString()
  }
]

// Get all trains
router.get('/', (req, res) => {
  const { category, operator, delayed, limit } = req.query
  
  let filteredTrains = [...mockTrains]
  
  // Filter by category
  if (category && typeof category === 'string') {
    filteredTrains = filteredTrains.filter(train => 
      train.category.toLowerCase() === category.toLowerCase()
    )
  }
  
  // Filter by operator
  if (operator && typeof operator === 'string') {
    filteredTrains = filteredTrains.filter(train => 
      train.operator.toLowerCase() === operator.toLowerCase()
    )
  }
  
  // Filter delayed trains
  if (delayed === 'true') {
    filteredTrains = filteredTrains.filter(train => train.delay > 0)
  }
  
  // Limit results
  if (limit && typeof limit === 'string') {
    const limitNum = parseInt(limit, 10)
    if (!isNaN(limitNum) && limitNum > 0) {
      filteredTrains = filteredTrains.slice(0, limitNum)
    }
  }
  
  res.json({
    data: filteredTrains,
    meta: {
      total: filteredTrains.length,
      timestamp: new Date().toISOString(),
      source: 'mock_data',
      filters: { category, operator, delayed, limit }
    }
  })
})

// Get specific train by ID
router.get('/:id', (req, res) => {
  const { id } = req.params
  const train = mockTrains.find(t => t.id === id)
  
  if (!train) {
    return res.status(404).json({
      error: 'Train not found',
      message: `Train with ID ${id} does not exist`,
      timestamp: new Date().toISOString()
    })
  }
  
  res.json({
    data: train,
    meta: {
      timestamp: new Date().toISOString(),
      source: 'mock_data'
    }
  })
})

// Get live positions (WebSocket endpoint simulation)
router.get('/live', (req, res) => {
  // Simulate real-time position updates by adding small random variations
  const liveTrains = mockTrains.map(train => ({
    ...train,
    position: {
      lat: train.position.lat + (Math.random() - 0.5) * 0.001,
      lng: train.position.lng + (Math.random() - 0.5) * 0.001
    },
    speed: train.speed + Math.floor((Math.random() - 0.5) * 10),
    lastUpdate: new Date().toISOString()
  }))
  
  res.json({
    data: liveTrains,
    meta: {
      timestamp: new Date().toISOString(),
      source: 'mock_data',
      updateInterval: 5000,
      note: 'Use WebSocket /ws for real-time updates'
    }
  })
})

// Get train statistics
router.get('/stats/summary', (req, res) => {
  const stats = {
    total: mockTrains.length,
    byCategory: mockTrains.reduce((acc, train) => {
      acc[train.category] = (acc[train.category] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byOperator: mockTrains.reduce((acc, train) => {
      acc[train.operator] = (acc[train.operator] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    delayed: mockTrains.filter(train => train.delay > 0).length,
    onTime: mockTrains.filter(train => train.delay === 0).length,
    cancelled: mockTrains.filter(train => train.cancelled).length,
    averageDelay: mockTrains.reduce((sum, train) => sum + train.delay, 0) / mockTrains.length,
    averageSpeed: mockTrains.reduce((sum, train) => sum + train.speed, 0) / mockTrains.length
  }
  
  res.json({
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
      source: 'mock_data'
    }
  })
})

export default router
