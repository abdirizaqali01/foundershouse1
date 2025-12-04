/**
 * GSAP Animation System
 * Based on Chartogne-Taillet animation patterns
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// Configuration
gsap.config({ autoKillThreshold: 7 })

export interface RevealOptions {
  element: HTMLElement | HTMLElement[]
  duration?: number
  delay?: number
  ease?: string
  stagger?: number
}

export interface LetterRevealOptions extends RevealOptions {
  stagger?: number
}

/**
 * Letter-by-letter reveal animation
 * Chartogne-Taillet style
 */
export const animateLetterReveal = (options: LetterRevealOptions) => {
  const {
    element,
    duration = 2,
    delay = 0,
    ease = 'power3.out',
    stagger = 0.05,
  } = options

  const elements = Array.isArray(element) ? element : [element]

  elements.forEach((el) => {
    // Split text into individual letters
    const text = el.textContent || ''
    el.innerHTML = text
      .split('')
      .map((char) => `<span class="letter">${char === ' ' ? '&nbsp;' : char}</span>`)
      .join('')

    const letters = el.querySelectorAll('.letter')

    // Animate letters
    gsap.fromTo(
      letters,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease,
        stagger,
      }
    )
  })
}

/**
 * Reveal progress animation
 * For shader uniforms (0 to 1)
 */
export const animateRevealProgress = (
  target: { value: number },
  duration: number = 2,
  delay: number = 0,
  ease: string = 'power3.inOut'
): gsap.core.Tween => {
  return gsap.to(target, {
    value: 1,
    duration,
    delay,
    ease,
  })
}

/**
 * Hover animation for buttons
 * Chartogne-Taillet style with line decorators
 */
export const createButtonHoverAnimation = (button: HTMLElement) => {
  const timeline = gsap.timeline({ paused: true })

  // Find letter elements
  const letters = button.querySelectorAll('.letter')

  // Find line decorators (pseudo-elements need to be handled via CSS)
  // This is for actual element-based decorators

  timeline
    .to(letters, {
      xPercent: 50,
      duration: 0.3,
      ease: 'sine.inOut',
      stagger: {
        amount: 0.2,
        from: 'edges',
      },
    })

  button.addEventListener('mouseenter', () => timeline.play())
  button.addEventListener('mouseleave', () => timeline.reverse())

  return timeline
}

/**
 * Scroll-based reveal animation
 */
export const animateScrollReveal = (options: RevealOptions & { trigger: string }) => {
  const { element, trigger, duration = 1, ease = 'power3.out' } = options

  const elements = Array.isArray(element) ? element : [element]

  elements.forEach((el) => {
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: 50,
      },
      {
        opacity: 1,
        y: 0,
        duration,
        ease,
        scrollTrigger: {
          trigger,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
      }
    )
  })
}

/**
 * Camera fly-to animation
 * For Three.js camera movements
 */
export const animateCameraTo = (
  camera: any,
  target: { x: number; y: number; z: number },
  duration: number = 1.2,
  ease: string = 'power3.inOut'
): gsap.core.Timeline => {
  const timeline = gsap.timeline()

  timeline.to(camera.position, {
    x: target.x,
    y: target.y,
    z: target.z,
    duration,
    ease,
  })

  return timeline
}

/**
 * Underline reveal animation
 */
export const animateUnderline = (element: HTMLElement) => {
  const underline = document.createElement('div')
  underline.className = 'underline-decorator'
  element.appendChild(underline)

  gsap.fromTo(
    underline,
    {
      scaleX: 0,
      transformOrigin: 'left center',
    },
    {
      scaleX: 1,
      duration: 0.625,
      ease: 'ease',
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
      },
    }
  )
}

/**
 * Page transition animation
 */
export const animatePageTransition = (
  outElement: HTMLElement,
  inElement: HTMLElement,
  onComplete?: () => void
) => {
  const timeline = gsap.timeline({
    onComplete,
  })

  timeline
    .to(outElement, {
      opacity: 0,
      duration: 0.6,
      ease: 'power3.inOut',
    })
    .fromTo(
      inElement,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 0.6,
        ease: 'power3.inOut',
      },
      '-=0.2'
    )

  return timeline
}

/**
 * Intro sequence animation
 * Chartogne-Taillet style page load
 */
export const animateIntroSequence = (
  logo: HTMLElement,
  text: HTMLElement,
  enterButton: HTMLElement,
  onComplete?: () => void
) => {
  const timeline = gsap.timeline({
    onComplete,
  })

  // Logo fade-in
  timeline.fromTo(
    logo,
    {
      opacity: 0,
      scale: 0.95,
    },
    {
      opacity: 1,
      scale: 1,
      duration: 2,
      delay: 0.5,
      ease: 'power3.out',
    }
  )

  // Text letter reveal
  const letters = text.querySelectorAll('.letter')
  timeline.fromTo(
    letters,
    {
      opacity: 0,
      y: 20,
    },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.05,
      ease: 'power3.out',
    },
    '-=1.5'
  )

  // Enter button reveal
  timeline.fromTo(
    enterButton,
    {
      opacity: 0,
      y: 20,
    },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    },
    '-=0.5'
  )

  return timeline
}

/**
 * Utility: Kill all ScrollTriggers
 */
export const killAllScrollTriggers = () => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

/**
 * Utility: Refresh ScrollTrigger
 */
export const refreshScrollTrigger = () => {
  ScrollTrigger.refresh()
}
