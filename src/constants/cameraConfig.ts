/**
 * Camera Configuration Constants
 * Centralized camera control settings for the entire site
 * 
 * These values define the "ideal" camera view and restrict user controls
 * to maintain narrative control and hide imperfections.
 */

/**
 * Base Camera Settings
 * Derived from the ideal view: Distance ~1007, Azimuth -136°, Elevation 10°, Height 182
 */
export const CAMERA_BASE = {
  // Target point (what we're looking at)
  target: {
    x: 603,
    y: 0,
    z: -347
  },
  
  // Ideal camera position
  position: {
    x: -105,
    y: 182,
    z: -1040
  },
  
  // Polar coordinates (easier to work with for restrictions)
  polar: {
    distance: 1007,      // Distance from target
    azimuth: -136,       // Horizontal angle (-136° = southwest view)
    elevation: 10,       // Vertical angle (10° looking down)
  },
  
  // Camera properties
  fov: 60,              // Field of view
  near: 1,              // Near clipping plane
  far: 100000           // Far clipping plane
} as const

/**
 * Camera Control Restrictions
 * Define allowed variance from base settings to control what users can see
 */
export const CAMERA_RESTRICTIONS = {
  // Distance constraints (zoom)
  distance: {
    min: 700,           // Closest zoom (70% of base) - prevents seeing too much detail
    max: 1500,          // Furthest zoom (150% of base) - keeps focal point visible
    default: 1007       // Base distance
  },
  
  // Azimuth (horizontal rotation) constraints
  azimuth: {
    min: -180,          // Allow 44° left from base (-136° - 44° = -180°)
    max: -90,           // Allow 46° right from base (-136° + 46° = -90°)
    default: -136       // Base angle (southwest view)
  },
  
  // Elevation (vertical angle) constraints - TIGHT control for narrative
  elevation: {
    min: 8,             // Minimum angle (8° looking down) - only 2° variance down from base (10°)
    max: 15,            // Maximum angle (15° looking down) - only 5° variance up from base (10°)
    default: 10         // Base angle
  },
  
  // Height constraints (Y position) - TIGHT control for narrative
  height: {
    min: 160,           // Minimum height - only 22 units below base (182)
    max: 220,           // Maximum height - only 38 units above base (182)
    default: 182        // Base height
  },
  
  // FOV constraints
  fov: {
    min: 50,            // Narrower FOV (telephoto feel)
    max: 70,            // Wider FOV (more panoramic)
    default: 60         // Base FOV
  }
} as const

/**
 * Camera Movement Speed Limits
 * Controls how fast users can rotate, zoom, and pan
 */
export const CAMERA_SPEED_LIMITS = {
  rotateSpeed: 0.3,     // Rotation velocity limit (lower = slower, prevents spinning too fast)
  zoomSpeed: 0.5,       // Zoom speed
  panSpeed: 0.3         // Pan speed
} as const

/**
 * Damping settings for smooth camera movement
 */
export const CAMERA_DAMPING = {
  enabled: true,
  factor: 0.08,         // Smooth, slow damping
  rotationSpeed: 0.5,   // Slower rotation for deliberate feel
  zoomSpeed: 0.7,       // Moderate zoom speed
  panSpeed: 0.5         // Slower panning
} as const

/**
 * Idle rotation settings (after cinematic)
 */
export const IDLE_ROTATION = {
  enabled: true,
  speed: -(Math.PI * 1) / 120,  // Very slow rotation (360° in 120 seconds)
  pauseOnInteraction: true,
  resumeDelay: 8000             // Resume after 8 seconds of inactivity
} as const
