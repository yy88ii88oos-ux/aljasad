import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOW, STRUCTURES, isMobile } from '../data'
import { parts } from './registry'
import { CLIP_PLANE } from './materials'
import { useStore } from '../store'
import { heartPulse } from './Body'

// Particles as instanced camera-facing quads (not GL points: point sprites misbehave with MSAA on some GPUs and are
// size-capped on phones). Each quad is pulled toward the camera by `pull` metres so it reads through the vessel wall.
function particleMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec3 ipos; attribute vec3 icolor; attribute float ialpha; attribute float isize; attribute float ipull;
      varying vec3 vC; varying float vA; varying vec2 vUv;
      void main(){ vec4 mv = modelViewMatrix * vec4(ipos, 1.0);
        mv.xyz += normalize(-mv.xyz) * ipull;
        mv.xy += position.xy * isize;
        gl_Position = projectionMatrix * mv; vC = icolor; vA = clamp(ialpha, 0.0, 1.0); vUv = position.xy; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA; varying vec2 vUv;
      void main(){ float r = length(vUv); if (r > 0.5 || vA < 0.002) discard;
        float a = 1.0 - smoothstep(0.0, 0.5, r);
        gl_FragColor = vec4(min(vC, vec3(1.0)) * (0.7 + 0.3 * a), smoothstep(0.0, 0.6, a) * vA); }`,
    // normal blending: overlapping cells stay red / blue instead of stacking up to white
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  })
}
function particles(n: number) {
  const g = new THREE.InstancedBufferGeometry()
  const quad = new THREE.PlaneGeometry(1, 1)
  g.index = quad.index; g.setAttribute('position', quad.attributes.position)
  g.instanceCount = n
  for (const [name, k] of [['ipos', 3], ['icolor', 3], ['ialpha', 1], ['isize', 1], ['ipull', 1]] as const)
    g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(n * k), k).setUsage(THREE.DynamicDrawUsage))
  const m = new THREE.Mesh(g, particleMaterial())
  m.frustumCulled = false
  return m
}

interface Stream { id: string; pts: THREE.Vector3[]; len: number; speed: number; artery: boolean; pull: number; color: THREE.Color }

function resample(points: [number, number, number][], n = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  return curve.getSpacedPoints(n)
}
function at(pts: THREE.Vector3[], u: number, out: THREE.Vector3) {
  const f = Math.min(0.99999, Math.max(0, u)) * (pts.length - 1)
  const i = Math.floor(f)
  return out.copy(pts[i]).lerp(pts[i + 1], f - i)
}

export default function Life() {
  const { blood, nerve, streams, nerveStreams, sparks } = useMemo(() => {
    const H = new THREE.Vector3(...(STRUCTURES['FMA7274']?.c || [0, 0.4, 0]))
    const streams: Stream[] = []
    const nerveStreams: Stream[] = []
    for (const [id, f] of Object.entries(FLOW)) {
      const s = STRUCTURES[id]
      if (!s || f.points.length < 3) continue
      let pts = resample(f.points)
      if (s.group === 'nervous') {
        // eye → brain: optic nerve starts anterior, optic tract runs posterior
        if (pts[0].z < pts[pts.length - 1].z) pts = pts.reverse()
        nerveStreams.push({ id, pts, len: f.length, speed: 0.35, artery: false, pull: 0.004, color: new THREE.Color(1.5, 1.15, 0.4) })
        continue
      }
      if (s.group !== 'cardio') continue
      const vein = /vein|vena|sinus/.test(s.en) && !/pulmonary vein/.test(s.en)
      const d0 = pts[0].distanceTo(H), d1 = pts[pts.length - 1].distanceTo(H)
      if (vein ? d0 < d1 : d0 > d1) pts = pts.reverse()
      const big = /aorta|vena cava/.test(s.en)
      streams.push({
        id, pts, len: f.length, speed: vein ? 0.07 : 0.16, artery: !vein, pull: big ? 0.014 : /carotid|subclavian|iliac|brachiocephalic|renal/.test(s.en) ? 0.007 : 0.004,
        color: vein ? new THREE.Color(0.18, 0.36, 1.0) : new THREE.Color(0.92, 0.08, 0.1), // stays below the bloom threshold: true red / blue, never white
      })
    }
    const density = isMobile ? 70 : 160 // particles per metre
    const make = (list: Stream[], dens: number, sizeBase: number) => {
      const items: { s: number; u: number; v: number; jit: THREE.Vector3 }[] = []
      list.forEach((st, si) => {
        const n = Math.max(3, Math.round(st.len * dens))
        for (let i = 0; i < n; i++) items.push({ s: si, u: Math.random(), v: 0.75 + Math.random() * 0.5, jit: new THREE.Vector3().randomDirection().multiplyScalar(0.0025) })
      })
      const N = items.length
      const pts = particles(N)
      const g = pts.geometry
      const sz = g.attributes.isize as THREE.BufferAttribute, col = g.attributes.icolor as THREE.BufferAttribute, pl = g.attributes.ipull as THREE.BufferAttribute
      items.forEach((it, i) => {
        const st = list[it.s]
        col.setXYZ(i, st.color.r, st.color.g, st.color.b)
        pl.setX(i, st.pull)
        sz.setX(i, sizeBase * (0.7 + Math.random() * 0.6))
      })
      pts.renderOrder = 20
      return { pts, items }
    }
    const blood = make(streams, density, 0.0042)
    const nerve = make(nerveStreams, 60, 0.0035)
    // synaptic sparks sampled on the real cortex surface
    const cortex = [...parts.values()].filter((p) => p.s.group === 'nervous' && /gyrus|lobe|lobule|cerebellum|insula/.test(p.s.en))
    const sparkPos: number[] = []
    const NS = isMobile ? 160 : 420
    for (let i = 0; i < NS && cortex.length; i++) {
      const p = cortex[Math.floor(Math.random() * cortex.length)]
      const P = p.mesh.geometry.attributes.position
      const k = Math.floor(Math.random() * P.count)
      sparkPos.push(P.getX(k), P.getY(k), P.getZ(k))
    }
    const ns = sparkPos.length / 3
    const sparks = particles(ns)
    {
      const g = sparks.geometry
      ;(g.attributes.ipos as THREE.BufferAttribute).copyArray(new Float32Array(sparkPos))
      for (let i = 0; i < ns; i++) {
        ;(g.attributes.icolor as THREE.BufferAttribute).setXYZ(i, 1.0, 0.85, 0.45)
        ;(g.attributes.isize as THREE.BufferAttribute).setX(i, 0.004)
        ;(g.attributes.ipull as THREE.BufferAttribute).setX(i, 0.002)
      }
    }
    const phases = new Float32Array(ns).map(() => Math.random() * 10)
    return { blood, nerve, streams, nerveStreams, sparks: { pts: sparks, phases } }
  }, [])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dt) => {
    const st = useStore.getState()
    const on = st.life
    const t = state.clock.elapsedTime
    for (const o of [blood.pts, nerve.pts, sparks.pts]) o.visible = on
    if (!on) return
    const pulse = heartPulse(t)
    // flow is shown once the organs are exposed (or seen through X-ray / isolation / tours)
    const exposed = st.mode === 'xray' || st.isolated || st.tour === 'blood' || st.depth >= 4 ? 1 : 0
    const vis = (id: string) => { const p = parts.get(id); return p && p.mesh.visible ? p.fade : 0 }
    const step = (sys: { pts: THREE.Mesh; items: { s: number; u: number; v: number; jit: THREE.Vector3 }[] }, list: Stream[], pulsatile: boolean) => {
      const P = sys.pts.geometry.attributes.ipos as THREE.BufferAttribute
      const A = sys.pts.geometry.attributes.ialpha as THREE.BufferAttribute
      const vcache = list.map((s) => vis(s.id))
      sys.items.forEach((it, i) => {
        const s = list[it.s]
        const boost = pulsatile && s.artery ? 0.45 + 1.6 * pulse : 1
        it.u += (dt * s.speed * it.v * boost) / Math.max(0.03, s.len)
        // wrap (a long frame — slow GPU, background tab — can push u several laps ahead)
        it.u -= Math.floor(it.u)
        at(s.pts, it.u, tmp)
        const ex = parts.get(s.id)?.mesh.position
        P.setXYZ(i, tmp.x + it.jit.x + (ex?.x || 0), tmp.y + it.jit.y + (ex?.y || 0), tmp.z + it.jit.z + (ex?.z || 0))
        const edge = Math.max(0, Math.min(1, it.u * 8, (1 - it.u) * 8))
        A.setX(i, vcache[it.s] * edge * exposed * (CLIP_PLANE.distanceToPoint(tmp) < 0 ? 0 : 1))
      })
      P.needsUpdate = true; A.needsUpdate = true
    }
    step(blood, streams, true)
    step(nerve, nerveStreams, false)
    // sparks flicker only while the brain is shown
    const brainVis = [...parts.values()].find((p) => p.s.group === 'nervous' && /cerebellum/.test(p.s.en))
    const bv = brainVis && brainVis.mesh.visible ? brainVis.fade : 0
    const SA = sparks.pts.geometry.attributes.ialpha as THREE.BufferAttribute
    for (let i = 0; i < SA.count; i++) {
      const ph = (t * 0.6 + sparks.phases[i]) % 3
      tmp.fromBufferAttribute(sparks.pts.geometry.attributes.ipos as THREE.BufferAttribute, i)
      SA.setX(i, CLIP_PLANE.distanceToPoint(tmp) < 0 ? 0 : bv * Math.max(0, 1 - Math.abs(ph - 0.15) * 7))
    }
    SA.needsUpdate = true
  })

  return (
    <group>
      <primitive object={blood.pts} />
      <primitive object={nerve.pts} />
      <primitive object={sparks.pts} />
    </group>
  )
}
