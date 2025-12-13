/**
 * Street Lights
 * Creates lights along street edges of the 3D model
 */
import * as THREE from 'three'
import { collectMeshes } from '../helpers'
import { createLightSprite } from './lightSprite'

/**
 * Create street lights along edges of the model
 * Analyzes edge geometry to find long paths and places lights along them
 */
export function addStreetLights(
  helsinkiModel: THREE.Group | null,
  spacing: number = 100,
  color: number | string = 0xfff5d4
): THREE.Group | null {
  if (!helsinkiModel) return null

  const meshes = collectMeshes(helsinkiModel)
  if (meshes.length === 0) return null

  const streetLightPositions = extractStreetLightPositions(helsinkiModel, meshes, spacing)

  if (streetLightPositions.length === 0) {
    return null
  }

  const group = createStreetLightGroups(streetLightPositions, color)
  group.visible = false

  helsinkiModel.add(group)
  return group
}

/**
 * Extract street light positions from mesh edges
 */
function extractStreetLightPositions(
  helsinkiModel: THREE.Group,
  meshes: THREE.Mesh[],
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []

  helsinkiModel.updateMatrixWorld(true)

  const meshSampleRate = meshes.length > 50 ? 2 : 1
  meshes.forEach((mesh, meshIndex) => {
    if (meshIndex % meshSampleRate !== 0) return

    const geometry = mesh.geometry
    const positionAttribute = geometry.getAttribute('position')
    if (!positionAttribute) return

    mesh.updateMatrixWorld(true)

    const edges = new THREE.EdgesGeometry(geometry, 15)
    const edgePositions = edges.getAttribute('position')

    const edgeSampleRate = edgePositions.count > 1000 ? 4 : 2
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

      start.applyMatrix4(mesh.matrixWorld)
      end.applyMatrix4(mesh.matrixWorld)

      const length = start.distanceTo(end)
      const yDiff = Math.abs(end.y - start.y)
      const xzDist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.z - start.z, 2))

      // Filter: edge must be long and horizontal (street-like)
      if (length > 50 && yDiff < length * 0.3 && xzDist > 40) {
        const numLights = Math.floor(length / spacing)
        for (let j = 0; j <= numLights; j++) {
          const t = j / Math.max(numLights, 1)
          const pos = new THREE.Vector3().lerpVectors(start, end, t)
          pos.y += 15 // Lift lights above ground
          positions.push(pos)
        }
      }
    }

    edges.dispose()
  })

  return positions
}

/**
 * Create street light point groups with flickering
 */
function createStreetLightGroups(
  positions: THREE.Vector3[],
  color: number | string
): THREE.Group {
  const group = new THREE.Group()

  const posArray = new Float32Array(positions.length * 3)
  const flickerOffsets = new Float32Array(positions.length)
  const flickerSpeeds = new Float32Array(positions.length)

  positions.forEach((pos, i) => {
    posArray[i * 3] = pos.x
    posArray[i * 3 + 1] = pos.y
    posArray[i * 3 + 2] = pos.z
    flickerOffsets[i] = Math.random() * 100
    flickerSpeeds[i] = 0.5 + Math.random() * 1.5
  })

  const lightsPerGroup = 100
  const totalLights = positions.length

  for (let groupStart = 0; groupStart < totalLights; groupStart += lightsPerGroup) {
    const groupEnd = Math.min(groupStart + lightsPerGroup, totalLights)
    const groupSize = groupEnd - groupStart

    const groupPositions = new Float32Array(groupSize * 3)
    const groupFlickerOffsets = new Float32Array(groupSize)
    const groupFlickerSpeeds = new Float32Array(groupSize)

    for (let i = 0; i < groupSize; i++) {
      const sourceIdx = groupStart + i
      groupPositions[i * 3] = posArray[sourceIdx * 3]
      groupPositions[i * 3 + 1] = posArray[sourceIdx * 3 + 1]
      groupPositions[i * 3 + 2] = posArray[sourceIdx * 3 + 2]
      groupFlickerOffsets[i] = flickerOffsets[sourceIdx]
      groupFlickerSpeeds[i] = flickerSpeeds[sourceIdx]
    }

    const groupGeometry = new THREE.BufferGeometry()
    groupGeometry.setAttribute('position', new THREE.BufferAttribute(groupPositions, 3))
    groupGeometry.setAttribute('flickerOffset', new THREE.BufferAttribute(groupFlickerOffsets, 1))
    groupGeometry.setAttribute('flickerSpeed', new THREE.BufferAttribute(groupFlickerSpeeds, 1))

    // Core bright lights
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

    // Glow layer
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

  return group
}
