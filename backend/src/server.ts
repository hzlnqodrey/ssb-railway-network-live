import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

// Import routes
import healthRoutes from './routes/health'
import trainsRoutes from './routes/trains'
import stationsRoutes from './routes/stations'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Routes
app.use('/health', healthRoutes)
app.use('/api/trains', trainsRoutes)
app.use('/api/stations', stationsRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Swiss Railway Network API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      trains: '/api/trains',
      stations: '/api/stations',
      websocket: `ws://localhost:${PORT}/ws`
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  })
})

// Create HTTP server
const server = createServer(app)

// WebSocket server for real-time updates
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
})

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected from:', req.socket.remoteAddress)
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Swiss Railway Network WebSocket',
    timestamp: new Date().toISOString()
  }))
  
  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('Received message:', message)
      
      // Echo message back (for now)
      ws.send(JSON.stringify({
        type: 'echo',
        data: message,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Invalid JSON message:', error)
    }
  })
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚂 Swiss Railway Network API Server`)
  console.log(`📍 Environment: ${NODE_ENV}`)
  console.log(`🌐 Server running on port ${PORT}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🚀 API Base: http://localhost:${PORT}/api`)
  console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`)
  console.log(`📊 Connected clients: ${wss.clients.size}`)
})

export default app
