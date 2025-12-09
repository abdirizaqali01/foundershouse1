import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Thin wrapper that dynamically upgrades OrbitControls to camera-controls when available.
 * Keeps a stable API used by HelsinkiScene: update(delta?), target, dispose, setLookAt, fitToBox, flyTo
 */
export class HelsinkiCameraController {
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private orbit: OrbitControls | null = null
  private cameraControls: any = null
  private installedAdvanced = false
  public parallax: THREE.Vector2 = new THREE.Vector2()

  // Proxyable properties
  public enableDamping: boolean = true
  public dampingFactor: number = 0.05
  public screenSpacePanning: boolean = false
  public minDistance: number = 100
  public maxDistance: number = 50000
  public maxPolarAngle: number = Math.PI / 2
  public minPolarAngle: number = 0
  public minAzimuthAngle: number = -Infinity
  public maxAzimuthAngle: number = Infinity
  public rotateSpeed: number = 1.0
  public zoomSpeed: number = 1.0
  public panSpeed: number = 1.0
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private userInteracting: boolean = false

  // internal clock for delta when needed
  private _last = performance.now()

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    // Start with OrbitControls as a safe default
    this.orbit = new OrbitControls(this.camera, this.domElement)
    this.orbit.enableDamping = this.enableDamping
    this.orbit.dampingFactor = this.dampingFactor
    this.orbit.screenSpacePanning = this.screenSpacePanning
    this.orbit.minDistance = this.minDistance
    this.orbit.maxDistance = this.maxDistance
    this.orbit.maxPolarAngle = this.maxPolarAngle
    this.orbit.minPolarAngle = this.minPolarAngle
    this.orbit.minAzimuthAngle = this.minAzimuthAngle
    this.orbit.maxAzimuthAngle = this.maxAzimuthAngle
    this.orbit.rotateSpeed = this.rotateSpeed
    this.orbit.zoomSpeed = this.zoomSpeed
    this.orbit.panSpeed = this.panSpeed
    this.orbit.target.copy(this.target)

    // Listen for user interaction events
    this.setupInteractionListeners()
  }

  private setupInteractionListeners(): void {
    // Mouse/touch events
    this.domElement.addEventListener('pointerdown', () => { this.userInteracting = true })
    this.domElement.addEventListener('wheel', () => { this.userInteracting = true }, { passive: true })
    
    // Also listen to touchstart for mobile
    this.domElement.addEventListener('touchstart', () => { this.userInteracting = true }, { passive: true })
  }

  public isUserInteracting(): boolean {
    return this.userInteracting
  }

  public resetInteractionFlag(): void {
    this.userInteracting = false
  }

  /**
   * Sync properties from this controller to the underlying OrbitControls
   * Call this after changing any camera restriction properties
   */
  private syncPropertiesToOrbit(): void {
    if (this.orbit) {
      // Basic properties
      this.orbit.enableDamping = this.enableDamping
      this.orbit.dampingFactor = this.dampingFactor
      this.orbit.screenSpacePanning = this.screenSpacePanning
      
      // Speed limits - prevents spinning too fast
      this.orbit.rotateSpeed = this.rotateSpeed
      this.orbit.zoomSpeed = this.zoomSpeed
      this.orbit.panSpeed = this.panSpeed
      
      // Distance constraints (zoom)
      this.orbit.minDistance = this.minDistance
      this.orbit.maxDistance = this.maxDistance
      
      // Vertical angle constraints (elevation) - prevents looking too far up or down
      this.orbit.maxPolarAngle = this.maxPolarAngle
      this.orbit.minPolarAngle = this.minPolarAngle
      
      // NO horizontal angle constraints - allow full 360° rotation
      this.orbit.minAzimuthAngle = -Infinity
      this.orbit.maxAzimuthAngle = Infinity
    }
  }

  /**
   * Try to dynamically import and switch to camera-controls. Falls back to OrbitControls on failure.
   */
  public async enableAdvanced(): Promise<boolean> {
    if (this.installedAdvanced) return true
    try {
      const mod = await import('camera-controls')
      const CameraControls = (mod && (mod.default || mod)) as any
      CameraControls.install({ THREE })
      // create camera-controls instance
      this.cameraControls = new CameraControls(this.camera, this.domElement)
      // copy current orbit state: camera position and target
      const pos = this.camera.position.clone()
      const tgt = this.orbit ? this.orbit.target.clone() : this.target.clone()
      // immediately set camera-controls to current state
      this.cameraControls.setLookAt(pos.x, pos.y, pos.z, tgt.x, tgt.y, tgt.z, 0)
      // dispose orbit
      if (this.orbit) {
        this.orbit.dispose()
        this.orbit = null
      }
      this.installedAdvanced = true
      return true
    } catch (err) {
      // dynamic import failed or not installed — keep orbit
      // console.warn('camera-controls not available, using OrbitControls')
      return false
    }
  }

  /**
   * Update controls. If camera-controls is active, pass delta seconds; otherwise update OrbitControls.
   */
  public update(deltaSeconds?: number) {
    if (this.cameraControls) {
      // compute delta (seconds) and ensure it's a finite positive number
      const raw = typeof deltaSeconds === 'number' ? deltaSeconds : ((performance.now() - this._last) / 1000)
      const dt = Number(raw)
      this._last = performance.now()

      if (!Number.isFinite(dt) || dt <= 0) {
        // guard: avoid calling update with invalid delta which can throw inside camera-controls
        try {
          // still attempt a tiny non-zero update to allow internal ticks
          this.cameraControls.update(1 / 60)
        } catch (err) {
          // fall back to OrbitControls on error
          try {
            if (this.cameraControls && this.cameraControls.dispose) this.cameraControls.dispose()
          } catch (e) {}
          this.cameraControls = null
          if (!this.orbit) {
            this.orbit = new OrbitControls(this.camera, this.domElement)
          }
        }
      } else {
        // Normal path
        try {
          this.cameraControls.update(dt)
        } catch (err) {
          // If camera-controls throws, catch and fallback to OrbitControls so the app doesn't stop animating
          try {
            if (this.cameraControls && this.cameraControls.dispose) this.cameraControls.dispose()
          } catch (e) {}
          this.cameraControls = null
          if (!this.orbit) {
            this.orbit = new OrbitControls(this.camera, this.domElement)
          }
        }
      }
    } else if (this.orbit) {
      try {
        // Ensure constraints are enforced on every update
        this.syncPropertiesToOrbit()
        this.orbit.update()
      } catch (err) {
        // ignore orbit update errors
      }
    }

    // update target proxy
    if (this.orbit) this.target.copy(this.orbit.target)
  }

  public setLookAt(px: number, py: number, pz: number, tx: number, ty: number, tz: number, enableTransition = true) {
    if (this.cameraControls) {
      // camera-controls accepts a transition duration in seconds as last param
      this.cameraControls.setLookAt(px, py, pz, tx, ty, tz, enableTransition ? 1.0 : 0)
    } else if (this.orbit) {
      this.camera.position.set(px, py, pz)
      this.orbit.target.set(tx, ty, tz)
      this.orbit.update()
    }
  }

  public fitToBox(box: THREE.Box3, immediate = false, options: any = {}) {
    if (this.cameraControls) {
      try {
        this.cameraControls.fitToBox(box, immediate, options)
      } catch (e) {
        // ignore
      }
    } else if (this.orbit) {
      // naive fit: place camera above center at distance based on box size
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = this.camera.fov * (Math.PI / 180)
      const distance = maxDim / (2 * Math.tan(fov / 2))
      this.camera.position.set(center.x, center.y + distance * 1.2, center.z + distance * 0.3)
      this.orbit.target.copy(center)
      this.orbit.update()
    }
  }

  public async flyTo(params: any) {
    if (this.cameraControls) {
      try {
        await this.cameraControls.moveTo(params.position || this.camera.position, params.target || this.target, true)
      } catch (e) {
        // ignore
      }
    } else if (this.orbit) {
      // simple immediate set for fallback
      if (params.position) this.camera.position.copy(params.position)
      if (params.target) this.orbit.target.copy(params.target)
      this.orbit.update()
    }
  }

  public dispose() {
    if (this.cameraControls && this.cameraControls.dispose) {
      try { this.cameraControls.dispose() } catch (e) { }
      this.cameraControls = null
    }
    if (this.orbit) {
      try { this.orbit.dispose() } catch (e) { }
      this.orbit = null
    }
  }
}

export default HelsinkiCameraController
