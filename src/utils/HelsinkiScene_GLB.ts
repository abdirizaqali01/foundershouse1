/**
 * Helsinki 3D Scene - GLB Version
 * Three.js scene setup with Helsinki GLB model and pencil shader effect
 * Based on Chartogne-Taillet visual style
 */

import * as THREE from 'three'
import { loadHelsinkiModel as loadModel } from './modelLoader'
import type { RenderMode } from './modelLoader'
import { setupPostProcessing, setupComposer } from './postProcessing'
import { addCityLights, addCityLightsPoints, animateCityLights, removeCityLights } from './cityLights'
import HelsinkiCameraController from './HelsinkiCameraController'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { PerlinNoiseGenerator } from './perlinNoise'
import { isNightInHelsinki } from './timeUtils'
import { createStarfield, animateStars } from './stars'
import { setupSceneLighting } from './lighting'
// post-processing and loaders moved to utilities

// Chartogne-Taillet color palette
export const COLORS = {
  creamBg: new THREE.Color(0xfdfcf5),
  creamLight: new THREE.Color(0xf9f6ee),
  wineRed: new THREE.Color(0xc23d2a),
  black: new THREE.Color(0x000000),
  warmGray: new THREE.Color(0x625e54),
  darkGray: new THREE.Color(0x464340),
  midGray: new THREE.Color(0xa0a095),
}

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
      ? new THREE.Color(0x0a0a15)  // Dark night sky
      : new THREE.Color(0xf0efe6)  // Light beige day sky

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      100000
    )
    this.camera.position.set(0, 5000, 10000)
    this.camera.lookAt(0, 0, 0)

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    config.container.appendChild(this.renderer.domElement)

  // Setup camera controller (starts with OrbitControls, can upgrade to camera-controls)
  this.controls = new HelsinkiCameraController(this.camera, this.renderer.domElement)
  this.controls.enableDamping = true
  this.controls.dampingFactor = 0.05
  this.controls.screenSpacePanning = false
  this.controls.minDistance = 100
  this.controls.maxDistance = 50000
  this.controls.maxPolarAngle = Math.PI / 2

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

    // Add starfield only for night mode (stars util)
    if (this.isNightMode) {
      this.stars = createStarfield()
      this.scene.add(this.stars)
    }

    // Add background text
    this.addBackgroundText()

    // Load Helsinki GLB model (delegated to modelLoader)
    loadModel({
      modelPath: '/untitled.glb',
      // modelPath: '/test.glb', // Test map - commented out
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
      isNightMode: this.isNightMode,
      renderMode: config.renderMode || 'textured',
      onLoadProgress: config.onLoadProgress,
      onLoadComplete: config.onLoadComplete,
    }).then((model) => {
      this.helsinkiModel = model
      console.log('✅ Helsinki model loaded successfully')
      // After the helsinkiModel reference is set, generate city lights if night mode
      if (this.isNightMode) {
        console.log('🌙 Night mode active - adding city lights...')
        try {
          this.addCityLightsPoints(800) // Reduced from 1200 for better performance
        } catch (e) {
          console.error('❌ Failed to add city lights:', e)
        }
      } else {
        console.log('☀️ Day mode - city lights not added')
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

    const loader = new FontLoader()

    // Load IBM Plex Sans font (we'll use a similar font from Three.js examples)
    // Three.js includes some built-in fonts, or we can use a web font
    loader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
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
          color: 0x2b0a05, // Dark brown color
          transparent: true,
          opacity: 0.15, // Subtle opacity so it stays in background
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

    // Animate city lights with flickering effect
    if (this.cityLights) {
      animateCityLights(this.cityLights, elapsed)
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


  // Toggle between day and night mode
  public toggleDayNightMode(forceNightMode: boolean) {
    this.isNightMode = forceNightMode

    // Update background
    this.scene.background = this.isNightMode
      ? new THREE.Color(0x0a0a15)  // Dark night sky
      : new THREE.Color(0xf0efe6)  // Light beige day sky

    // Update edge line colors
    if (this.helsinkiModel) {
      this.helsinkiModel.traverse((child) => {
        // Update LineSegments materials (the edge lines)
        if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
          if (this.isNightMode) {
            // Night mode: subtle gray lines (very faint to avoid visual clutter)
            child.material.color.setHex(0x4a4a52)
            child.material.transparent = true
            child.material.opacity = 0.25
          } else {
            // Day mode: dark brown lines but still subtle
            child.material.color.setHex(0x2b0a05)
            child.material.transparent = true
            child.material.opacity = 0.35
          }
          // Keep depth test on and depth write off so overlapping lines don't accumulate visually
          child.material.depthTest = true
          child.material.depthWrite = false
          child.material.needsUpdate = true
        }
      })
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
        console.log('🌙 Creating city lights for night mode...')
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
  public addCityLights(count = 1000, color: number | string = 0xfff1c8, size = 6) {
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

  public addCityLightsPoints(count = 3000, color: number | string = 0xfff1c8) {
    if (!this.helsinkiModel) return
    this.removeCityLights()
    const group = addCityLightsPoints(this.helsinkiModel, count, color)
    if (group) this.cityLights = group as any
  }

}
