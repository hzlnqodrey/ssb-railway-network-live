// Swiss Railway Network Type Definitions

export interface Station {
  id: string
  name: string
  coordinate: {
    x: number // Longitude
    y: number // Latitude
  }
  distance?: number
  delay?: number
}

export interface Connection {
  from: Station
  to: Station
  departure: string // ISO date string
  arrival: string   // ISO date string
  duration: string  // Duration in format "HH:MM"
  transfers: number
  products: string[] // Train types: ["IC", "S", "RE", etc.]
  capacity1st?: number
  capacity2nd?: number
}

export interface Journey {
  id: string
  name: string // Train number/name (e.g., "IC 1 753")
  category: string // Train category (IC, S, RE, etc.)
  categoryCode?: string
  number?: string
  operator: string
  to: string // Final destination
  passList: JourneyStop[]
  delay?: number
  cancelled?: boolean
  realtimeAvailability?: string
}

export interface JourneyStop {
  station: Station
  arrival?: string // ISO date string
  departure?: string // ISO date string
  delay?: number
  platform?: string
  prognosis?: {
    platform?: string
    arrival?: string
    departure?: string
    capacity1st?: number
    capacity2nd?: number
  }
  realtimeAvailability?: string
}

export interface TrainStop {
  station: Station
  arrivalTime?: string // Format: "HH:MM"
  departureTime?: string // Format: "HH:MM"
  arrivalDelay?: number // Minutes
  departureDelay?: number // Minutes
  platform?: string
  isCurrentStation?: boolean
  isPassed?: boolean
  isSkipped?: boolean
}

// Route coordinate for detailed path drawing
export interface RouteCoordinate {
  lat: number
  lng: number
  name?: string // Optional waypoint name
  stopId?: string // Optional stop ID if this is a station
}

// Journey leg representing one train segment
export interface JourneyLeg {
  legId: string
  trainName: string
  trainNumber?: string
  category: string
  operator: string
  line?: string
  from: Station
  to: Station
  departureTime: string
  arrivalTime: string
  duration: number // in seconds
  platform?: string
  exitPlatform?: string
  stops: TrainStop[]
  routeCoordinates: RouteCoordinate[] // Detailed path coordinates
  color?: string // Display color for this leg
}

// Multi-leg journey
export interface MultiLegJourney {
  id: string
  from: string
  to: string
  departureTime: string
  arrivalTime: string
  totalDuration: number // in seconds
  transfers: number
  legs: JourneyLeg[]
  occupancy?: string
}

export interface Train {
  id: string
  name: string
  category: string
  number: string
  line?: string
  operator: string
  to: string
  from: string
  currentStation?: Station
  nextStation?: Station
  position?: {
    lat: number
    lng: number
  }
  delay?: number
  cancelled?: boolean
  occupancy?: {
    firstClass?: number
    secondClass?: number
  }
  speed?: number
  direction?: number // Direction in degrees
  lastUpdate: string // ISO date string
  timetable?: TrainStop[] // Complete journey with all stops
  departureTime?: string // Original departure time from first station
  arrivalTime?: string // Expected arrival time at final destination
  routeCoordinates?: RouteCoordinate[] // Detailed path coordinates for route drawing
  journey?: MultiLegJourney // Multi-leg journey if applicable
}

export interface MapSettings {
  center: {
    lat: number
    lng: number
  }
  zoom: number
  showTrains: boolean
  showStations: boolean
  showConnections: boolean
  maxTrainsDisplayed: number
  updateInterval: number
  darkMode: boolean
  language: 'en' | 'de' | 'fr' | 'it'
  fontSize: 'small' | 'medium' | 'large'
  mapType: 'standard' | 'satellite' | 'terrain'
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    timestamp: string
    source: string
    version: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface StationBoard {
  station: Station
  stationboard: StationBoardEntry[]
}

export interface StationBoardEntry {
  stop: JourneyStop
  name: string
  category: string
  subcategory?: string
  categoryCode?: string
  number?: string
  operator: string
  to: string
  passList?: JourneyStop[]
  capacity1st?: number
  capacity2nd?: number
}

// UI State Types
export interface UIState {
  selectedTrain?: Train
  selectedStation?: Station
  isLoading: boolean
  error?: string
  sidebarOpen: boolean
  settingsOpen: boolean
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheStore {
  trains: Map<string, CacheEntry<Train[]>>
  stations: Map<string, CacheEntry<Station[]>>
  connections: Map<string, CacheEntry<Connection[]>>
  stationBoards: Map<string, CacheEntry<StationBoard>>
}

// Configuration Types
export interface AppConfig {
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  map: {
    defaultCenter: { lat: number; lng: number }
    defaultZoom: number
    bounds?: {
      southwest: { lat: number; lng: number }
      northeast: { lat: number; lng: number }
    }
  }
  features: {
    enablePWA: boolean
    enableAnalytics: boolean
    enableDebug: boolean
  }
  cache: {
    trainsTTL: number
    stationsTTL: number
    timetablesTTL: number
  }
  performance: {
    maxTrainsDisplayed: number
    updateInterval: number
  }
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: unknown
  timestamp: string
}

export class SwissRailwayError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'SwissRailwayError'
  }
}
