// «الجسد» — model processing pipeline
// Usage: node scripts/build-models.mjs <path-to-BodyParts3D_data>
// Input : BodyParts3D v3.0 (STL conversion of the official OBJ release, CC BY-SA 2.1 JP)
// Output: public/models/<group>.glb (desktop) + <group>.m.glb (mobile LOD),
//         meshopt-compressed + quantized, one node per structure named by its stable FMA id.
//         data/geometry.json (per-structure bounds/centroid/group), data/flow.json (vessel centerlines)
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { reorder, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { readSTL } from './stl.mjs';

const SRC = process.argv[2] || '/home/user/kevin-mattheus-moerman/bodyparts3d/assets/BodyParts3D_data';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public/models');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });

// ---------- 1. classify structures by FMA part-of hierarchy ----------
const names = {};
for (const l of fs.readFileSync(path.join(SRC, 'parts_list_e.txt'), 'utf8').split('\n')) {
  const p = l.split('\t');
  if (p.length >= 2) names[p[0].replace(/"/g, '')] = p[1].trim();
}
const parent = {};
for (const f of ['conventional_part_of.txt', 'composite_parts.txt']) {
  const lines = fs.readFileSync(path.join(SRC, f), 'utf8').split('\n').slice(1);
  for (const l of lines) {
    const p = l.split('\t');
    if (p.length >= 3) (parent[p[2]] ||= new Set()).add(p[0]);
  }
}
const SYS = {
  FMA7157: 'nervous', FMA7158: 'respiratory', FMA23881: 'skeletal', FMA7161: 'cardiovascular',
  FMA7152: 'digestive', FMA7159: 'urinary', FMA7160: 'genital', FMA72954: 'muscular',
  FMA72979: 'integument', FMA9668: 'endocrine', FMA74594: 'lymphoid', FMA78499: 'sense', FMA23878: 'articular',
};
function systemsOf(id) {
  const seen = new Set(); const st = [id];
  while (st.length) { const c = st.pop(); for (const p of parent[c] || []) if (!seen.has(p)) { seen.add(p); st.push(p); } }
  return [...seen].filter((x) => SYS[x]).map((x) => SYS[x]);
}
const EXCLUDE = new Set(['FMA70751', 'FMA70754', 'FMA71098']); // hair sets / eyebrows
function groupOf(id, name, sys) {
  if (id === 'FMA7163') return 'skin';
  if (/tooth/.test(name)) return 'skeleton';
  if (sys.includes('skeletal') || sys.includes('articular')) return 'skeleton';
  if (sys.includes('cardiovascular')) return 'cardio';
  if (sys.includes('muscular')) return 'muscles';
  if (sys.includes('nervous')) return 'nervous';
  return 'organs';
}
function primarySystem(name, sys, group) {
  if (group === 'skin') return 'integumentary';
  if (group === 'skeleton') return 'skeletal';
  if (group === 'muscles') return 'muscular';
  if (group === 'cardio') return 'cardiovascular';
  if (group === 'nervous') return 'nervous';
  for (const s of ['respiratory', 'urinary', 'genital', 'endocrine', 'lymphoid', 'digestive', 'sense']) if (sys.includes(s)) return s;
  return 'other';
}

// ---------- 2. triangle budgets ----------
const BUDGET = { // total triangles per group: [desktop, mobile]
  skeleton: [800000, 220000],
  skin: [240000, 70000],
  muscles: [1400000, 400000],
  cardio: [300000, 90000],
  nervous: [300000, 80000],
  organs: [420000, 120000],
};
const MIN_TRIS = [500, 180];

// ---------- 3. geometry helpers ----------
function weld(pos) {
  const map = new Map(); const verts = []; const idx = new Uint32Array(pos.length / 3);
  for (let i = 0; i < pos.length; i += 3) {
    const k = pos[i] + ',' + pos[i + 1] + ',' + pos[i + 2];
    let v = map.get(k);
    if (v === undefined) { v = verts.length / 3; map.set(k, v); verts.push(pos[i], pos[i + 1], pos[i + 2]); }
    idx[i / 3] = v;
  }
  // drop degenerate triangles
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (a !== b && b !== c && a !== c) keep.push(a, b, c);
  }
  return { positions: new Float32Array(verts), indices: new Uint32Array(keep) };
}
function compact(positions, indices) {
  const remap = new Int32Array(positions.length / 3).fill(-1); const out = []; const ni = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] < 0) { remap[v] = out.length / 3; out.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]); }
    ni[i] = remap[v];
  }
  return { positions: new Float32Array(out), indices: ni };
}
function simplify(g, targetTris) {
  const cur = g.indices.length / 3;
  if (targetTris >= cur) return g;
  let [res] = MeshoptSimplifier.simplify(g.indices, g.positions, 3, targetTris * 3, 0.02, []);
  if (res.length / 3 > targetTris * 1.6) { // topology-locked; allow sloppy for heavy meshes
    res = MeshoptSimplifier.simplifySloppy(g.indices, g.positions, 3, null, targetTris * 3, 0.02)[0];
  }
  return compact(g.positions, res);
}
function normals(positions, indices) {
  const n = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) { n[o] += nx; n[o + 1] += ny; n[o + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

// ---------- 4. load + transform all structures ----------
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const files = fs.readdirSync(path.join(SRC, 'stl')).filter((f) => f.endsWith('.stl'));
// body frame: mm Z-up (x: body left +, y: anterior -) -> metres Y-up, +Z anterior, origin at body centre
const CENTER = [0, -96.5, 814];
const tf = (p) => {
  const o = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    o[i] = (p[i] - CENTER[0]) * 0.001;
    o[i + 1] = (p[i + 2] - CENTER[2]) * 0.001;
    o[i + 2] = -(p[i + 1] - CENTER[1]) * 0.001;
  }
  return o;
};
const parts = [];
let n = 0;
for (const f of files) {
  const id = f.slice(0, -4);
  if (EXCLUDE.has(id)) continue;
  const name = names[id] || id;
  const sys = systemsOf(id);
  const group = groupOf(id, name, sys);
  const g = weld(tf(readSTL(path.join(SRC, 'stl', f))));
  parts.push({ id, name, sys, group, system: primarySystem(name, sys, group), g });
  if (++n % 100 === 0) console.log('loaded', n);
}

const geometry = {};
const flow = {};
const LOD = ['', '.m'];
for (const group of Object.keys(BUDGET)) {
  const gp = parts.filter((p) => p.group === group);
  for (let li = 0; li < 2; li++) {
    const budget = BUDGET[group][li];
    const w = gp.map((p) => Math.sqrt(p.g.indices.length / 3));
    const W = w.reduce((a, b) => a + b, 0);
    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene(group);
    let tris = 0;
    gp.forEach((p, i) => {
      const orig = p.g.indices.length / 3;
      const target = Math.min(orig, Math.max(MIN_TRIS[li], Math.round((budget * w[i]) / W)));
      const s = simplify(p.g, target);
      tris += s.indices.length / 3;
      const nrm = normals(s.positions, s.indices);
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(s.positions).setBuffer(buffer))
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nrm).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(s.positions.length / 3 > 65535 ? s.indices : new Uint16Array(s.indices)).setBuffer(buffer));
      const mesh = doc.createMesh(p.id).addPrimitive(prim);
      scene.addChild(doc.createNode(p.id).setMesh(mesh).setExtras({ system: p.system }));
      if (li === 0) {
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], c = [0, 0, 0];
        const P = s.positions;
        for (let k = 0; k < P.length; k += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[k + a]); mx[a] = Math.max(mx[a], P[k + a]); c[a] += P[k + a]; }
        const r3 = (v) => Math.round(v * 1000) / 1000;
        geometry[p.id] = {
          en: p.name, group, system: p.system, fmaSystems: [...new Set(p.sys)],
          min: mn.map(r3), max: mx.map(r3), centroid: c.map((v) => r3(v / (P.length / 3))), tris: orig,
        };
        if (group === 'cardio' || (group === 'nervous' && /optic/.test(p.name))) {
          const cl = centerline(s.positions, s.indices);
          if (cl) flow[p.id] = cl;
        }
      }
    });
    doc.createMaterial('default');
    await doc.transform(
      reorder({ encoder: MeshoptEncoder }),
      quantize({ quantizePosition: 14, quantizeNormal: 8 }),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    );
    const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
    const file = path.join(OUT, group + LOD[li] + '.glb');
    await io.write(file, doc);
    console.log(group + LOD[li], gp.length, 'parts', tris, 'tris', (fs.statSync(file).size / 1048576).toFixed(2) + 'MB');
  }
}

// ---------- 5. vessel / nerve centerlines (geodesic binning) ----------
function centerline(P, I) {
  const nv = P.length / 3;
  if (nv < 30) return null;
  const adj = Array.from({ length: nv }, () => []);
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = I[t + e], b = I[t + ((e + 1) % 3)];
    adj[a].push(b); adj[b].push(a);
  }
  const d3 = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
  const dijkstra = (src) => {
    const dist = new Float64Array(nv).fill(Infinity); dist[src] = 0;
    const heap = [[0, src]];
    while (heap.length) {
      let bi = 0; // small meshes: linear pop is fine
      for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
      const [d, u] = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop();
      if (d > dist[u]) continue;
      for (const v of adj[u]) { const nd = d + d3(u, v); if (nd < dist[v]) { dist[v] = nd; heap.push([nd, v]); } }
    }
    return dist;
  };
  if (nv > 6000) return null;
  // farthest-point double sweep to find the two tube ends
  let d0 = dijkstra(0), a = 0;
  for (let i = 0; i < nv; i++) if (isFinite(d0[i]) && d0[i] > d0[a]) a = i;
  const da = dijkstra(a);
  let maxd = 0; for (let i = 0; i < nv; i++) if (isFinite(da[i]) && da[i] > maxd) maxd = da[i];
  const bins = Math.max(4, Math.min(40, Math.round(maxd / 0.008)));
  const acc = Array.from({ length: bins }, () => [0, 0, 0, 0]);
  for (let i = 0; i < nv; i++) {
    if (!isFinite(da[i])) continue;
    const b = Math.min(bins - 1, Math.floor((da[i] / maxd) * bins));
    acc[b][0] += P[i * 3]; acc[b][1] += P[i * 3 + 1]; acc[b][2] += P[i * 3 + 2]; acc[b][3]++;
  }
  const pts = acc.filter((x) => x[3]).map((x) => [x[0] / x[3], x[1] / x[3], x[2] / x[3]].map((v) => Math.round(v * 10000) / 10000));
  return { length: Math.round(maxd * 1000) / 1000, points: pts };
}

fs.writeFileSync(path.join(ROOT, 'data/geometry.json'), JSON.stringify(geometry));
fs.writeFileSync(path.join(ROOT, 'data/flow.json'), JSON.stringify(flow));
console.log('structures:', Object.keys(geometry).length, 'centerlines:', Object.keys(flow).length);
