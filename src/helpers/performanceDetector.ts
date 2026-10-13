/**
 * Performance Detection Utility
 * Detects device capabilities and returns appropriate settings
 */

export interface PerformanceProfile {
  tier: 'high' | 'medium' | 'low'
  pixelRatio: number
  antialias: boolean
  shadowsEnabled: boolean
}

/**
 * Detect performance tier based on device capabilities
 * Returns settings that affect the visual experience
 */
export function detectPerformanceTier(): PerformanceProfile {
  // Mobile devices: limit to 1.25x to prevent memory crashes
  // Desktop: cap at 1.5x to reduce rendering load
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
  const maxPixelRatio = isMobile ? 1.25 : 1.5;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio)

  return {
    tier: 'high',
    pixelRatio,
    antialias: !isMobile, // Disable antialiasing on mobile for better performance
    shadowsEnabled: false // Shadows not used in current experience
  }
}

export const FULL_MAP_MODEL = '/models/fh.glb'
export const LITE_MAP_MODEL = '/models/fh-mobile.glb'

/**
 * Pick which map model to load.
 * The full model needs ~600 MB of GPU texture memory (480 textures) and 1.4M triangles, which
 * kills the tab on many phones. The lite model is one 4096px atlas and ~40% of the triangles.
 *
 * Desktop (mouse-primary) always gets the full model. Override for testing with
 * ?model=lite or ?model=full in the URL.
 */
export function getMapModelPath(): string {
  if (typeof window === 'undefined') return FULL_MAP_MODEL

  const override = new URLSearchParams(window.location.search).get('model')
  if (override === 'lite') return LITE_MAP_MODEL
  if (override === 'full') return FULL_MAP_MODEL

  const touchPrimary = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 4

  return touchPrimary || lowMemory ? LITE_MAP_MODEL : FULL_MAP_MODEL
}
