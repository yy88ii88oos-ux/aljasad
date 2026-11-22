import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOW, STRUCTURES, isMobile } from '../data'
import { parts } from './registry'
import { useStore } from '../store'
import { heartPulse } from './Body'

// Points shader: soft glowing dots, pulled toward the camera by `pull` metres so they read through the vessel wall
function pointsMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float alpha; attribute float size; attribute float pull;
      varying vec3 vC; varying float vA; uniform float uScale;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        mv.xyz += normalize(-mv.xyz) * pull;
        gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, size * uScale / -mv.z); vC = color; vA = alpha; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vC * (0.6 + a), a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
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
        nerveStreams.push({ id, pts, len: f.length, speed: 0.35, artery: false, pull: 0.004, color: new THREE.Color(3.2, 2.4, 0.9) })
        continue
      }
      if (s.group !== 'cardio') continue
      const vein = /vein|vena|sinus/.test(s.en) && !/pulmonary vein/.test(s.en)
      const d0 = pts[0].distanceTo(H), d1 = pts[pts.length - 1].distanceTo(H)
      if (vein ? d0 < d1 : d0 > d1) pts = pts.reverse()
      const big = /aorta|vena cava/.test(s.en)
      streams.push({
        id, pts, len: f.length, speed: vein ? 0.07 : 0.16, artery: !vein, pull: big ? 0.014 : /carotid|subclavian|iliac|brachiocephalic|renal/.test(s.en) ? 0.007 : 0.004,
        color: vein ? new THREE.Color(0.3, 0.5, 2.6) : new THREE.Color(2.8, 0.2, 0.25),
      })
    }
    const density = isMobile ? 70 : 160 // particles per metre
    const make = (list: Stream[], dens: number, sizeBase: number) => {
      const items: { s: number; u: number; v: number; jit: THREE.Vector3 }[] = []
      list.forEach((st, si) => {
        const n = Math.max(3, Math.round(st.len * dens))
        for (let i = 0; i < n; i++) items.push({ s: si, u: Math.random(), v: 0.75 + Math.random() * 0.5, jit: new THREE.Vector3().randomDirection().multiplyScalar(0.0025) })
      })
      const g = new THREE.BufferGeometry()
      const N = items.length
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
      g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N), 1))
      g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N).map(() => sizeBase * (0.7 + Math.random() * 0.6)), 1))
      g.setAttribute('pull', new THREE.BufferAttribute(new Float32Array(N), 1))
      items.forEach((it, i) => {
        const st = list[it.s]
        ;(g.attributes.color as THREE.BufferAttribute).setXYZ(i, st.color.r, st.color.g, st.color.b)
        ;(g.attributes.pull as THREE.BufferAttribute).setX(i, st.pull)
      })
      const pts = new THREE.Points(g, pointsMaterial())
      pts.frustumCulled = false
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
    const sg = new THREE.BufferGeometry()
    const ns = sparkPos.length / 3
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkPos), 3))
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ns * 3).map((_, i) => [3.0, 2.3, 1.0][i % 3]), 3))
    sg.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(ns), 1))
    sg.setAttribute('size', new THREE.BufferAttribute(new Float32Array(ns).fill(0.004), 1))
    sg.setAttribute('pull', new THREE.BufferAttribute(new Float32Array(ns).fill(0.002), 1))
    const sparks = new THREE.Points(sg, pointsMaterial())
    sparks.frustumCulled = false
    const phases = new Float32Array(ns).map(() => Math.random() * 10)
    return { blood, nerve, streams, nerveStreams, sparks: { pts: sparks, phases } }
  }, [])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dt) => {
    const st = useStore.getState()
    const on = st.life
    const t = state.clock.elapsedTime
    // pixels per metre at 1 m distance → sizes below are true world sizes in metres
    const cam = state.camera as THREE.PerspectiveCamera
    const scale = (state.size.height * state.viewport.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2))
    for (const o of [blood.pts, nerve.pts, sparks.pts]) { o.visible = on; (o.material as THREE.ShaderMaterial).uniforms.uScale.value = scale }
    if (!on) return
    const pulse = heartPulse(t)
    // flow is shown once the organs are exposed (or seen through X-ray / isolation / tours)
    const exposed = st.mode === 'xray' || st.isolated || st.tour === 'blood' || st.depth >= 3 ? 1 : 0
    const vis = (id: string) => { const p = parts.get(id); return p && p.mesh.visible ? p.fade : 0 }
    const step = (sys: { pts: THREE.Points; items: { s: number; u: number; v: number; jit: THREE.Vector3 }[] }, list: Stream[], pulsatile: boolean) => {
      const P = sys.pts.geometry.attributes.position as THREE.BufferAttribute
      const A = sys.pts.geometry.attributes.alpha as THREE.BufferAttribute
      const vcache = list.map((s) => vis(s.id))
      sys.items.forEach((it, i) => {
        const s = list[it.s]
        const boost = pulsatile && s.artery ? 0.45 + 1.6 * pulse : 1
        it.u += (dt * s.speed * it.v * boost) / Math.max(0.03, s.len)
        if (it.u > 1) it.u -= 1
        at(s.pts, it.u, tmp)
        const ex = parts.get(s.id)?.mesh.position
        P.setXYZ(i, tmp.x + it.jit.x + (ex?.x || 0), tmp.y + it.jit.y + (ex?.y || 0), tmp.z + it.jit.z + (ex?.z || 0))
        const edge = Math.min(1, it.u * 8, (1 - it.u) * 8)
        A.setX(i, vcache[it.s] * edge * exposed)
      })
      P.needsUpdate = true; A.needsUpdate = true
    }
    step(blood, streams, true)
    step(nerve, nerveStreams, false)
    // sparks flicker only while the brain is shown
    const brainVis = [...parts.values()].find((p) => p.s.group === 'nervous' && /cerebellum/.test(p.s.en))
    const bv = brainVis && brainVis.mesh.visible ? brainVis.fade : 0
    const SA = sparks.pts.geometry.attributes.alpha as THREE.BufferAttribute
    for (let i = 0; i < SA.count; i++) {
      const ph = (t * 0.6 + sparks.phases[i]) % 3
      SA.setX(i, bv * Math.max(0, 1 - Math.abs(ph - 0.15) * 7))
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
