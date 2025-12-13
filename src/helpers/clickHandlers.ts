/**
 * Click Handlers
 * Debug utilities for clicking buildings and logging POI coordinates
 */
import * as THREE from 'three'
import { POINTS_OF_INTEREST } from '../constants/poi'

/**
 * Setup click handler for debugging building locations
 * Click on any building to log its world coordinates for POI configuration
 * Hold Shift for more detailed output
 */
export function setupClickHandler(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  getModel: () => THREE.Group | null
): void {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const onClick = (event: MouseEvent) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    // Update the raycaster with camera and mouse position
    raycaster.setFromCamera(mouse, camera)

    // Check for intersections with the Helsinki model
    const helsinkiModel = getModel()
    if (helsinkiModel) {
      const intersects = raycaster.intersectObject(helsinkiModel, true)

      if (intersects.length > 0) {
        const intersection = intersects[0]
        const point = intersection.point

        const coords = {
          x: Math.round(point.x),
          y: Math.round(point.y),
          z: Math.round(point.z)
        }

        const exactCoords = {
          x: Math.round(point.x * 100) / 100,
          y: Math.round(point.y * 100) / 100,
          z: Math.round(point.z * 100) / 100
        }

        // Check if this click is near any known POI
        const nearestPOI = findNearestPOI(point)

        // Log to console with clear formatting
        logClickInfo(coords, exactCoords, intersection, nearestPOI, event.shiftKey)

        // Store in window for dev tools inspection
        storeClickInfo(coords, exactCoords, intersection, nearestPOI)
      }
    }
  }

  renderer.domElement.addEventListener('click', onClick)
}

/**
 * Find nearest POI to a given point
 */
function findNearestPOI(point: THREE.Vector3): { key: string; distance: number } | null {
  let nearestPOI: string | null = null
  let minDistance = Infinity
  const PROXIMITY_THRESHOLD = 100

  Object.entries(POINTS_OF_INTEREST).forEach(([key, poi]) => {
    const dx = point.x - poi.worldCoords.x
    const dy = point.y - poi.worldCoords.y
    const dz = point.z - poi.worldCoords.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (distance < minDistance && distance < PROXIMITY_THRESHOLD) {
      minDistance = distance
      nearestPOI = key
    }
  })

  if (nearestPOI) {
    return { key: nearestPOI, distance: Math.round(minDistance) }
  }

  return null
}

/**
 * Log click information to console
 */
function logClickInfo(
  coords: { x: number; y: number; z: number },
  exactCoords: { x: number; y: number; z: number },
  intersection: THREE.Intersection,
  nearestPOI: { key: string; distance: number } | null,
  showDetailed: boolean
): void {
  console.group(`🏢 Building Clicked`)
  console.log(`📍 World Coordinates:`, coords)
  console.log(`📐 Exact Coordinates:`, exactCoords)
  console.log(`🏷️  Object Name:`, intersection.object.name || 'unnamed')

  if (nearestPOI) {
    const poi = POINTS_OF_INTEREST[nearestPOI.key as keyof typeof POINTS_OF_INTEREST]
    console.log(`🎯 Nearest POI: ${nearestPOI.key} (${poi.name})`)
    console.log(`📏 Distance to POI: ${nearestPOI.distance} units`)
  } else {
    console.log(`🎯 Nearest POI: None nearby`)
  }

  if (showDetailed) {
    console.log(`📊 Detailed Info:`, {
      distance: intersection.distance,
      faceIndex: intersection.faceIndex,
      uv: intersection.uv,
      normal: intersection.normal
    })
  }

  console.groupEnd()
}

/**
 * Store click information in window object for dev tools
 */
function storeClickInfo(
  coords: { x: number; y: number; z: number },
  exactCoords: { x: number; y: number; z: number },
  intersection: THREE.Intersection,
  nearestPOI: { key: string; distance: number } | null
): void {
  ;(window as any).__lastClickedPOI = {
    worldCoords: coords,
    objectName: intersection.object.name || 'unnamed',
    exactCoords,
    nearestPOI: nearestPOI ? {
      key: nearestPOI.key,
      name: POINTS_OF_INTEREST[nearestPOI.key as keyof typeof POINTS_OF_INTEREST].name,
      distance: nearestPOI.distance
    } : null
  }
}
