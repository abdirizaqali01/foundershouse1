/**
 * Scene Setup Utilities
 * Helper functions for initializing Three.js scene components
 */
import * as THREE from 'three'
import { CAMERA_BASE, CAMERA_RESTRICTIONS, CAMERA_DAMPING, CAMERA_SPEED_LIMITS } from '../constants/cameraConfig'
import { detectPerformanceTier } from './performanceDetector'
import type HelsinkiCameraController from '../core/HelsinkiCameraController'

/**
 * Create and configure a perspective camera with default settings
 */
export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_BASE.fov,
    window.innerWidth / window.innerHeight,
    CAMERA_BASE.near,
    CAMERA_BASE.far
  )

  camera.position.set(
    CAMERA_BASE.position.x,
    CAMERA_BASE.position.y,
    CAMERA_BASE.position.z
  )

  camera.lookAt(
    CAMERA_BASE.target.x,
    CAMERA_BASE.target.y,
    CAMERA_BASE.target.z
  )

  return camera
}

/**
 * Create and configure a WebGL renderer with performance settings
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const performanceProfile = detectPerformanceTier()

  const renderer = new THREE.WebGLRenderer({
    antialias: performanceProfile.antialias,
    powerPreference: performanceProfile.tier === 'high' ? 'high-performance' : 'default',
    stencil: false,
    depth: true,
  })

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(performanceProfile.pixelRatio)
  renderer.shadowMap.enabled = performanceProfile.shadowsEnabled

  if (performanceProfile.shadowsEnabled) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  container.appendChild(renderer.domElement)

  return renderer
}

/**
 * Configure camera controls with default settings
 */
export function configureCameraControls(controls: HelsinkiCameraController): void {
  controls.enableDamping = CAMERA_DAMPING.enabled
  controls.dampingFactor = CAMERA_DAMPING.factor
  controls.screenSpacePanning = false

  controls.setTarget(
    CAMERA_BASE.target.x,
    CAMERA_BASE.target.y,
    CAMERA_BASE.target.z
  )

  controls.rotateSpeed = CAMERA_SPEED_LIMITS.rotateSpeed
  controls.zoomSpeed = CAMERA_SPEED_LIMITS.zoomSpeed
  controls.panSpeed = CAMERA_SPEED_LIMITS.panSpeed

  controls.minDistance = CAMERA_RESTRICTIONS.distance.min
  controls.maxDistance = CAMERA_RESTRICTIONS.distance.max

  controls.maxPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(CAMERA_RESTRICTIONS.elevation.min)
  controls.minPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(CAMERA_RESTRICTIONS.elevation.max)

  controls.minAzimuthAngle = -Infinity
  controls.maxAzimuthAngle = Infinity
}

/**
 * Create a render target with device pixel ratio
 */
export function createRenderTarget(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )
}

/**
 * Handle window resize for camera, renderer, and render target
 */
export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  renderTarget: THREE.WebGLRenderTarget,
  postProcessMaterial: THREE.ShaderMaterial,
  composer: any | null
): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)

  renderTarget.setSize(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )

  postProcessMaterial.uniforms.uResolution.value.set(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio
  )

  if (composer) {
    composer.setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )
  }
}
