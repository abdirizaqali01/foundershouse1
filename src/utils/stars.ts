/**
 * Starfield Creation Utility
 * Generate and manage the night sky stars
 */

import * as THREE from 'three'
import { SCENE_CONFIG, THREE_COLORS, OPACITY } from '../constants/designSystem'

/**
 * Create a starfield for the night sky
 * @returns THREE.Points object containing the stars
 */
export function createStarfield(): THREE.Points {
  const starsGeometry = new THREE.BufferGeometry()
  const { count, radiusMin, radiusMax, size } = SCENE_CONFIG.stars
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    // Random position in a large sphere around the scene
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const starsMaterial = new THREE.PointsMaterial({
    color: THREE_COLORS.night.stars,
    size,
    transparent: true,
    opacity: OPACITY.stars.base,
    sizeAttenuation: true,
  })

  return new THREE.Points(starsGeometry, starsMaterial)
}

/**
 * Animate star shimmer effect
 * @param stars - The stars Points object
 * @param elapsed - Elapsed time in seconds
 */
export function animateStars(stars: THREE.Points, elapsed: number): void {
  if (stars.material instanceof THREE.PointsMaterial) {
    const { shimmerMin, shimmerMax } = OPACITY.stars
    const { shimmerSpeed, rotationSpeed } = SCENE_CONFIG.stars

    // Shimmer effect using sine wave
    stars.material.opacity =
      shimmerMin + Math.sin(elapsed * shimmerSpeed) * (shimmerMax - shimmerMin)

    // Slow rotation
    stars.rotation.y = elapsed * rotationSpeed
  }
}
