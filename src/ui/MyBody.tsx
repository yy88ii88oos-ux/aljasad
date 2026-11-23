import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { STRUCTURES, normalizeAr, isMobile } from '../data'
import { STUDIES, NOTES, DISCLAIMER, DIAG_RULES, DIAG_KEY, buildStudy, studyFrame, kneeSideView, type Study } from '../three/myBody'
import { flyTo, flyHome } from '../three/Scene'

export function openStudy(s: Study) {
  sideView = false
  void buildStudy(s).then(() => useStore.getState().set({ studyReady: true }))
  const st = useStore.getState()
  st.set({ study: s, studyReady: false, studyStep: 0, mode: 'layers', selected: null, isolated: false, removed: [], dimmed: [], highlight: [], kneeFlex: 0, kneePlay: false, tour: null })
  const f = studyFrame(s)
  flyTo(f.pos, f.target, 2.2)
  // peel in slowly once the camera arrives: skin → muscles → the study's centre
  setTimeout(() => useStore.getState().study === s && useStore.getState().set({ studyStep: 1 }), 2600)
  setTimeout(() => useStore.getState().study === s && useStore.getState().set({ studyStep: 2 }), 4400)
}
let sideView = false
function toSide() { if (sideView) return; sideView = true; const v = kneeSideView(); flyTo(v.pos, v.target, 1.8) }
export function closeStudy() {
  sideView = false
  useStore.getState().set({ study: null, studyStep: 0, highlight: [], selected: null, kneePlay: false, kneeFlex: 0 })
  flyHome()
}

const load = () => { try { return localStorage.getItem(DIAG_KEY) || '' } catch { return '' } }
const save = (v: string) => { try { if (v) localStorage.setItem(DIAG_KEY, v); else localStorage.removeItem(DIAG_KEY) } catch { /* private mode */ } }

// «تشخيصي»: wording from the report → highlighted structures + a plain explanation (kept in this browser only)
function Diagnosis() {
  const [text, setText] = useState(load)
  const [applied, setApplied] = useState(load)
  const set = useStore((s) => s.set)
  const hits = useMemo(() => {
    const n = normalizeAr(applied) + ' ' + applied.toLowerCase()
    const out: typeof DIAG_RULES = []
    const seen = new Set<string>()
    for (const r of DIAG_RULES) if (r.re.test(n) && !r.ids.every((id) => seen.has(id))) { out.push(r); r.ids.forEach((id) => seen.add(id)) }
    return out
  }, [applied])
  const apply = () => {
    setApplied(text); save(text)
    const n = normalizeAr(text) + ' ' + text.toLowerCase()
    const ids = [...new Set(DIAG_RULES.filter((r) => r.re.test(n)).flatMap((r) => r.ids))]
    // peel exactly far enough that every highlighted structure is visible (a structure shows while step ≤ its level)
    const lv = ids.length ? Math.min(...ids.map((id) => STUDIES.knee.levels[id] ?? 4)) : useStore.getState().studyStep
    set({ highlight: ids, studyStep: Math.max(1, lv) })
  }
  return (
    <div className="diag">
      <h3>تشخيصي</h3>
      <p className="muted">اكتب الإصابة كما في تقرير الطبيب (عربي أو إنجليزي). تُحفظ في هذا المتصفح فقط ولا تُرسل إلى أي مكان.</p>
      <div className="diag-row">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="مثال: تمزق جزئي في الرباط الصليبي الأمامي / medial meniscus tear" aria-label="التشخيص" />
        <button className="btn" onClick={apply}>إبراز</button>
        {applied && <button className="btn ghost" onClick={() => { setText(''); setApplied(''); save(''); set({ highlight: [] }) }} title="مسح من هذا الجهاز">مسح</button>}
      </div>
      {applied && hits.length === 0 && <p className="muted">لم أتعرّف على تراكيب في هذا النص؛ جرّب اسم التركيب (مثل «الهلالة الإنسية» أو ACL).</p>}
      {hits.map((h, i) => (
        <div key={i} className="diag-hit">
          <div className="chips">{h.ids.map((id) => STRUCTURES[id] && <button key={id} className="chip on" onClick={() => useStore.getState().select(id)}>{STRUCTURES[id].ar}</button>)}</div>
          <p>{h.ar}</p>
        </div>
      ))}
    </div>
  )
}

export default function MyBodyPanel() {
  const study = useStore((s) => s.study)
  const step = useStore((s) => s.studyStep)
  const flex = useStore((s) => s.kneeFlex)
  const play = useStore((s) => s.kneePlay)
  const set = useStore((s) => s.set)
  const [open, setOpen] = useState(!isMobile)
  const studyReady = useStore((s) => s.studyReady)
  if (!study) return null
  const def = STUDIES[study]
  return (
    <section className={'study glass' + (open ? ' open' : '')} aria-label={def.title}>
      <header>
        <button className="study-x" onClick={closeStudy} aria-label="خروج من جسدي">→ رجوع</button>
        <h2>{def.title}{!studyReady && <small className="prep"> · تحضير الدقة العالية…</small>}</h2>
        <button className="study-fold" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '▾' : '▴'}</button>
      </header>
      <div className="study-steps" role="tablist" aria-label="الطبقات">
        {def.steps.map((s, i) => (
          <button key={s} role="tab" aria-selected={step === i} className={step === i ? 'on' : step > i ? 'peeled' : ''} onClick={() => set({ studyStep: i })}>{s}</button>
        ))}
      </div>
      {study === 'knee' && (
        <div className="study-motion">
          <button className={'btn' + (play ? ' on' : '')} onClick={() => { set({ kneePlay: !play, studyStep: Math.max(2, step) }); toSide() }}>{play ? '❚❚ إيقاف' : '▶ ثني ومد'}</button>
          <input type="range" min={0} max={1} step={0.01} value={flex} onChange={(e) => { set({ kneeFlex: +e.target.value, kneePlay: false, studyStep: Math.max(2, step) }); toSide() }} aria-label="زاوية الثني" />
          <span>{Math.round(flex * 110)}°</span>
        </div>
      )}
      {open && (
        <div className="study-body">
          {study === 'knee' && <Diagnosis />}
          {NOTES[study].map((n) => (
            <details key={n.h}><summary>{n.h}</summary><p>{n.p}</p></details>
          ))}
          <p className="disclaimer">⚕︎ {DISCLAIMER}</p>
          <p className="muted small">التراكيب غير الموجودة في BodyParts3D (الصفيحة والبراغي، الضفيرة العضدية، الهلالتان، الأربطة، الغضاريف) مبنية برمجيًا على أسطح العظام الحقيقية، وهي توضيحية.</p>
        </div>
      )}
    </section>
  )
}
