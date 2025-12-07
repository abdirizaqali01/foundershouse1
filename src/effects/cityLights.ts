/**
 * City lights utilities — create instanced lights or points-based city lights
 */
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { CITY_LIGHTS } from '../constants/designSystem'
import { collectMeshes, computeMeshAreas } from '../helpers'

// Custom shader for per-point flickering
const vertexShader = `
  attribute float flickerState;
  attribute vec3 customColor;
  varying float vFlickerState;
  varying vec3 vColor;
  varying float vFogDepth;

  void main() {
    vFlickerState = flickerState;
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    gl_PointSize = 15.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform sampler2D pointTexture;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying float vFlickerState;
  varying vec3 vColor;
  varying float vFogDepth;

  void main() {
    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
    float opacity = vFlickerState * texColor.a;
    vec4 baseColor = vec4(vColor, opacity);
    
    // Apply fog
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor = mix(baseColor, vec4(fogColor, baseColor.a), fogFactor);
  }
`

const glowVertexShader = `
  attribute float flickerState;
  varying float vFlickerState;
  varying float vFogDepth;

  void main() {
    vFlickerState = flickerState;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mvPosition.z;
    gl_PointSize = 80.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const glowFragmentShader = `
  uniform sampler2D pointTexture;
  uniform vec3 color;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying float vFlickerState;
  varying float vFogDepth;

  void main() {
    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
    float opacity = vFlickerState * 0.6 * texColor.a;
    vec4 baseColor = vec4(color, opacity);
    
    // Apply fog
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    gl_FragColor = mix(baseColor, vec4(fogColor, baseColor.a), fogFactor);
  }
`

export function createLightSprite(color: number | string = CITY_LIGHTS.color) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)
  const col = new THREE.Color(color as any)
  const r = Math.floor(col.r * 255)
  const g = Math.floor(col.g * 255)
  const b = Math.floor(col.b * 255)

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0.0, `rgba(${r},${g},${b},1)`)
  gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.8)`)
  gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`)
  gradient.addColorStop(1.0, `rgba(${r},${g},${b},0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function addCityLights(helsinkiModel: THREE.Group | null, count = 1000, color: number | string = CITY_LIGHTS.color, size = 6) {
  if (!helsinkiModel) return null

  // Remove old lights if caller managed that

  const meshes = collectMeshes(helsinkiModel)
  if (meshes.length === 0) return null

  const geometry = new THREE.SphereGeometry(size * 0.25, 4, 4)
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color as any),
    blending: THREE.NormalBlending,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    vertexColors: true,
    fog: true, // Enable fog for city lights
  })

  const inst = new THREE.InstancedMesh(geometry, mat, count)
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

  const instanceColors = new Float32Array(count * 3)
  const pos = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const quat = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const matrix = new THREE.Matrix4()

  let placed = 0
  helsinkiModel.updateMatrixWorld(true)

  const modelInvMatrix = new THREE.Matrix4().copy(helsinkiModel.matrixWorld).invert()
  const modelNormalMatrix = new THREE.Matrix3().getNormalMatrix(modelInvMatrix)

  const meshAreas = computeMeshAreas(meshes)

  const totalArea = meshAreas.reduce((s, v) => s + v, 0)

  for (let m = 0; m < meshes.length; m++) {
    if (placed >= count) break
    const mesh = meshes[m]
    const area = meshAreas[m]
    const samplesForMesh = Math.max(1, Math.round((area / totalArea) * count))
    try {
      mesh.updateMatrixWorld(true)
      const sampler = new MeshSurfaceSampler(mesh as any).build()
      for (let i = 0; i < samplesForMesh; i++) {
        if (placed >= count) break
        sampler.sample(pos, normal)
        mesh.localToWorld(pos)
        const meshNormalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
        normal.applyMatrix3(meshNormalMatrix).normalize()
        pos.add(normal.clone().multiplyScalar(0.5 + Math.random() * 1.0))
        helsinkiModel.worldToLocal(pos)
        normal.applyMatrix3(modelNormalMatrix).normalize()
        const s = 0.15 + Math.random() * 0.35
        scale.set(s, s, s)
        quat.setFromUnitVectors(up, normal.clone().normalize())
        matrix.compose(pos.clone(), quat, scale)
        inst.setMatrixAt(placed, matrix)
        const base = new THREE.Color(color as any)
        const v = 0.7 + Math.random() * 0.35
        base.multiplyScalar(v)
        instanceColors[placed * 3] = base.r
        instanceColors[placed * 3 + 1] = base.g
        instanceColors[placed * 3 + 2] = base.b
        placed++
      }
    } catch (err) {
      continue
    }
  }

  if (placed === 0) {
    geometry.dispose()
    mat.dispose()
    return null
  }

  if (placed < count) inst.count = placed

  inst.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3)
  inst.instanceMatrix.needsUpdate = true
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  inst.frustumCulled = false
  // start hidden — we'll enable visibility from the scene when user zooms/rotates
  inst.visible = false
  helsinkiModel.add(inst)
  return inst
}

export function addCityLightsPoints(helsinkiModel: THREE.Group | null, count = 3000, color: number | string = CITY_LIGHTS.color) {
  if (!helsinkiModel) return null

  const meshes = collectMeshes(helsinkiModel)
  if (meshes.length === 0) return null

  const positions: number[] = []
  const colors: number[] = []
  const pos = new THREE.Vector3()
  const normal = new THREE.Vector3()

  const meshAreas = computeMeshAreas(meshes)
  const totalArea = meshAreas.reduce((s, v) => s + v, 0)

  let placed = 0
  for (let m = 0; m < meshes.length; m++) {
    if (placed >= count) break
    const mesh = meshes[m]
    const samplesForMesh = Math.max(1, Math.round((meshAreas[m] / totalArea) * count))
    try {
      mesh.updateMatrixWorld(true)
      const sampler = new MeshSurfaceSampler(mesh as any).build()
      for (let i = 0; i < samplesForMesh; i++) {
        if (placed >= count) break
        sampler.sample(pos, normal)
        mesh.localToWorld(pos)
        const meshNormalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
        normal.applyMatrix3(meshNormalMatrix).normalize()
        pos.add(normal.clone().multiplyScalar(0.5 + Math.random() * 0.8))
        helsinkiModel.worldToLocal(pos)
        positions.push(pos.x, pos.y, pos.z)
        const palette = [0xfff6d0, 0xffdca3, 0xffb86b, 0xffffff, 0xcfe8ff, 0xffc6d1]
        const pick = palette[Math.floor(Math.random() * palette.length)]
        const base = new THREE.Color(pick as any)
        const v = 0.7 + Math.random() * 0.4
        base.multiplyScalar(v)
        colors.push(base.r, base.g, base.b)
        placed++
      }
    } catch (err) {
      continue
    }
  }

  if (placed === 0) return null

  const finalPositions = positions.slice(0, placed * 3)
  const finalColors = colors.slice(0, placed * 3)

  // Initialize flicker state for each individual light
  const flickerStates = new Float32Array(placed)
  const nextFlickerTimes = new Float32Array(placed)
  const flickerDurations = new Float32Array(placed)

  // Initialize each light with random initial state
  for (let i = 0; i < placed; i++) {
    flickerStates[i] = 1.0 // Start on
    nextFlickerTimes[i] = Math.random() * 15 // First flicker in 0-15 seconds (spread out!)
    flickerDurations[i] = 0
  }

  const coreGeom = new THREE.BufferGeometry()
  coreGeom.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3))
  coreGeom.setAttribute('customColor', new THREE.Float32BufferAttribute(finalColors, 3))
  coreGeom.setAttribute('flickerState', new THREE.Float32BufferAttribute(flickerStates, 1))

  const sprite = createLightSprite(color)

  // Use custom shader material for per-point flickering
  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: sprite },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 0 },
      fogFar: { value: 0 }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    fog: true, // Enable fog
  })

  const corePoints = new THREE.Points(coreGeom, coreMaterial)
  corePoints.frustumCulled = false

  // Store flicker timing data on userData
  corePoints.userData.nextFlickerTimes = nextFlickerTimes
  corePoints.userData.flickerDurations = flickerDurations

  // Glow layer with same shader approach
  const glowGeom = new THREE.BufferGeometry()
  glowGeom.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3))
  glowGeom.setAttribute('flickerState', new THREE.Float32BufferAttribute(flickerStates, 1))

  const avgColor = new THREE.Color(color as any)
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: sprite },
      color: { value: avgColor },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 0 },
      fogFar: { value: 0 }
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    fog: true, // Enable fog
  })

  const glowPoints = new THREE.Points(glowGeom, glowMaterial)
  glowPoints.frustumCulled = false
  glowPoints.userData.nextFlickerTimes = nextFlickerTimes
  glowPoints.userData.flickerDurations = flickerDurations

  const group = new THREE.Group()
  group.add(corePoints)
  group.add(glowPoints)

  // start hidden — scene will reveal when user zooms in / changes orientation
  group.visible = false
  helsinkiModel.add(group)

  return group
}

/**
 * Create street lights along edges of the model
 * Analyzes edge geometry to find long paths and places lights along them
 */
export function addStreetLights(helsinkiModel: THREE.Group | null, spacing = 100, color: number | string = 0xfff5d4) {
  if (!helsinkiModel) return null

  const meshes = collectMeshes(helsinkiModel)
  if (meshes.length === 0) return null

  const streetLightPositions: THREE.Vector3[] = []

  // Ensure model's world matrix is up to date
  helsinkiModel.updateMatrixWorld(true)

  // Process each mesh to find edges (optimized: sample every nth mesh for performance)
  const meshSampleRate = meshes.length > 50 ? 2 : 1 // Skip every other mesh if scene is complex
  meshes.forEach((mesh, meshIndex) => {
    if (meshIndex % meshSampleRate !== 0) return // Skip meshes for performance

    const geometry = mesh.geometry
    const positionAttribute = geometry.getAttribute('position')
    if (!positionAttribute) return

    // Ensure mesh world matrix is updated
    mesh.updateMatrixWorld(true)

    // Get edges using EdgesGeometry (same as what we use for rendering)
    const edges = new THREE.EdgesGeometry(geometry, 15)
    const edgePositions = edges.getAttribute('position')

    // Extract edge segments (pairs of points) - sample fewer edges for performance
    const edgeSampleRate = edgePositions.count > 1000 ? 4 : 2 // Sample every 4th or 2nd edge
    for (let i = 0; i < edgePositions.count; i += edgeSampleRate * 2) {
      const start = new THREE.Vector3(
        edgePositions.getX(i),
        edgePositions.getY(i),
        edgePositions.getZ(i)
      )
      const end = new THREE.Vector3(
        edgePositions.getX(i + 1),
        edgePositions.getY(i + 1),
        edgePositions.getZ(i + 1)
      )

      // Apply mesh transformations
      start.applyMatrix4(mesh.matrixWorld)
      end.applyMatrix4(mesh.matrixWorld)

      const length = start.distanceTo(end)

      // Only place lights on edges that are reasonably long (likely streets)
      // and roughly horizontal (Y difference small relative to XZ distance)
      const yDiff = Math.abs(end.y - start.y)
      const xzDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.z - start.z, 2))

      // Filter: edge must be > 50 units long and relatively horizontal (street-like)
      if (length > 50 && yDiff < length * 0.3 && xzDist > 40) {
        // Place lights along this edge
        const numLights = Math.floor(length / spacing)
        for (let j = 0; j <= numLights; j++) {
          const t = j / Math.max(numLights, 1)
          const pos = new THREE.Vector3().lerpVectors(start, end, t)
          // Lift lights slightly above ground
          pos.y += 15
          streetLightPositions.push(pos)
        }
      }
    }

    edges.dispose()
  })

  if (streetLightPositions.length === 0) {
    return null
  }

  // Create point lights visualization
  const positions = new Float32Array(streetLightPositions.length * 3)
  const flickerOffsets = new Float32Array(streetLightPositions.length)
  const flickerSpeeds = new Float32Array(streetLightPositions.length)

  streetLightPositions.forEach((pos, i) => {
    positions[i * 3] = pos.x
    positions[i * 3 + 1] = pos.y
    positions[i * 3 + 2] = pos.z

    // Random flicker attributes for each street light
    flickerOffsets[i] = Math.random() * 100
    flickerSpeeds[i] = 0.5 + Math.random() * 1.5
  })

  const group = new THREE.Group()
  group.visible = false // Start hidden, will be shown in night mode

  // Split street lights into multiple groups for independent flickering
  const lightsPerGroup = 100 // Split into groups of 100 lights each
  const totalLights = streetLightPositions.length

  for (let groupStart = 0; groupStart < totalLights; groupStart += lightsPerGroup) {
    const groupEnd = Math.min(groupStart + lightsPerGroup, totalLights)
    const groupSize = groupEnd - groupStart

    // Create positions for this group
    const groupPositions = new Float32Array(groupSize * 3)
    const groupFlickerOffsets = new Float32Array(groupSize)
    const groupFlickerSpeeds = new Float32Array(groupSize)

    for (let i = 0; i < groupSize; i++) {
      const sourceIdx = groupStart + i
      groupPositions[i * 3] = positions[sourceIdx * 3]
      groupPositions[i * 3 + 1] = positions[sourceIdx * 3 + 1]
      groupPositions[i * 3 + 2] = positions[sourceIdx * 3 + 2]
      groupFlickerOffsets[i] = flickerOffsets[sourceIdx]
      groupFlickerSpeeds[i] = flickerSpeeds[sourceIdx]
    }

    // Create geometry for this group
    const groupGeometry = new THREE.BufferGeometry()
    groupGeometry.setAttribute('position', new THREE.BufferAttribute(groupPositions, 3))
    groupGeometry.setAttribute('flickerOffset', new THREE.BufferAttribute(groupFlickerOffsets, 1))
    groupGeometry.setAttribute('flickerSpeed', new THREE.BufferAttribute(groupFlickerSpeeds, 1))

    // Core bright lights for this group
    const coreMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(color as any),
      size: 18,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const corePoints = new THREE.Points(groupGeometry, coreMaterial)
    corePoints.frustumCulled = false
    group.add(corePoints)

    // Glow layer for this group
    const glowTexture = createLightSprite(color)
    const glowMaterial = new THREE.PointsMaterial({
      size: 80,
      map: glowTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const glowGeometry = groupGeometry.clone()
    const glowPoints = new THREE.Points(glowGeometry, glowMaterial)
    glowPoints.frustumCulled = false
    group.add(glowPoints)
  }

  helsinkiModel.add(group)

  return group
}

/**
 * Animate city lights with per-point discrete random flickering
 * Optimized: only update lights that need state changes, skip unnecessary updates
 */
export function animateCityLights(cityLights: THREE.Object3D, elapsed: number) {
  if (!cityLights) return

  cityLights.traverse((child) => {
    if (child instanceof THREE.Points) {
      const geometry = child.geometry
      const flickerStateAttr = geometry.getAttribute('flickerState')

      if (!flickerStateAttr || !child.userData.nextFlickerTimes) return

      const nextFlickerTimes = child.userData.nextFlickerTimes
      const flickerDurations = child.userData.flickerDurations
      const flickerStates = flickerStateAttr.array as Float32Array

      let needsUpdate = false

      // Only check/update lights that are due for a state change
      // This significantly reduces CPU usage
      for (let i = 0; i < flickerStates.length; i++) {
        if (elapsed >= nextFlickerTimes[i]) {
          needsUpdate = true

          if (flickerStates[i] > 0.5) {
            // Currently on - flicker off
            flickerStates[i] = 0.2 + Math.random() * 0.2 // Dim to 20-40%
            // Flicker lasts 0.05-0.3 seconds
            flickerDurations[i] = 0.05 + Math.random() * 0.25
            nextFlickerTimes[i] = elapsed + flickerDurations[i]
          } else {
            // Currently off - turn back on
            flickerStates[i] = 1.0 // Full brightness
            // Wait 2-12 seconds before next flicker (much longer, more subtle!)
            const waitTime = 2.0 + Math.random() * 10.0
            nextFlickerTimes[i] = elapsed + waitTime
          }
        }
      }

      // Only mark for update if something actually changed
      if (needsUpdate) {
        flickerStateAttr.needsUpdate = true
      }
    }
  })
}

/**
 * Update fog uniforms for city lights shader materials
 */
export function updateCityLightsFog(cityLights: THREE.Object3D, scene: THREE.Scene) {
  if (!cityLights || !scene.fog) return

  const fog = scene.fog as THREE.Fog
  const fogColor = fog.color
  const fogNear = fog.near
  const fogFar = fog.far

  cityLights.traverse((child) => {
    if (child instanceof THREE.Points) {
      const material = child.material as THREE.ShaderMaterial
      if (material.uniforms) {
        if (material.uniforms.fogColor) material.uniforms.fogColor.value.copy(fogColor)
        if (material.uniforms.fogNear) material.uniforms.fogNear.value = fogNear
        if (material.uniforms.fogFar) material.uniforms.fogFar.value = fogFar
      }
    }
  })
}

export function removeCityLights(cityLights: any) {
  if (!cityLights) return
  try {
    if (cityLights.geometry) cityLights.geometry.dispose()
    const mat = cityLights.material
    if (mat) {
      if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose())
      else mat.dispose()
    }
  } catch (err) {
    // ignore
  }
}
