import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ 
  text = "Loading...", 
  size = 'md',
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-4 p-8",
      className
    )}>
      <div className={cn(
        "animate-spin rounded-full border-4 border-gray-300 border-t-blue-600",
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}
