/**
 * Light Sprite Generator
 * Creates radial gradient textures for point lights
 */
import * as THREE from 'three'
import { CITY_LIGHTS } from '../constants/designSystem'

/**
 * Create a light sprite texture with radial gradient
 */
export function createLightSprite(color: number | string = CITY_LIGHTS.color): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)
  const col = new THREE.Color(color as any)
  const r = Math.floor(col.r * 255)
  const g = Math.floor(col.g * 255)
  const b = Math.floor(col.b * 255)

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0.0, `rgba(${r},${g},${b},1)`)
  gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.8)`)
  gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.35)`)
  gradient.addColorStop(1.0, `rgba(${r},${g},${b},0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}
