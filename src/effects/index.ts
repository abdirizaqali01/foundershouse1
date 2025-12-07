/**
 * Effects Module
 * Visual effects: fog, city lights, stars, and atmospheric effects
 */

export {
  setupSceneFog,
  updateFogColor,
  disableFog,
  enableFog,
  updateFogForAnimation
} from './fogManager'

export {
  createLightSprite,
  addCityLights,
  addCityLightsPoints,
  addStreetLights,
  animateCityLights,
  updateCityLightsFog,
  removeCityLights
} from './cityLights'

export {
  createStarfield,
  animateStars
} from './stars'
