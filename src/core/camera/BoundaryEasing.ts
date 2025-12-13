/**
 * Boundary Easing Utilities
 * Smooth easing calculations for camera boundaries
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Super smooth ease-out using quartic (power of 4)
 * Provides very gentle deceleration near boundaries
 */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export interface BoundaryEasingConfig {
  enabled: boolean
  softBoundaryZone: number // Percentage of range (e.g., 0.20 for 20%)
  baseZoomSpeed: number
  baseRotateSpeed: number
}

export class BoundaryEasing {
  public enabled: boolean = true
  public softBoundaryZone: number = 0.20
  private baseZoomSpeed: number = 1.0
  private baseRotateSpeed: number = 1.0

  constructor(config?: Partial<BoundaryEasingConfig>) {
    if (config) {
      this.enabled = config.enabled ?? true
      this.softBoundaryZone = config.softBoundaryZone ?? 0.20
      this.baseZoomSpeed = config.baseZoomSpeed ?? 1.0
      this.baseRotateSpeed = config.baseRotateSpeed ?? 1.0
    }
  }

  /**
   * Set base speeds for easing calculations
   */
  public setBaseSpeeds(zoomSpeed: number, rotateSpeed: number): void {
    this.baseZoomSpeed = zoomSpeed
    this.baseRotateSpeed = rotateSpeed
  }

  /**
   * Calculate easing factor for any boundary using smooth bezier ease-out
   */
  public calculateGeneric(
    currentValue: number,
    minValue: number,
    maxValue: number,
    movingTowardsMin: boolean
  ): number {
    const range = maxValue - minValue
    if (range <= 0) return 1.0

    const softZoneSize = range * this.softBoundaryZone

    if (movingTowardsMin) {
      const distanceFromMin = currentValue - minValue
      if (distanceFromMin < softZoneSize && distanceFromMin >= 0) {
        const t = distanceFromMin / softZoneSize
        return easeOutQuart(t)
      }
    } else {
      const distanceFromMax = maxValue - currentValue
      if (distanceFromMax < softZoneSize && distanceFromMax >= 0) {
        const t = distanceFromMax / softZoneSize
        return easeOutQuart(t)
      }
    }

    return 1.0
  }

  /**
   * Calculate easing for zoom (distance)
   */
  public calculateZoomEasing(
    camera: THREE.PerspectiveCamera,
    orbitTarget: THREE.Vector3,
    minDistance: number,
    maxDistance: number,
    zoomingIn: boolean
  ): number {
    const currentDistance = camera.position.distanceTo(orbitTarget)
    return this.calculateGeneric(
      currentDistance,
      minDistance,
      maxDistance,
      zoomingIn
    )
  }

  /**
   * Calculate easing for polar angle (vertical rotation / elevation)
   */
  public calculatePolarEasing(
    camera: THREE.PerspectiveCamera,
    orbitTarget: THREE.Vector3,
    minPolarAngle: number,
    maxPolarAngle: number,
    movingUp: boolean
  ): number {
    const spherical = new THREE.Spherical()
    const offset = camera.position.clone().sub(orbitTarget)
    spherical.setFromVector3(offset)
    const currentPolar = spherical.phi

    return this.calculateGeneric(
      currentPolar,
      minPolarAngle,
      maxPolarAngle,
      movingUp
    )
  }

  /**
   * Calculate easing for azimuth angle (horizontal rotation)
   * Only applies if azimuth is constrained
   */
  public calculateAzimuthEasing(
    camera: THREE.PerspectiveCamera,
    orbitTarget: THREE.Vector3,
    minAzimuthAngle: number,
    maxAzimuthAngle: number,
    movingLeft: boolean
  ): number {
    if (minAzimuthAngle === -Infinity || maxAzimuthAngle === Infinity) {
      return 1.0
    }

    const spherical = new THREE.Spherical()
    const offset = camera.position.clone().sub(orbitTarget)
    spherical.setFromVector3(offset)
    const currentAzimuth = spherical.theta

    return this.calculateGeneric(
      currentAzimuth,
      minAzimuthAngle,
      maxAzimuthAngle,
      movingLeft
    )
  }

  /**
   * Calculate easing based on bounding box proximity
   */
  public calculateBoxEasing(
    position: THREE.Vector3,
    boundingBox: THREE.Box3,
    margin: number = 40
  ): number {
    const box = boundingBox

    // For X axis
    const distToMinX = Math.abs(position.x - box.min.x)
    const distToMaxX = Math.abs(position.x - box.max.x)
    const tX = Math.min(distToMinX, distToMaxX) / margin

    // For Z axis
    const distToMinZ = Math.abs(position.z - box.min.z)
    const distToMaxZ = Math.abs(position.z - box.max.z)
    const tZ = Math.min(distToMinZ, distToMaxZ) / margin

    // Use the minimum t for strongest edge effect
    const t = Math.max(0, Math.min(1, Math.min(tX, tZ)))
    return easeOutQuart(t)
  }

  /**
   * Apply easing to orbit controls based on movement deltas
   */
  public applyToOrbitControls(
    orbit: OrbitControls,
    camera: THREE.PerspectiveCamera,
    deltaX: number,
    deltaY: number,
    deltaZoom: number,
    minDistance: number,
    maxDistance: number,
    minPolarAngle: number,
    maxPolarAngle: number,
    minAzimuthAngle: number,
    maxAzimuthAngle: number
  ): void {
    if (!this.enabled) return

    const zoomEasing = deltaZoom !== 0
      ? this.calculateZoomEasing(camera, orbit.target, minDistance, maxDistance, deltaZoom > 0)
      : 1.0

    const polarEasing = deltaY !== 0
      ? this.calculatePolarEasing(camera, orbit.target, minPolarAngle, maxPolarAngle, deltaY < 0)
      : 1.0

    const azimuthEasing = deltaX !== 0
      ? this.calculateAzimuthEasing(camera, orbit.target, minAzimuthAngle, maxAzimuthAngle, deltaX < 0)
      : 1.0

    const rotationEasing = Math.min(polarEasing, azimuthEasing)

    orbit.zoomSpeed = this.baseZoomSpeed * zoomEasing
    orbit.rotateSpeed = this.baseRotateSpeed * rotationEasing
  }
}
