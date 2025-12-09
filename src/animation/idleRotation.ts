/**
 * Idle Rotation Controller
 * Handles gentle orbital rotation around the map after cinematic completes
 */

import * as THREE from 'three'

export interface IdleRotationState {
  isActive: boolean
  isPaused: boolean
  startTime: number
  pausedTime: number // Time when rotation was paused
  accumulatedTime: number // Total time spent rotating (excluding paused periods)
  rotationSpeed: number // radians per second (full rotation = 2π radians in 60 seconds)
  center: THREE.Vector3
  initialOffset: THREE.Vector3
  radius: number
}

/**
 * Creates idle rotation state from current camera position
 * @param camera - The camera to rotate
 * @param lookAtPoint - The point the camera is looking at (center of rotation)
 * @param elapsedTime - Current elapsed time from scene clock
 * @returns IdleRotationState
 */
export function createIdleRotation(
  camera: THREE.PerspectiveCamera,
  lookAtPoint: THREE.Vector3,
  elapsedTime: number
): IdleRotationState {
  // Calculate offset from center to camera
  const offset = new THREE.Vector3().subVectors(camera.position, lookAtPoint)
  const radius = offset.length()

  return {
    isActive: true,
    isPaused: false,
    startTime: elapsedTime,
    pausedTime: 0,
    accumulatedTime: 0,
    rotationSpeed: -(Math.PI * 1) / 120, // Very slow rotation (360° in 120 seconds) - centralized config
    center: lookAtPoint.clone(),
    initialOffset: offset.clone(),
    radius,
  }
}

/**
 * Updates the camera position during idle rotation
 * @param rotation - The idle rotation state
 * @param camera - The camera to update
 * @param controls - The camera controls (to update target)
 * @param elapsedTime - Current elapsed time from scene clock
 * @returns true if rotation is still active, false if stopped
 */
export function updateIdleRotation(
  rotation: IdleRotationState,
  camera: THREE.PerspectiveCamera,
  controls: any,
  elapsedTime: number
): boolean {
  if (!rotation.isActive) return false

  // Check if user is interacting - pause rotation if so
  if (controls && controls.isUserInteracting && controls.isUserInteracting()) {
    if (!rotation.isPaused) {
      // Just started interacting - pause the rotation
      rotation.isPaused = true
      rotation.pausedTime = elapsedTime
      rotation.accumulatedTime += (elapsedTime - rotation.startTime)
    }
    return true // Keep rotation active but paused
  }

  // Check if we should resume from pause
  if (rotation.isPaused) {
    if (controls && controls.shouldResumeIdle && controls.shouldResumeIdle()) {
      // Resume rotation from current camera position (user may have moved it)
      resumeIdleRotation(rotation, camera, elapsedTime)
    } else {
      return true // Still paused, waiting for idle timeout
    }
  }

  const elapsed = rotation.accumulatedTime + (elapsedTime - rotation.startTime)
  const angle = elapsed * rotation.rotationSpeed

  // Calculate new camera position by rotating the initial offset
  const rotatedOffset = rotation.initialOffset.clone()
  
  // Rotate around Y axis (vertical axis - orbiting horizontally)
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)
  
  const newX = rotatedOffset.x * cosAngle - rotatedOffset.z * sinAngle
  const newZ = rotatedOffset.x * sinAngle + rotatedOffset.z * cosAngle
  
  rotatedOffset.x = newX
  rotatedOffset.z = newZ

  // Update camera position
  camera.position.copy(rotation.center).add(rotatedOffset)
  camera.lookAt(rotation.center)

  // Update controls target
  if (controls && controls.target) {
    controls.target.copy(rotation.center)
  }

  return true
}

/**
 * Resume idle rotation from current camera position
 * Recalculates the offset and radius from the current camera position
 */
export function resumeIdleRotation(
  rotation: IdleRotationState,
  camera: THREE.PerspectiveCamera,
  elapsedTime: number
): void {
  if (!rotation) return

  // Recalculate offset from center to current camera position
  const offset = new THREE.Vector3().subVectors(camera.position, rotation.center)
  const radius = offset.length()

  rotation.initialOffset = offset.clone()
  rotation.radius = radius
  rotation.isPaused = false
  rotation.startTime = elapsedTime
  // Keep accumulated time to continue from where we left off
}

/**
 * Stop the idle rotation
 */
export function stopIdleRotation(rotation: IdleRotationState | null): void {
  if (rotation) {
    rotation.isActive = false
  }
}
