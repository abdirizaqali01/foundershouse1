/**
 * Helsinki 3D Scene - GLB Version
 * Three.js scene setup with Helsinki GLB model and pencil shader effect
 * Based on Chartogne-Taillet visual style
 */

import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import HelsinkiCameraController from './HelsinkiCameraController'
import { loadHelsinkiModel as loadModel, type RenderMode } from '../loaders'
import { setupPostProcessing, setupComposer, setupSceneLighting } from '../rendering'
import { addCityLights, addCityLightsPoints, animateCityLights, removeCityLights, updateCityLightsFog, createStarfield, animateStars, setupSceneFog, updateFogColor } from '../effects'
// Animation imports removed
import { PerlinNoiseGenerator, isNightInHelsinki, updateMaterialsInHierarchy, isLineSegmentsWithBasicMaterial, applyCameraConfig, getCurrentCameraConfig, formatCameraConfigAsCode, CAMERA_PRESETS, type CameraConfig } from '../helpers'
import { COLORS, FOG, FONTS, CITY_LIGHTS } from '../constants/designSystem'
import { CAMERA_BASE, CAMERA_RESTRICTIONS, CAMERA_DAMPING, CAMERA_SPEED_LIMITS } from '../constants/cameraConfig'
import { FOUNDERS_HOUSE_POI, POINTS_OF_INTEREST } from '../constants/poi'
import { clampToMapBounds } from '../constants/mapBoundaries'

export interface SceneConfig {
  container: HTMLElement
  helsinkiCenter: { lat: number; lng: number }
  radius: number // km
  renderMode?: RenderMode
  isNightMode?: boolean
  onLoadProgress?: (progress: number) => void
  onLoadComplete?: () => void
}

export class HelsinkiScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: any
  private helsinkiModel: THREE.Group | null = null
  private cityLights: THREE.Object3D | null = null
  private perlinTexture: THREE.DataTexture
  private postProcessMaterial: THREE.ShaderMaterial
  private composer: any | null = null
  // bloomPass is managed by postProcessing composer; not stored locally currently
  private renderTarget: THREE.WebGLRenderTarget
  private clock: THREE.Clock
  private container: HTMLElement
  private backgroundText: THREE.Mesh | null = null
  private stars: THREE.Group | THREE.Points | null = null
  private isNightMode: boolean
  // Animation fields removed
  private fog: THREE.Fog | null = null

  // Animation state
  public revealProgress: number = 0
  public pencilStrength: number = 1.0

  constructor(config: SceneConfig) {
    this.container = config.container
    this.clock = new THREE.Clock()

  // Check if it's day or night in Helsinki (extracted to timeUtils)
  this.isNightMode = config.isNightMode !== undefined ? config.isNightMode : isNightInHelsinki()

    // Initialize scene
    this.scene = new THREE.Scene()
    this.scene.background = this.isNightMode
      ? new THREE.Color(COLORS.night.sky)  // Dark night sky
      : new THREE.Color(COLORS.day.sky)  // Light beige day sky

    // Setup camera with initial position from config
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_BASE.fov,
      window.innerWidth / window.innerHeight,
      CAMERA_BASE.near,
      CAMERA_BASE.far
    )
    // Set camera to configured starting position
    this.camera.position.set(
      CAMERA_BASE.position.x,
      CAMERA_BASE.position.y,
      CAMERA_BASE.position.z
    )
    this.camera.lookAt(
      CAMERA_BASE.target.x,
      CAMERA_BASE.target.y,
      CAMERA_BASE.target.z
    )
    
    // Debug: Log initial camera setup
    console.log('📷 CAMERA INITIAL SETUP:')
    console.log('   Position:', CAMERA_BASE.position)
    console.log('   Target:', CAMERA_BASE.target)
    console.log('   Actual camera.position:', this.camera.position.toArray())

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    config.container.appendChild(this.renderer.domElement)

  // Setup camera controller with restricted controls for narrative control
  this.controls = new HelsinkiCameraController(this.camera, this.renderer.domElement)
  this.controls.enableDamping = CAMERA_DAMPING.enabled
  this.controls.dampingFactor = CAMERA_DAMPING.factor
  this.controls.screenSpacePanning = false
  
  // Set the controls target to the configured target point (syncs to OrbitControls)
  this.controls.setTarget(
    CAMERA_BASE.target.x,
    CAMERA_BASE.target.y,
    CAMERA_BASE.target.z
  )
  
  // Speed limits - prevents spinning too fast
  this.controls.rotateSpeed = CAMERA_SPEED_LIMITS.rotateSpeed
  this.controls.zoomSpeed = CAMERA_SPEED_LIMITS.zoomSpeed
  this.controls.panSpeed = CAMERA_SPEED_LIMITS.panSpeed
  
  // Distance constraints (zoom control)
  this.controls.minDistance = CAMERA_RESTRICTIONS.distance.min
  this.controls.maxDistance = CAMERA_RESTRICTIONS.distance.max
  
  // Elevation constraints (vertical angle) - prevents looking too far up or down
  // Convert elevation degrees to polar angles (measured from zenith)
  // polarAngle = π/2 - elevation (90° - elevation in radians)
  this.controls.maxPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(CAMERA_RESTRICTIONS.elevation.min)
  this.controls.minPolarAngle = Math.PI / 2 - THREE.MathUtils.degToRad(CAMERA_RESTRICTIONS.elevation.max)
  
  // NO azimuth restrictions - users can rotate 360° horizontally
  this.controls.minAzimuthAngle = -Infinity
  this.controls.maxAzimuthAngle = Infinity
  
  // Debug: Log camera restrictions
  console.log('🎮 CAMERA RESTRICTIONS APPLIED:')
  console.log('   Rotation speed:', CAMERA_SPEED_LIMITS.rotateSpeed, '(lower = slower)')
  console.log('   Distance (zoom):', { min: this.controls.minDistance, max: this.controls.maxDistance })
  console.log('   Elevation angle:', { 
    min: CAMERA_RESTRICTIONS.elevation.min + '° down',
    max: CAMERA_RESTRICTIONS.elevation.max + '° down'
  })
  console.log('   Horizontal rotation: UNRESTRICTED (360°)')
  
  // Import MAP_BOUNDARIES here for logging
  import('../constants/mapBoundaries').then(({ MAP_BOUNDARIES }) => {
    console.log('🗺️  MAP BOUNDARIES:')
    console.log('   X (east-west):', MAP_BOUNDARIES.x)
    console.log('   Z (north-south):', MAP_BOUNDARIES.z)
  })

    // Setup render target for post-processing
    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )

    // Generate Perlin noise texture
    this.perlinTexture = this.generatePerlinTexture()

    // Setup post-processing (moved to postProcessing util)
    const { material: ppMaterial } = setupPostProcessing(this.renderTarget, this.perlinTexture)
    this.postProcessMaterial = ppMaterial
    // Setup composer and bloom pass (uses the postProcessMaterial as final shader pass)
  const composerResult = setupComposer(this.renderer, this.scene, this.camera, this.postProcessMaterial)
  this.composer = composerResult.composer

  // Lighting (moved to lighting utility)
  setupSceneLighting(this.scene)

    // Setup fog and enable it immediately (no animation)
    this.fog = setupSceneFog(this.scene, this.isNightMode)
    // Fog is already attached to scene by setupSceneFog

    // Add starfield only for night mode (stars util)
    if (this.isNightMode) {
      this.stars = createStarfield()
      this.scene.add(this.stars)
    }

    // Add background text
    this.addBackgroundText()

    // Load Helsinki GLB model (delegated to modelLoader)
    loadModel({
      modelPath: '/untitled.glb', // Using old map temporarily - untitled.glb has broken WebP texture references
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
      isNightMode: this.isNightMode,
      renderMode: config.renderMode || 'textured',
      onLoadProgress: config.onLoadProgress,
      onLoadComplete: config.onLoadComplete,
    }).then((model) => {
      this.helsinkiModel = model
      
      // After the helsinkiModel reference is set, generate city lights if night mode
      if (this.isNightMode) {
        try {
          this.addCityLightsPoints(800) // Reduced from 1200 for better performance
        } catch (e) {
          console.error('❌ Failed to add city lights:', e)
        }
      }
    }).catch((error) => {
      console.error('❌ Helsinki model loading failed:', error)
    })

  // Expose scene for debugging and runtime controls
  // (user can call window.helsinkiScene.setCityLightsDensity or enable/disable)
  ;(window as any).helsinkiScene = this

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this))

  }

  private generatePerlinTexture(): THREE.DataTexture {
    const generator = new PerlinNoiseGenerator(512)
    const data = generator.generate()

    const texture = new THREE.DataTexture(data, 512, 512, THREE.RedFormat)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true

    return texture
  }





  private addBackgroundText(): void {
    // Temporarily disabled - uncomment to re-enable background text
    /*
    const loader = new FontLoader()

    // Load font for background text
    loader.load(
      FONTS.backgroundText,
      (font) => {
        const textGeometry = new TextGeometry('TOP 0.1%', {
          font: font,
          size: 400, // Large text
          depth: 10, // Slight depth for 3D effect
          curveSegments: 12,
          bevelEnabled: false,
        })

        // Center the text geometry
        textGeometry.computeBoundingBox()
        const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x
        textGeometry.translate(-textWidth / 2, 0, 0)

        const textMaterial = new THREE.MeshBasicMaterial({
          color: COLORS.day.wireframe, // Dark brown color
          transparent: true,
          opacity: 0.15, // Subtle opacity so it stays in background
          fog: false, // Background text should not be affected by fog
        })

        this.backgroundText = new THREE.Mesh(textGeometry, textMaterial)

        // Position text on the back wall (negative Z for behind, Y for height)
        this.backgroundText.position.set(0, 200, -1500) // Behind the map on vertical wall
        // No rotation needed - text faces forward by default (stands vertically)

        this.scene.add(this.backgroundText)
      },
      undefined,
      () => {
        // Error loading font
      }
    )
    */
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.renderTarget.setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )

    this.postProcessMaterial.uniforms.uResolution.value.set(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    )

    // Update composer / bloom sizes if present
    if (this.composer) {
      this.composer.setSize(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio
      )
    }
  }

  public update(): void {
    const elapsed = this.clock.getElapsedTime()
    const delta = this.clock.getDelta()

    // Update controls (pass delta for camera-controls; wrapper handles both)
    this.controls.update(delta)

    // Enforce map boundaries - prevent camera target from going outside map
    const currentTarget = this.controls.target
    const clampedPosition = clampToMapBounds(currentTarget.x, currentTarget.z)
    if (clampedPosition.x !== currentTarget.x || clampedPosition.z !== currentTarget.z) {
      this.controls.target.set(clampedPosition.x, currentTarget.y, clampedPosition.z)
    }

    // Animate city lights with flickering effect
    if (this.cityLights) {
      animateCityLights(this.cityLights, elapsed)
      // Update fog uniforms for city lights shaders
      updateCityLightsFog(this.cityLights, this.scene)
    }

    // Update background text with parallax effect
    if (this.backgroundText) {
      // Move text with camera but slower (parallax effect) - on vertical wall
      const parallaxFactor = 0.2
      this.backgroundText.position.x = this.camera.position.x * parallaxFactor
      // Keep base Z position but add slight parallax
      this.backgroundText.position.z = -1500 + (this.camera.position.z * parallaxFactor * 0.5)
    }

    // Animate stars shimmer (delegated to stars util)
    if (this.stars) {
      animateStars(this.stars, elapsed)
    }

    // Update shader uniforms
    this.postProcessMaterial.uniforms.uTime.value = elapsed
    this.postProcessMaterial.uniforms.uPencilStrength.value = this.pencilStrength

    // Render scene
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Play the intro animation (disabled)
   */
  public playIntroAnimation(): void {
    // Animation disabled
  }

  /**
   * Check if cinematic animation is currently playing
   */
  public isCinematicAnimationPlaying(): boolean {
    return false
  }

  /**
   * Log camera debug information for development
   * Shows position, distance from target, viewing angle, and rotation
   */
  private logCameraDebugInfo(): void {
    const pos = this.camera.position
    const target = this.controls.target || new THREE.Vector3(0, 0, 0)
    
    // Calculate distance from camera to target
    const distance = pos.distanceTo(target)
    
    // Calculate height (Y position)
    const height = pos.y
    
    // Calculate horizontal angle (azimuth) in degrees
    const dx = pos.x - target.x
    const dz = pos.z - target.z
    const azimuthRad = Math.atan2(dz, dx)
    const azimuthDeg = THREE.MathUtils.radToDeg(azimuthRad)
    
    // Calculate vertical angle (elevation/pitch) in degrees
    const horizontalDist = Math.sqrt(dx * dx + dz * dz)
    const dy = pos.y - target.y
    const elevationRad = Math.atan2(dy, horizontalDist)
    const elevationDeg = THREE.MathUtils.radToDeg(elevationRad)
    
    // Get camera rotation in degrees
    const rotX = THREE.MathUtils.radToDeg(this.camera.rotation.x)
    const rotY = THREE.MathUtils.radToDeg(this.camera.rotation.y)
    const rotZ = THREE.MathUtils.radToDeg(this.camera.rotation.z)
    
    console.log('📷 CAMERA DEBUG INFO:')
    console.log('   Position:', {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      z: Math.round(pos.z)
    })
    console.log('   Target:', {
      x: Math.round(target.x),
      y: Math.round(target.y),
      z: Math.round(target.z)
    })
    console.log('   Distance from target:', Math.round(distance))
    console.log('   Height (Y):', Math.round(height))
    console.log('   Angles:', {
      azimuth: Math.round(azimuthDeg) + '°',
      elevation: Math.round(elevationDeg) + '°'
    })
    console.log('   Camera Rotation:', {
      x: Math.round(rotX) + '°',
      y: Math.round(rotY) + '°',
      z: Math.round(rotZ) + '°'
    })
    console.log('   FOV:', this.camera.fov + '°')
    console.log('   ---')
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this))
    this.controls.dispose()
    this.renderer.dispose()
    this.renderTarget.dispose()
    this.perlinTexture.dispose()

    if (this.helsinkiModel) {
      this.scene.remove(this.helsinkiModel)
    }

    // Remove and dispose city lights if present
    this.removeCityLights()

    this.container.removeChild(this.renderer.domElement)
  }

  // Getters
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  public getModel(): THREE.Group | null {
    return this.helsinkiModel
  }

  public getControls(): any {
    return this.controls
  }

  /**
   * Attempt to enable advanced camera-controls (dynamically imported). Returns a boolean success flag.
   */
  public async enableAdvancedCamera(): Promise<boolean> {
    if (!this.controls) return false
    try {
      const ok = await this.controls.enableAdvanced()
      return !!ok
    } catch (e) {
      return false
    }
  }

  // Helper to adjust pencil strength
  public setPencilStrength(strength: number) {
    this.pencilStrength = Math.max(0, Math.min(1, strength))
  }

  /**
   * Manually log camera debug info
   * Call from console: window.helsinkiScene.debugCamera()
   */
  public debugCamera(): void {
    this.logCameraDebugInfo()
  }

  /**
   * Set camera to a specific configuration
   * @param config - Camera configuration object
   * @example
   * window.helsinkiScene.setCameraConfig({
   *   targetX: 164, targetY: 50, targetZ: -804,
   *   polar: { distance: 500, azimuth: 90, elevation: 15 }
   * })
   */
  public setCameraConfig(config: CameraConfig): void {
    applyCameraConfig(this.camera, this.controls, config)
  }

  /**
   * Apply a preset camera configuration
   * @param presetName - Name of the preset from CAMERA_PRESETS
   * @example
   * window.helsinkiScene.applyCameraPreset('BIRDS_EYE')
   */
  public applyCameraPreset(presetName: keyof typeof CAMERA_PRESETS): void {
    const preset = CAMERA_PRESETS[presetName]
    if (preset) {
      applyCameraConfig(this.camera, this.controls, preset)
    } else {
      console.error(`Camera preset "${presetName}" not found`)
    }
  }

  /**
   * Get current camera configuration
   * Returns a config object you can copy/paste into code
   * @example
   * window.helsinkiScene.getCameraConfig()
   */
  public getCameraConfig(): CameraConfig {
    return getCurrentCameraConfig(this.camera, this.controls)
  }

  /**
   * Print current camera config as copyable code
   * @example
   * window.helsinkiScene.printCameraConfig()
   */
  public printCameraConfig(): void {
    const config = getCurrentCameraConfig(this.camera, this.controls)
    console.log('📷 CURRENT CAMERA CONFIG (copy/paste ready):')
    console.log(formatCameraConfigAsCode(config))
  }

  /**
   * Get list of available Points of Interest
   */
  public getPOIs(): typeof POINTS_OF_INTEREST {
    return POINTS_OF_INTEREST
  }

  /**
   * Get list of available camera presets
   */
  public getCameraPresets(): typeof CAMERA_PRESETS {
    return CAMERA_PRESETS
  }

  /**
   * Move camera to look at a specific POI
   * @param poiName - Name of the POI from POINTS_OF_INTEREST
   * @param distance - Optional distance from POI (default: 500)
   * @param azimuth - Optional horizontal angle in degrees (default: 90)
   * @param elevation - Optional vertical angle in degrees (default: 15)
   * @example
   * window.helsinkiScene.focusPOI('FOUNDERS_HOUSE', 800, 135, 20)
   */
  public focusPOI(
    poiName: keyof typeof POINTS_OF_INTEREST,
    distance: number = 500,
    azimuth: number = 90,
    elevation: number = 15
  ): void {
    const poi = POINTS_OF_INTEREST[poiName]
    if (poi) {
      const config: CameraConfig = {
        targetX: poi.worldCoords.x,
        targetY: poi.worldCoords.y,
        targetZ: poi.worldCoords.z,
        polar: { distance, azimuth, elevation }
      }
      applyCameraConfig(this.camera, this.controls, config)
      console.log(`📍 Focused on ${poi.name} at (${poi.mapCoords.x}, ${poi.mapCoords.y})`)
    } else {
      console.error(`POI "${poiName}" not found`)
    }
  }

  // Toggle between day and night mode
  public toggleDayNightMode(forceNightMode: boolean) {
    this.isNightMode = forceNightMode

    // Update background
    this.scene.background = this.isNightMode
      ? new THREE.Color(COLORS.night.sky)  // Dark night sky
      : new THREE.Color(COLORS.day.sky)  // Light beige day sky

    // Update fog color
    updateFogColor(this.fog, this.isNightMode)

    // Update bottom fog color in post-processing
    this.postProcessMaterial.uniforms.uBottomFogColor.value.setHex(
      this.isNightMode ? COLORS.night.sky : COLORS.day.sky
    )

    // Update edge line colors
    if (this.helsinkiModel) {
      updateMaterialsInHierarchy(
        this.helsinkiModel,
        isLineSegmentsWithBasicMaterial,
        (lineSegments) => {
          if (this.isNightMode) {
            // Night mode: subtle gray lines (very faint to avoid visual clutter)
            lineSegments.material.color.setHex(COLORS.night.wireframe)
            lineSegments.material.transparent = true
            lineSegments.material.opacity = COLORS.night.wireframeOpacity
          } else {
            // Day mode: dark brown lines but still subtle
            lineSegments.material.color.setHex(COLORS.day.wireframe)
            lineSegments.material.transparent = true
            lineSegments.material.opacity = COLORS.day.wireframeOpacity
          }
          // Keep depth test on and depth write off so overlapping lines don't accumulate visually
          lineSegments.material.depthTest = true
          lineSegments.material.depthWrite = false
          lineSegments.material.needsUpdate = true
        }
      )
    }

    // Toggle stars visibility
    if (this.stars) {
      this.stars.visible = this.isNightMode
    } else if (this.isNightMode) {
      // Create stars if switching to night mode and they don't exist
      this.stars = createStarfield()
      this.scene.add(this.stars)
    }

    // Toggle or create city lights
    if (this.isNightMode) {
      // If switching to night mode and city lights don't exist, create them
      if (!this.cityLights && this.helsinkiModel) {
        this.addCityLightsPoints(1200)
      }
      // Make sure they're visible
      if (this.cityLights) {
        this.cityLights.visible = true
      }
    } else {
      // Day mode - hide city lights
      if (this.cityLights) {
        this.cityLights.visible = false
      }
    }

    // Also toggle any manual point lights that might exist
    this.scene.traverse((child) => {
      // Check if it's a point light (your manual city lights)
      if (child instanceof THREE.PointLight) {
        child.visible = this.isNightMode
      }
      // Also hide the light spheres (small glowing spheres)
      if (child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshBasicMaterial &&
          child.geometry instanceof THREE.SphereGeometry) {
        // Check if it's a small sphere (likely a city light indicator)
        const sphere = child.geometry
        // @ts-ignore - accessing internal radius property
        if (sphere.parameters && sphere.parameters.radius < 20) {
          child.visible = this.isNightMode
        }
      }
    })
  }

  /**
   * Generate city lights by sampling surfaces of building meshes.
   * Creates an InstancedMesh of small emissive spheres for performance.
   * @param count number of light instances to generate
   * @param color color of the lights (hex number or string)
   * @param size base radius of a light sphere
   */
  public addCityLights(count = 1000, color: number | string = CITY_LIGHTS.color, size = 6) {
    if (!this.helsinkiModel) return
    this.removeCityLights()
    const inst = addCityLights(this.helsinkiModel, count, color, size)
    if (inst) this.cityLights = inst as any
  }

  public removeCityLights() {
    if (!this.cityLights) return
    if (this.cityLights.parent) this.cityLights.parent.remove(this.cityLights)
    try {
      removeCityLights(this.cityLights)
    } catch (err) {
      // ignore
    }
    this.cityLights = null
  }

  public setCityLightsDensity(count: number) {
    this.addCityLights(Math.max(0, Math.floor(count)))
  }

  public setCityLightsEnabled(enabled: boolean) {
    if (this.cityLights) this.cityLights.visible = enabled
  }

  public addCityLightsPoints(count = 3000, color: number | string = CITY_LIGHTS.color) {
    if (!this.helsinkiModel) return
    this.removeCityLights()
    const group = addCityLightsPoints(this.helsinkiModel, count, color)
    if (group) this.cityLights = group as any
  }

}
