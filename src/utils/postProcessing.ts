import * as THREE from 'three'
import postProcessVertexShader from '../shaders/postProcessVertex.glsl?raw'
import postProcessFragmentShader from '../shaders/postProcessFragment.glsl?raw'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export function setupPostProcessing(renderTarget: THREE.WebGLRenderTarget, perlinTexture: THREE.DataTexture) {
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      uPerlinTexture: { value: perlinTexture },
      uPaperTexture: { value: null },
      uPencilColor: { value: new THREE.Color(0x000000) },
      uPaperColor: { value: new THREE.Color(0xfdfcf5) },
      uTime: { value: 0 },
      uPencilStrength: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) },
    },
    vertexShader: postProcessVertexShader,
    fragmentShader: postProcessFragmentShader,
  })

  const geometry = new THREE.PlaneGeometry(2, 2)
  const quad = new THREE.Mesh(geometry, material)
  scene.add(quad)

  return { scene, camera, material }
}

export function setupComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, postProcessMaterial: THREE.ShaderMaterial) {
  try {
    const composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85)
    bloomPass.threshold = 0.8
    bloomPass.strength = 1.0
    bloomPass.radius = 0.4
    composer.addPass(bloomPass)

    const shaderPass = new (ShaderPass as any)(postProcessMaterial as any)
    shaderPass.renderToScreen = true
    composer.addPass(shaderPass)

    return { composer, bloomPass }
  } catch (err) {
    return { composer: null, bloomPass: null }
  }
}
