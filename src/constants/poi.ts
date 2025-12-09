/**
 * Points of Interest (POI) Configuration
 * Centralized location definitions for the entire site
 */

export interface PointOfInterest {
  id: string
  name: string
  description: string
  mapCoords: {
    x: number   // Map X: positive = right, negative = left
    y: number   // Map Y: positive = north, negative = south
  }
  worldCoords: {
    x: number   // World X
    y: number   // World Y (height)
    z: number   // World Z (note: z = -mapY due to model rotation)
  }
  cameraView?: {
    distance?: number
    azimuth?: number
    elevation?: number
  }
}

/**
 * Primary POI - Founders House
 * The main focal point of the experience
 */
export const FOUNDERS_HOUSE_POI: PointOfInterest = {
  id: 'founders-house',
  name: 'Founders House',
  description: 'The heart of innovation and entrepreneurship',
  mapCoords: {
    x: 164,
    y: 804
  },
  worldCoords: {
    x: 164,
    y: 0,
    z: -804
  },
  cameraView: {
    distance: 1007,
    azimuth: -136,
    elevation: 10
  }
}

/**
 * All Points of Interest
 * Add new locations here as the site expands
 */
export const POINTS_OF_INTEREST: Record<string, PointOfInterest> = {
  FOUNDERS_HOUSE: FOUNDERS_HOUSE_POI,
  
  // Example: Add more POIs as needed
  // HARBOR: {
  //   id: 'harbor',
  //   name: 'Helsinki Harbor',
  //   description: 'The vibrant waterfront',
  //   mapCoords: { x: -200, y: 150 },
  //   worldCoords: { x: -200, y: 0, z: -150 },
  //   cameraView: { distance: 1200, azimuth: 90, elevation: 15 }
  // }
}

/**
 * Get POI by ID
 */
export function getPOI(id: string): PointOfInterest | undefined {
  return Object.values(POINTS_OF_INTEREST).find(poi => poi.id === id)
}

/**
 * Get all POI IDs
 */
export function getAllPOIIds(): string[] {
  return Object.values(POINTS_OF_INTEREST).map(poi => poi.id)
}

/**
 * Convert map coordinates to world coordinates
 * Accounts for the model's -90° X-axis rotation
 */
export function mapToWorldCoords(mapX: number, mapY: number, height: number = 0) {
  return {
    x: mapX,
    y: height,
    z: -mapY  // Inverted due to model rotation
  }
}

/**
 * Convert world coordinates to map coordinates
 */
export function worldToMapCoords(worldX: number, worldZ: number) {
  return {
    x: worldX,
    y: -worldZ
  }
}
