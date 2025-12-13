/**
 * Animation Module
 * Camera animations, transitions, and motion controllers
 */

export {
  createCinematicAnimation,
  updateCinematicAnimation,
  getAnimationProgress,
  cinematicEaseOut,
  type CinematicAnimationState
} from './cinematicAnimation'

export {
  createPOITransition,
  updatePOITransition,
  cancelPOITransition,
  type POITransitionState
} from './poiTransition'
