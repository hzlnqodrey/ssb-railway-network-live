/**
 * useDraggable Hook
 * 
 * A reusable hook for making floating components draggable.
 * Supports both mouse and touch events, saves position to localStorage.
 */

import { useState, useEffect, useCallback, useRef, RefObject } from 'react'

export interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  /** Unique key for localStorage persistence */
  storageKey: string
  /** Default position (use negative values for relative positioning from edges) */
  defaultPosition: Position
  /** Whether to use bottom-relative positioning for y */
  bottomRelative?: boolean
  /** Whether to use right-relative positioning for x */
  rightRelative?: boolean
}

interface UseDraggableReturn {
  /** Current position */
  position: Position
  /** Whether component is currently being dragged */
  isDragging: boolean
  /** Ref to attach to the draggable container */
  containerRef: RefObject<HTMLDivElement>
  /** Handler for mouse down on drag handle */
  handleMouseDown: (e: React.MouseEvent) => void
  /** Handler for touch start on drag handle */
  handleTouchStart: (e: React.TouchEvent) => void
  /** Reset position to default */
  resetPosition: () => void
  /** Whether position is initialized (for SSR) */
  isInitialized: boolean
}

function getSavedPosition(storageKey: string, defaultPos: Position): Position | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const pos = JSON.parse(saved)
      // Validate position is within viewport
      if (pos.x >= 0 && pos.y >= 0 && 
          pos.x < window.innerWidth - 50 && 
          pos.y < window.innerHeight - 50) {
        return pos
      }
    }
  } catch {}
  return null
}

export function useDraggable(options: UseDraggableOptions): UseDraggableReturn {
  const { storageKey, defaultPosition, bottomRelative = false, rightRelative = false } = options
  
  const [position, setPosition] = useState<Position>({ x: -1, y: -1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize position on mount
  useEffect(() => {
    const saved = getSavedPosition(storageKey, defaultPosition)
    if (saved) {
      setPosition(saved)
    } else {
      // Calculate default position based on options
      let x = defaultPosition.x
      let y = defaultPosition.y
      
      if (rightRelative && defaultPosition.x >= 0) {
        x = window.innerWidth - defaultPosition.x - 150 // Approximate width
      }
      if (bottomRelative && defaultPosition.y >= 0) {
        y = window.innerHeight - defaultPosition.y - 50 // Approximate height
      }
      
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) })
    }
    setIsInitialized(true)
  }, [storageKey, defaultPosition.x, defaultPosition.y, bottomRelative, rightRelative])

  // Save position to localStorage when it changes
  useEffect(() => {
    if (isInitialized && position.x >= 0 && position.y >= 0) {
      localStorage.setItem(storageKey, JSON.stringify(position))
    }
  }, [position, storageKey, isInitialized])

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
      e.preventDefault()
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && e.touches.length === 1) {
      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      })
      setIsDragging(true)
    }
  }, [])

  // Handle mouse/touch move
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y))
      setPosition({ x: newX, y: newY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const newX = Math.max(0, Math.min(window.innerWidth - 100, touch.clientX - dragOffset.x))
        const newY = Math.max(0, Math.min(window.innerHeight - 50, touch.clientY - dragOffset.y))
        setPosition({ x: newX, y: newY })
        e.preventDefault()
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

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

  // Reset position
  const resetPosition = useCallback(() => {
    let x = defaultPosition.x
    let y = defaultPosition.y
    
    if (rightRelative && defaultPosition.x >= 0) {
      x = window.innerWidth - defaultPosition.x - 150
    }
    if (bottomRelative && defaultPosition.y >= 0) {
      y = window.innerHeight - defaultPosition.y - 50
    }
    
    const newPos = { x: Math.max(0, x), y: Math.max(0, y) }
    setPosition(newPos)
    localStorage.removeItem(storageKey)
  }, [defaultPosition, bottomRelative, rightRelative, storageKey])

  return {
    position,
    isDragging,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
    isInitialized
  }
}
