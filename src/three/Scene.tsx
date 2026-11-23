import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, DepthOfField, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode, SMAAPreset, type DepthOfFieldEffect } from 'postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'

// keep tweens wall-clock accurate even when frames are slow (low-end GPUs, background tabs)
gsap.ticker.lagSmoothing(0)
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import Body from './Body'
import Life from './Life'
import Tours from './Tours'
import StudyRig from './StudyRig'
import { Grade } from './grade'
import { parts, upgradeGroup } from './registry'
import { STRUCTURES, isMobile, lightModels, type Group } from '../data'
import { useStore } from '../store'

export const HOME = isMobile
  ? { pos: new THREE.Vector3(0, 0.08, 3.45), target: new THREE.Vector3(0, 0.035, 0) }
  : { pos: new THREE.Vector3(0, 0.12, 2.75), target: new THREE.Vector3(0, 0.02, 0) }
export const rig: { controls: OrbitControlsImpl | null; camera: THREE.PerspectiveCamera | null; focus: THREE.Vector3; dof: number } = {
  controls: null, camera: null, focus: new THREE.Vector3(), dof: 0,
}

// cinematic fly: arcs around the target while dollying in
export function flyTo(pos: THREE.Vector3, target: THREE.Vector3, duration = 1.8, onComplete?: () => void) {
  const c = rig.controls, cam = rig.camera
  if (!c || !cam) return
  const p0 = cam.position.clone(), t0 = c.target.clone()
  const o = { t: 0 }
  gsap.killTweensOf(o)
  gsap.to(o, {
    t: 1, duration, ease: 'power3.inOut',
    onUpdate: () => {
      const k = o.t
      c.target.lerpVectors(t0, target, k)
      const p = new THREE.Vector3().lerpVectors(p0, pos, k)
      // lift the path in the middle for a crane-like move
      p.y += Math.sin(k * Math.PI) * 0.12 * p0.distanceTo(pos)
      cam.position.copy(p)
      c.update()
    },
    onComplete,
  })
}
export function flyToStructure(id: string) {
  const s = STRUCTURES[id]; const cam = rig.camera; const c = rig.controls
  if (!s || !cam || !c) return
  const p = parts.get(id)
  const target = new THREE.Vector3(...s.c).add(p ? p.mesh.position : new THREE.Vector3())
  const size = Math.max(s.max[0] - s.min[0], s.max[1] - s.min[1], s.max[2] - s.min[2])
  const dist = THREE.MathUtils.clamp(size * 2.6, 0.18, 1.6) * (isMobile ? 1.35 : 1)
  const dir = cam.position.clone().sub(c.target).normalize()
  // prefer viewing from the structure's exposed side
  if (Math.abs(s.c[0]) > 0.08) dir.x += Math.sign(s.c[0]) * 0.5
  dir.y = Math.max(dir.y, 0.05)
  dir.normalize()
  rig.focus.copy(target)
  flyTo(target.clone().addScaledVector(dir, dist), target)
}
// straight at a sagittal cut face (camera on +x looking toward -x)
export function flyToCut(id: string, dist = 0.09, axis: 'x' | 'z' = 'x') {
  const s = STRUCTURES[id]
  if (!s) return
  const t = new THREE.Vector3(...s.c)
  rig.focus.copy(t)
  const off = axis === 'x' ? new THREE.Vector3(dist, 0.004, 0.012) : new THREE.Vector3(0.02, 0.01, dist)
  flyTo(t.clone().add(off), t, 2)
}
// «internal section» presets: a cut through the structure, then the camera faces the cut
export const CUTS: Record<string, { axis: 'x' | 'z'; target: string; dist: number; depth: number }> = {
  eye: { axis: 'x', target: 'EYE_LENS_R', dist: 0.09, depth: 2 },
  heart: { axis: 'z', target: 'FMA7274', dist: 0.32, depth: 4 },
}
export function openCut(key: keyof typeof CUTS) {
  const c = CUTS[key], s = STRUCTURES[c.target]
  if (!s) return
  const ext = c.axis === 'x' ? 0.34 : 0.2
  useStore.getState().set({ mode: 'section', sectionAxis: c.axis, sectionPos: s.c[c.axis === 'x' ? 0 : 2] / ext, depth: c.depth })
  setTimeout(() => { useStore.getState().select(c.target); flyToCut(c.target, c.dist, c.axis) }, 1700)
}
// opening shot: the beating heart seen through the glass body, then the camera pulls back to the whole figure
export function intro() {
  const c = rig.controls, cam = rig.camera
  const h = STRUCTURES['FMA7274']
  if (!c || !cam || !h) return
  const t = new THREE.Vector3(...h.c)
  cam.position.set(t.x + 0.05, t.y + 0.03, t.z + (isMobile ? 0.62 : 0.45)); c.target.copy(t); c.update()
  const st = useStore.getState()
  st.set({ mode: 'xray', life: true, highlight: ['FMA7274'] })
  gsap.delayedCall(3.2, () => {
    if ((window as unknown as { __holdIntro?: boolean }).__holdIntro) return
    useStore.getState().set({ mode: 'layers', highlight: [] })
    flyTo(HOME.pos, HOME.target, 3.4)
  })
}
export function flyHome() { rig.focus.set(0, 0, 0); flyTo(HOME.pos, HOME.target) }

function Rig() {
  const ref = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const focusTick = useStore((s) => s.focusTick)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let to = 0
    const start = () => { clearTimeout(to); to = window.setTimeout(() => useStore.getState().set({ interacting: true }), 180) }
    const end = () => { clearTimeout(to); to = window.setTimeout(() => useStore.getState().set({ interacting: false }), 1200) }
    c.addEventListener('start', start); c.addEventListener('end', end)
    return () => { c.removeEventListener('start', start); c.removeEventListener('end', end); clearTimeout(to) }
  }, [])
  useEffect(() => { rig.controls = ref.current; rig.camera = camera as THREE.PerspectiveCamera; (window as unknown as Record<string, unknown>).__rig = rig }, [camera])
  // ?cam=px,py,pz,tx,ty,tz pins the camera (screenshots, shareable views)
  const ready = useStore((s) => s.ready)
  useEffect(() => {
    const m = /[?&]cam=([-\d.,]+)/.exec(location.search)
    if (!ready || !m || !ref.current) return
    const v = m[1].split(',').map(Number)
    camera.position.set(v[0], v[1], v[2]); ref.current.target.set(v[3], v[4], v[5]); ref.current.update()
  }, [ready, camera])
  useEffect(() => {
    const sel = useStore.getState().selected
    if (focusTick && sel) flyToStructure(sel)
  }, [focusTick])
  // section mode: swing the camera so the cut face is in view
  const mode = useStore((s) => s.mode)
  const axis = useStore((s) => s.sectionAxis)
  useEffect(() => {
    if (mode !== 'section' || useStore.getState().tour) return
    const k = isMobile ? 1.35 : 1
    const v = { x: [1.9, 0.25, 1.5], y: [0.7, 1.9, 1.6], z: [0.5, 0.2, 2.6] }[axis]
    flyTo(new THREE.Vector3(...v).multiplyScalar(k), new THREE.Vector3(0, axis === 'y' ? -0.1 : 0.02, 0), 1.6)
  }, [mode, axis])
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (ref.current) {
      // near plane follows the orbit distance → full depth precision at every zoom (no z-fighting speckles)
      const d = cam.position.distanceTo(ref.current.target)
      const near = THREE.MathUtils.clamp(d * 0.035, 0.002, 0.06)
      if (Math.abs(near - cam.near) / cam.near > 0.08) { cam.near = near; cam.far = 60; cam.updateProjectionMatrix() }
      // close-up on a phone: swap in the full-resolution meshes of whatever is being looked at
      if (lightModels && d < 0.9 && useStore.getState().streaming >= 1) {
        const st = useStore.getState()
        const sel = st.selected ? STRUCTURES[st.selected]?.group : undefined
        const byDepth: Group[][] = [['skin', 'muscles'], ['muscles'], ['muscles'], ['muscles', 'skeleton'], ['organs', 'cardio', 'nervous'], ['skeleton']]
        const want: Group[] = sel ? [sel] : st.mode === 'xray' ? ['organs', 'cardio'] : byDepth[st.depth] || []
        for (const g of want) void upgradeGroup(g)
      }
    }
    const st = useStore.getState()
    const want = st.selected && st.focused ? 1 : 0
    rig.dof += (want - rig.dof) * 0.05
    if (ref.current) ref.current.autoRotate = !st.selected && !st.tour && st.ready && !STILL
  })
  return (
    <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={0.08} autoRotateSpeed={0.35} minDistance={0.04} maxDistance={5}
      target={HOME.target.toArray() as [number, number, number]} />
  )
}

function Backdrop() {
  // dark radial gradient dome + slow drifting light motes
  const dome = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: /* glsl */ `varying vec3 vP; uniform float uTime;
      void main(){ float h = vP.y*0.5+0.5;
        vec3 top = vec3(0.05,0.075,0.15), mid = vec3(0.028,0.042,0.09), bot = vec3(0.01,0.015,0.032);
        vec3 c = mix(bot, mid, smoothstep(0.0,0.5,h)); c = mix(c, top, smoothstep(0.5,1.0,h));
        float glow = pow(max(0.0, 1.0 - length(vP.xy - vec2(0.0,0.1))), 3.0); c += vec3(0.05,0.03,0.05)*glow*0.6;
        gl_FragColor = vec4(c,1.0); }`,
  }), [])
  const motes = useMemo(() => {
    const N = isMobile ? 220 : 600
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(N * 3), s = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const r = 1.2 + Math.random() * 3.5, a = Math.random() * Math.PI * 2
      p.set([Math.cos(a) * r, (Math.random() - 0.5) * 4, Math.sin(a) * r - 0.6], i * 3); s[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('seed', new THREE.BufferAttribute(s, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `attribute float seed; uniform float uTime; varying float vA;
        void main(){ vec3 p = position; p.y += mod(uTime*0.02*(0.4+seed) + seed*4.0, 4.0) - 2.0 - position.y*0.0;
          p.x += sin(uTime*0.1+seed*20.0)*0.08; vec4 mv = modelViewMatrix*vec4(p,1.0);
          gl_Position = projectionMatrix*mv; gl_PointSize = (2.0+seed*5.0)*(3.0/-mv.z); vA = 0.25+0.5*sin(uTime*0.5+seed*30.0)*0.5+0.25; }`,
      fragmentShader: 'varying float vA; void main(){ float r=length(gl_PointCoord-0.5); if(r>0.5) discard; gl_FragColor=vec4(vec3(0.55,0.75,1.0)*(1.0-smoothstep(0.0,0.5,r))*vA*0.55,1.0); }',
    })
    const pts = new THREE.Points(g, m); pts.frustumCulled = false
    return pts
  }, [])
  useFrame((_, dt) => { (motes.material as THREE.ShaderMaterial).uniforms.uTime.value += dt })
  return (
    <>
      <mesh material={dome} scale={30} renderOrder={-10}><sphereGeometry args={[1, 32, 16]} /></mesh>
      <primitive object={motes} />
    </>
  )
}

// soft contact shadow under the feet (a blurred ellipse: no extra scene render)
const FLOOR_Y = Math.min(...Object.values(STRUCTURES).map((s) => s.min[1])) - 0.004
function FloorShadow() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uOp: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv*2.0-1.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec2 vU; uniform float uOp;
      void main(){ vec2 f = vec2(abs(vU.x) - 0.32, vU.y) * vec2(1.0, 1.0); float core = exp(-dot(f,f)*7.0);
        float wide = exp(-dot(vU,vU)*2.2); gl_FragColor = vec4(0.0,0.0,0.02, (core*0.55 + wide*0.35) * uOp); }`,
  }), [])
  useFrame(() => {
    const st = useStore.getState()
    const want = st.mode === 'layers' || st.mode === 'xray' ? (st.ready ? 1 : 0) : 0
    mat.uniforms.uOp.value += (want - mat.uniforms.uOp.value) * 0.06
  })
  return <mesh material={mat} position={[0, FLOOR_Y, -0.02]} rotation-x={-Math.PI / 2} renderOrder={-5}><planeGeometry args={[0.7, 0.5]} /></mesh>
}

// elegant name tag beside the selected structure (follows it as the camera moves)
function SelLabel() {
  const selected = useStore((s) => s.selected)
  const tour = useStore((s) => s.tour)
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const p = selected ? parts.get(selected) : undefined
    if (p && ref.current) {
      // anchor at the structure's side that faces the screen-right, slightly above centre
      const s = p.s
      ref.current.position.set(s.c[0], s.c[1] + (s.max[1] - s.min[1]) * 0.25, s.c[2]).add(p.mesh.position)
    }
  })
  if (!selected || tour || !STRUCTURES[selected]) return null
  return (
    <group ref={ref}>
      <Html zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div className="sel-label">{STRUCTURES[selected].ar}</div></Html>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.06} color="#9fb4e8" />
      {/* key: warm, high and to the side, with soft shadows the muscles cast on one another */}
      <directionalLight position={[-1.5, 2.6, 2.3]} intensity={3.3} color="#ffe6cc" castShadow
        shadow-mapSize={[SHADOW, SHADOW]} shadow-bias={-0.0004} shadow-normalBias={0.0035} shadow-radius={isMobile ? 3 : 4}
        shadow-camera-left={-0.62} shadow-camera-right={0.62} shadow-camera-top={0.95} shadow-camera-bottom={-0.95}
        shadow-camera-near={1} shadow-camera-far={7} />
      {/* faint cool fill so the shadow side stays readable */}
      <directionalLight position={[1.8, 0.4, 2.2]} intensity={0.35} color="#9db6ff" />
      {/* rim lights from behind carve the silhouette: cold on one side, warm on the other */}
      <directionalLight position={[1.4, 1.6, -3]} intensity={3.6} color="#8fc4ff" />
      <directionalLight position={[-1.8, -0.3, -2.5]} intensity={1.5} color="#ffb48a" />
      <Environment resolution={256} frames={1} environmentIntensity={0.6}>
        {/* soft studio HDRI built from light-formers (no network fetch) */}
        <Lightformer form="rect" intensity={1.2} position={[-1, 4, 2]} scale={[8, 3, 1]} color="#fff1e2" />
        <Lightformer form="rect" intensity={0.9} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} color="#cfe3ff" />
        <Lightformer form="rect" intensity={0.7} position={[5, 0.5, 0]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} color="#ffd8c4" />
        <Lightformer form="ring" intensity={2.2} position={[0, 1, -5]} scale={3} color="#9cc8ff" />
        <Lightformer form="rect" intensity={0.25} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#30283a" />
      </Environment>
    </>
  )
}

const STILL = /[?&](still|cam=)/.test(location.search)
// MSAA in the HDR composer turned frames black with blended particles in testing (and costs a lot on phones):
// anti-aliasing comes from SMAA at device-pixel-ratio 2 instead. ?msaa=4 re-enables it for comparison.
const MSAA = /[?&]msaa=4/.test(location.search) ? 4 : 0
const SHADOW = isMobile ? 1024 : 2048
const SAFE_KEY = 'jasad.safeFx'
const storedSafe = (() => { try { return localStorage.getItem(SAFE_KEY) === '1' } catch { return false } })()
const FX = !/[?&]fx=0/.test(location.search)
// If the composited frame comes out pure black while the body should be on screen, fall back to plain rendering
// (no post-processing) and remember that on this device. Reads a few pixels right after the composer has drawn.
function BlackGuard({ onFail }: { onFail: () => void }) {
  const { gl } = useThree()
  const st = useRef({ t0: -1, next: 0, bad: 0, done: false })
  const px = useMemo(() => new Uint8Array(4), [])
  useFrame((state) => {
    const g = st.current
    if (g.done || !useStore.getState().ready) return
    const t = state.clock.elapsedTime
    if (g.t0 < 0) { g.t0 = t; g.next = t + 3 }
    if (t < g.next) return
    g.next = t + 1.5
    if (t - g.t0 > 40) { g.done = true; return }
    const ctx = gl.getContext(), w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight
    let max = 0
    for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.35], [0.5, 0.65], [0.3, 0.5], [0.7, 0.5], [0.1, 0.9]]) {
      ctx.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
      max = Math.max(max, px[0], px[1], px[2])
    }
    // the backdrop alone is never pure black, so an all-black sample means a broken frame
    g.bad = max <= 2 ? g.bad + 1 : 0
    if (g.bad >= 2) { g.done = true; console.warn('black frames detected: post-processing disabled on this device'); onFail() }
  }, 2)
  return null
}
function Effects({ lite }: { lite: boolean }) {
  const dofRef = useRef<DepthOfFieldEffect>(null)
  useFrame(() => {
    const d = dofRef.current
    if (!d) return
    d.target = rig.focus
    d.bokehScale = rig.dof * 3.2
  })
  if (isMobile || lite) {
    return (
      <EffectComposer multisampling={MSAA}>
        {/* light AO at half resolution, iOS included: the black-frame guard falls back to plain rendering if it ever fails */}
        {!lite && !/noao/.test(location.search) ? <N8AO halfRes quality="performance" aoRadius={0.045} distanceFalloff={0.6} intensity={1.6} /> : <></>}
        <Bloom mipmapBlur luminanceThreshold={2.2} intensity={0.7} radius={0.6} />
        <Vignette offset={0.25} darkness={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Grade />
        <SMAA preset={SMAAPreset.HIGH} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={MSAA}>
      {!/noao/.test(location.search) ? <N8AO quality="medium" aoRadius={0.06} distanceFalloff={0.6} intensity={2.6} /> : <></>}
      {!/nodof/.test(location.search) ? <DepthOfField ref={dofRef} focusRange={0.05} bokehScale={0} /> : <></>}
      <Bloom mipmapBlur luminanceThreshold={2.2} intensity={0.7} radius={0.6} />
      <Vignette offset={0.25} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Grade />
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  )
}

// tone mapping lives in the composer normally, in the renderer when post-processing is off
function ToneSync({ safe }: { safe: boolean }) {
  const { gl } = useThree()
  useEffect(() => { gl.toneMapping = safe ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }, [gl, safe])
  return null
}

export default function Scene() {
  const ready = useStore((s) => s.ready)
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
  // adaptive quality never drops below this: edges stay crisp on phones
  const minDpr = Math.min(maxDpr, 1.5)
  const [dpr, setDpr] = useState(maxDpr)
  const [lite, setLite] = useState(false)
  const [safe, setSafe] = useState(storedSafe || !FX)
  const goSafe = () => { try { localStorage.setItem(SAFE_KEY, '1') } catch { /* private mode */ } setSafe(true) }
  return (
    <Canvas
      dpr={dpr}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: safe ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
      onCreated={({ gl }) => {
        // a lost GPU context (memory pressure on phones) shows as a black canvas: reload once in safe mode
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          try { if (!sessionStorage.getItem('jasad.reloaded')) { sessionStorage.setItem('jasad.reloaded', '1'); localStorage.setItem(SAFE_KEY, '1'); location.reload() } } catch { /* ignore */ }
        })
      }}
      camera={{ position: HOME.pos.toArray() as [number, number, number], fov: 38, near: 0.02, far: 80 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Backdrop />
      <Lights />
      <FloorShadow />
      <SelLabel />
      <Body />
      {ready && <Life />}
      {ready && <Tours />}
      {ready && <StudyRig />}
      <Rig />
      {/* adaptive quality: lower resolution first, then drop SSAO + DoF */}
      <PerformanceMonitor flipflops={4} onDecline={() => { if (dpr > minDpr + 0.01) setDpr(Math.max(minDpr, dpr - 0.25)); else setLite(true) }} onIncline={() => setDpr(Math.min(maxDpr, dpr + 0.25))} />
      {!safe && <Effects lite={lite} />}
      {!safe && <BlackGuard onFail={goSafe} />}
      <ToneSync safe={safe} />
    </Canvas>
  )
}
