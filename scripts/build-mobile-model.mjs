/**
 * Builds the lightweight mobile map model from the full desktop model.
 *
 *   node scripts/build-mobile-model.mjs
 *
 * Input : public/models/fh.glb          (desktop model, never modified)
 * Output: public/models/fh-mobile.glb
 *
 * What it does:
 *   1. Packs the 480 per-building textures (≈116 MP decoded, 450 MB+ of GPU memory)
 *      into ONE atlas and remaps every primitive's UVs into its atlas cell.
 *   2. Simplifies every primitive (border-locked, so atlas cells never bleed into each other).
 *   3. Merges everything into a single mesh / single material (1 draw call instead of 480).
 *   4. Writes Draco-compressed geometry + a WebP atlas.
 *
 * Tweak via env: ERROR (default 0.05), LOCK=0 to unlock borders (fewer triangles but spiky artifacts),
 * ATLAS_SIZE (default 4096), GRID (default 22), SMOOTH_ANGLE (default 35)
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, simplify, join, dedup, prune, draco, getBounds } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = path.join(root, 'public/models/fh.glb')
const OUTPUT = path.join(root, 'public/models/fh-mobile.glb')

const RATIO = parseFloat(process.env.TRIANGLE_RATIO ?? '0.25')
const ATLAS = parseInt(process.env.ATLAS_SIZE ?? '4096')
const GRID = parseInt(process.env.GRID ?? '22')       // GRID*GRID cells, must be >= texture count
const PAD = 8                                          // edge-extended gutter per cell (px)
const CELL = Math.floor(ATLAS / GRID)
const INNER = CELL - PAD * 2

await MeshoptSimplifier.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })

const doc = await io.read(INPUT)
const rootDoc = doc.getRoot()
const countTris = () => rootDoc.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0)

const sceneBounds = (document) => getBounds(document.getRoot().listScenes()[0])
const boundsBefore = sceneBounds(doc)
const trisBefore = countTris()
const prims = rootDoc.listMeshes().flatMap((m) => m.listPrimitives())
if (prims.length > GRID * GRID) throw new Error(`${prims.length} primitives do not fit a ${GRID}x${GRID} grid`)

// ---- 1. Atlas ------------------------------------------------------------
// Verify every material is "the same except for its texture", since we collapse them into one.
// Use the majority setting (doubleSided: true) as the base; a lone single-sided material is merged into it.
const base = rootDoc.listMaterials().find((m) => m.getDoubleSided()) ?? rootDoc.listMaterials()[0]
for (const m of rootDoc.listMaterials()) {
  const same =
    m.getRoughnessFactor() === base.getRoughnessFactor() &&
    m.getMetallicFactor() === base.getMetallicFactor() &&
    m.getAlphaMode() === base.getAlphaMode() &&
    m.getEmissiveFactor().every((v, i) => v === base.getEmissiveFactor()[i]) &&
    m.getBaseColorFactor().every((v, i) => v === base.getBaseColorFactor()[i])
  if (!same) throw new Error(`Material "${m.getName()}" differs from the first material; cannot merge safely`)
}

const composites = []
const cellOf = new Map() // primitive -> {col,row}
let idx = 0
for (const prim of prims) {
  const tex = prim.getMaterial()?.getBaseColorTexture()
  if (!tex) throw new Error('Primitive without base color texture')
  const col = idx % GRID
  const row = Math.floor(idx / GRID)
  idx++
  cellOf.set(prim, { col, row })

  // Resize the texture to the cell's inner size, then extend its edge pixels into the gutter
  const inner = await sharp(Buffer.from(tex.getImage())).resize(INNER, INNER, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const padded = await sharp(inner.data, { raw: { width: INNER, height: INNER, channels: inner.info.channels } })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, extendWith: 'copy' })
    .png().toBuffer()
  composites.push({ input: padded, left: col * CELL, top: row * CELL })
}

const atlasImage = await sharp({ create: { width: ATLAS, height: ATLAS, channels: 3, background: '#808080' } })
  .composite(composites)
  .webp({ quality: 82 })
  .toBuffer()

// UV remap: [0,1] -> inside the cell's inner rect
for (const prim of prims) {
  const { col, row } = cellOf.get(prim)
  const uv = prim.getAttribute('TEXCOORD_0')
  const a = uv.getArray()
  const scale = INNER / ATLAS
  const ox = (col * CELL + PAD) / ATLAS
  const oy = (row * CELL + PAD) / ATLAS
  for (let i = 0; i < a.length; i += 2) {
    a[i] = ox + a[i] * scale
    a[i + 1] = oy + a[i + 1] * scale
  }
  uv.setArray(a)
}

// Single material using the atlas
const atlasTex = doc.createTexture('atlas').setImage(new Uint8Array(atlasImage)).setMimeType('image/webp')
const material = base.setBaseColorTexture(atlasTex)
for (const prim of prims) prim.setMaterial(material)
for (const m of rootDoc.listMaterials()) if (m !== material) m.dispose()
for (const t of rootDoc.listTextures()) if (t !== atlasTex) t.dispose()

const SMOOTH_ANGLE_DEG = parseFloat(process.env.SMOOTH_ANGLE ?? '35')

/** Recompute vertex normals: per unique position, average only the faces within SMOOTH_ANGLE of each other. */
function rebuildNormals(document) {
  const cosLimit = Math.cos((SMOOTH_ANGLE_DEG * Math.PI) / 180)
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAcc = prim.getAttribute('POSITION')
      const pos = posAcc.getArray()
      const idx = prim.getIndices().getArray()
      const vcount = posAcc.getCount()
      const faceN = new Float32Array(idx.length) // 3 floats per face
      const faces = idx.length / 3
      const groups = new Map() // position key -> [face indices]
      const key = (v) => `${Math.round(pos[3 * v] * 100)},${Math.round(pos[3 * v + 1] * 100)},${Math.round(pos[3 * v + 2] * 100)}`
      const vkey = new Array(vcount)
      for (let v = 0; v < vcount; v++) vkey[v] = key(v)
      for (let f = 0; f < faces; f++) {
        const a = idx[3 * f], b = idx[3 * f + 1], c = idx[3 * f + 2]
        const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2]
        const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2]
        // cross product magnitude = 2*area, so unnormalised normals are area-weighted
        faceN[3 * f] = uy * vz - uz * vy
        faceN[3 * f + 1] = uz * vx - ux * vz
        faceN[3 * f + 2] = ux * vy - uy * vx
        for (const v of [a, b, c]) {
          const k = vkey[v]
          let g = groups.get(k)
          if (!g) groups.set(k, (g = []))
          g.push(f)
        }
      }
      const out = new Float32Array(vcount * 3)
      const done = new Uint8Array(vcount)
      for (let f = 0; f < faces; f++) {
        const fl = Math.hypot(faceN[3 * f], faceN[3 * f + 1], faceN[3 * f + 2]) || 1
        const fx = faceN[3 * f] / fl, fy = faceN[3 * f + 1] / fl, fz = faceN[3 * f + 2] / fl
        for (let c = 0; c < 3; c++) {
          const v = idx[3 * f + c]
          // A vertex can be shared by several faces of the same position group; compute from this face's
          // viewpoint, but only the first writer wins (the vertex belongs to one UV island).
          if (done[v]) continue
          done[v] = 1
          let nx = 0, ny = 0, nz = 0
          for (const g of groups.get(vkey[v])) {
            const gl = Math.hypot(faceN[3 * g], faceN[3 * g + 1], faceN[3 * g + 2]) || 1
            const dot = (faceN[3 * g] * fx + faceN[3 * g + 1] * fy + faceN[3 * g + 2] * fz) / gl
            if (dot >= cosLimit) { nx += faceN[3 * g]; ny += faceN[3 * g + 1]; nz += faceN[3 * g + 2] }
          }
          const l = Math.hypot(nx, ny, nz) || 1
          out[3 * v] = nx / l; out[3 * v + 1] = ny / l; out[3 * v + 2] = nz / l
        }
      }
      prim.setAttribute('NORMAL', document.createAccessor().setType('VEC3').setArray(out).setBuffer(posAcc.getBuffer()))
    }
  }
}

// ---- 2/3. Simplify then merge --------------------------------------------
// The source has a distinct normal on almost every vertex, which makes every edge look like a hard
// seam to the simplifier (it would barely remove anything). So: drop normals, simplify, then rebuild
// them below with angle-limited smoothing (hard building edges stay hard, flat areas stay smooth).
for (const prim of prims) prim.setAttribute('NORMAL', null)

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: parseFloat(process.env.ERROR ?? '0.05'), lockBorder: process.env.LOCK !== '0' }),
  rebuildNormals,
  join({ keepMeshes: false, keepNamed: false }),
  dedup(),
  prune(),
)

// ---- 4. Compress & write -------------------------------------------------
await doc.transform(draco({ method: 'edgebreaker', quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: 8 }))
await io.write(OUTPUT, doc)

const trisAfter = countTris()
// The viewer centres the model on its bounding box and positions POIs/overlays relative to it,
// so the simplified model MUST keep the same bounds as the desktop one.
const boundsAfter = sceneBounds(await io.read(OUTPUT))
const drift = Math.max(
  ...['min', 'max'].flatMap((k) => boundsBefore[k].map((v, i) => Math.abs(v - boundsAfter[k][i])))
)
console.log('bounds before:', boundsBefore.min.map((v) => v.toFixed(2)), boundsBefore.max.map((v) => v.toFixed(2)))
console.log('bounds after :', boundsAfter.min.map((v) => v.toFixed(2)), boundsAfter.max.map((v) => v.toFixed(2)))
console.log(`max bounds drift: ${drift.toFixed(3)} units`)
const out = (await import('node:fs')).statSync(OUTPUT).size
console.log(`triangles: ${Math.round(trisBefore)} -> ${Math.round(trisAfter)} (${((trisAfter / trisBefore) * 100).toFixed(1)}%)`)
console.log(`primitives: ${prims.length} -> ${rootDoc.listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0)}`)
console.log(`atlas: ${ATLAS}x${ATLAS}, cell ${CELL}px (${INNER}px inner)`)
console.log(`output: ${(out / 1024 / 1024).toFixed(2)} MB -> ${OUTPUT}`)
