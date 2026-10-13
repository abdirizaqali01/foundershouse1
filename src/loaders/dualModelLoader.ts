/**
 * Dual Model Loader
 * Loads main map and fog tiles simultaneously with combined progress
 */
import * as THREE from 'three'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createGLTFLoader } from './createGLTFLoader'

export interface DualLoadParams {
  mainMapPath: string
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: any
  isNightMode?: boolean
  onLoadProgress?: (progress: number) => void
  onLoadComplete?: () => void
  renderer?: THREE.WebGLRenderer
}

export interface DualLoadResult {
  mainMap: THREE.Group
}

// Abort the download if no bytes arrive for this long (dead connection / stalled CDN)
const STALL_TIMEOUT_MS = 20000

/**
 * Download a file with progress, preallocating one buffer when the size is known
 * so the data is not held in memory twice (chunks + concatenated copy).
 */
async function downloadArrayBuffer(
  path: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const controller = new AbortController()
  let stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS)
  const kick = () => {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS)
  }

  try {
    const response = await fetch(path, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    kick()

    const reader = response.body?.getReader()
    if (!reader) return await response.arrayBuffer()

    // content-length is the compressed size when the server gzips, so it can be smaller
    // than the bytes we receive. Only use it as a progress hint, never as a hard size.
    const total = parseInt(response.headers.get('content-length') || '0')
    const chunks: Uint8Array[] = []
    let loaded = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        kick()
        chunks.push(value)
        loaded += value.length
        if (onProgress && total) onProgress(Math.min(loaded, total), total)
      }
    }

    // Single concatenation; chunks are released right after
    const buffer = new Uint8Array(loaded)
    let offset = 0
    for (let i = 0; i < chunks.length; i++) {
      buffer.set(chunks[i], offset)
      offset += chunks[i].length
      chunks[i] = undefined as unknown as Uint8Array
    }
    return buffer.buffer
  } finally {
    clearTimeout(stallTimer)
  }
}

/**
 * Load a single GLB file with progress tracking
 */
async function loadSingleGLB(
  path: string,
  loader: GLTFLoader,
  onProgress?: (loaded: number, total: number) => void
): Promise<THREE.Group> {
  const arrayBuffer = await downloadArrayBuffer(path, onProgress)
  const gltf = await loader.parseAsync(arrayBuffer, '')
  return gltf.scene
}

/**
 * Apply edge fade-out to map meshes
 * Blends the map into the background colour near its edge to prevent a cliff-off.
 * This is done in the shader as a colour mix (not alpha) so the 480 map materials can
 * stay opaque: no per-frame transparent sorting/blending, and early-z still works.
 */
function applyMapEdgeFade(model: THREE.Group, fadeColor: THREE.Color): void {
  model.updateMatrixWorld(true)

  const bbox = new THREE.Box3().setFromObject(model)
  const center = bbox.getCenter(new THREE.Vector3())
  const size = bbox.getSize(new THREE.Vector3())
  const maxRadius = Math.max(size.x, size.z) * 0.5

  const fadeStartDistance = maxRadius * 0.94  // Start fading at 94% from center
  const fadeEndDistance = maxRadius * 0.98    // Fully faded at 98%

  // Materials are shared between many meshes in some exports; only patch each once
  const patched = new Set<THREE.Material>()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return

    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((mat: any) => {
      if (!mat || patched.has(mat)) return
      patched.add(mat)

      mat.onBeforeCompile = (shader: any) => {
        if (shader.uniforms.fadeCenter) return

        shader.uniforms.fadeCenter = { value: center }
        shader.uniforms.fadeStart = { value: fadeStartDistance }
        shader.uniforms.fadeEnd = { value: fadeEndDistance }
        shader.uniforms.fadeColor = { value: fadeColor }

        shader.vertexShader = `
varying vec3 vWorldPosition;
${shader.vertexShader}
`.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        )

        shader.fragmentShader = `
varying vec3 vWorldPosition;
uniform vec3 fadeCenter;
uniform float fadeStart;
uniform float fadeEnd;
uniform vec3 fadeColor;
${shader.fragmentShader}
`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
// Apply grayscale to diffuse color BEFORE fog
float gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gray), 0.6);
// Lower contrast (0.88 = slightly reduced contrast)
diffuseColor.rgb = (diffuseColor.rgb - 0.5) * 0.88 + 0.5;`
        ).replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
float dist = distance(vWorldPosition.xz, fadeCenter.xz);
float fadeProgress = clamp((dist - fadeStart) / (fadeEnd - fadeStart), 0.0, 1.0);
float fadeFactor = 1.0 - (fadeProgress * fadeProgress * fadeProgress); // cubic ease
gl_FragColor.rgb = mix(fadeColor, gl_FragColor.rgb, fadeFactor);`
        )
      }

      mat.needsUpdate = true
    })
  })
}

/**
 * Process and position the main map model
 */
function processMainMap(
  model: THREE.Group,
  camera: THREE.PerspectiveCamera,
  fadeColor: THREE.Color
): void {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())

  if (!isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z) || size.x === 0 || size.y === 0 || size.z === 0) {
    camera.position.set(0, 2000, 5000)
    camera.lookAt(0, 0, 0)
  } else {
    model.rotation.x = -Math.PI / 2
    model.scale.set(1, 1, 1)
    model.updateMatrixWorld(true)
    const rotatedBox = new THREE.Box3().setFromObject(model)
    const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3())

    model.position.set(-rotatedCenter.x, -rotatedCenter.y, -rotatedCenter.z)
  }

  applyMapEdgeFade(model, fadeColor)
}

/**
 * Load main map model
 */
export async function loadDualModels(params: DualLoadParams): Promise<DualLoadResult> {
  const {
    mainMapPath,
    scene,
    camera,
    onLoadProgress,
    onLoadComplete,
    renderer,
  } = params

  const { loader, dispose: disposeLoader } = createGLTFLoader()

  try {
    const mainMapModel = await loadSingleGLB(mainMapPath, loader, (loaded, total) => {
      if (onLoadProgress && total > 0) {
        // Hold at 99% until parsing finishes so the bar never claims "done" early
        onLoadProgress(Math.min((loaded / total) * 100, 99))
      }
    })

    // Fade to the scene background so the map edge blends into the sky
    const fadeColor = scene.background instanceof THREE.Color
      ? scene.background.clone()
      : new THREE.Color(0xFFF8F2)

    processMainMap(mainMapModel, camera, fadeColor)
    scene.add(mainMapModel)

    // Compile shaders without blocking the main thread (replaces 6 synchronous full-scene renders)
    if (renderer) {
      try {
        await renderer.compileAsync(scene, camera)
      } catch {
        // Not fatal: shaders will compile lazily on first render
      }
    }

    // Wait one frame so GPU uploads happen before the render loop gets the "loaded" signal
    requestAnimationFrame(() => {
      onLoadComplete?.()
    })

    return { mainMap: mainMapModel }
  } finally {
    // Frees the Draco worker(s) and their WASM heap
    disposeLoader()
  }
}
