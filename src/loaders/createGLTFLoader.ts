/**
 * Shared GLTF loader factory
 * Uses the self-hosted Draco decoder (WASM with JS fallback) from /draco/
 * so the map never depends on a third-party CDN being reachable.
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export function createGLTFLoader(): { loader: GLTFLoader; dispose: () => void } {
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  // Fewer workers = lower peak memory on phones (each worker holds its own decoder heap)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024
  dracoLoader.setWorkerLimit(isMobile ? 1 : 2)
  loader.setDRACOLoader(dracoLoader)
  return { loader, dispose: () => dracoLoader.dispose() }
}
