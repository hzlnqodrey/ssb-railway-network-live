/**
 * WebSocket hook for real-time Swiss Railway updates
 * 
 * This hook manages WebSocket connections for receiving live train updates,
 * station announcements, and system notifications.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface WebSocketMessage {
  type: 'train_update' | 'station_update' | 'system_notification' | 'connection' | 'echo'
  data?: unknown
  message?: string
  timestamp: string
}

interface UseWebSocketOptions {
  url?: string
  enabled?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  skipInDevelopment?: boolean
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: WebSocketMessage | null
  connectionAttempts: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NODE_ENV === 'production' 
      ? 'wss://your-production-domain.com/ws'
      : 'ws://localhost:8080/ws',
    enabled = true, // Enabled by default as requested
    reconnectAttempts = 5,
    reconnectInterval = 5000,
    heartbeatInterval = 30000,
    skipInDevelopment = false // Enable in development as requested
  } = options

  // Don't attempt WebSocket connections in development unless explicitly enabled
  const shouldConnect = enabled && !(process.env.NODE_ENV === 'development' && skipInDevelopment)

  // Log WebSocket status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && skipInDevelopment && enabled) {
      console.info('ℹ️ WebSocket connections disabled in development mode. Set skipInDevelopment: false to enable.')
    }
  }, [enabled, skipInDevelopment])

  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionAttempts: 0
  })

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('📡 WebSocket message received:', message)

      setState(prev => ({ ...prev, lastMessage: message, error: null }))

      // Handle different message types
      switch (message.type) {
        case 'train_update':
          // Invalidate train queries to trigger refetch
          queryClient.invalidateQueries({ 
            queryKey: ['swiss-railway', 'trains'] 
          })
          break

        case 'station_update':
          // Invalidate station queries
          queryClient.invalidateQueries({ 
            queryKey: ['swiss-railway', 'stations'] 
          })
          break

        case 'system_notification':
          // Handle system notifications (could trigger UI alerts)
          console.log('🔔 System notification:', message.message)
          break

        case 'connection':
          console.log('✅ WebSocket connection established:', message.message)
          break

        default:
          console.log('📨 Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to parse message from server' 
      }))
    }
  }, [queryClient])

  // Track connection attempts with a ref to avoid dependency loops
  const connectionAttemptsRef = useRef(0)

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!shouldConnect || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Limit connection attempts to avoid spam
    if (connectionAttemptsRef.current >= reconnectAttempts) {
      console.warn('🚫 Max WebSocket connection attempts reached. Server may not be available.')
      setState(prev => ({ 
        ...prev, 
        error: 'WebSocket server unavailable (max attempts reached)', 
        isConnecting: false 
      }))
      return
    }

    connectionAttemptsRef.current += 1
    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null,
      connectionAttempts: connectionAttemptsRef.current
    }))

    try {
      console.log(`🔌 Connecting to WebSocket (attempt ${connectionAttemptsRef.current}/${reconnectAttempts}):`, url)
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        connectionAttemptsRef.current = 0
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: null,
          connectionAttempts: 0
        }))

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            }))
          }
        }, heartbeatInterval)
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason)
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false 
        }))

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && connectionAttemptsRef.current < reconnectAttempts) {
          console.log(`🔄 Attempting reconnection in ${reconnectInterval}ms...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (error) => {
        // More informative error logging
        const errorMessage = error instanceof ErrorEvent ? error.message : 'Connection refused'
        console.warn('🔌 WebSocket connection failed:', {
          url,
          error: errorMessage,
          readyState: ws.readyState,
          attempts: connectionAttemptsRef.current
        })
        
        setState(prev => ({ 
          ...prev, 
          error: `WebSocket connection failed: ${errorMessage || 'Server not available'}`, 
          isConnecting: false 
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('🚫 Failed to create WebSocket connection:', {
        url,
        error: errorMessage,
        attempts: connectionAttemptsRef.current
      })
      setState(prev => ({ 
        ...prev, 
        error: `Failed to create WebSocket connection: ${errorMessage}`, 
        isConnecting: false 
      }))
    }
  }, [shouldConnect, url, reconnectAttempts, reconnectInterval, heartbeatInterval, handleMessage])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    connectionAttemptsRef.current = 0
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      connectionAttempts: 0
    })
  }, [])

  // Send message to server
  const sendMessage = useCallback((message: Partial<WebSocketMessage>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'echo',
        data: message.data,
        message: message.message,
        timestamp: new Date().toISOString()
      }
      
      wsRef.current.send(JSON.stringify(fullMessage))
      console.log('📤 WebSocket message sent:', fullMessage)
      return true
    } else {
      console.warn('WebSocket is not connected. Cannot send message.')
      return false
    }
  }, [])

  // Connect on mount and when shouldConnect changes
  useEffect(() => {
    if (shouldConnect) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [shouldConnect, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // Connection state
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connectionAttempts: state.connectionAttempts,
    
    // Message handling
    lastMessage: state.lastMessage,
    sendMessage,
    
    // Connection control
    connect,
    disconnect,
    
    // Status info
    status: state.isConnected ? 'connected' : 
            state.isConnecting ? 'connecting' : 
            state.error ? 'error' : 'disconnected'
  }
}

/**
 * Hook for subscribing to specific WebSocket message types
 */
export function useWebSocketSubscription(
  messageType: WebSocketMessage['type'],
  callback: (data: unknown) => void
) {
  const { lastMessage } = useWebSocket()

  useEffect(() => {
    if (lastMessage?.type === messageType && lastMessage.data) {
      callback(lastMessage.data)
    }
  }, [lastMessage, messageType, callback])
}

/**
 * Hook for WebSocket status in the UI
 */
export function useWebSocketStatus() {
  const { isConnected, isConnecting, error, connectionAttempts } = useWebSocket()
  
  const status = isConnected ? 'online' : 
                isConnecting ? 'connecting' : 
                error ? 'error' : 'offline'
  
  const statusColor = {
    online: 'text-green-600',
    connecting: 'text-yellow-600',
    error: 'text-red-600',
    offline: 'text-gray-600'
  }[status]
  
  const statusIcon = {
    online: '🟢',
    connecting: '🟡',
    error: '🔴',
    offline: '⚫'
  }[status]
  
  return {
    status,
    statusColor,
    statusIcon,
    isOnline: isConnected,
    hasError: !!error,
    attempts: connectionAttempts
  }
}
