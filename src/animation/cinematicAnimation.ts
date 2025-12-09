/**
 * Cinematic Animation Controller
 * Handles intro animation for the Helsinki 3D scene
 */

import * as THREE from 'three'

/**
 * Cubic bezier easing function
 * Implements CSS cubic-bezier easing for smooth animations
 * @param t - Progress value between 0 and 1
 * @param p1x - First control point x
 * @param p1y - First control point y
 * @param p2x - Second control point x
 * @param p2y - Second control point y
 * @returns Eased value between 0 and 1
 */
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // Newton-Raphson method for solving cubic bezier
  const epsilon = 0.0001
  let currentT = t
  
  for (let i = 0; i < 8; i++) {
    const currentX = 
      3 * (1 - currentT) * (1 - currentT) * currentT * p1x +
      3 * (1 - currentT) * currentT * currentT * p2x +
      currentT * currentT * currentT
    
    const diff = currentX - t
    if (Math.abs(diff) < epsilon) break
    
    const derivative =
      3 * (1 - currentT) * (1 - currentT) * p1x +
      6 * (1 - currentT) * currentT * (p2x - p1x) +
      3 * currentT * currentT * (1 - p2x)
    
    if (Math.abs(derivative) < epsilon) break
    
    currentT -= diff / derivative
  }
  
  // Calculate Y value using the solved T
  return (
    3 * (1 - currentT) * (1 - currentT) * currentT * p1y +
    3 * (1 - currentT) * currentT * currentT * p2y +
    currentT * currentT * currentT
  )
}

/**
 * Cinematic ease-out function
 * Based on CSS cubic-bezier(0.16, 0.84, 0.44, 1) for smooth, dramatic easing
 * Starts fast and gracefully decelerates
 * Exported for use in fog and other effects that need to sync with camera animation
 */
export function cinematicEaseOut(t: number): number {
  return cubicBezier(t, 0.16, 0.84, 0.44, 1)
}

export interface CinematicAnimationState {
  isPlaying: boolean
  startTime: number
  duration: number
  startPosition: THREE.Vector3
  startTarget: THREE.Vector3
  targetPosition: THREE.Vector3
  targetLookAt: THREE.Vector3
  // Idle rotation state (continuous gentle left rotation)
  isIdleRotating: boolean
  idleRotationStartTime: number
  idleRotationSpeed: number // radians per second
}

export interface CinematicAnimationConfig {
  buildingX: number
  buildingZ: number
  buildingY: number
  startDistance: number
  endDistance: number
  endAzimuth: number      // End horizontal angle in degrees
  endElevation: number    // End vertical angle in degrees
  startAngle: number
  rotationAngle: number
  duration: number
}

/**
 * Creates the intro animation configuration
 * Focuses on Tile_+029_+020_L17_0001 - a specific tile in the map
 * Note: The exact position will depend on how the model was centered when exported.
 * You can adjust buildingX and buildingZ below to fine-tune the focus point.
 */
export function createCinematicAnimation(
  config: Partial<CinematicAnimationConfig> = {}
): Omit<CinematicAnimationState, 'isPlaying' | 'startTime'> {
  // Focus on Tile_+029_+020 - adjust these coordinates as needed to center on your desired tile
  // These values are estimates and may need tweaking based on the actual model layout
  const {
    buildingX = 0,     // The building coordinates (center of world)
    buildingZ = 0,     // The building coordinates (center of world)
    buildingY = 0,
    startDistance = 3000,
    // End camera settings based on desired final view:
    // Distance: ~1000 units, Azimuth: -136° (224°), Elevation: 10°, Height: 182
    endDistance = 1000,    // Distance from focal point
    endAzimuth = -136,     // Horizontal angle in degrees (-136° = 224° from east)
    endElevation = 10,     // Vertical angle (10° looking down)
    startAngle = Math.PI * 0.25, // 45 degrees from the side (starting position)
    duration = 5.0, // 5 seconds - slower, more cinematic
  } = config

  // Calculate starting position (far and high)
  const startPosition = new THREE.Vector3(
    buildingX + Math.cos(startAngle) * startDistance,
    buildingY + 1500, // Start high
    buildingZ + Math.sin(startAngle) * startDistance
  )

  // Calculate ending position using polar coordinates (azimuth, elevation, distance)
  // Convert angles to radians
  const endAzimuthRad = THREE.MathUtils.degToRad(endAzimuth)
  const endElevationRad = THREE.MathUtils.degToRad(endElevation)
  
  // Calculate position in spherical coordinates
  const horizontalDistance = endDistance * Math.cos(endElevationRad)
  const endX = buildingX + horizontalDistance * Math.cos(endAzimuthRad)
  const endZ = buildingZ + horizontalDistance * Math.sin(endAzimuthRad)
  const endY = buildingY + endDistance * Math.sin(endElevationRad)
  
  const endPosition = new THREE.Vector3(endX, endY, endZ)

  // Look at point: slightly elevated above the building for better framing
  const lookAtPoint = new THREE.Vector3(buildingX, buildingY + 20, buildingZ)

  return {
    duration,
    startPosition,
    startTarget: new THREE.Vector3(buildingX, buildingY, buildingZ),
    targetPosition: endPosition,
    targetLookAt: lookAtPoint,
    isIdleRotating: false,
    idleRotationStartTime: 0,
    idleRotationSpeed: 0.08, // Gentle left rotation - radians per second (~4.5 degrees/sec)
  }
}

/**
 * Updates the camera position during the cinematic animation
 * Returns true if animation is still playing, false if complete
 * Also returns the current progress (0-1) for fog fade-in
 */
export function updateCinematicAnimation(
  animation: CinematicAnimationState,
  camera: THREE.PerspectiveCamera,
  controls: any,
  elapsedTime: number,
  _delta: number
): boolean {
  if (!animation.isPlaying) return false

  const elapsed = elapsedTime - animation.startTime
  const rawProgress = elapsed / animation.duration

  // Continue for a bit longer to blend with idle rotation (1.5x duration)
  if (rawProgress >= 1.5) {
    // Animation truly complete - hand off to idle rotation
    return false
  }

  // Apply cinematic cubic-bezier easing for smooth, dramatic animation
  let eased: number
  
  if (rawProgress <= 1.0) {
    // Normal easing during main animation using cubic-bezier
    eased = cinematicEaseOut(rawProgress)
  } else {
    // After 100%, continue with very slow perpetual movement matching idle rotation
    // This creates seamless handoff - no stopping, just continuous gentle motion
    const overshoot = rawProgress - 1.0
    const slowdownFactor = 0.02 // Very slow movement
    eased = 1 - Math.pow(0.001, overshoot) * slowdownFactor
  }

  // Interpolate camera position
  camera.position.lerpVectors(
    animation.startPosition,
    animation.targetPosition,
    eased
  )
  
  // After 80% progress (1 second before end), add subtle orbital movement to blend with idle rotation
  // This creates perpetual motion instead of slowing to a stop
  if (rawProgress >= 0.80) {
    const orbitProgress = (rawProgress - 0.80) / (1.5 - 0.80) // 0 to 1 over remaining time
    const orbitAngle = orbitProgress * (Math.PI * 0.06) // ~11 degrees of rotation over longer blend period
    const orbitSpeed = -(Math.PI * 1) / 100 // Match idle rotation speed (negative for same direction)
    
    // Apply subtle orbital rotation around the target lookAt point
    const offset = new THREE.Vector3().subVectors(camera.position, animation.targetLookAt)
    const radius = offset.length()
    
    // Rotate the offset vector
    const currentAngle = Math.atan2(offset.z, offset.x)
    const newAngle = currentAngle + (orbitAngle * orbitSpeed / Math.abs(orbitSpeed))
    
    offset.x = Math.cos(newAngle) * radius
    offset.z = Math.sin(newAngle) * radius
    
    camera.position.copy(animation.targetLookAt).add(offset)
  }

  // Always look at the target
  camera.lookAt(animation.targetLookAt)

  // Update controls target to match
  if (controls && controls.target) {
    controls.target.copy(animation.targetLookAt)
  }

  // Animation continues
  return true
}

/**
 * Get the current progress of the animation (0-1)
 */
export function getAnimationProgress(
  animation: CinematicAnimationState,
  elapsedTime: number
): number {
  if (!animation.isPlaying) return 1.0
  const elapsed = elapsedTime - animation.startTime
  return Math.min(elapsed / animation.duration, 1.0)
}
