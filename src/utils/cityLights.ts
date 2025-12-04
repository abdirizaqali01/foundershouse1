/**
 * City lights utilities — create instanced lights or points-based city lights
 */
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

export function createLightSprite(color: number | string = 0xfff1c8) {
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

export function addCityLights(helsinkiModel: THREE.Group | null, count = 1000, color: number | string = 0xfff1c8, size = 6) {
  if (!helsinkiModel) return null

  // Remove old lights if caller managed that

  const meshes: THREE.Mesh[] = []
  helsinkiModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) meshes.push(child as THREE.Mesh)
  })
  if (meshes.length === 0) return null

  const geometry = new THREE.SphereGeometry(size * 0.25, 4, 4)
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color as any),
    blending: THREE.NormalBlending,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    vertexColors: true,
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

  const computeSurfaceArea = (geom: THREE.BufferGeometry) => {
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
    const idx = geom.getIndex()
    let area = 0
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        a.fromBufferAttribute(posAttr, idx.getX(i))
        b.fromBufferAttribute(posAttr, idx.getX(i + 1))
        c.fromBufferAttribute(posAttr, idx.getX(i + 2))
        area += new THREE.Triangle(a, b, c).getArea()
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        a.fromBufferAttribute(posAttr, i)
        b.fromBufferAttribute(posAttr, i + 1)
        c.fromBufferAttribute(posAttr, i + 2)
        area += new THREE.Triangle(a, b, c).getArea()
      }
    }
    return area
  }

  const meshAreas: number[] = meshes.map((mesh) => {
    try {
      const geom = mesh.geometry as THREE.BufferGeometry
      if (!geom.boundingBox) geom.computeBoundingBox()
      return Math.max(0.000001, computeSurfaceArea(geom))
    } catch (err) {
      return 0.000001
    }
  })

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

export function addCityLightsPoints(helsinkiModel: THREE.Group | null, count = 3000, color: number | string = 0xfff1c8, size = 12) {
  if (!helsinkiModel) return null

  const meshes: THREE.Mesh[] = []
  helsinkiModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) meshes.push(child as THREE.Mesh)
  })
  if (meshes.length === 0) return null

  const positions: number[] = []
  const colors: number[] = []
  const pos = new THREE.Vector3()
  const normal = new THREE.Vector3()

  const computeSurfaceArea = (geom: THREE.BufferGeometry) => {
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
    const idx = geom.getIndex()
    let area = 0
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        a.fromBufferAttribute(posAttr, idx.getX(i))
        b.fromBufferAttribute(posAttr, idx.getX(i + 1))
        c.fromBufferAttribute(posAttr, idx.getX(i + 2))
        area += new THREE.Triangle(a, b, c).getArea()
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        a.fromBufferAttribute(posAttr, i)
        b.fromBufferAttribute(posAttr, i + 1)
        c.fromBufferAttribute(posAttr, i + 2)
        area += new THREE.Triangle(a, b, c).getArea()
      }
    }
    return area
  }

  const meshAreas = meshes.map((mesh) => {
    try {
      const geom = mesh.geometry as THREE.BufferGeometry
      return Math.max(0.000001, computeSurfaceArea(geom))
    } catch (err) {
      return 0.000001
    }
  })
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

  const coreGeom = new THREE.BufferGeometry()
  coreGeom.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3))
  coreGeom.setAttribute('color', new THREE.Float32BufferAttribute(finalColors, 3))

  const coreMaterial = new THREE.PointsMaterial({
    size: Math.max(1, size * 0.25),
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  const corePoints = new THREE.Points(coreGeom, coreMaterial)
  corePoints.frustumCulled = false

  const glowGeom = new THREE.BufferGeometry()
  glowGeom.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3))
  glowGeom.setAttribute('color', new THREE.Float32BufferAttribute(finalColors, 3))

  const sprite = createLightSprite(color)
  const glowMaterial = new THREE.PointsMaterial({
    size: Math.max(4, size * 1.5),
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })

  const glowPoints = new THREE.Points(glowGeom, glowMaterial)
  glowPoints.frustumCulled = false

  const group = new THREE.Group()
  group.add(corePoints)
  group.add(glowPoints)
  // start hidden — scene will reveal when user zooms in / changes orientation
  group.visible = false
  helsinkiModel.add(group)

  console.log('✅ City lights created successfully:', {
    totalLights: count,
    corePointsCount: positions.length / 3,
    meshesProcessed: meshes.length,
    visible: group.visible
  })

  return group
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
