/**
 * Camera Controller
 * Handles camera movements, orbital controls, and interactions
 * Based on Chartogne-Taillet camera system
 */

import * as THREE from 'three'
import gsap from 'gsap'

export interface CameraControllerConfig {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  target?: THREE.Vector3
  enableDamping?: boolean
  dampingFactor?: number
  minDistance?: number
  maxDistance?: number
  minPolarAngle?: number
  maxPolarAngle?: number
}

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private target: THREE.Vector3
  private enableDamping: boolean
  private dampingFactor: number
  private minDistance: number
  private maxDistance: number
  private minPolarAngle: number
  private maxPolarAngle: number

  // Mouse/touch state
  private isRotating: boolean = false
  private isPanning: boolean = false
  private rotateStart: THREE.Vector2 = new THREE.Vector2()
  private rotateEnd: THREE.Vector2 = new THREE.Vector2()
  private rotateDelta: THREE.Vector2 = new THREE.Vector2()
  private panStart: THREE.Vector2 = new THREE.Vector2()
  private panEnd: THREE.Vector2 = new THREE.Vector2()
  private panDelta: THREE.Vector2 = new THREE.Vector2()

  // Spherical coordinates
  private spherical: THREE.Spherical = new THREE.Spherical()
  private sphericalDelta: THREE.Spherical = new THREE.Spherical()
  private scale: number = 1

  // Parallax for pencil shader
  public parallax: THREE.Vector2 = new THREE.Vector2()

  constructor(config: CameraControllerConfig) {
    this.camera = config.camera
    this.domElement = config.domElement
    this.target = config.target || new THREE.Vector3()
    this.enableDamping = config.enableDamping !== undefined ? config.enableDamping : true
    this.dampingFactor = config.dampingFactor || 0.05
    this.minDistance = config.minDistance || 100
    this.maxDistance = config.maxDistance || 5000
    this.minPolarAngle = config.minPolarAngle || 0
    this.maxPolarAngle = config.maxPolarAngle || Math.PI

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this))
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

    // Touch events
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this))
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault()

    if (event.button === 0) {
      // Left mouse button - rotate
      this.isRotating = true
      this.rotateStart.set(event.clientX, event.clientY)
    } else if (event.button === 2) {
      // Right mouse button - pan
      this.isPanning = true
      this.panStart.set(event.clientX, event.clientY)
    }
  }

  private onMouseMove(event: MouseEvent): void {
    // Update parallax for shader effect
    const rect = this.domElement.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    this.parallax.set((x - 0.5) * 2, (y - 0.5) * -2)

    if (this.isRotating) {
      this.rotateEnd.set(event.clientX, event.clientY)
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(0.3)

      this.rotateLeft((2 * Math.PI * this.rotateDelta.x) / this.domElement.clientHeight)
      this.rotateUp((2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight)

      this.rotateStart.copy(this.rotateEnd)
    }

    if (this.isPanning) {
      this.panEnd.set(event.clientX, event.clientY)
      this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(0.5)

      this.pan(this.panDelta.x, this.panDelta.y)

      this.panStart.copy(this.panEnd)
    }
  }

  private onMouseUp(): void {
    this.isRotating = false
    this.isPanning = false
  }

  private onMouseWheel(event: WheelEvent): void {
    event.preventDefault()

    if (event.deltaY < 0) {
      this.zoomIn()
    } else if (event.deltaY > 0) {
      this.zoomOut()
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault()

    if (event.touches.length === 1) {
      this.isRotating = true
      this.rotateStart.set(event.touches[0].clientX, event.touches[0].clientY)
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault()

    if (event.touches.length === 1 && this.isRotating) {
      this.rotateEnd.set(event.touches[0].clientX, event.touches[0].clientY)
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(0.3)

      this.rotateLeft((2 * Math.PI * this.rotateDelta.x) / this.domElement.clientHeight)
      this.rotateUp((2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight)

      this.rotateStart.copy(this.rotateEnd)
    }
  }

  private onTouchEnd(): void {
    this.isRotating = false
  }

  private rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle
  }

  private rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle
  }

  private pan(deltaX: number, deltaY: number): void {
    const offset = new THREE.Vector3()
    const targetDistance = this.camera.position.distanceTo(this.target)

    // Calculate pan amount
    offset.copy(this.camera.position).sub(this.target)
    offset.multiplyScalar(targetDistance * 0.001)

    const panOffset = new THREE.Vector3()
    const v = new THREE.Vector3()

    // Pan left/right
    v.setFromMatrixColumn(this.camera.matrix, 0)
    v.multiplyScalar(-deltaX * 0.001 * targetDistance)
    panOffset.add(v)

    // Pan up/down
    v.setFromMatrixColumn(this.camera.matrix, 1)
    v.multiplyScalar(deltaY * 0.001 * targetDistance)
    panOffset.add(v)

    this.target.add(panOffset)
  }

  private zoomIn(): void {
    this.scale /= 0.95
  }

  private zoomOut(): void {
    this.scale *= 0.95
  }

  public update(): void {
    const offset = new THREE.Vector3()

    // Get current position relative to target
    offset.copy(this.camera.position).sub(this.target)

    // Convert to spherical coordinates
    this.spherical.setFromVector3(offset)

    // Apply deltas
    this.spherical.theta += this.sphericalDelta.theta
    this.spherical.phi += this.sphericalDelta.phi

    // Apply constraints
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))
    this.spherical.makeSafe()

    // Apply zoom
    this.spherical.radius *= this.scale

    // Clamp distance
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))

    // Convert back to Cartesian
    offset.setFromSpherical(this.spherical)
    this.camera.position.copy(this.target).add(offset)

    this.camera.lookAt(this.target)

    // Damping
    if (this.enableDamping) {
      this.sphericalDelta.theta *= 1 - this.dampingFactor
      this.sphericalDelta.phi *= 1 - this.dampingFactor
      this.scale = 1 + (this.scale - 1) * (1 - this.dampingFactor)
    } else {
      this.sphericalDelta.set(0, 0, 0)
      this.scale = 1
    }
  }

  /**
   * Animate camera to position
   * Chartogne-Taillet style with GSAP
   */
  public flyTo(
    position: THREE.Vector3,
    target?: THREE.Vector3,
    duration: number = 1.2,
    ease: string = 'power3.inOut'
  ): gsap.core.Timeline {
    const timeline = gsap.timeline()

    timeline.to(this.camera.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration,
      ease,
    })

    if (target) {
      timeline.to(
        this.target,
        {
          x: target.x,
          y: target.y,
          z: target.z,
          duration,
          ease,
        },
        0
      )
    }

    return timeline
  }

  /**
   * Set target position
   */
  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target)
  }

  /**
   * Get current target
   */
  public getTarget(): THREE.Vector3 {
    return this.target.clone()
  }

  /**
   * Dispose and cleanup
   */
  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.removeEventListener('wheel', this.onMouseWheel.bind(this))
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this))
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this))
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this))
  }
}
