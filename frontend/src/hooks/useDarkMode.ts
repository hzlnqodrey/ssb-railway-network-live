/**
 * Dark mode hook with system preference detection and persistence
 */

import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(false)

  // Check system preference
  const getSystemPreference = (): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const systemIsDark = getSystemPreference()
    
    let shouldBeDark = false
    
    switch (newTheme) {
      case 'dark':
        shouldBeDark = true
        break
      case 'light':
        shouldBeDark = false
        break
      case 'system':
        shouldBeDark = systemIsDark
        break
    }

    if (shouldBeDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    setIsDark(shouldBeDark)
  }

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('swiss-railway-theme') as Theme
    const initialTheme = stored || 'system'
    
    setTheme(initialTheme)
    applyTheme(initialTheme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  // Change theme
  const setMode = (newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('swiss-railway-theme', newTheme)
  }

  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setMode(newTheme)
  }

  return {
    theme,
    isDark,
    setTheme: setMode,
    toggleDarkMode,
    isSystem: theme === 'system'
  }
}
