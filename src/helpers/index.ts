/**
 * Helpers Module  
 * Utility functions: geometry operations, time utilities, procedural generation, camera utilities
 */

export {
  collectMeshes,
  computeSurfaceArea,
  computeMeshAreas,
  updateMaterialsInHierarchy,
  isLineSegmentsWithBasicMaterial
} from './geometryHelpers'

export {
  isNightInHelsinki,
  getHelsinkiHour
} from './timeUtils'

export {
  PerlinNoiseGenerator
} from './perlinNoise'

export {
  type CameraConfig,
  CAMERA_PRESETS,
  polarToCartesian,
  cartesianToPolar,
  applyCameraConfig,
  getCurrentCameraConfig,
  formatCameraConfigAsCode
} from './cameraUtils'
