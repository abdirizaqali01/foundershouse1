import { useState } from 'react'
import HelsinkiViewer from './components/HelsinkiViewer'
import { LoadingScreen } from './components/LoadingScreen'
import { TypingAnimation } from './components/TypingAnimation'
import './App.css'

type AppPhase = 'loading' | 'typing' | 'map'

function App() {
  const [phase, setPhase] = useState<AppPhase>('loading')

  return (
    <div className="App">
      <div 
        className={phase === 'map' ? 'map-visible' : 'map-hidden'}
        style={{ 
          pointerEvents: phase === 'map' ? 'auto' : 'none'
        }}
      >
        <HelsinkiViewer />
      </div>

      {phase === 'loading' && (
        <LoadingScreen onComplete={() => setPhase('typing')} duration={3500} />
      )}
      
      {phase === 'typing' && (
        <TypingAnimation onComplete={() => setPhase('map')} />
      )}
    </div>
  )
}

export default App
