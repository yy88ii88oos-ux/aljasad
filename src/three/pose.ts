// Atlas pose: both arms swing a few degrees away from the trunk, rotating about each shoulder joint.
// Applied once to every loaded mesh (bones, muscles, skin, vessels...) with the same weight field, so all layers stay aligned.
//  - above the armpit: a smooth lateral weight (0 at the neck/trunk → 1 over the shoulder joint)
//  - below the armpit: whole arm pieces (mesh components there whose centre lies on the arm, not the trunk/legs) rotate rigidly;
//    everything else fades out just under the armpit
import * as THREE from 'three'
import type { Structure } from '../data'

export const ABDUCT = THREE.MathUtils.degToRad(7)
const Y_AX = 0.44 // armpit level
// per side (x > 0 = left); pivot ≈ centre of the humeral head
const PIVOT = (sx: number) => new THREE.Vector3(0.165 * sx, 0.508, -0.025)
const ARM = (sx: number) => [[0.168, 0.505, -0.025], [0.215, 0.235, -0.03], [0.25, 0.0, 0.0], [0.272, -0.1, 0.05], [0.276, -0.15, 0.085]]
  .map(([x, y, z]) => new THREE.Vector3(x * sx, y, z))
const BODY = (sx: number) => [
  [[0, 0.5, 0], [0, -0.05, 0]],
  [[0.09 * sx, -0.02, 0], [0.09 * sx, -0.45, 0], [0.08 * sx, -0.82, 0]],
].map((l) => l.map(([x, y, z]) => new THREE.Vector3(x, y, z)))

const seg = new THREE.Line3(), cp = new THREE.Vector3()
function distPoly(p: THREE.Vector3, pts: THREE.Vector3[]) {
  let d = Infinity
  for (let i = 0; i < pts.length - 1; i++) { seg.set(pts[i], pts[i + 1]); seg.closestPointToPoint(p, true, cp); d = Math.min(d, cp.distanceTo(p)) }
  return d
}
const sstep = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const shoulderW = (x: number, y: number) => sstep(0.112, 0.172, Math.abs(x)) * (1 - sstep(0.58, 0.64, y))
// how far a point (below the armpit) is closer to the arm's surface than to the trunk's or a leg's (capsule radii, m)
const R_ARM = 0.035, R_BODY = [0.12, 0.07]
function armScore(p: THREE.Vector3) {
  const sx = Math.sign(p.x) || 1
  const da = distPoly(p, ARM(sx)) - R_ARM
  const db = Math.min(...BODY(sx).map((l, i) => distPoly(p, l) - R_BODY[i]))
  return db - da
}
// 0..1 membership of the arm: smooth, so a surface joining arm and trunk stretches instead of tearing
const armness = (p: THREE.Vector3) => sstep(0.0, 0.02, armScore(p))
function weight(x: number, y: number, arm: number) {
  const ws = shoulderW(x, y)
  if (y >= Y_AX) return ws
  return arm * (ws + (1 - ws) * sstep(Y_AX, Y_AX - 0.05, y)) + (1 - arm) * ws * sstep(Y_AX - 0.05, Y_AX, y)
}
function rotate(v: THREE.Vector3, w: number, nrm?: THREE.Vector3) {
  if (w < 1e-4) return
  const sx = Math.sign(v.x) || 1, a = ABDUCT * w * sx, c = Math.cos(a), s = Math.sin(a)
  const P = PIVOT(sx), dx = v.x - P.x, dy = v.y - P.y
  v.x = P.x + dx * c - dy * s; v.y = P.y + dx * s + dy * c
  if (nrm) { const nx = nrm.x * c - nrm.y * s, ny = nrm.x * s + nrm.y * c; nrm.x = nx; nrm.y = ny }
}

// single points (vessel centre lines for the flow animation)
export function posePoint(p: [number, number, number]) {
  const v = new THREE.Vector3(...p)
  rotate(v, weight(v.x, v.y, v.y < Y_AX ? armness(v) : 0))
  p[0] = v.x; p[1] = v.y; p[2] = v.z
}

const posed = new Set<string>()
export function poseGeometry(geo: THREE.BufferGeometry, s: Structure) {
  // quick reject: nothing lateral enough to belong to a shoulder or an arm
  if (Math.max(Math.abs(s.min[0]), Math.abs(s.max[0])) < 0.112 || s.min[1] > 0.64) return
  const P = geo.attributes.position as THREE.BufferAttribute, N = geo.attributes.normal as THREE.BufferAttribute | undefined
  const n = P.count
  // connected pieces below the armpit (union-find over triangle edges; vertices above the armpit are cut out)
  const par = new Int32Array(n)
  for (let i = 0; i < n; i++) par[i] = i
  const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i] } return i }
  const below = new Uint8Array(n)
  for (let i = 0; i < n; i++) below[i] = P.getY(i) < Y_AX ? 1 : 0
  const I = geo.index?.array
  if (I) for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = I[t + k], b = I[t + ((k + 1) % 3)]
    if (below[a] && below[b]) { const ra = find(a), rb = find(b); if (ra !== rb) par[ra] = rb }
  }
  // classify each piece by its centroid (big pieces spanning arm and trunk fall back to per-vertex tests)
  const sum = new Map<number, [number, number, number, number]>()
  for (let i = 0; i < n; i++) if (below[i]) {
    const r = find(i), e = sum.get(r) ?? [0, 0, 0, 0]
    e[0] += P.getX(i); e[1] += P.getY(i); e[2] += P.getZ(i); e[3]++; sum.set(r, e)
  }
  const armPiece = new Map<number, number | null>()
  const v = new THREE.Vector3()
  for (const [r, e] of sum) {
    v.set(e[0] / e[3], e[1] / e[3], e[2] / e[3])
    const sc = armScore(v)
    armPiece.set(r, e[3] > n * 0.6 && n > 2000 && sc <= 0.01 ? null : sc > 0.01 ? 1 : 0)
  }
  const nv = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i)
    let arm = 0
    if (below[i]) { const c = armPiece.get(find(i)); arm = c === null || c === undefined ? armness(v) : c }
    const w = weight(v.x, v.y, arm)
    if (w < 1e-4) continue
    if (N) nv.fromBufferAttribute(N, i)
    rotate(v, w, N ? nv : undefined)
    P.setXYZ(i, v.x, v.y, v.z)
    if (N) N.setXYZ(i, nv.x, nv.y, nv.z)
  }
  P.needsUpdate = true
  if (N) N.needsUpdate = true
  // keep the structure's stored bounds (labels, camera flights, explode) on the posed mesh — once, the LOD swap re-poses raw data
  if (!posed.has(s.id)) {
    posed.add(s.id)
    const bb = new THREE.Box3().setFromBufferAttribute(P)
    const old = new THREE.Box3(new THREE.Vector3(...s.min), new THREE.Vector3(...s.max))
    const d = bb.getCenter(new THREE.Vector3()).sub(old.getCenter(new THREE.Vector3()))
    s.c = [s.c[0] + d.x, s.c[1] + d.y, s.c[2] + d.z]
    s.min = bb.min.toArray() as [number, number, number]; s.max = bb.max.toArray() as [number, number, number]
  }
}
