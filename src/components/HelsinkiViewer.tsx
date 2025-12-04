/**
 * Helsinki 3D Viewer Component
 * React + TypeScript component with Three.js and pencil shader effect
 */

import { useEffect, useRef, useState } from 'react'
import { HelsinkiScene } from '../utils/HelsinkiScene_GLB'
import './HelsinkiViewer.css'

export const HelsinkiViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HelsinkiScene | null>(null)
  const animationFrameRef = useRef<number>(0)

  const [status, setStatus] = useState<string>('Initializing...')
  const [loading, setLoading] = useState<boolean>(true)
  const [loadProgress, setLoadProgress] = useState<number>(0)
  const [isDemoNightMode, setIsDemoNightMode] = useState<boolean>(false)
  const [isAdvancedCamera, setIsAdvancedCamera] = useState<boolean>(false)

  useEffect(() => {
    if (!containerRef.current) return

    try {

      // Initialize Helsinki scene
      const scene = new HelsinkiScene({
        container: containerRef.current,
        helsinkiCenter: {
          lat: 60.1699,
          lng: 24.9384,
        },
        radius: 2, // 2km radius
        onLoadProgress: (progress) => {
          setLoadProgress(progress)
          setStatus(`Loading Helsinki 3D model... ${progress.toFixed(1)}%`)
        },
        onLoadComplete: () => {
          setLoading(false)
          setStatus('Helsinki 3D - 2km radius')
        },
      })

      sceneRef.current = scene
      setStatus('Loading Helsinki 3D model...')

      // Animation loop
      const animate = () => {
        if (sceneRef.current) {
          sceneRef.current.update()
          animationFrameRef.current = requestAnimationFrame(animate)
        }
      }

      animate()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus('Error: ' + message)
      setLoading(false)
    }

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sceneRef.current) {
        sceneRef.current.dispose()
        sceneRef.current = null
      }
    }
  }, [])

  const handleToggleDayNight = () => {
    if (sceneRef.current) {
      const newMode = !isDemoNightMode
      setIsDemoNightMode(newMode)
      // Call the toggle method on the scene
      sceneRef.current.toggleDayNightMode(newMode)
    }
  }

  const handleToggleAdvancedCamera = async () => {
    if (!sceneRef.current) return
    setStatus('Enabling advanced camera...')
    const ok = await sceneRef.current.enableAdvancedCamera()
    setIsAdvancedCamera(ok)
    setStatus(ok ? 'Advanced camera enabled' : 'Using fallback OrbitControls')
  }

  return (
    <>
      <div ref={containerRef} className="helsinki-container" />

      {/* UI Overlay - Chartogne style */}
      <div className="ui-overlay">
        <div className="main-cta">
          <span>H</span>
          <span>E</span>
          <span>L</span>
          <span>S</span>
          <span>I</span>
          <span>N</span>
          <span>K</span>
          <span>I</span>
        </div>

        <div className="controls">
          <button onClick={handleToggleDayNight}>
            {isDemoNightMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          </button>
          <button onClick={handleToggleAdvancedCamera} style={{ marginLeft: 8 }}>
            {isAdvancedCamera ? 'Advanced Camera Enabled' : 'Enable Advanced Camera'}
          </button>
        </div>

        <div className="status">{status}</div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <h1 className="loading-title">Helsinki 3D</h1>
            <p className="loading-text">Loading... {loadProgress.toFixed(1)}%</p>
            <div className="loading-bar">
              <div
                className="loading-bar-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HelsinkiViewer
