/**
 * Mock Train Movement Service
 * 
 * This service simulates realistic train movement across the Swiss railway network
 * by creating predefined routes and animating trains along those routes.
 */

import { Train } from '@/types/railway'

interface RoutePoint {
  lat: number
  lng: number
  stationId?: string
  stationName?: string
}

interface TrainRoute {
  id: string
  name: string
  category: string
  operator: string
  points: RoutePoint[]
  totalDistance: number
  estimatedDuration: number // in minutes
}

// Predefined realistic Swiss train routes
const TRAIN_ROUTES: TrainRoute[] = [
  {
    id: 'zurich-bern',
    name: 'IC 1',
    category: 'IC',
    operator: 'SBB',
    points: [
      { lat: 47.3769, lng: 8.5417, stationId: 'zurich-hb', stationName: 'Zürich HB' },
      { lat: 47.3500, lng: 8.3000 }, // Intermediate point
      { lat: 47.2000, lng: 7.8000 }, // Intermediate point
      { lat: 46.9481, lng: 7.4474, stationId: 'bern', stationName: 'Bern' }
    ],
    totalDistance: 125,
    estimatedDuration: 90 // 1.5 hours
  },
  {
    id: 'bern-geneva',
    name: 'IC 5',
    category: 'IC',
    operator: 'SBB',
    points: [
      { lat: 46.9481, lng: 7.4474, stationId: 'bern', stationName: 'Bern' },
      { lat: 46.7500, lng: 7.0000 }, // Intermediate point
      { lat: 46.5197, lng: 6.6323, stationId: 'lausanne', stationName: 'Lausanne' },
      { lat: 46.3500, lng: 6.4000 }, // Intermediate point
      { lat: 46.2044, lng: 6.1432, stationId: 'geneva', stationName: 'Genève' }
    ],
    totalDistance: 155,
    estimatedDuration: 120 // 2 hours
  },
  {
    id: 'zurich-basel',
    name: 'IC 3',
    category: 'IC',
    operator: 'SBB',
    points: [
      { lat: 47.3769, lng: 8.5417, stationId: 'zurich-hb', stationName: 'Zürich HB' },
      { lat: 47.4500, lng: 8.2000 }, // Intermediate point
      { lat: 47.5000, lng: 7.8000 }, // Intermediate point
      { lat: 47.5479, lng: 7.5893, stationId: 'basel', stationName: 'Basel SBB' }
    ],
    totalDistance: 87,
    estimatedDuration: 75 // 1.25 hours
  },
  {
    id: 's-bahn-zurich',
    name: 'S 3',
    category: 'S',
    operator: 'SBB',
    points: [
      { lat: 47.3769, lng: 8.5417, stationId: 'zurich-hb', stationName: 'Zürich HB' },
      { lat: 47.4000, lng: 8.6000 }, // Suburban route
      { lat: 47.4200, lng: 8.6500 }, // Suburban route
      { lat: 47.4100, lng: 8.7000 } // End station
    ],
    totalDistance: 25,
    estimatedDuration: 35 // 35 minutes
  },
  {
    id: 'regional-express',
    name: 'RE 456',
    category: 'RE',
    operator: 'SBB',
    points: [
      { lat: 46.5197, lng: 6.6323, stationId: 'lausanne', stationName: 'Lausanne' },
      { lat: 46.6000, lng: 6.8000 }, // Intermediate point
      { lat: 46.7000, lng: 7.1000 }, // Intermediate point
      { lat: 46.9481, lng: 7.4474, stationId: 'bern', stationName: 'Bern' }
    ],
    totalDistance: 95,
    estimatedDuration: 80 // 1.33 hours
  }
]

interface MovingTrain extends Train {
  routeId: string
  routeProgress: number // 0-1, how far along the route
  targetStationIndex: number
  startTime: number
  travelDirection: 'forward' | 'backward' // renamed to avoid conflict with direction (compass)
}

class MockTrainMovementService {
  private movingTrains: Map<string, MovingTrain> = new Map()
  private updateInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.initializeTrains()
  }

  private initializeTrains() {
    TRAIN_ROUTES.forEach((route, index) => {
      const isReverse = Math.random() > 0.5 // Randomly choose direction
      const startProgress = Math.random() * 0.3 // Start somewhere along the route
      
      const train: MovingTrain = {
        id: `mock-${route.id}-${index}`,
        name: route.name,
        category: route.category,
        number: (100 + index).toString(),
        operator: route.operator,
        to: isReverse ? route.points[0].stationName || 'Start' : route.points[route.points.length - 1].stationName || 'End',
        position: this.interpolatePosition(route.points, startProgress),
        delay: Math.floor(Math.random() * 5), // 0-4 minutes delay
        cancelled: false,
        occupancy: {
          firstClass: 20 + Math.floor(Math.random() * 60),
          secondClass: 40 + Math.floor(Math.random() * 50)
        },
        speed: this.getRouteSpeed(route.category),
        direction: this.calculateDirection(route.points, startProgress),
        lastUpdate: new Date().toISOString(),
        routeId: route.id,
        routeProgress: startProgress,
        targetStationIndex: isReverse ? 0 : route.points.length - 1,
        startTime: Date.now(),
        travelDirection: isReverse ? 'backward' : 'forward'
      }

      this.movingTrains.set(train.id, train)
    })
  }

  private getRouteSpeed(category: string): number {
    switch (category) {
      case 'IC': return 80 + Math.floor(Math.random() * 40) // 80-120 km/h
      case 'RE': return 60 + Math.floor(Math.random() * 30) // 60-90 km/h
      case 'S': return 40 + Math.floor(Math.random() * 20)  // 40-60 km/h
      default: return 70
    }
  }

  private interpolatePosition(points: RoutePoint[], progress: number): { lat: number; lng: number } {
    if (points.length < 2) return { lat: points[0]?.lat || 0, lng: points[0]?.lng || 0 }
    
    // Clamp progress between 0 and 1
    progress = Math.max(0, Math.min(1, progress))
    
    // Find which segment we're on
    const segmentLength = 1 / (points.length - 1)
    const segmentIndex = Math.min(Math.floor(progress / segmentLength), points.length - 2)
    const segmentProgress = (progress - segmentIndex * segmentLength) / segmentLength
    
    const start = points[segmentIndex]
    const end = points[segmentIndex + 1]
    
    // Linear interpolation with slight randomization for realism
    const lat = start.lat + (end.lat - start.lat) * segmentProgress + (Math.random() - 0.5) * 0.001
    const lng = start.lng + (end.lng - start.lng) * segmentProgress + (Math.random() - 0.5) * 0.001
    
    return { lat, lng }
  }

  private calculateDirection(points: RoutePoint[], progress: number): number {
    if (points.length < 2) return 0
    
    const segmentLength = 1 / (points.length - 1)
    const segmentIndex = Math.min(Math.floor(progress / segmentLength), points.length - 2)
    
    const start = points[segmentIndex]
    const end = points[segmentIndex + 1]
    
    // Calculate bearing between two points
    const dLng = end.lng - start.lng
    const dLat = end.lat - start.lat
    const bearing = Math.atan2(dLng, dLat) * 180 / Math.PI
    
    return (bearing + 360) % 360
  }

  private updateTrainPosition(train: MovingTrain) {
    const route = TRAIN_ROUTES.find(r => r.id === train.routeId)
    if (!route) return
    
    // Calculate progress based on speed and elapsed time
    const progressPerMinute = 1 / route.estimatedDuration
    let progressDelta = progressPerMinute * 2 // Update every 2 seconds, so speed up for visible movement
    
    // Add some randomness to speed
    progressDelta *= (0.8 + Math.random() * 0.4)
    
    if (train.travelDirection === 'backward') {
      train.routeProgress -= progressDelta
      if (train.routeProgress <= 0) {
        train.routeProgress = 0
        train.travelDirection = 'forward' // Turn around
        train.to = route.points[route.points.length - 1].stationName || 'End'
      }
    } else {
      train.routeProgress += progressDelta
      if (train.routeProgress >= 1) {
        train.routeProgress = 1
        train.travelDirection = 'backward' // Turn around
        train.to = route.points[0].stationName || 'Start'
      }
    }

    // Update position and direction
    train.position = this.interpolatePosition(route.points, train.routeProgress)
    train.direction = this.calculateDirection(route.points, train.routeProgress)
    train.lastUpdate = new Date().toISOString()
    
    // Occasionally update speed and delay
    if (Math.random() < 0.1) { // 10% chance each update
      train.speed = this.getRouteSpeed(train.category)
      if (Math.random() < 0.05) { // 5% chance of delay change
        train.delay = Math.max(0, (train.delay || 0) + (Math.random() - 0.5) * 2)
      }
    }
  }

  public startMovement(updateIntervalMs = 2000) {
    if (this.isRunning) return

    this.isRunning = true
    console.log('🚂 Starting mock train movement simulation...')
    
    this.updateInterval = setInterval(() => {
      this.movingTrains.forEach(train => {
        this.updateTrainPosition(train)
      })
    }, updateIntervalMs)
  }

  public stopMovement() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
    this.isRunning = false
    console.log('🛑 Stopped mock train movement simulation')
  }

  public getMovingTrains(): Train[] {
    return Array.from(this.movingTrains.values()).map(train => ({
      id: train.id,
      name: train.name,
      category: train.category,
      number: train.number,
      operator: train.operator,
      to: train.to,
      position: train.position,
      delay: train.delay,
      cancelled: train.cancelled,
      occupancy: train.occupancy,
      speed: train.speed,
      direction: train.direction,
      lastUpdate: train.lastUpdate
    }))
  }

  public isMovementActive(): boolean {
    return this.isRunning
  }

  public getRouteInfo() {
    return {
      totalRoutes: TRAIN_ROUTES.length,
      activeTrains: this.movingTrains.size,
      routes: TRAIN_ROUTES.map(route => ({
        id: route.id,
        name: route.name,
        category: route.category,
        distance: route.totalDistance,
        duration: route.estimatedDuration
      }))
    }
  }
}

// Create a singleton instance
export const mockTrainMovementService = new MockTrainMovementService()

// Export the service class for testing
export { MockTrainMovementService }
