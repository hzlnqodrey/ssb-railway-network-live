'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static override getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg m-4">
          <div className="text-center space-y-4">
            <div className="text-6xl">🚫</div>
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-200">
              Swiss Railway Network Error
            </h2>
            <p className="text-red-600 dark:text-red-300 max-w-md">
              Something went wrong while loading the railway network. This might be due to:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-300 text-left space-y-1">
              <li>• Network connectivity issues</li>
              <li>• Swiss Transport API unavailability</li>
              <li>• Browser compatibility issues</li>
              <li>• Map rendering problems</li>
            </ul>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-red-100 dark:bg-red-900/40 rounded border text-left">
                <summary className="cursor-pointer font-mono text-sm mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
