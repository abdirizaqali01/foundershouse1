import { useEffect } from 'react'
import './LoadingScreen.css'

interface LoadingScreenProps {
  onComplete: () => void
  duration?: number
}

export const LoadingScreen = ({ onComplete, duration = 6000 }: LoadingScreenProps) => {
  useEffect(() => {
    // Add 1.5s blur time after loading completes
    const timer = setTimeout(() => {
      onComplete()
    }, duration + 800)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <img src="/fhlogo_horizontal.png" alt="Founders House" />
        </div>
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
    </div>
  )
}
