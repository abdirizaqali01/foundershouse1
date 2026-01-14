

import { useState, useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';
import { BrowserRouter as Router } from 'react-router-dom';
import AnimatedRoutes from './components/AnimatedRoutes';
import { LoadingScreen } from './components/LoadingScreen';
import './App.css';

// Custom hook to initialize Lenis smooth scroll (official @studio-freight/lenis)
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    // Log Lenis instance and scroll events for debugging
    console.log('[Lenis] Initialized:', lenis);
    lenis.on('scroll', (...args: any[]) => {
      console.log('[Lenis] Scroll event:', ...args);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Check if the main scroll container is scrollable
    setTimeout(() => {
      const html = document.documentElement;
      const body = document.body;
      if (html.scrollHeight <= html.clientHeight && body.scrollHeight <= body.clientHeight) {
        console.warn('[Lenis] No scrollable content detected. Add more content or check CSS overflow.');
      } else {
        console.log('[Lenis] Scrollable content detected.');
      }
    }, 1000);

    return () => {
      lenis.destroy();
    };
  }, []);
}

// CSS-based noise overlay
const NoiseOverlay = () => (
  <div className="noise-overlay" />
);

function App() {
  useLenis();
  const isInitialMount = useRef(true);

  // Persist scroll progress across tab switches, but NOT on page reload
  const [scrollProgress, setScrollProgress] = useState(() => {
    // Only restore from sessionStorage if this is NOT a page reload
    if (performance.navigation.type !== 1) { // 1 = TYPE_RELOAD
      const saved = sessionStorage.getItem('scrollProgress');
      return saved ? parseFloat(saved) : 0;
    }
    // Clear sessionStorage on reload
    sessionStorage.removeItem('scrollProgress');
    sessionStorage.removeItem('animationStage');
    return 0;
  });

  // Save scroll progress to sessionStorage whenever it changes (but not on initial mount if it's a reload)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sessionStorage.setItem('scrollProgress', scrollProgress.toString());
  }, [scrollProgress]);

  return (
    <div className="App">
      <NoiseOverlay />
      {/* Main app routes and transitions */}
      <Router>
        <AnimatedRoutes />
      </Router>
    </div>
  );
}

export default App;
