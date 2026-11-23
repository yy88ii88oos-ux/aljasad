import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import { STRUCTURES, lightModels, type Group, type Structure } from '../data'
import { makeMaterial, makeXray } from './materials'

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

function register(scene: THREE.Object3D) {
  const heartPivot = new THREE.Vector3()
  const hs = STRUCTURES['FMA7274']
  if (hs) heartPivot.set(...hs.c)
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const id = mesh.name.replace(/_\d+$/, '') || mesh.parent?.name || ''
    const s = STRUCTURES[id]
    if (!s) return
    const geo = dequantize(mesh)
    const n = geo.attributes.position.count
    if (s.group === 'muscles') {
      const d = fiberDir(geo)
      const arr = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) arr.set([d.x, d.y, d.z], i * 3)
      geo.setAttribute('fdir', new THREE.BufferAttribute(arr, 3))
    }
    if (ARM.test(s.en) && (s.side === 'right' || /right/.test(s.en))) {
      const arr = new Float32Array(n * 2)
      const bulge = /biceps brachii|brachialis/.test(s.en) ? 1 : 0
      for (let i = 0; i < n; i++) { arr[i * 2] = 1; arr[i * 2 + 1] = bulge }
      geo.setAttribute('armw', new THREE.BufferAttribute(arr, 2))
    }
    geo.computeBoundingSphere()
    const mat = makeMaterial(s)
    mesh.material = mat
    mesh.userData.id = id
    mesh.matrixAutoUpdate = true
    const center = new THREE.Vector3(...s.c)
    const p: Part = {
      id, s, mesh, mat, xray: xrayShared, center, fade: 0, target: 1, glow: 0,
      explodeDir: new THREE.Vector3(),
    }
    if (s.group === 'skin') mesh.renderOrder = 10
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
    const layerPush = { skin: 0.35, superficial: 0.24, deep: 0.14, organs: 0.1, bones: -0.06 }[p.s.layer]
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
