'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { 
  ArrowLeft, 
  Train, 
  MapPin, 
  Clock, 
  Wifi, 
  Mountain,
  Users,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Bell,
  Navigation,
  Calendar
} from 'lucide-react'

// Dynamically import the 3D scene to avoid SSR issues
const TrainScene = dynamic(
  () => import('@/components/three/TrainScene'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] lg:min-h-[600px] rounded-2xl bg-gradient-to-b from-sky-200 to-sky-400 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Loading 3D Experience...</p>
        </div>
      </div>
    )
  }
)

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/25">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// Timeline item for the story section
function TimelineItem({ 
  year, 
  title, 
  description,
  isLast = false 
}: { 
  year: string
  title: string
  description: string
  isLast?: boolean
}) {
  return (
    <div className="relative flex gap-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-full bg-gradient-to-b from-red-500 to-red-200" />
      )}
      
      {/* Year bubble */}
      <div className="relative z-10 flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/25">
          <span className="text-white font-bold text-xs">{year}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="pb-10">
        <h4 className="text-lg font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Map</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Train className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">Swiss Railway Live</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with 3D Train */}
      <section className="relative py-12 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Mountain className="w-4 h-4" />
                Made with ❤️ for Swiss Railways
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
                Experience the
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600"> Swiss Railway</span>
                <br />Network Live
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                A real-time visualization of Switzerland's world-renowned railway system. 
                Track trains, explore stations, and discover the engineering marvel that 
                connects the Swiss Alps.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all hover:-translate-y-0.5"
                >
                  <Train className="w-5 h-5" />
                  View Live Map
                </Link>
                <a 
                  href="#features"
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Learn More
                </a>
              </div>
            </div>
            
            {/* Right: 3D Train Scene */}
            <div className="order-1 lg:order-2">
              <Suspense fallback={
                <div className="w-full h-[500px] lg:h-[600px] rounded-2xl bg-gradient-to-b from-sky-200 to-sky-400 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium">Loading 3D Experience...</p>
                  </div>
                </div>
              }>
                <TrainScene />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: What This Web Intends To Do */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Our Mission
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
              What We're Building
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Swiss Railway Network Live is designed to bring the magic of Swiss public transit 
              to your screen. We aim to provide a seamless, real-time experience for tracking 
              trains across Switzerland's extensive railway network.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Visualization</h3>
              <p className="text-gray-600">
                Transform complex railway data into an intuitive, interactive map that anyone can understand at a glance.
              </p>
            </div>
            
            <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Accessible for Everyone</h3>
              <p className="text-gray-600">
                Whether you're a daily commuter, tourist, or railway enthusiast, our platform is designed for all users.
              </p>
            </div>
            
            <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Open & Reliable</h3>
              <p className="text-gray-600">
                Built on official Swiss transport data with a robust, secure backend architecture for reliable service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Features */}
      <section id="features" className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-sky-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
              Powerful Features for Railway Enthusiasts
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to explore and understand the Swiss railway network.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={MapPin}
              title="Interactive Map"
              description="Explore an interactive map showing all Swiss railway stations and train positions in real-time."
            />
            <FeatureCard 
              icon={Train}
              title="Live Train Tracking"
              description="Watch trains move across the network with real-time position updates every few seconds."
            />
            <FeatureCard 
              icon={Clock}
              title="Delay Information"
              description="Get instant visibility into delays and disruptions affecting your journey."
            />
            <FeatureCard 
              icon={Bell}
              title="Station Departures"
              description="View upcoming departures from any station with platform and destination info."
            />
            <FeatureCard 
              icon={Navigation}
              title="Route Timetables"
              description="Access complete train timetables showing all stops along each route."
            />
            <FeatureCard 
              icon={Wifi}
              title="WebSocket Updates"
              description="Experience seamless real-time updates through our WebSocket connection."
            />
            <FeatureCard 
              icon={Calendar}
              title="GTFS Integration"
              description="Powered by official Swiss GTFS data for accurate schedule information."
            />
            <FeatureCard 
              icon={BarChart3}
              title="Network Statistics"
              description="View aggregated stats about trains, delays, and network performance."
            />
            <FeatureCard 
              icon={Globe}
              title="Swiss Transport API"
              description="Direct integration with Switzerland's official transport data API."
            />
          </div>
        </div>
      </section>

      {/* Section 3: What This Web Facilitates */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Use Cases
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
                Who Benefits from Swiss Railway Live?
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Our platform serves diverse users across Switzerland and beyond, 
                making railway information accessible and actionable.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    title: 'Daily Commuters',
                    description: 'Track your train in real-time and plan your commute around delays.'
                  },
                  {
                    title: 'Tourists & Travelers',
                    description: 'Navigate the Swiss railway system with confidence and discover scenic routes.'
                  },
                  {
                    title: 'Railway Enthusiasts',
                    description: 'Watch trains move across the network and explore the technical details.'
                  },
                  {
                    title: 'Transit Planners',
                    description: 'Analyze network performance and understand traffic patterns.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600 font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-1">
                <div className="w-full h-full bg-white rounded-3xl p-8 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <div className="text-4xl font-black text-red-600">52+</div>
                      <div className="text-gray-600 text-sm">Stations</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <div className="text-4xl font-black text-red-600">87+</div>
                      <div className="text-gray-600 text-sm">Train Trips</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <div className="text-4xl font-black text-red-600">58</div>
                      <div className="text-gray-600 text-sm">Routes</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <div className="text-4xl font-black text-red-600">5s</div>
                      <div className="text-gray-600 text-sm">Update Rate</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">Powered by Swiss GTFS Data</p>
                    <p className="text-gray-400 text-xs mt-1">Real-time updates via Go backend</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: The Story of Swiss Railways */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Mountain className="w-4 h-4" />
              Heritage
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-6">
              The Story of Swiss Railways
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed">
              From mountain tunnels to precision timekeeping, discover the legacy 
              of one of the world's most admired railway systems.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Timeline */}
            <div>
              <TimelineItem 
                year="1847"
                title="First Railway Line"
                description="Switzerland's first railway line opens between Zürich and Baden, marking the beginning of a transportation revolution."
              />
              <TimelineItem 
                year="1882"
                title="Gotthard Railway Tunnel"
                description="The legendary Gotthard tunnel opens, connecting northern and southern Europe through the Swiss Alps."
              />
              <TimelineItem 
                year="1902"
                title="Swiss Federal Railways (SBB)"
                description="Major Swiss railways are nationalized, creating SBB (Schweizerische Bundesbahnen) as we know it today."
              />
              <TimelineItem 
                year="1980"
                title="Taktfahrplan (Clockface Scheduling)"
                description="Switzerland introduces the revolutionary Taktfahrplan, with trains departing at the same minutes each hour."
              />
              <TimelineItem 
                year="2016"
                title="Gotthard Base Tunnel"
                description="The world's longest railway tunnel opens at 57km, a masterpiece of Swiss engineering."
                isLast
              />
            </div>
            
            {/* Facts and figures */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <h3 className="text-2xl font-bold mb-6">Swiss Railways by the Numbers</h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Total Track Length', value: '5,323 km' },
                    { label: 'Railway Stations', value: '1,800+' },
                    { label: 'Daily Passengers', value: '1.25 million' },
                    { label: 'Punctuality Rate', value: '92.5%' },
                    { label: 'Trains per Day', value: '11,000+' },
                    { label: 'Longest Tunnel', value: '57 km (Gotthard Base)' }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                      <span className="text-slate-300">{stat.label}</span>
                      <span className="font-bold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
                <h3 className="text-xl font-bold mb-4">🇨🇭 Swiss Precision</h3>
                <p className="text-slate-300 leading-relaxed">
                  Swiss railways are world-renowned for their punctuality and reliability. 
                  The famous "Taktfahrplan" (clockface schedule) ensures that trains depart 
                  at consistent times throughout the day, making travel planning intuitive 
                  and connections seamless.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
            Ready to Explore?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start tracking Swiss trains in real-time with our interactive map.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all hover:-translate-y-0.5"
          >
            <Train className="w-6 h-6" />
            Open Live Map
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <Train className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-600 text-sm">
              Swiss Railway Network Live © {new Date().getFullYear()}
            </span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Powered by Go + Next.js</span>
            <span>|</span>
            <span>Data: Swiss Transport API</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

