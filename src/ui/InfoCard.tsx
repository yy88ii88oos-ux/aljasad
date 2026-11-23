import { useState } from 'react'
import { STRUCTURES, SYSTEM_BY_KEY, LAYERS, isMobile } from '../data'
import { useStore } from '../store'
import { flyHome } from '../three/Scene'

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
function speak(text: string) {
  if (!canSpeak) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ar-SA'
  const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('ar'))
  if (v) u.voice = v
  u.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

// glass card docked at the bottom: names (Arabic · English · Latin), quick actions, details on demand
export default function InfoCard() {
  const selected = useStore((s) => s.selected)
  const isolated = useStore((s) => s.isolated)
  const dimmed = useStore((s) => s.dimmed)
  const tour = useStore((s) => s.tour)
  const set = useStore((s) => s.set)
  const select = useStore((s) => s.select)
  const [more, setMore] = useState(!isMobile)
  if (!selected || tour) return null
  const s = STRUCTURES[selected]
  if (!s) return null
  const sys = SYSTEM_BY_KEY[s.system]
  const layer = LAYERS.find((l) => l.key === s.layer)
  const isDim = dimmed.includes(s.id)
  return (
    <aside className={'card glass' + (more ? ' more' : '')} key={s.id} aria-live="polite">
      <button className="card-x" onClick={() => { select(null); if (isolated) set({ isolated: false }); flyHome() }} aria-label="إغلاق">×</button>
      <div className="card-sys" style={{ ['--c' as string]: sys?.color }}><i />{sys?.ar}<span>· {layer?.ar}</span></div>
      <h2 className="card-ar">{s.ar}</h2>
      <div className="card-names" dir="ltr">
        <span className="card-en">{s.en}</span>
        {s.la && <span className="card-la">{s.la}</span>}
      </div>
      <div className="card-actions">
        <button className="act" onClick={() => useStore.getState().remove(s.id)} title="إخفاء هذا التركيب وحده">
          <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.6M6.3 7.6C4.2 9.2 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.9-1" /></svg>إخفاء</button>
        <button className={'act' + (isDim ? ' on' : '')} onClick={() => useStore.getState().toggleDim(s.id)} title="جعله شفافًا">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></svg>تعتيم</button>
        <button className={'act' + (isolated ? ' on' : '')} onClick={() => set({ isolated: !isolated })} title="إظهار هذا العضو وحده">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>عزل</button>
        <button className="act" disabled={!canSpeak} onClick={() => speak(s.ar)} title="نطق الاسم">
          <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>نطق</button>
        <button className="act" onClick={() => select(s.id, true)} title="تقريب الكاميرا">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8v6M8 11h6" /></svg>تقريب</button>
      </div>
      <button className="card-more" onClick={() => setMore(!more)} aria-expanded={more}>{more ? 'إخفاء التفاصيل' : 'الوظيفة ومعلومة مدهشة'} <b>{more ? '▴' : '▾'}</b></button>
      {more && (
        <div className="card-body">
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
          <div className="card-id" dir="ltr">{s.id}</div>
        </div>
      )}
    </aside>
  )
}
