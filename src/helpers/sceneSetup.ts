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
    // CHROME FIX: Enable alpha for better compositing
    alpha: false,
    // CHROME FIX: Preserve drawing buffer can help with Chrome's rendering pipeline
    preserveDrawingBuffer: false,
  })

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(performanceProfile.pixelRatio)
  renderer.shadowMap.enabled = performanceProfile.shadowsEnabled

  if (performanceProfile.shadowsEnabled) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  // CHROME FIX: Set output color space for consistent rendering
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // CHROME FIX: Enable scissor test for better performance
  renderer.autoClear = true
  renderer.autoClearColor = true
  renderer.autoClearDepth = true
  renderer.autoClearStencil = true

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
 * Handle window resize for camera and renderer
 * Skips no-op resizes: on mobile, the URL bar collapsing fires resize events that would
 * otherwise reallocate the full-screen drawing buffer for nothing.
 */
export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  const width = window.innerWidth
  const height = window.innerHeight

  const size = renderer.getSize(new THREE.Vector2())
  if (size.x === width && size.y === height) return

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
