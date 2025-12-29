import { useEffect, useState } from 'react'
import { HelsinkiViewer } from './HelsinkiViewer'
import './LoadingScreen.css'

interface LoadingScreenProps {
  onComplete: () => void
  duration: number
  scrollProgress: number
  onScrollProgressChange: (progress: number) => void
}

interface MapLoadingState {
  isLoaded: boolean
  progress: number
}

// Animated text component with fade-in or fade-up effect and optional fade-out
const AnimatedText = ({ text, fadeUp = false, fadeOut = false }: { text: string; fadeUp?: boolean; fadeOut?: boolean; duration?: number }) => {
  let className = "fade-in-text";
  if (fadeUp) className = "fade-up-text";
  if (fadeUp && fadeOut) className += " fade-up-out";
  return <span className={className}>{text}</span>;
}

interface Block {
  id: number
  x: number
  y: number
  width: number
  height: number
  delay: number
}

type Stage = 'logo-loading' | 'logo-blur' | 'pixel-out-to-text1' | 'text1' | 'text2' | 'map-slide-in' | 'map-expand' | 'complete'

export const LoadingScreen = ({ onComplete, duration, scrollProgress, onScrollProgressChange }: LoadingScreenProps) => {
  const [blocks, setBlocks] = useState<Block[]>([])
  // Persist stage across tab switches
  const [stage, setStage] = useState<Stage>(() => {
    const saved = sessionStorage.getItem('animationStage')
    return saved ? (saved as Stage) : 'logo-loading'
  })
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const [mapLoadingState, setMapLoadingState] = useState<MapLoadingState>({ isLoaded: false, progress: 0 })
  const [loadingBarProgress, setLoadingBarProgress] = useState(0)
  const [canProceedToBlur, setCanProceedToBlur] = useState(false)

  // Save stage to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('animationStage', stage)
  }, [stage])

  // Loading bar effect
  // Proceed as soon as model is loaded, with a minimal buffer (0.5s)
  // Animate loading bar ONCE, then trigger transition when both bar is full and model is loaded
  useEffect(() => {
    const MIN_LOADING_TIME = 10; // 0.5s
    const startTime = Date.now();
    let cancelled = false;

    setLoadingBarProgress(0);
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / MIN_LOADING_TIME) * 100, 100);
      setLoadingBarProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // When both loading bar is full and model is loaded, proceed
  useEffect(() => {
    if (loadingBarProgress >= 100 && mapLoadingState.isLoaded) {
      setCanProceedToBlur(true);
    }
  }, [loadingBarProgress, mapLoadingState.isLoaded]);

  // Watch for map loading completion: if loading bar is done and model is loaded, proceed
  useEffect(() => {
    if (loadingBarProgress >= 100 && mapLoadingState.isLoaded) {
      setCanProceedToBlur(true);
    }
  }, [loadingBarProgress, mapLoadingState.isLoaded]);

  useEffect(() => {
    // Generate random blocks with natural dissolve timing
    const generatedBlocks: Block[] = []
    const cols = 18 // Reduced by 2 columns
    const rows = 10 // Reduced by 2 rows
    const blockWidth = 100 / cols
    const blockHeight = 100 / rows

    // Create blocks with edge-filling logic
    const blockPositions: Block[] = []
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // Overlap amount in percent
        const overlap = 0.15;
        blockPositions.push({
          id: i * rows + j,
          x: i * blockWidth,
          y: j * blockHeight,
          width: i === cols - 1 ? 100 - i * blockWidth : blockWidth + overlap,
          height: j === rows - 1 ? 100 - j * blockHeight : blockHeight + overlap,
          delay: 0
        })
      }
    }

    // Shuffle blocks and assign truly random delays for natural dissolve
    const shuffled = blockPositions.sort(() => Math.random() - 0.5)
    const maxDelay = 1200 // Spread dissolve over 1.2 seconds
    shuffled.forEach((block) => {
      generatedBlocks.push({
        ...block,
        delay: Math.random() * maxDelay // Completely random delay for natural effect
      })
    })

    setBlocks(generatedBlocks)

    // No timers here - stages are controlled by canProceedToBlur
    // All stage transitions happen in a separate useEffect watching canProceedToBlur

    return () => {
      // No timers to clean up
    }
  }, [duration, onComplete])

  // Stage transitions triggered after loading completes
  // Uses timestamp-based checking with setInterval to work in background tabs
  useEffect(() => {
    if (!canProceedToBlur) return

    // Record start time for time-based stage transitions
    const startTime = Date.now()

    // Use setInterval instead of setTimeout chain to work in background tabs
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime

      if (elapsed >= 500 && elapsed < 1300) {
        setStage('logo-blur')
      } else if (elapsed >= 1300 && elapsed < 2800) {
        setStage('pixel-out-to-text1')
      } else if (elapsed >= 2800 && elapsed < 6800) {
        setStage('text1')
      } else if (elapsed >= 6800 && elapsed < 9000) {
        setStage('text2')
      } else if (elapsed >= 9000 && elapsed < 9500) {
        setStage('map-slide-in')
      } else if (elapsed >= 11500 && elapsed < 13000) {
        setStage('map-expand')
      } else if (elapsed >= 13000) {
        setStage('complete')
        clearInterval(checkInterval) // Stop checking once we reach final stage
      }
    }, 50) // Check every 50ms for smooth transitions

    return () => {
      clearInterval(checkInterval)
    }
  }, [canProceedToBlur, scrollProgress])


  const showLogo = stage === 'logo-loading' || stage === 'logo-blur' || stage === 'pixel-out-to-text1'
  const showLoadingBar = stage === 'logo-loading'
  const showBackgroundImage = stage === 'logo-loading' || stage === 'logo-blur' || stage === 'pixel-out-to-text1'
  const showPixelTransition = stage === 'pixel-out-to-text1'
  // Always render text-page as a background for dark red, but only show content in text1/text2
  const showTextPage = true
  const [showText1Delayed, setShowText1Delayed] = useState(false)
  const showText1 = stage === 'text1' && showText1Delayed
  const [fadeOutText1, setFadeOutText1] = useState(false)
  const showText2 = stage === 'text2'
  const shouldBlurLogo = stage === 'logo-blur' || stage === 'pixel-out-to-text1'
  // Start loading map immediately at page launch (all stages)
  const shouldLoadMap = true
  const shouldPauseMapLoading = false


  // Delay showText1 by 0.5s after entering 'text1' stage
  // Also, trigger fadeOutText1 after 2400ms in 'text1' stage
  useEffect(() => {
    let showTimeout: ReturnType<typeof setTimeout> | undefined
    let fadeOutTimeout: ReturnType<typeof setTimeout> | undefined
    if (stage === 'text1') {
      showTimeout = setTimeout(() => setShowText1Delayed(true), 300)
      // Fade out text1 just before switching to text2
      fadeOutTimeout = setTimeout(() => setFadeOutText1(true), 3400)
    } else {
      setShowText1Delayed(false)
      setFadeOutText1(false)
    }
    return () => {
      if (showTimeout) clearTimeout(showTimeout)
      if (fadeOutTimeout) clearTimeout(fadeOutTimeout)
    }
  }, [stage])

  // Debug logging
  console.log('[LoadingScreen] Render:', {
    stage,
    shouldLoadMap,
    shouldPauseMapLoading,
    scrollProgress
  })

  return (
    <div
      className="loading-screen"
      style={{
        pointerEvents: 'auto',
        zIndex: 10000,
        background: 'transparent'
      }}
    >
      <div className="loading-content">
        {/* Persistent dark red background layer */}
        <div className={`loading-text text-page${stage === 'map-slide-in' ? ' text-pushed-by-box' : ''}`} style={{ pointerEvents: 'none', zIndex: 0, position: 'fixed', inset: 0 }}>
          {/* Corner labels absolutely positioned, not wrapped, so they stay in corners */}
          {(stage === 'text1' || stage === 'text2' || stage === 'map-slide-in' || stage === 'map-expand') && <>
            <span
              className={`corner-label top-left${stage === 'text1' ? ' fade-in' : ''}${stage !== 'text1' ? ' fade-in-persist' : ''}`}
            >FOUNDERS HOUSE</span>
            <span
              className={`corner-label top-right${stage === 'text1' ? ' fade-in' : ''}${stage !== 'text1' ? ' fade-in-persist' : ''}`}
            >HELSINKI, FINLAND</span>
          </>}
          {/* Text content in its own container for independent animation */}
          <div className={`text-centered align-left${stage === 'map-slide-in' ? ' text-pushed-by-box' : ''}${stage === 'map-expand' ? ' text-pushed-expand' : ''}`} style={{ opacity: (stage === 'text1' || stage === 'text2' || stage === 'map-slide-in' || stage === 'map-expand' || stage === 'complete') ? 1 : 0 }}>
            {/* Always render both text1 and text2, but control their visibility with stage */}
            <div style={{ display: stage === 'text1' && showText1 ? 'block' : 'none' }}>
              <div className="fade-up-wrapper"><AnimatedText text="FOR THE NEXT" fadeUp={true} fadeOut={fadeOutText1} /></div>
              <div className="fade-up-wrapper"><AnimatedText text="FOUNDER GENERATION" fadeUp={true} fadeOut={fadeOutText1} /></div>
            </div>
            <div 
              style={{ display: (stage === 'text2' || stage === 'map-slide-in' || stage === 'map-expand' || stage === 'complete') ? 'block' : 'none' }}
            >
              <div className="fade-up-wrapper"><AnimatedText text="WHERE BUILDERS CONVERGE," fadeUp /></div>
              <div className="fade-up-wrapper"><AnimatedText text="WHERE POTENTIAL MULTIPLIES" fadeUp /></div>
            </div>
          </div>
        </div>

        {/* Background layer: LoadInImage - Always visible during initial stages */}
        {showBackgroundImage && (
          <div className="loading-background-image">
            <img src="/LoadInImage.png" alt="Founders House" />
          </div>
        )}

        {/* Stage 1 & 2: Logo + Loading Bar (on top of background) */}
        {showLogo && (
          <div
            className={`loading-logo ${shouldBlurLogo ? 'blur-out' : ''}`}
            style={{ height: '76px', width: 'auto' }}
          >
            <img src="/fhlogo_horizontal.png" alt="Founders House" style={{ height: '100%', width: 'auto', display: 'block' }} />
          </div>
        )}
        {showLoadingBar && (
          <div className="loading-bar-container">
            <div className="loading-bar" style={{ width: `${loadingBarProgress}%` }} />
          </div>
        )}

        {/* Cream blocks that pixelate out the image to reveal text */}
        {showPixelTransition && (
          <div className="blocks-container">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="block pixel-reveal"
                style={{
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  width: `${block.width}%`,
                  height: `${block.height}%`,
                  animationDelay: `${block.delay}ms`
                }}
              />
            ))}
          </div>
        )}

        {/* Always mount HelsinkiViewer so it can trigger loading state */}
        <div
          className={`map-container${stage === 'map-slide-in' ? ' slide-in' : ''}${stage === 'map-expand' ? ' expand' : ''}`}
          style={{
            visibility: (stage === 'map-slide-in' || stage === 'map-expand' || stage === 'complete') ? 'visible' : 'hidden',
            pointerEvents: (stage === 'map-slide-in' || stage === 'map-expand' || stage === 'complete') ? 'auto' : 'none',
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 2,
            background: 'transparent',
            opacity: 1,
            overflow: 'hidden',
            transition: 'none',
          }}
        >
          <HelsinkiViewer
            shouldLoad={true}
            shouldPause={false}
            onMapLoadingChange={setMapLoadingState}
            showUI={stage === 'map-expand' || stage === 'complete'}
            scrollProgress={(stage === 'map-expand' || stage === 'complete') ? 1 : 0}
          />
        </div>
      </div>
    </div>
  )
}
