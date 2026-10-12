import { useState, useEffect, useRef, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LoadingScreen, TransitionOverlay } from './components/transitions'
import { TransitionProvider, useTransition } from './components/transitions/TransitionContext'
import PageContent from './components/transitions/PageContent'
import CookieBanner from './components/ui/CookieBanner'
import { initializeCookieManager } from './helpers/cookieManager'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import './App.css'
import { applyPageMeta, type PageMetaConfig } from './helpers/pageMeta'

// Lazy load route components
const Home = lazy(() => import('./home').then(module => ({ default: module.Home })))
const AboutPage = lazy(() => import('./about/page'))
const JoinPage = lazy(() => import('./join/page'))
const EventsPage = lazy(() => import('./events/page'))
const PrivacyPolicyPage = lazy(() => import('./privacy-policy/page'))
const CookiesPage = lazy(() => import('./cookies/page'))
const NotFoundPage = lazy(() => import('./not-found/page'))

/** Derives overlay isActive/mode from the transition phase */
function AppLevelOverlay() {
  const { phase, revealMaxDelayMs } = useTransition()

  const isActive = phase === 'covering' || phase === 'covered' || phase === 'revealing'
  const mode = phase === 'revealing' ? 'in' as const : 'out' as const
  // Pass home-specific longer stagger only during the reveal phase
  const maxDelayMs = mode === 'in' && revealMaxDelayMs !== undefined ? revealMaxDelayMs : undefined

  return <TransitionOverlay isActive={isActive} mode={mode} maxDelayMs={maxDelayMs} />
}

function AppContent() {
  const location = useLocation()

  const isInitialMount = useRef(true)
  const [isReturnVisit, setIsReturnVisit] = useState(() => {
    return sessionStorage.getItem('hasVisitedMap') === 'true'
  })
  const [hasMounted, setHasMounted] = useState(false)
  const pageMetaRef = useRef<Record<string, PageMetaConfig>>({
    '/': {
      title: 'Founders House — Helsinki',
      description: "Built for the obsessed, built for the exceptional. This is where the next generation of Founders are born. Finland's GDP Growth starts here.",
      path: '/'
    },
    '/home': {
      title: 'Home — Founders House',
      description: 'Learn about why we exist, who we are, and how to join the next generation of founders.',
      path: '/'
    },
    '/about': {
      title: 'About — Founders House',
      description: 'Meet the mission, team, and vision behind Founders House in Helsinki.',
      path: '/about'
    },
    '/join': {
      title: 'Join — Founders House',
      description: 'Apply to become part of Founders House — the community for ambitious and exceptional founders in Helsinki.',
      path: '/join'
    },
    '/events': {
      title: 'Events — Founders House',
      description: 'Curated founder events in Helsinki. Learn what is next and how to join.',
      path: '/events'
    },    
    '/privacy-policy': {
      title: 'Privacy Policy — Founders House',
      description: 'Our commitment to protecting your personal data and privacy.',
      path: '/privacy-policy'
    },
    '/cookies': {
      title: 'Cookie Settings — Founders House',
      description: 'Manage your cookie preferences and learn about how we use cookies.',
      path: '/cookies'
    },    '*': {
      title: '404 — Founders House',
      description: 'We could not find that page.',
      path: '*',
      robots: 'noindex,follow'
    }
  })

  const [scrollProgress, setScrollProgress] = useState(() => {
    // performance.navigation is deprecated and not available in all browsers
    // Use Navigation Timing API Level 2 instead
    const isReload = typeof performance !== 'undefined' &&
                     performance.getEntriesByType &&
                     performance.getEntriesByType('navigation').length > 0 &&
                     (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'reload';

    if (!isReload) {
      const saved = sessionStorage.getItem('scrollProgress');
      return saved ? parseFloat(saved) : 0;
    }
    sessionStorage.removeItem('scrollProgress');
    sessionStorage.removeItem('animationStage');
    return 0;
  });

  // Check if this is a return visit whenever we navigate to '/'
  useEffect(() => {
    if (location.pathname === '/') {
      const hasVisited = sessionStorage.getItem('hasVisitedMap') === 'true'
      setIsReturnVisit(hasVisited)
    }
  }, [location.pathname])

  useEffect(() => {
    const baseMeta = pageMetaRef.current[location.pathname] ?? pageMetaRef.current['*']
    const meta = baseMeta.path === '*' ? { ...baseMeta, path: location.pathname } : baseMeta
    applyPageMeta(meta)
  }, [location.pathname])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sessionStorage.setItem('scrollProgress', scrollProgress.toString());
  }, [scrollProgress]);

  // Prefetch the Home chunk as soon as the map is interactive,
  // so it's cached before the user taps "Learn more"
  useEffect(() => {
    if (scrollProgress >= 1) {
      import('./home')
    }
  }, [scrollProgress])

  useEffect(() => {
    setHasMounted(true)

    // Console signature (guard prevents double-fire in React StrictMode)
    if (!(window as any).__ilSig) {
      (window as any).__ilSig = true

      const interract = [
        '██╗███╗   ██╗████████╗███████╗██████╗ ██████╗  █████╗  ██████╗████████╗',
        '██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝',
        '██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝███████║██║        ██║   ',
        '██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔══██╗██╔══██║██║        ██║   ',
        '██║██║ ╚████║   ██║   ███████╗██║  ██║██║  ██║██║  ██║╚██████╗   ██║   ',
        '╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ',
      ].join('\n')

      const labs = [
        '██╗      █████╗ ██████╗ ███████╗',
        '██║     ██╔══██╗██╔══██╗██╔════╝',
        '██║     ███████║██████╔╝███████╗',
        '██║     ██╔══██║██╔══██╗╚════██║',
        '███████╗██║  ██║██████╔╝███████║',
        '╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝',
      ].join('\n')

      console.log(
        `%c${interract}`,
        'color:#FFFEEA;font-family:monospace;font-size:10px;line-height:1.4;font-weight:bold;'
      )
      console.log(
        `%c${labs}`,
        'color:#06070A;font-family:monospace;font-size:10px;line-height:1.4;font-weight:bold;'
      )
      console.log(
        '%c  Designed & Developed by Interract Labs',
        'color:#FFFEEA;font-family:"Geist",ui-monospace,monospace;font-size:12px;font-weight:300;letter-spacing:0.14em;line-height:3;'
      )
      console.log(
        '%c  https://interractlabs.com',
        'color:#FFFEEA;font-family:"Geist",ui-monospace,monospace;font-size:11px;font-weight:300;letter-spacing:0.12em;text-decoration:underline;'
      )
      console.log(
        '%c  © 2026 Interract Labs. All rights reserved.',
        'color:#444;font-family:"Geist",ui-monospace,monospace;font-size:10px;font-weight:300;letter-spacing:0.1em;line-height:3;'
      )
    }

    // Initialize cookie manager
    initializeCookieManager()
  }, [])

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 0.9,
      syncTouch: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [location.pathname])


  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            <PageContent skipFadeIn>
              <LoadingScreen
                onComplete={() => {
                  sessionStorage.setItem('hasVisitedMap', 'true')
                }}
                duration={6000}
                scrollProgress={scrollProgress}
                onScrollProgressChange={setScrollProgress}
                isReturnVisit={isReturnVisit}
              />
            </PageContent>
          }
        />
        <Route path="/home" element={<PageContent><Home /></PageContent>} />
        <Route path="/about" element={<PageContent><AboutPage /></PageContent>} />
        <Route path="/join" element={<PageContent><JoinPage /></PageContent>} />
        <Route path="/events" element={<PageContent><EventsPage /></PageContent>} />
        <Route path="/privacy-policy" element={<PageContent><PrivacyPolicyPage /></PageContent>} />
        <Route path="/cookies" element={<PageContent><CookiesPage /></PageContent>} />
        <Route path="*" element={<PageContent><NotFoundPage /></PageContent>} />
      </Routes>

      <AppLevelOverlay />
      <CookieBanner />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <TransitionProvider>
        <AppContent />
      </TransitionProvider>
    </BrowserRouter>
  )
}

export default App
