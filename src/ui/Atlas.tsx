import { STRUCTURES, SYSTEMS } from '../data'
import { useStore } from '../store'
import { flyTo, HOME } from '../three/Scene'
import * as THREE from 'three'

const THUMB: Record<string, string> = Object.fromEntries(SYSTEMS.map((s) => [s.key, import.meta.env.BASE_URL + 'thumbs/' + s.key + '.webp']))
const COUNT: Record<string, number> = {}
for (const s of Object.values(STRUCTURES)) COUNT[s.system] = (COUNT[s.system] || 0) + 1

// visual index: one card per body system with a rendered thumbnail; choosing one shows that system and frames it
export default function Atlas({ onClose }: { onClose: () => void }) {
  const set = useStore((s) => s.set)
  const genital = useStore((s) => s.systems.genital)
  const open = (k: string) => {
    const depth = k === 'integumentary' ? 0 : k === 'muscular' ? 2 : k === 'skeletal' ? 5 : 4
    const layerSys = k === 'integumentary' || k === 'muscular' || k === 'skeletal'
    set({ mode: 'layers', depth, selected: null, isolated: false, removed: [],
      systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, layerSys ? s.key !== 'genital' || genital : s.key === k])) })
    onClose()
    if (layerSys) { flyTo(HOME.pos, HOME.target); return }
    const v = Object.values(STRUCTURES).filter((s) => s.system === k)
    const mn = [0, 1, 2].map((i) => Math.min(...v.map((s) => s.min[i]))), mx = [0, 1, 2].map((i) => Math.max(...v.map((s) => s.max[i])))
    const c = new THREE.Vector3(...mn.map((m, i) => (m + mx[i]) / 2))
    const d = Math.max(mx[0] - mn[0], mx[1] - mn[1]) * 1.9 + 0.25
    flyTo(c.clone().add(new THREE.Vector3(0.12 * d, 0.05 * d, d)), c)
  }
  return (
    <div className="atlas" role="dialog" aria-label="فهرس الأجهزة" onClick={onClose}>
      <div className="atlas-in glass" onClick={(e) => e.stopPropagation()}>
        <div className="atlas-head"><h2>فهرس الجسم</h2><button className="card-x" onClick={onClose} aria-label="إغلاق">×</button></div>
        <div className="atlas-grid">
          {SYSTEMS.filter((s) => s.key !== 'genital').map((s) => (
            <button key={s.key} className="atlas-card" style={{ ['--c' as string]: s.color }} onClick={() => open(s.key)}>
              <img src={THUMB[s.key]} alt="" loading="lazy" width={240} height={320} />
              <span><i />{s.ar}</span>
              <small>{COUNT[s.key] || 0} تركيبًا</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
