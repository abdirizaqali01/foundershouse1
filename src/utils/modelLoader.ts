/**
 * Model Loader
 * Responsible for loading the Helsinki GLB and positioning it in the scene.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export interface LoadParams {
  modelPath: string
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: any
  isNightMode?: boolean
  onLoadProgress?: (progress: number) => void
  onLoadComplete?: () => void
}

export async function loadHelsinkiModel(params: LoadParams): Promise<THREE.Group | null> {
  const { modelPath, scene, camera, controls, isNightMode = false, onLoadProgress, onLoadComplete } = params

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    dracoLoader.setDecoderConfig({ type: 'js' })
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene
        console.log('🔧 Model loaded, processing wireframes...')

        // Apply solid material + wireframe overlay
        let meshCount = 0
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log('📐 Processing mesh:', child.name || 'unnamed')
            
            // Create light solid base material
            child.material = new THREE.MeshBasicMaterial({
              color: isNightMode ? 0x3a3a42 : 0xe8e5d8, // Light beige for day, darker gray for night
              transparent: true,
              opacity: isNightMode ? 0.8 : 0.8,
            })
            
            // Add thin wireframe overlay
            const edges = new THREE.EdgesGeometry(child.geometry)
            const lineMaterial = new THREE.LineBasicMaterial({
              color: isNightMode ? 0x4a4a52 : 0x2b0a05,
              linewidth: 1,
              transparent: true,
              opacity: isNightMode ? 0.6 : 0.8,
            })
            
            const wireframe = new THREE.LineSegments(edges, lineMaterial)
            wireframe.position.copy(child.position)
            wireframe.rotation.copy(child.rotation)
            wireframe.scale.copy(child.scale)
            wireframe.frustumCulled = false
            
            if (child.parent) {
              child.parent.add(wireframe)
            }
            
            child.visible = true
            child.frustumCulled = false
            meshCount++
          }
        })
        
        console.log(`✅ Applied solid material + wireframes to ${meshCount} meshes`)

        // Compute bounding box and position model
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
          const rotatedSize = rotatedBox.getSize(new THREE.Vector3())

          model.position.set(-rotatedCenter.x, -rotatedCenter.y, -rotatedCenter.z)

          const maxDim = Math.max(rotatedSize.x, rotatedSize.z)
          const fov = camera.fov * (Math.PI / 180)
          const cameraDistance = maxDim / (2 * Math.tan(fov / 2))
          const cameraHeight = cameraDistance * 1.2

          camera.position.set(0, cameraHeight, cameraDistance * 0.3)
          camera.lookAt(0, 0, 0)
          controls.target.set(0, 0, 0)
        }

        scene.add(model)

        // Defer city light placement to the caller after the model is assigned

        if (onLoadComplete) onLoadComplete()
        resolve(model)
      },
      (xhr) => {
        if (xhr && xhr.total && onLoadProgress) {
          const progress = (xhr.loaded / xhr.total) * 100
          onLoadProgress(progress)
        }
      },
      (err) => {
        // loader error
        reject(err)
      }
    )
  })
}
