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
  createIdleRotation,
  updateIdleRotation,
  stopIdleRotation,
  type IdleRotationState
} from './idleRotation'
