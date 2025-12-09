/**
 * Map Boundary Constants
 * Define the explorable area limits to prevent users from going outside the map
 * 
 * Map Setup: 2x2 tile grid, each tile is 3km x 3km (1.5km radius)
 * Total map size: 6km x 6km (6000m x 6000m)
 * 
 * Coordinates are in world space (x, z) - Y is height
 * Units are in meters (Three.js world units = meters)
 */

/**
 * Map Boundaries
 * 2x2 grid of tiles, each 3000m x 3000m (1.5km radius = 3km diameter)
 * Total coverage: 6000m x 6000m centered around origin
 */
export const MAP_BOUNDARIES = {
  // X-axis boundaries (east-west): ±3km from center
  x: {
    min: -3000,         // Western boundary (-3km)
    max: 3000,          // Eastern boundary (+3km)
  },
  
  // Z-axis boundaries (north-south): ±3km from center
  z: {
    min: -3000,         // Southern boundary (-3km)
    max: 3000,          // Northern boundary (+3km)
  }
} as const

/**
 * Check if a position is within map boundaries
 */
export function isWithinMapBounds(x: number, z: number): boolean {
  return (
    x >= MAP_BOUNDARIES.x.min &&
    x <= MAP_BOUNDARIES.x.max &&
    z >= MAP_BOUNDARIES.z.min &&
    z <= MAP_BOUNDARIES.z.max
  )
}

/**
 * Clamp a position to map boundaries
 */
export function clampToMapBounds(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(MAP_BOUNDARIES.x.min, Math.min(MAP_BOUNDARIES.x.max, x)),
    z: Math.max(MAP_BOUNDARIES.z.min, Math.min(MAP_BOUNDARIES.z.max, z))
  }
}
