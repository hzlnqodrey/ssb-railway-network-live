/**
 * Debug script for Mock Train Movement
 * This can be run in the browser console to debug train movement
 */

import { mockTrainMovementService } from './mockTrainMovement'

export function debugMockTrains() {
  console.log('🔍 Debugging Mock Train Movement Service...')
  
  // Check if service is running
  const isActive = mockTrainMovementService.isMovementActive()
  console.log(`🚦 Service Status: ${isActive ? 'ACTIVE' : 'INACTIVE'}`)
  
  // Get current trains
  const trains = mockTrainMovementService.getMovingTrains()
  console.log(`🚂 Active Trains: ${trains.length}`)
  
  // Show details of each train
  trains.forEach((train, index) => {
    console.log(`\n🚂 Train ${index + 1}:`)
    console.log(`   ID: ${train.id}`)
    console.log(`   Name: ${train.name}`)
    console.log(`   Category: ${train.category}`)
    console.log(`   To: ${train.to}`)
    console.log(`   Position: ${train.position?.lat.toFixed(4)}, ${train.position?.lng.toFixed(4)}`)
    console.log(`   Speed: ${train.speed} km/h`)
    console.log(`   Direction: ${train.direction}°`)
    console.log(`   Delay: ${train.delay} min`)
    console.log(`   Last Update: ${train.lastUpdate}`)
  })
  
  // Get route info
  const routeInfo = mockTrainMovementService.getRouteInfo()
  console.log(`\n📊 Route Info:`)
  console.log(`   Total Routes: ${routeInfo.totalRoutes}`)
  console.log(`   Active Trains: ${routeInfo.activeTrains}`)
  
  routeInfo.routes.forEach(route => {
    console.log(`   📍 ${route.name} (${route.category}): ${route.distance}km, ${route.duration}min`)
  })
  
  return {
    isActive,
    trainsCount: trains.length,
    trains,
    routeInfo
  }
}

export function startMockTrains() {
  console.log('▶️ Starting mock train movement...')
  mockTrainMovementService.startMovement(2000)
  
  // Log updates for 10 seconds
  let updateCount = 0
  const testInterval = setInterval(() => {
    updateCount++
    const trains = mockTrainMovementService.getMovingTrains()
    console.log(`📈 Update ${updateCount}: ${trains.length} trains moving`)
    
    if (updateCount >= 5) { // Stop after 5 updates (10 seconds)
      clearInterval(testInterval)
      console.log('✅ Test completed')
    }
  }, 2000)
}

export function stopMockTrains() {
  console.log('⏹️ Stopping mock train movement...')
  mockTrainMovementService.stopMovement()
}

// Auto-expose functions to global window in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-expect-error - Adding to global for testing
  window.debugMockTrains = debugMockTrains
  // @ts-expect-error - Adding to global for testing  
  window.startMockTrains = startMockTrains
  // @ts-expect-error - Adding to global for testing
  window.stopMockTrains = stopMockTrains
  
  console.log('🔧 Mock train debug functions available:')
  console.log('   window.debugMockTrains() - Show current status')
  console.log('   window.startMockTrains() - Start movement test')
  console.log('   window.stopMockTrains() - Stop movement')
}
