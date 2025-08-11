'use client'

import { useState, useEffect } from 'react'
import { 
  Train, 
  Settings, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWebSocketStatus } from '@/hooks/useWebSocket'
import { useSwissRailwayData } from '@/hooks/useSwissRailwayData'
import { useDarkMode } from '@/hooks/useDarkMode'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  // Get real connection and data status
  const { isOnline, status: wsStatus, statusIcon } = useWebSocketStatus()
  const { stats, apiStatus } = useSwissRailwayData({ 
    enableRealtime: true,
    enableStations: true,
    enableTrains: true 
  })
  
  // Dark mode functionality
  const { isDark, toggleDarkMode } = useDarkMode()

  return (
    <header className={cn(
      "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-lg">
            <Train className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Swiss Railway Network
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live Transit Map
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {wsStatus === 'connecting' ? (
              <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
            ) : wsStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : isOnline ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              wsStatus === 'connecting' ? "text-yellow-600 dark:text-yellow-400" :
              wsStatus === 'error' ? "text-red-600 dark:text-red-400" :
              isOnline ? "text-green-600 dark:text-green-400" : 
              "text-gray-600 dark:text-gray-400"
            )}>
              {wsStatus === 'connecting' ? 'Connecting' :
               wsStatus === 'error' ? 'Error' :
               isOnline ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Active Trains */}
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {stats?.trainsActive || 0} Trains
            </span>
          </div>

          {/* API Health */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              apiStatus?.healthy ? "bg-green-500" :
              apiStatus?.rateLimited ? "bg-yellow-500" :
              "bg-red-500"
            )} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              API {apiStatus?.healthy ? 'Ready' : 
                   apiStatus?.rateLimited ? 'Limited' : 'Error'}
            </span>
          </div>

          {/* Last Update */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.lastUpdate?.toLocaleTimeString('de-CH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) || '--:--:--'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Speed Control */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-600 dark:text-gray-400">Speed:</span>
            <select className="text-xs bg-transparent border-none outline-none">
              <option value="1">1x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
              <option value="20">20x</option>
              <option value="50">50x</option>
            </select>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            )}
          </button>

          {/* Settings */}
          <button
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Mobile Status Bar */}
      <div className="md:hidden px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span className={cn(
                isOnline ? "text-green-600" : "text-red-600"
              )}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {stats?.trainsActive || 0} Trains
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500 dark:text-gray-400">
              {stats?.lastUpdate?.toLocaleTimeString('de-CH', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
