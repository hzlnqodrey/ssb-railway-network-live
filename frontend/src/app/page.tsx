'use client'

import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Dynamically import the map component to avoid SSR issues with 
const SwissRailwayMap = dynamic(
  () => import('@/components/map/SwissRailwayMap'),
  { 
    ssr: false,
    loading: () => <LoadingSpinner text="Loading Swiss Railway Network..." />
  }
)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Header */}
        <Header />
        
        {/* Main Map Container */}
        <main className="flex-1 relative overflow-hidden">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner text="Initializing Railway Network..." />}>
              <SwissRailwayMap />
            </Suspense>
          </ErrorBoundary>
        </main>
        
        {/* Development Tools */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </div>
    </QueryClientProvider>
  )
}
