import { useEffect, useMemo, useState } from 'react'
import Scene, { flyHome, openCut, intro } from './three/Scene'
import { initAudio, setSound, setHeartbeat } from './audio'
import { loadGroups, buildBVHIdle } from './three/registry'
import { loadTextures } from './three/textures'
import { useStore, deepLink, type Mode, type TourId } from './store'
import { SYSTEMS, LAYERS, LAYER_INDEX, STRUCTURES, search, isMobile, type Structure } from './data'
import Loader from './ui/Loader'
import InfoCard from './ui/InfoCard'
import Sources from './ui/Sources'
import Atlas from './ui/Atlas'
import MyBodyPanel, { openStudy } from './ui/MyBody'

function useLoad() {
  const set = useStore((s) => s.set)
  useEffect(() => {
    let alive = true
    // first paint: skin, bones, organs, heart & vessels, brain. Muscles stream afterwards.
    loadGroups(['skin', 'skeleton', 'organs', 'cardio', 'nervous'], (f) => alive && set({ progress: f }))
      .then(() => {
        if (!alive) return
        set({ progress: 1 })
        setTimeout(() => {
          set({ ready: true })
          // cinematic opening when the page is opened plainly (no deep link)
          if (!location.search.replace(/^\?/, '').replace(/(^|&)lod=m/, '')) intro()
          if (deepLink.sel) { useStore.getState().select(deepLink.sel, deepLink.fly); if (deepLink.iso) set({ isolated: true }) }
          if (deepLink.tour) setTimeout(() => set({ tour: deepLink.tour }), 600)
          const cut = new URLSearchParams(location.search).get('cut') as 'eye' | 'heart' | null
          if (cut) setTimeout(() => openCut(cut), 400)
          const my = new URLSearchParams(location.search).get('my') as 'clavicle' | 'knee' | null
          if (my) setTimeout(() => openStudy(my), 400)
        }, 250)
        return loadGroups(['muscles'], (f) => set({ streaming: f }))
      })
      .then(() => { set({ streaming: 1 }); buildBVHIdle(); loadTextures() })
      .catch((e) => console.error(e))
    return () => { alive = false }
  }, [set])
}

function SearchBox() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const select = useStore((s) => s.select)
  const set = useStore((s) => s.set)
  const results = useMemo(() => search(q), [q])
  const choose = (s: Structure) => {
    const depth = LAYER_INDEX[s.layer]
    const st = useStore.getState()
    set({ depth: Math.min(st.depth, depth), mode: st.mode === 'explode' ? 'layers' : st.mode, systems: { ...st.systems, [s.system]: true } })
    select(s.id, true)
    setQ(''); setOpen(false)
  }
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.6-4.6" /></svg>
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ابحث: قلب، كبد، عظم الفخذ، femur…" aria-label="بحث عن عضو"
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) choose(results[0]) }} />
      {open && q && (
        <ul className="results glass">
          {results.length === 0 && <li className="muted">لا نتائج</li>}
          {results.map((s) => (
            <li key={s.id} onMouseDown={() => choose(s)}>
              <i style={{ background: SYSTEMS.find((x) => x.key === s.system)?.color }} />
              <span>{s.ar}</span><small dir="ltr">{s.en}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// skin, muscles and bones are driven by the layer bar: listing them here too would duplicate it
const LAYER_SYSTEMS = new Set(['integumentary', 'muscular', 'skeletal', 'genital'])
function SystemsMenu() {
  const systems = useStore((s) => s.systems)
  const toggle = useStore((s) => s.toggleSystem)
  const set = useStore((s) => s.set)
  const [open, setOpen] = useState(!isMobile)
  const only = (k: string) => set({ systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, s.key === k || (LAYER_SYSTEMS.has(s.key) && s.key !== 'genital' ? s.key === 'skeletal' : false)])), depth: 4 })
  return (
    <nav className={'systems glass' + (open ? ' open' : '')} aria-label="الأجهزة">
      <button className="systems-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>أجهزة الجسم</span><b>{open ? '−' : '+'}</b>
      </button>
      {open && (
        <ul>
          {SYSTEMS.filter((s) => !LAYER_SYSTEMS.has(s.key)).map((s) => (
            <li key={s.key} className={systems[s.key] ? 'on' : ''}>
              <button onClick={() => toggle(s.key)} style={{ ['--c' as string]: s.color }} aria-pressed={systems[s.key]}>
                <i />{s.ar}
              </button>
              <button className="solo" onClick={() => only(s.key)} title="إظهار هذا الجهاز فقط" aria-label={'إظهار ' + s.ar + ' فقط'}>◉</button>
            </li>
          ))}
          <li className="all"><button onClick={() => set({ systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, s.key === 'genital' ? systems.genital : true])) })}>إظهار الكل</button></li>
          <li className="setting">
            <label><input type="checkbox" checked={!!systems.genital} onChange={() => toggle('genital')} /> إظهار الأعضاء التناسلية</label>
          </li>
        </ul>
      )}
    </nav>
  )
}

const MODES: { k: Mode; ar: string }[] = [
  { k: 'layers', ar: 'الطبقات' }, { k: 'xray', ar: 'الأشعة' }, { k: 'section', ar: 'المقطع' }, { k: 'explode', ar: 'التفكيك' },
]
const TOURS: { k: TourId; ar: string }[] = [
  { k: 'blood', ar: 'رحلة قطرة دم' }, { k: 'food', ar: 'رحلة لقمة طعام' }, { k: 'arm', ar: 'كيف يتحرك الذراع' },
]

function Dock() {
  const st = useStore()
  return (
    <div className="dock">
      <div className="dock-row glass">
        <div className="seg" role="tablist" aria-label="وضع العرض">
          {MODES.map((m) => (
            <button key={m.k} role="tab" aria-selected={st.mode === m.k} className={st.mode === m.k ? 'on' : ''} onClick={() => st.set({ mode: m.k })}>{m.ar}</button>
          ))}
        </div>
        <button className={'life' + (st.life ? ' on' : '')} onClick={() => st.set({ life: !st.life })} aria-pressed={st.life} title="القلب ينبض والرئتان تتنفسان والدم يجري">
          <span className="beat" />الحياة
        </button>
      </div>
      <div className="dock-row glass controls">
        {(st.mode === 'layers' || st.mode === 'section' || st.mode === 'explode') && (
          <div className="layers" aria-label="عمق التشريح">
            {LAYERS.map((l, i) => (
              <button key={l.key} className={st.depth === i ? 'on' : st.depth > i ? 'peeled' : ''} onClick={() => st.set({ depth: i })}>{l.ar}</button>
            ))}
          </div>
        )}
        {st.mode === 'section' && (
          <div className="slider-row">
            <div className="seg small">
              {(['x', 'y', 'z'] as const).map((a) => (
                <button key={a} className={st.sectionAxis === a ? 'on' : ''} onClick={() => st.set({ sectionAxis: a })}>{{ x: 'سهمي', y: 'أفقي', z: 'جبهي' }[a]}</button>
              ))}
            </div>
            <input type="range" min={-1} max={1} step={0.005} value={st.sectionPos} onChange={(e) => st.set({ sectionPos: +e.target.value })} aria-label="موضع المقطع" />
          </div>
        )}
        {st.mode === 'explode' && (
          <div className="slider-row"><span>التباعد</span><input type="range" min={0} max={1} step={0.01} value={st.explode} onChange={(e) => st.set({ explode: +e.target.value })} aria-label="مقدار التفكيك" /></div>
        )}
        {st.mode === 'xray' && <div className="hint">جسم زجاجي بحواف فرينل — المس عضوًا ليظهر بلونه الحقيقي</div>}
      </div>
    </div>
  )
}

// finger dissection: undo the last removal or put everything back
function DissectBar() {
  const removed = useStore((s) => s.removed)
  const undo = useStore((s) => s.undo)
  const restoreAll = useStore((s) => s.restoreAll)
  if (!removed.length) return null
  const last = STRUCTURES[removed[removed.length - 1]]
  return (
    <div className="dissect glass" role="toolbar" aria-label="التشريح">
      <button onClick={undo} title={last ? 'إرجاع ' + last.ar : 'تراجع'}><span aria-hidden>↶</span>تراجع</button>
      <i />
      <button onClick={restoreAll}>إعادة الكل <b>{removed.length}</b></button>
    </div>
  )
}

function ToursBar() {
  const tour = useStore((s) => s.tour)
  const caption = useStore((s) => s.caption)
  const set = useStore((s) => s.set)
  const [open, setOpen] = useState(!isMobile)
  return (
    <>
      <div className={'tours' + (open ? ' open' : '')}>
        {isMobile && <button className="tour-btn glass tours-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><span>▶</span>جولات سينمائية</button>}
        {open && TOURS.map((t) => (
          <button key={t.k} className={'tour-btn glass' + (tour === t.k ? ' on' : '')} onClick={() => { set({ tour: tour === t.k ? null : t.k, selected: null, isolated: false }); if (isMobile) setOpen(false) }}>
            <span>▶</span>{t.ar}
          </button>
        ))}
      </div>
      {tour && caption && <div className="caption glass" key={caption}>{caption}</div>}
    </>
  )
}

const BARE = /[?&]bare/.test(location.search) // thumbnails / clean captures

export default function App() {
  useLoad()
  const sound = useStore((s) => s.sound)
  const life = useStore((s) => s.life)
  useEffect(() => { initAudio() }, [])
  useEffect(() => { setSound(sound) }, [sound])
  useEffect(() => { setHeartbeat(life) }, [life])
  const page = useStore((s) => s.page)
  const ready = useStore((s) => s.ready)
  const streaming = useStore((s) => s.streaming)
  const interacting = useStore((s) => s.interacting)
  const study = useStore((s) => s.study)
  const [atlas, setAtlas] = useState(false)
  const set = useStore((s) => s.set)
  useEffect(() => {
    const f = () => set({ page: location.hash === '#sources' ? 'sources' : 'viewer' })
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [set])
  return (
    <>
      <Scene />
      <div className={'ui' + (ready ? ' ready' : '') + (interacting ? ' interacting' : '') + (study ? ' studying' : '')} hidden={BARE}>
        <header className="top">
          <button className="brand" onClick={() => { set({ selected: null, isolated: false, tour: null }); flyHome() }} aria-label="الجسد — العودة للعرض الكامل">
            <svg viewBox="0 0 64 64" aria-hidden><path d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z" /><path className="ln" d="M12 32h12l4-8 5 16 4-8h15" /></svg>
            <span>الجسد</span>
          </button>
          <SearchBox />
          <button className="atlas-btn" onClick={() => setAtlas(true)} title="فهرس بصري لأجهزة الجسم">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></svg><span>الفهرس</span>
          </button>
          <button className="snd" onClick={() => set({ sound: !sound })} aria-pressed={sound} aria-label={sound ? 'كتم الصوت' : 'تشغيل الصوت'} title={sound ? 'كتم الصوت' : 'تشغيل الصوت'}>
            <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" />{sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}</svg>
          </button>
          <a className="src-link" href="#sources">المصادر والرخصة</a>
        </header>
        <SystemsMenu />
        <InfoCard />
        <ToursBar />
        <DissectBar />
        <MyBodyPanel />
        <Dock />
        {ready && streaming < 1 && <div className="stream glass">تحميل العضلات… {Math.round(streaming * 100)}%</div>}
      </div>
      {atlas && <Atlas onClose={() => setAtlas(false)} />}
      {page === 'sources' && <Sources />}
      <Loader />
    </>
  )
}
