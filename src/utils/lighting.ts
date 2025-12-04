/**
 * Lighting Setup Utility
 * Configure scene lighting (ambient, directional, hemisphere)
 */

import * as THREE from 'three'
import { SCENE_CONFIG } from '../constants/designSystem'

/**
 * Setup lighting for the scene
 * @param scene - The THREE.Scene to add lights to
 */
export function setupSceneLighting(scene: THREE.Scene): void {
  const { ambient, directional, hemisphere } = SCENE_CONFIG.lighting

  // Ambient light for soft illumination
  const ambientLight = new THREE.AmbientLight(ambient.color, ambient.intensity)
  scene.add(ambientLight)

  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(
    directional.color,
    directional.intensity
  )
  directionalLight.position.set(
    directional.position.x,
    directional.position.y,
    directional.position.z
  )
  directionalLight.castShadow = true
  directionalLight.shadow.camera.left = directional.shadow.left
  directionalLight.shadow.camera.right = directional.shadow.right
  directionalLight.shadow.camera.top = directional.shadow.top
  directionalLight.shadow.camera.bottom = directional.shadow.bottom
  scene.add(directionalLight)

  // Hemisphere light for outdoor feel
  const hemiLight = new THREE.HemisphereLight(
    hemisphere.skyColor,
    hemisphere.groundColor,
    hemisphere.intensity
  )
  scene.add(hemiLight)
}
