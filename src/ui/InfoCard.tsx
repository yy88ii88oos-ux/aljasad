import { STRUCTURES, SYSTEM_BY_KEY, LAYERS } from '../data'
import { useStore } from '../store'
import { flyHome } from '../three/Scene'

export default function InfoCard() {
  const selected = useStore((s) => s.selected)
  const isolated = useStore((s) => s.isolated)
  const tour = useStore((s) => s.tour)
  const set = useStore((s) => s.set)
  const select = useStore((s) => s.select)
  if (!selected || tour) return null
  const s = STRUCTURES[selected]
  if (!s) return null
  const sys = SYSTEM_BY_KEY[s.system]
  const layer = LAYERS.find((l) => l.key === s.layer)
  return (
    <aside className="card glass" key={s.id} aria-live="polite">
      <button className="card-x" onClick={() => { select(null); if (isolated) set({ isolated: false }); flyHome() }} aria-label="إغلاق">×</button>
      <div className="card-sys" style={{ ['--c' as string]: sys?.color }}><i />{sys?.ar}<span>· {layer?.ar}</span></div>
      <h2 className="card-ar">{s.ar}</h2>
      <div className="card-en" dir="ltr">{s.en}</div>
      {s.fn && (<><h3>الوظيفة</h3><p>{s.fn}</p></>)}
      {s.fact && (<div className="card-fact"><b>✦ معلومة مدهشة</b><p>{s.fact}</p></div>)}
      {s.connected.length > 0 && (
        <>
          <h3>تراكيب متصلة ومجاورة</h3>
          <div className="chips">
            {s.connected.map((c) => STRUCTURES[c] && (
              <button key={c} className="chip" onClick={() => select(c, true)}>{STRUCTURES[c].ar}</button>
            ))}
          </div>
        </>
      )}
      <div className="card-actions">
        <button className="btn danger" onClick={() => useStore.getState().remove(s.id)} title="إخفاء هذا التركيب وحده ليظهر ما تحته">إزالة</button>
        <button className={'btn' + (isolated ? ' on' : '')} onClick={() => set({ isolated: !isolated })}>{isolated ? 'إظهار الكل' : 'عزل العضو'}</button>
        <button className="btn" onClick={() => select(s.id, true)}>طيران إليه</button>
      </div>
      <div className="card-id" dir="ltr">{s.id}</div>
    </aside>
  )
}
