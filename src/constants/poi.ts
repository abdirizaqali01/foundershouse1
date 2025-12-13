/**
 * Points of Interest (POI) Configuration
 * Centralized location definitions for the entire site
 * 
 * USAGE - Smooth Camera Transitions to POIs:
 * 
 * From browser console:
 *   window.helsinkiScene.focusPOI('FOUNDERS_HOUSE')           // Fly to Founders House (2s animation)
 *   window.helsinkiScene.focusPOI('OURA', 600, 45, 12, 1.5)   // Fly to Oura, custom distance/angle/duration
 *   window.helsinkiScene.focusPOI('WOLT', 800)                 // Fly to Wolt at 800m distance
 * 
 * Parameters:
 *   - poiName: POI key (e.g., 'FOUNDERS_HOUSE', 'OURA', 'WOLT')
 *   - distance: Camera distance from POI in meters (default: 700)
 *   - azimuth: Horizontal viewing angle in degrees (default: 90)
 *   - elevation: Vertical viewing angle in degrees (default: 15)
 *   - duration: Animation duration in seconds (default: 2.0)
 *   - animated: Whether to animate or jump instantly (default: true)
 * 
 * Features:
 *   - Smooth ease-in-out animation
 *   - User can interrupt by clicking/dragging
 *   - Callback on arrival
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
 * Oura Ring HQ
 * TODO: Click on the actual Oura building to get correct coordinates
 */
export const OURA_POI: PointOfInterest = {
  id: 'oura',
  name: 'Oura',
  description: 'Oura Ring - Health technology and wearables',
  mapCoords: {
    x: 804,
    y: 520
  },
  worldCoords: {
    x: 804,
    y: -47,
    z: -520
  },
  cameraView: {
    distance: 280,
    azimuth: 90,
    elevation: 40
  }
}

/**
 * Wolt HQ
 * Located at world coordinates: x: -99, y: -38, z: -781
 */
export const WOLT_POI: PointOfInterest = {
  id: 'wolt',
  name: 'Wolt',
  description: 'Wolt - Food delivery and logistics platform',
  mapCoords: {
    x: -99,
    y: 781
  },
  worldCoords: {
    x: -99,
    y: -38,
    z: -781
  },
  cameraView: {
    distance: 320,
    azimuth: 90,
    elevation: 40
  }
}

/**
 * Lifeline Ventures
 * TODO: Click on the actual Lifeline building to get correct coordinates
 */
export const LIFELINE_VENTURES_POI: PointOfInterest = {
  id: 'lifeline-ventures',
  name: 'Lifeline Ventures',
  description: 'Lifeline Ventures - Early-stage venture capital',
  mapCoords: {
    x: 233,
    y: -691
  },
  worldCoords: {
    x: 233,
    y: -48,
    z: 691
  },
  cameraView: {
    distance: 300,
    azimuth: 90,
    elevation: 40
  }
}

/**
 * Silo AI
 * TODO: Click on the actual Silo AI building to get correct coordinates
 * Currently using placeholder - NEEDS DIFFERENT COORDS FROM LIFELINE
 */
export const SILO_AI_POI: PointOfInterest = {
  id: 'silo-ai',
  name: 'Silo AI',
  description: 'Silo AI - Europe\'s largest private AI lab',
  mapCoords: {
    x: -200,
    y: -500
  },
  worldCoords: {
    x: -200,
    y: -48,
    z: 500
  },
  cameraView: {
    distance: 290,
    azimuth: 90,
    elevation: 40
  }
}

/**
 * Wave Ventures
 * TODO: Click on the actual Wave Ventures building to get correct coordinates
 */
export const WAVE_VENTURES_POI: PointOfInterest = {
  id: 'wave-ventures',
  name: 'Wave Ventures',
  description: 'Wave Ventures - Venture capital and startup acceleration',
  mapCoords: {
    x: 52,
    y: 529
  },
  worldCoords: {
    x: 52,
    y: -37,
    z: -529
  },
  cameraView: {
    distance: 310,
    azimuth: 90,
    elevation: 40
  }
}

/**
 * All Points of Interest
 * Add new locations here as the site expands
 */
export const POINTS_OF_INTEREST: Record<string, PointOfInterest> = {
  FOUNDERS_HOUSE: FOUNDERS_HOUSE_POI,
  OURA: OURA_POI,
  WOLT: WOLT_POI,
  LIFELINE_VENTURES: LIFELINE_VENTURES_POI,
  SILO_AI: SILO_AI_POI,
  WAVE_VENTURES: WAVE_VENTURES_POI,
}
