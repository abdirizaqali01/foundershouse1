/**
 * Fog Manager
 * Handles fog setup and dynamic fog transitions for the Helsinki scene
 */

import * as THREE from 'three'
import { FOG } from '../constants/designSystem'

export interface FogConfig {
  near: number
  far: number
  color: number
}

/**
 * Creates and adds fog to a scene
 */
export function setupSceneFog(
  scene: THREE.Scene,
  isNightMode: boolean
): THREE.Fog {
  const fogColor = isNightMode ? FOG.colors.night : FOG.colors.day
  const fog = new THREE.Fog(fogColor, FOG.near, FOG.far)
  scene.fog = fog
  return fog
}

/**
 * Updates fog color when switching between day/night modes
 */
export function updateFogColor(fog: THREE.Fog | null, isNightMode: boolean): void {
  if (fog && fog instanceof THREE.Fog) {
    fog.color.setHex(isNightMode ? FOG.colors.night : FOG.colors.day)
  }
}

/**
 * Disables fog by setting distances to very far values
 */
export function disableFog(fog: THREE.Fog | null): void {
  if (fog && fog instanceof THREE.Fog) {
    fog.near = 100000 // Effectively disable fog
    fog.far = 200000
  }
}

/**
 * Resets fog to normal operating values
 */
export function enableFog(fog: THREE.Fog | null): void {
  if (fog && fog instanceof THREE.Fog) {
    fog.near = FOG.near
    fog.far = FOG.far
  }
}

/**
 * Gradually fades in fog during cinematic animation
 * Uses the same cubic-bezier easing as the camera for synchronized, smooth introduction
 *
 * @param fog - The fog instance to update
 * @param progress - Animation progress (0.0 to 1.0)
 * @param easingFn - Optional easing function to apply (for syncing with camera animation)
 * @param startProgress - When to start fading in fog (default 0.0 = start immediately)
 */
export function updateFogForAnimation(
  fog: THREE.Fog | null,
  progress: number,
  easingFn?: (t: number) => number,
  startProgress: number = 0.0
): void {
  if (!fog || !(fog instanceof THREE.Fog)) return

  if (progress >= startProgress) {
    // Map progress from startProgress-1.0 to fogProgress 0.0-1.0
    const fogProgress = Math.min((progress - startProgress) / (1.0 - startProgress), 1.0)

    // Apply easing function if provided, otherwise use ease-in curve
    const easedFogProgress = easingFn ? easingFn(fogProgress) : fogProgress * fogProgress

    // Gradually reduce fog distances to normal values
    fog.near = THREE.MathUtils.lerp(100000, FOG.near, easedFogProgress)
    fog.far = THREE.MathUtils.lerp(200000, FOG.far, easedFogProgress)
  }
}
