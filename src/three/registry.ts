import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import { STRUCTURES, FLOW, lightModels, type Group, type Structure } from '../data'
import { poseGeometry, posePoint } from './pose'

// vessel centre lines follow the posed arms
for (const f of Object.values(FLOW)) for (const pt of f.points) posePoint(pt)
import { makeMaterial, makeXray, type EyeInfo } from './materials'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

export interface Part {
  id: string
  s: Structure
  mesh: THREE.Mesh
  mat: THREE.MeshPhysicalMaterial
  xray: THREE.ShaderMaterial
  center: THREE.Vector3
  fade: number // current opacity factor 0..1 (animated)
  target: number // desired visibility 0..1
  glow: number // current highlight 0..1
  ghost: boolean // drawn as Fresnel glass because it hides the selection
  study?: boolean // built for «جسدي»: only shown inside its study
  custom?: boolean // transform driven elsewhere (knee ligaments)
  rot?: { pivot: THREE.Vector3; q: THREE.Quaternion } // rigid rotation about a joint (knee flexion)
  explodeDir: THREE.Vector3
  pulse?: { pivot: THREE.Vector3; kind: 'heart' | 'lung' | 'diaphragm' }
}

export const parts = new Map<string, Part>()
export const root = new THREE.Group()
root.name = 'body'

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const LOD = lightModels ? '.m' : ''
const BASE = import.meta.env.BASE_URL + 'models/'

// right-arm structures bend at the elbow in the «arm» tour
const ARM = /right (humerus|radius|ulna|scaphoid|lunate|triquetral|pisiform|trapezi|capitate|hamate)|of right (thumb|index|middle|ring|little) finger|right (first|second|third|fourth|fifth) metacarpal|biceps brachii|triceps brachii|brachialis|brachioradialis|anconeus|supinator|pronator|carpi|digitorum superficialis|digitorum profundus|pollicis|palmaris|extensor digitorum$|digiti minimi of (right )?hand|indicis|lumbricals of right hand|interossei of right hand|interosseous membrane of right forearm|flexor retinaculum of right wrist/

function fiberDir(geo: THREE.BufferGeometry) {
  // principal axis of the vertex cloud ≈ dominant fibre direction
  const p = geo.attributes.position as THREE.BufferAttribute
  const n = p.count, c = new THREE.Vector3()
  for (let i = 0; i < n; i++) c.x += p.getX(i), c.y += p.getY(i), c.z += p.getZ(i)
  c.divideScalar(n)
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0
  const step = Math.max(1, Math.floor(n / 2000))
  for (let i = 0; i < n; i += step) {
    const x = p.getX(i) - c.x, y = p.getY(i) - c.y, z = p.getZ(i) - c.z
    xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z
  }
  const v = new THREE.Vector3(0.3, 1, 0.2).normalize()
  for (let k = 0; k < 12; k++) {
    v.set(xx * v.x + xy * v.y + xz * v.z, xy * v.x + yy * v.y + yz * v.z, xz * v.x + yz * v.y + zz * v.z).normalize()
  }
  return v
}

const xrayShared = makeXray()
const HEART = /wall of heart|papillary|valve|coronary|cardiac vein|coronary sinus|interventricular|marginal branch|posterolateral branch/
const LUNG = /lobe of (right |left )?lung/

// KHR_mesh_quantization stores int16 positions + a node transform; bake back to float metres
function dequantize(mesh: THREE.Mesh) {
  mesh.updateMatrix()
  const src = mesh.geometry
  const P = src.attributes.position, N = src.attributes.normal
  const n = P.count
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3)
  const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mesh.matrix)
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrix); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z
    if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  if (N) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  else { g.setIndex(src.index); g.computeVertexNormals() }
  g.setIndex(src.index)
  src.dispose()
  mesh.geometry = g
  mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.set(1, 1, 1)
  return g
}

// float positions + per-vertex attributes the shaders need (fibre direction, elbow weights)
function prepare(mesh: THREE.Mesh, s: Structure) {
    const geo = dequantize(mesh)
    poseGeometry(geo, s)
    const n = geo.attributes.position.count
    if (s.en === 'linea alba') {
      // the sheet lies 3–5 mm behind the recti's medial edges, which left a dark slit: bring it forward to bridge the gap,
      // still a little sunk (deepest at the midline); its shader paints the pale band and the red to either side
      const P = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < n; i++) { const dx = Math.min(1, Math.abs(P.getX(i) - s.c[0]) / 0.009); P.setZ(i, P.getZ(i) + 0.0032 - 0.0008 * dx * dx) }
      geo.computeVertexNormals()
    }
    if (s.group === 'muscles') {
      // broad sheets whose longest extent is across their fibres: use the known anatomical direction
      const d = /frontalis|occipitalis|temporoparietalis|platysma/.test(s.en) ? new THREE.Vector3(0, 1, 0.15).normalize() : fiberDir(geo)
      const arr = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) arr.set([d.x, d.y, d.z], i * 3)
      geo.setAttribute('fdir', new THREE.BufferAttribute(arr, 3))
      // distance (m) to the nearer end along the fibres + the muscle's length: the shader whitens the ends into tendon
      const P = geo.attributes.position as THREE.BufferAttribute
      const proj = new Float32Array(n)
      let lo = Infinity, hi = -Infinity
      for (let i = 0; i < n; i++) { const t = P.getX(i) * d.x + P.getY(i) * d.y + P.getZ(i) * d.z; proj[i] = t; lo = Math.min(lo, t); hi = Math.max(hi, t) }
      const fp = new Float32Array(n * 2)
      for (let i = 0; i < n; i++) { fp[i * 2] = Math.min(proj[i] - lo, hi - proj[i]); fp[i * 2 + 1] = hi - lo }
      geo.setAttribute('fpos', new THREE.BufferAttribute(fp, 2))
    }
    if (ARM.test(s.en) && (s.side === 'right' || /right/.test(s.en))) {
      const arr = new Float32Array(n * 2)
      const bulge = /biceps brachii|brachialis/.test(s.en) ? 1 : 0
      for (let i = 0; i < n; i++) { arr[i * 2] = 1; arr[i * 2 + 1] = bulge }
      geo.setAttribute('armw', new THREE.BufferAttribute(arr, 2))
    }
  if (s.group === 'skin') genitalMorph(geo)
  return geo
}

// External genitalia are hidden by default: skin over them morphs (gpos/gnor) into a smooth harmonic surface spanned by
// the surrounding skin — no hole, no stand-in shape. Weight from distance to the genital organs' bounds.
const GEN_IDS = ['FMA18247', 'FMA19617nsn', 'FMA19618', 'FMA7211', 'FMA7212', 'FMA18256', 'FMA18257']
function genitalMorph(geo: THREE.BufferGeometry) {
  const P = geo.attributes.position as THREE.BufferAttribute
  const n = P.count
  const boxes = GEN_IDS.map((id) => STRUCTURES[id]).filter(Boolean).map((g) => new THREE.Box3(new THREE.Vector3(...g.min), new THREE.Vector3(...g.max)))
  const gpos = new Float32Array(P.array as Float32Array)
  const free = new Uint8Array(n)
  const v = new THREE.Vector3()
  let nFree = 0
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i)
    if (v.y > -0.015 || v.z < 0.0) continue
    let d = Infinity
    for (const b of boxes) d = Math.min(d, b.distanceToPoint(v))
    if (d < 0.006) { free[i] = 1; nFree++ }
  }
  if (nFree && geo.index) {
    // adjacency of free vertices, then Jacobi relaxation with the rest of the skin as fixed boundary
    const I = geo.index.array
    const nb: number[][] = []
    for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
      const a = I[t + k], b = I[t + ((k + 1) % 3)]
      if (free[a]) (nb[a] ||= []).push(b)
      if (free[b]) (nb[b] ||= []).push(a)
    }
    const ids: number[] = []
    for (let i = 0; i < n; i++) if (free[i] && nb[i]) ids.push(i)
    const tmpP = new Float32Array(gpos)
    for (let it = 0; it < 220; it++) {
      for (const i of ids) {
        let x = 0, y = 0, z = 0
        for (const j of nb[i]) { x += gpos[j * 3]; y += gpos[j * 3 + 1]; z += gpos[j * 3 + 2] }
        const k = nb[i].length
        tmpP[i * 3] = x / k; tmpP[i * 3 + 1] = y / k; tmpP[i * 3 + 2] = z / k
      }
      for (const i of ids) { gpos[i * 3] = tmpP[i * 3]; gpos[i * 3 + 1] = tmpP[i * 3 + 1]; gpos[i * 3 + 2] = tmpP[i * 3 + 2] }
    }
  }
  const g2 = new THREE.BufferGeometry()
  g2.setAttribute('position', new THREE.BufferAttribute(gpos, 3)); g2.setIndex(geo.index); g2.computeVertexNormals()
  geo.setAttribute('gpos', new THREE.BufferAttribute(gpos, 3))
  geo.setAttribute('gnor', g2.attributes.normal)
}

// Subcutaneous fat is not part of BodyParts3D: it is generated here as a lobulated shell just under the skin
function makeFat(skin: THREE.BufferGeometry) {
  const P = skin.attributes.position as THREE.BufferAttribute, N = skin.attributes.normal as THREE.BufferAttribute
  const G = skin.attributes.gpos as THREE.BufferAttribute, GN = skin.attributes.gnor as THREE.BufferAttribute
  const n = P.count, pos = new Float32Array(n * 3), gp = new Float32Array(n * 3)
  const IN = 0.0012
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    pos[i * 3 + k] = P.getComponent(i, k) - N.getComponent(i, k) * IN
    gp[i * 3 + k] = G.getComponent(i, k) - GN.getComponent(i, k) * IN
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', N.clone())
  g.setAttribute('gpos', new THREE.BufferAttribute(gp, 3)); g.setAttribute('gnor', GN.clone())
  g.setIndex(skin.index)
  return g
}
export const FAT_ID = 'FAT'

// lens, vitreous, retina and cornea at true proportions inside each globe (gaze +z); BodyParts3D has no inner eye
function buildEyeInternals(eye: EyeInfo, parent: THREE.Object3D) {
  const R = eye.r
  for (const [side, c] of [['R', eye.a], ['L', eye.b]] as const) {
    const mk = (key: string, g: THREE.BufferGeometry) => {
      const id = 'EYE_' + key + '_' + side, s = STRUCTURES[id]
      if (!s || parts.has(id)) return
      const mesh = new THREE.Mesh(g, makeMaterial(s)); mesh.name = id
      g.computeBoundingSphere()
      const center = new THREE.Vector3(); g.boundingSphere!.center && center.copy(g.boundingSphere!.center)
      const bb = new THREE.Box3().setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute)
      Object.assign(s, { c: center.toArray(), min: bb.min.toArray(), max: bb.max.toArray() })
      parts.set(id, { id, s, mesh, mat: mesh.material as THREE.MeshPhysicalMaterial, xray: xrayShared, center, fade: 0, target: 1, glow: 0, ghost: false, explodeDir: new THREE.Vector3() })
      parent.add(mesh)
    }
    // vitreous: fills the posterior 4/5 of the globe
    mk('VITREOUS', new THREE.SphereGeometry(R * 0.9, 40, 28).translate(c.x, c.y, c.z - R * 0.06))
    // retina: inner lining of the back of the globe, up to the ora serrata
    mk('RETINA', new THREE.SphereGeometry(R * 0.94, 48, 32, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62).rotateX(Math.PI / 2).translate(c.x, c.y, c.z))
    // lens: biconvex, ~9 mm across and 4 mm thick, just behind the iris
    mk('LENS', new THREE.SphereGeometry(R * 0.37, 40, 24).scale(1, 1, 0.42).translate(c.x, c.y, c.z + R * 0.6))
    // cornea: steeper dome (r ≈ 7.8 mm) bulging ~1.5 mm in front of the sclera
    const rc = R * 0.65
    mk('CORNEA', new THREE.SphereGeometry(rc, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.36).rotateX(Math.PI / 2).translate(c.x, c.y, c.z + R + R * 0.12 - rc))
  }
}

// the BodyParts3D eyeball holds both globes: split by side and fit each centre
function eyeInfo(geo: THREE.BufferGeometry): EyeInfo {
  const P = geo.attributes.position as THREE.BufferAttribute
  const A = new THREE.Box3(), B = new THREE.Box3(), v = new THREE.Vector3()
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); (v.x < 0 ? A : B).expandByPoint(v) }
  // radius from the x/y extent (the corneal bulge stretches z); centre one radius in front of the back pole
  const fit = (bx: THREE.Box3) => {
    const sz = bx.getSize(new THREE.Vector3()), r = (sz.x + sz.y) / 4
    const c = bx.getCenter(new THREE.Vector3()); c.z = bx.min.z + r
    return { c, r }
  }
  const fa = fit(A), fb = fit(B)
  return { a: fa.c, b: fb.c, r: (fa.r + fb.r) / 2 }
}

function register(scene: THREE.Object3D) {
  const heartPivot = new THREE.Vector3()
  const hs = STRUCTURES['FMA7274']
  if (hs) heartPivot.set(...hs.c)
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const id = mesh.name.replace(/_\d+$/, '') || mesh.parent?.name || ''
    const s = STRUCTURES[id]
    if (!s || id === FAT_ID || parts.has(id)) return
    const geo = prepare(mesh, s)
    geo.computeBoundingSphere()
    const eyeI = s.en === 'eyeball' ? eyeInfo(geo) : undefined
    const mat = makeMaterial(s, eyeI)
    if (eyeI) buildEyeInternals(eyeI, mesh.parent!)
    mesh.material = mat
    mesh.castShadow = mesh.receiveShadow = true
    mesh.userData.id = id
    mesh.matrixAutoUpdate = true
    const center = new THREE.Vector3(...s.c)
    const p: Part = {
      id, s, mesh, mat, xray: xrayShared, center, fade: 0, target: 1, glow: 0, ghost: false,
      explodeDir: new THREE.Vector3(),
    }
    if (s.group === 'skin') {
      mesh.renderOrder = 10
      const fs = STRUCTURES[FAT_ID]
      if (fs && !parts.has(FAT_ID)) {
        const fm = new THREE.Mesh(makeFat(geo), makeMaterial(fs))
        fm.name = FAT_ID; fm.renderOrder = 9; fm.receiveShadow = true
        fm.geometry.computeBoundingSphere()
        parts.set(FAT_ID, { id: FAT_ID, s: fs, mesh: fm, mat: fm.material as THREE.MeshPhysicalMaterial, xray: xrayShared, center: new THREE.Vector3(...fs.c), fade: 0, target: 1, glow: 0, ghost: false, explodeDir: new THREE.Vector3() })
        mesh.parent?.add(fm)
      }
    }
    if (HEART.test(s.en) && center.distanceTo(heartPivot) < 0.12) p.pulse = { pivot: heartPivot, kind: 'heart' }
    if (LUNG.test(s.en)) p.pulse = { pivot: center.clone(), kind: 'lung' }
    if (s.en === 'diaphragm') p.pulse = { pivot: center.clone(), kind: 'diaphragm' }
    parts.set(id, p)
  })
  root.add(scene)
}

// explode directions: radial from body axis + vertical spread, relative to each layer's centre
export function computeExplode() {
  for (const p of parts.values()) {
    const c = p.center
    // radial spread grows toward the trunk (organs fan out), limbs move less
    const trunk = Math.abs(c.x) < 0.17 && c.y > -0.05 && c.y < 0.62
    const d = new THREE.Vector3(c.x * (trunk ? 2.2 : 0.7), (c.y - 0.3) * (trunk ? 0.6 : 0.15), c.z * (trunk ? 2.4 : 0.8))
    const layerPush = { skin: 0.35, fat: 0.3, superficial: 0.24, deep: 0.14, organs: 0.1, bones: -0.06 }[p.s.layer]
    d.z += layerPush
    p.explodeDir.copy(d)
  }
}

// ---- progressive loading with real byte progress ----
async function fetchWithProgress(url: string, onBytes: (loaded: number, total: number) => void) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('failed ' + url)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); loaded += value.length
    onBytes(loaded, total)
  }
  const buf = new Uint8Array(loaded)
  let o = 0
  for (const c of chunks) { buf.set(c, o); o += c.length }
  return buf.buffer
}

// approximate sizes (bytes) used until Content-Length is known
const EST: Record<Group, number> = lightModels
  ? { skeleton: 1.4e6, skin: 0.3e6, organs: 0.6e6, cardio: 0.5e6, nervous: 0.5e6, muscles: 2.4e6 }
  : { skeleton: 3.9e6, skin: 1.0e6, organs: 1.8e6, cardio: 1.2e6, nervous: 1.5e6, muscles: 6.7e6 }

// one fetch + parse per group, however many times loading is requested (React StrictMode runs effects twice)
const inflight = new Map<Group, { p: Promise<void>; subs: Set<(f: number) => void> }>()
export function loadGroups(groups: Group[], onProgress: (f: number) => void, onGroup?: (g: Group) => void) {
  const todo = groups.filter((g) => !inflight.has(g))
  if (todo.length) {
    const subs = new Set<(f: number) => void>()
    const p = loadGroupsOnce(todo, (f) => subs.forEach((fn) => fn(f)), onGroup)
    for (const g of todo) inflight.set(g, { p, subs })
  }
  for (const g of groups) inflight.get(g)!.subs.add(onProgress)
  return Promise.all(groups.map((g) => inflight.get(g)!.p)).then(() => onProgress(1))
}
async function loadGroupsOnce(groups: Group[], onProgress: (f: number) => void, onGroup?: (g: Group) => void) {
  const loaded: Record<string, number> = {}
  const totals: Record<string, number> = { ...EST }
  const report = () => {
    const T = groups.reduce((a, g) => a + totals[g], 0)
    const L = groups.reduce((a, g) => a + (loaded[g] || 0), 0)
    onProgress(Math.min(1, L / T))
  }
  await Promise.all(groups.map(async (g) => {
    // VITE_MODELS_B64: hosts that only serve text get base64 copies of the same GLB files
    const b64 = import.meta.env.VITE_MODELS_B64 === '1'
    if (b64) totals[g] *= 1.34
    let buf = await fetchWithProgress(BASE + g + LOD + '.glb' + (b64 ? '.txt' : ''), (l, t) => { loaded[g] = l; if (t) totals[g] = t; report() })
    if (b64) buf = Uint8Array.from(atob(new TextDecoder().decode(buf)), (c) => c.charCodeAt(0)).buffer
    const gltf = await loader.parseAsync(buf, BASE)
    register(gltf.scene)
    onGroup?.(g)
  }))
  computeExplode()
}

// ---- zoom LOD: phones start with the light files; the full-resolution group is swapped in when the camera comes close ----
const upgrades = new Map<Group, Promise<void>>()
let chain: Promise<void> = Promise.resolve()
export const upgrading = { group: null as Group | null }
// one group at a time; awaiting returns when that group's full-resolution meshes are in place
export function upgradeGroup(g: Group): Promise<void> {
  if (!lightModels) return Promise.resolve()
  // a failed upgrade (network) must not block the ones queued after it
  if (!upgrades.has(g)) { chain = chain.catch(() => {}).then(() => upgradeNow(g)); upgrades.set(g, chain.catch((e) => console.warn('upgrade', g, e))) }
  return upgrades.get(g)!
}
async function upgradeNow(g: Group) {
  upgrading.group = g
  try {
    const b64 = import.meta.env.VITE_MODELS_B64 === '1'
    let buf = await fetchWithProgress(BASE + g + '.glb' + (b64 ? '.txt' : ''), () => {})
    if (b64) buf = Uint8Array.from(atob(new TextDecoder().decode(buf)), (c) => c.charCodeAt(0)).buffer
    const gltf = await loader.parseAsync(buf, BASE)
    const meshes: THREE.Mesh[] = []
    gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh) })
    // swap a few meshes per frame so the view never stalls
    await new Promise<void>((done) => {
      const step = () => {
        const t0 = performance.now()
        while (meshes.length && performance.now() - t0 < 6) {
          const m = meshes.pop()!
          const id = m.name.replace(/_\d+$/, '') || m.parent?.name || ''
          const p = parts.get(id)
          if (!p) continue
          const geo = prepare(m, p.s)
          geo.computeBoundingSphere()
          const old = p.mesh.geometry
          p.mesh.geometry = geo
          old.dispose()
          // the generated fat shell must follow the skin it was shaped from, or it pokes through
          const fat = p.s.group === 'skin' ? parts.get(FAT_ID) : undefined
          if (fat) { const fo = fat.mesh.geometry; fat.mesh.geometry = makeFat(geo); fat.mesh.geometry.computeBoundingSphere(); fo.dispose() }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(geo as any).computeBoundsTree?.()
        }
        if (meshes.length) requestAnimationFrame(step); else done()
      }
      step()
    })
  } finally { upgrading.group = null }
}

// build BVH lazily in idle time so picking stays fast
export function buildBVHIdle() {
  const queue = [...parts.values()]
  const step = () => {
    const t0 = performance.now()
    while (queue.length && performance.now() - t0 < 8) {
      const p = queue.shift()!
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = p.mesh.geometry as any
      if (!g.boundsTree) g.computeBoundsTree()
    }
    if (queue.length) setTimeout(step, 16)
  }
  step()
}
