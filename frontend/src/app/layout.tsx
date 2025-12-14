import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Swiss Railway Network Live',
  description: 'Live transit map for Swiss Railway Network with real-time train tracking and station information',
  keywords: ['Swiss Railway', 'SBB', 'trains', 'live tracking', 'transit map', 'Switzerland'],
  authors: [{ name: 'Swiss Railway Network Team' }],
  creator: 'Swiss Railway Network Team',
  publisher: 'Swiss Railway Network',
  applicationName: 'Swiss Railway Network Live',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  category: 'transportation',
  classification: 'transportation',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://swiss-railway-live.com',
    siteName: 'Swiss Railway Network Live',
    title: 'Swiss Railway Network Live - Real-time Train Tracking',
    description: 'Track Swiss trains in real-time with our interactive map showing live positions, delays, and station information',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Swiss Railway Network Live - Real-time Train Map'
      }
    ]
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Swiss Railway Network Live',
    description: 'Real-time Swiss train tracking with interactive map',
    images: ['/og-image.png'],
    creator: '@swissrailway'
  },
  
  // PWA
  manifest: '/manifest.json',
  
  // Icons
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
        color: '#dc2626'
      }
    ]
  },
  
  // Additional meta
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification
  verification: {
    google: 'your-google-verification-code',
    // Add other verification codes as needed
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Swiss Railway Live" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Swiss Railway Live" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Additional Performance */}
        <link rel="dns-prefetch" href="https://transport.opendata.ch" />
        <link rel="preconnect" href="https://transport.opendata.ch" crossOrigin="anonymous" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <div id="root">
          {children}
        </div>
        
        {/* Install Prompt */}
        <div id="install-prompt" style={{ display: 'none' }}>
          <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Install Swiss Railway Live</h3>
                <p className="text-sm opacity-90">Get the app for offline access and notifications</p>
              </div>
              <div className="flex space-x-2">
                <button id="install-dismiss" className="px-3 py-1 text-sm bg-blue-700 rounded">
                  Later
                </button>
                <button id="install-accept" className="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium">
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}