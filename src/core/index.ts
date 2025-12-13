/**
 * Core Module
 * Main scene management, camera controls, and managers
 */

export { HelsinkiScene } from './HelsinkiScene_GLB'
export { HelsinkiCameraController } from './HelsinkiCameraController'

// Re-export managers (explicitly to avoid conflicts)
export {
  AutoTourManager,
  POIHighlightManager,
  InteractionManager as SceneInteractionManager,
  type AutoTourConfig,
  type InteractionCallbacks as SceneInteractionCallbacks
} from './managers'

// Re-export camera utilities (explicitly to avoid conflicts)
export {
  BoundaryEasing,
  DragControls,
  CameraInteractionListeners,
  easeOutQuart,
  type BoundaryEasingConfig,
  type DragConfig,
  type InteractionCallbacks as CameraInteractionCallbacks
} from './camera'
