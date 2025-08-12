/**
 * Test script for Real-time Train Service
 * This can be run in the browser console to verify the service is working
 */

import { realTimeTrainService } from './realTimeTrainService'

export async function testRealTimeService() {
  console.log('🧪 Testing Real-time SBB Train Service...')
  
  try {
    // Start the service
    await realTimeTrainService.startRealTimeService(10000)
    
    // Wait for initial data
    setTimeout(() => {
      const trains = realTimeTrainService.getMovingTrains()
      console.log(`✅ Found ${trains.length} active trains:`)
      
      trains.forEach(train => {
        console.log(`🚂 ${train.category} ${train.number}: ${train.name} → ${train.to}`)
        console.log(`   Position: ${train.position?.lat.toFixed(4)}, ${train.position?.lng.toFixed(4)}`)
        console.log(`   Speed: ${train.speed} km/h, Direction: ${train.direction}°`)
        console.log('---')
      })
      
      const status = realTimeTrainService.getServiceStatus()
      console.log('📊 Service Status:', status)
      
    }, 5000) // Wait 5 seconds for data to load
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Auto-run test if in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Real-time train service test available: testRealTimeService()')
}
