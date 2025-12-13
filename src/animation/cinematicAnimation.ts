/**
 * Cinematic Animation Controller
 * Handles intro animation for the Helsinki 3D scene
 * 
 * Animation: Bird's eye view descending to final camera position
 */

import * as THREE from 'three'
import { CAMERA_BASE } from '../constants/cameraConfig'

/**
 * Heavy ease-out function using quintic (power of 5)
 * Creates a dramatic slow landing effect
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
function heavyEaseOut(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

/**
 * Cinematic ease-out function - exported for other systems to sync
 */
export function cinematicEaseOut(t: number): number {
  return heavyEaseOut(t)
}

export interface CinematicAnimationState {
  isPlaying: boolean
  startTime: number
  duration: number
  startPosition: THREE.Vector3
  startTarget: THREE.Vector3
  endPosition: THREE.Vector3
  endTarget: THREE.Vector3
  // Idle rotation state (continuous gentle rotation after animation)
  isIdleRotating: boolean
  idleRotationStartTime: number
  idleRotationSpeed: number
}

export interface CinematicAnimationConfig {
  duration: number
  startHeight: number      // How high the bird's eye view starts
  startDistance: number    // Horizontal distance from target at start (0 = directly above)
}

/**
 * Creates the intro animation configuration
 * Starts from bird's eye view (above target, looking down)
 * Ends at the configured camera position from cameraConfig.ts
 */
export function createCinematicAnimation(
  config: Partial<CinematicAnimationConfig> = {}
): Omit<CinematicAnimationState, 'isPlaying' | 'startTime'> {
  const {
    duration = 3.0,           // 3 seconds animation
    startHeight = 1500,       // Start 1500 units above target
    startDistance = 100,      // Small horizontal offset so it's not perfectly top-down
  } = config

  // Target point (what we're looking at) - from config
  const targetPoint = new THREE.Vector3(
    CAMERA_BASE.target.x,
    CAMERA_BASE.target.y,
    CAMERA_BASE.target.z
  )

  // Start position: Bird's eye view (above target, looking down)
  const startPosition = new THREE.Vector3(
    targetPoint.x + startDistance,  // Slight offset for visual interest
    targetPoint.y + startHeight,    // High above
    targetPoint.z + startDistance   // Slight offset
  )

  // End position: Final camera position from config
  const endPosition = new THREE.Vector3(
    CAMERA_BASE.position.x,
    CAMERA_BASE.position.y,
    CAMERA_BASE.position.z
  )

  // Start target: Looking at the target point
  const startTarget = targetPoint.clone()

  // End target: Same target point
  const endTarget = targetPoint.clone()

  return {
    duration,
    startPosition,
    startTarget,
    endPosition,
    endTarget,
    isIdleRotating: false,
    idleRotationStartTime: 0,
    idleRotationSpeed: 0.05,
  }
}

/**
 * Updates the camera position during the cinematic animation
 * Returns true if animation is still playing, false if complete
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
  const rawProgress = Math.min(elapsed / animation.duration, 1.0)

  // Check if animation is complete
  if (rawProgress >= 1.0) {
    // Snap to final position
    camera.position.copy(animation.endPosition)
    camera.lookAt(animation.endTarget)
    
    // Update controls target
    if (controls && controls.target) {
      controls.target.copy(animation.endTarget)
    }
    
    return false // Animation complete
  }

  // Apply heavy ease-out for dramatic slow landing
  const eased = heavyEaseOut(rawProgress)

  // Interpolate camera position
  camera.position.lerpVectors(
    animation.startPosition,
    animation.endPosition,
    eased
  )

  // Interpolate target (in case start and end targets differ)
  const currentTarget = new THREE.Vector3().lerpVectors(
    animation.startTarget,
    animation.endTarget,
    eased
  )

  // Update controls target to match (do this BEFORE lookAt for smoother motion)
  if (controls && controls.target) {
    controls.target.copy(currentTarget)
  }

  // Use controls update instead of direct lookAt for smoother motion
  if (controls && controls.update) {
    controls.update()
  } else {
    // Fallback to lookAt if controls don't support update
    camera.lookAt(currentTarget)
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
