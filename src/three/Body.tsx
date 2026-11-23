import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { parts, root } from './registry'
import { SHARED, CLIP_PLANE } from './materials'
import { useStore } from '../store'
import { LAYER_INDEX } from '../data'

const BEAT = 72 / 60 // Hz
const BREATH = 14 / 60
// lub-dub: two gaussian pulses per cycle
export function heartPulse(t: number) {
  const ph = (t * BEAT) % 1
  const g = (x: number, m: number, w: number) => Math.exp(-((x - m) ** 2) / (2 * w * w))
  return g(ph, 0.08, 0.045) + 0.55 * g(ph, 0.3, 0.05)
}
export const breathPhase = (t: number) => 0.5 - 0.5 * Math.cos(t * BREATH * Math.PI * 2)

const tmp = new THREE.Vector3()
const segA = new THREE.Vector3(), segB = new THREE.Vector3()
let selR = 0.1
const ray = new THREE.Ray(), box = new THREE.Box3()
const glowCol = new THREE.Color()
const WARM = new THREE.Color('#ffd9a0')
const EXT = { x: 0.34, y: 0.86, z: 0.2 }

export default function Body() {
  const explodeT = useRef(0)
  const { gl, camera } = useThree()
  gl.localClippingEnabled = true

  useFrame((state, dt) => {
    const st = useStore.getState()
    const t = state.clock.elapsedTime
    SHARED.uTime.value = t
    const k = 1 - Math.exp(-dt * 7)
    const explodeTarget = st.mode === 'explode' ? st.explode : 0
    explodeT.current += (explodeTarget - explodeT.current) * (1 - Math.exp(-dt * 4))
    const ex = explodeT.current

    // section plane
    if (st.mode === 'section') {
      const n = { x: [-1, 0, 0], y: [0, -1, 0], z: [0, 0, -1] }[st.sectionAxis] as [number, number, number]
      CLIP_PLANE.normal.set(...n)
      CLIP_PLANE.constant = st.sectionPos * EXT[st.sectionAxis] + (st.sectionAxis === 'y' ? 0 : 0)
      SHARED.uCap.value = 1
    } else {
      CLIP_PLANE.constant = 1000
      SHARED.uCap.value = 0
    }

    // focus: ghost whatever sits between the camera and the focused structure
    const sel = st.focused && st.selected ? parts.get(st.selected) : undefined
    if (sel) {
      segA.copy(camera.position); segB.copy(sel.center).add(sel.mesh.position)
      const sz = sel.s.max.map((v, i) => v - sel.s.min[i])
      selR = Math.max(0.05, Math.max(...sz) * 0.55)
      ray.set(segA, segB.clone().sub(segA).normalize())
    }
    const pulse = st.life ? heartPulse(t) : 0
    const breath = st.life ? breathPhase(t) : 0
    const xray = st.mode === 'xray'

    for (const p of parts.values()) {
      const s = p.s
      // ---------- visibility target ----------
      let target = st.systems[s.system] === false ? 0 : 1
      if (!xray) {
        const li = LAYER_INDEX[s.layer]
        if (s.layer === 'skin') { if (st.depth > 0) target = 0 }
        else if (li < st.depth) target = 0
      }
      if (st.isolated && st.selected) target = p.id === st.selected ? 1 : 0
      else if (sel && p !== sel && target > 0) {
        // ghost anything whose bounds the camera→target sight line crosses before reaching the target
        box.min.set(...p.s.min).add(p.mesh.position); box.max.set(...p.s.max).add(p.mesh.position)
        const hit = ray.intersectBox(box, tmp)
        const dTarget = segA.distanceTo(segB)
        if (hit && segA.distanceTo(hit) < dTarget - selR * 0.6 && !box.containsPoint(segB)) target = 0.12
      }
      if (st.tour === 'arm' && s.group !== 'skeleton' && !(s.group === 'muscles' && /arm|brachi|deltoid|biceps|triceps|anconeus|pectoralis major|carpi|pronator|supinator/.test(s.en))) target = Math.min(target, 0)
      p.target = target
      p.fade += (target - p.fade) * k
      const visible = p.fade > 0.01
      p.mesh.visible = visible
      if (!visible) continue

      // ---------- material: X-ray vs real ----------
      const isSel = p.id === st.selected || st.highlight.includes(p.id)
      const useX = xray && !isSel
      const m = p.mat
      if (useX) { if (p.mesh.material !== p.xray) p.mesh.material = p.xray }
      else if (p.mesh.material !== m) p.mesh.material = m

      if (!useX) {
        const op = p.fade
        const needT = op < 0.995
        if (m.transparent !== needT) { m.transparent = needT; m.needsUpdate = true }
        m.depthWrite = op > 0.6
        m.opacity = op
        // highlight glow (bloom picks up emissive > 1)
        const want = p.id === st.selected ? 0.75 + 0.25 * Math.sin(t * 3) : st.highlight.includes(p.id) ? 0.7 + 0.3 * Math.sin(t * 5) : p.id === st.hovered ? 0.55 : 0
        p.glow += (want - p.glow) * k
        glowCol.copy(m.userData.baseColor as THREE.Color).lerp(WARM, 0.35)
        m.emissive.copy(glowCol)
        m.emissiveIntensity = p.glow * 3.2
        // skin glass reads better from DoubleSide in section mode
        const side = s.layer === 'skin' ? THREE.FrontSide : THREE.DoubleSide
        if (m.side !== side) { m.side = side; m.needsUpdate = true }
      }

      // ---------- transforms: explode + life ----------
      tmp.copy(p.explodeDir).multiplyScalar(ex)
      let sc = 1
      if (p.pulse) {
        if (p.pulse.kind === 'heart') sc = 1 + 0.045 * pulse
        else if (p.pulse.kind === 'lung') sc = 1 + 0.035 * breath
        if (p.pulse.kind === 'diaphragm') tmp.y -= 0.012 * breath
      }
      if (sc !== 1) {
        p.mesh.scale.setScalar(sc)
        p.mesh.position.copy(p.pulse!.pivot).multiplyScalar(1 - sc).add(tmp)
        if (p.pulse!.kind === 'lung') { p.mesh.scale.y = 1 + 0.05 * breath; p.mesh.position.y = p.pulse!.pivot.y * (1 - p.mesh.scale.y) + tmp.y - 0.004 * breath }
      } else {
        p.mesh.scale.setScalar(1)
        p.mesh.position.copy(tmp)
      }
    }
  })

  // ---------- picking ----------
  useEffect(() => {
    const el = gl.domElement
    const ray = new THREE.Raycaster()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ray as any).firstHitOnly = true
    const ndc = new THREE.Vector2()
    const pick = (e: PointerEvent | MouseEvent): string | null => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const st = useStore.getState()
      let best: { d: number; id: string } | null = null
      let skinHit: string | null = null
      for (const p of parts.values()) {
        if (!p.mesh.visible || p.fade < 0.5) continue
        const hits = ray.intersectObject(p.mesh, false)
        if (!hits.length) continue
        // honour section plane
        const h = hits.find((x) => st.mode !== 'section' || CLIP_PLANE.distanceToPoint(x.point) >= 0)
        if (!h) continue
        if (p.s.layer === 'skin') { skinHit = p.id; continue }
        if (!best || h.distance < best.d) best = { d: h.distance, id: p.id }
      }
      return best?.id ?? skinHit
    }
    // debug/automation hook (used by screenshot scripts)
    ;(window as unknown as Record<string, unknown>).__jasad = { pickAt: (x: number, y: number) => pick({ clientX: x, clientY: y } as MouseEvent), parts, store: useStore, shared: SHARED, gsap }
    let last = 0, raf = 0
    let down = { x: 0, y: 0, t: 0 }
    let lastTap = { t: 0, id: null as string | null }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (now - last < 60) return
      last = now
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const id = pick(e)
        if (id !== useStore.getState().hovered) useStore.getState().set({ hovered: id })
        el.style.cursor = id ? 'pointer' : 'grab'
      })
    }
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() } }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || performance.now() - down.t > 450) return
      const st = useStore.getState()
      if (st.tour) return
      const id = pick(e)
      const now = performance.now()
      const dbl = now - lastTap.t < 380 && id && id === lastTap.id
      lastTap = { t: now, id }
      if (dbl) st.select(id, true)
      else if (id) st.select(id)
      else if (!st.isolated) st.select(null)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp) }
  }, [gl, camera])

  return <primitive object={root} />
}
