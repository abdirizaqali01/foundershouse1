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

export {
  detectPerformanceTier,
  PerformanceMonitor,
  type PerformanceProfile
} from './performanceDetector'

export {
  isMobileDevice,
  isTabletDevice,
  isLowEndDevice,
  hasSlowConnection,
  getDeviceCapabilities,
  getRecommendedModelPath,
  logDeviceInfo,
  type DeviceCapabilities
} from './deviceDetection'

export {
  setupClickHandler
} from './clickHandlers'

export {
  createCamera,
  createRenderer,
  configureCameraControls,
  createRenderTarget,
  handleResize
} from './sceneSetup'
