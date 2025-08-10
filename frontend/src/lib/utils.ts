import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * This function combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format time duration in a human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Format time delay in minutes
 */
export function formatDelay(delaySeconds: number): string {
  const minutes = Math.floor(delaySeconds / 60)
  if (minutes === 0) return 'On time'
  return `+${minutes} min`
}

/**
 * Convert coordinates from Swiss projection to WGS84
 * Swiss coordinates are in CH1903+ / LV95 format
 */
export function swissToWGS84(x: number, y: number): { lat: number; lng: number } {
  // Convert from Swiss CH1903+ to WGS84
  // This is a simplified conversion - for production use a proper projection library
  const lat = 46.95240 + ((y - 600000) * 10.82055) / 1000000
  const lng = 7.43958 + ((x - 200000) * 9.14755) / 1000000
  
  return { lat, lng }
}

/**
 * Calculate distance between two geographic points using Haversine formula
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Get train color based on category
 */
export function getTrainColor(category: string): string {
  const colors = {
    'IC': '#e74c3c',     // Red for InterCity
    'ICE': '#9b59b6',    // Purple for ICE
    'S': '#3498db',      // Blue for S-Bahn
    'RE': '#2ecc71',     // Green for Regional Express
    'R': '#f39c12',      // Orange for Regional
    'IR': '#e67e22',     // Dark Orange for InterRegio
    'SN': '#34495e',     // Dark Gray for Night trains
    'TGV': '#e74c3c',    // Red for TGV
    'default': '#95a5a6' // Gray for unknown
  }
  
  return colors[category as keyof typeof colors] || colors.default
}

/**
 * Format Swiss time string
 */
export function formatSwissTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get relative time (e.g., "2 minutes ago")
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
