import { useEffect, useState } from 'react'
import { useStore } from '../store'

// Beating heart that unrolls into an ECG trace; the trace length = real download progress
export default function Loader() {
  const progress = useStore((s) => s.progress)
  const ready = useStore((s) => s.ready)
  const [gone, setGone] = useState(false)
  useEffect(() => { if (ready) { const t = setTimeout(() => setGone(true), 1100); return () => clearTimeout(t) } }, [ready])
  if (gone) return null
  const pct = Math.round(progress * 100)
  const ecg = 'M0 50 H70 l8 -6 l6 6 H100 l6 10 l10 -52 l10 62 l7 -20 H170 l10 -10 l12 10 H230 l8 -6 l6 6 H260 l6 10 l10 -52 l10 62 l7 -20 H330 l10 -10 l12 10 H400'
  return (
    <div className={'loader' + (ready ? ' out' : '')} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="جارٍ تحميل النماذج">
      <div className="loader-inner">
        <svg className="loader-heart" viewBox="0 0 100 90" aria-hidden style={{ opacity: Math.max(0, 1 - progress * 1.6) }}>
          <defs>
            <radialGradient id="hg" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ff6a6f" /><stop offset="1" stopColor="#8e1420" /></radialGradient>
          </defs>
          <path d="M50 84S8 58 8 30A20 20 0 0 1 50 20a20 20 0 0 1 42 10c0 28-42 54-42 54z" fill="url(#hg)" />
        </svg>
        <svg className="loader-ecg" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden>
          <path d={ecg} className="ecg-bg" />
          <path d={ecg} className="ecg-fg" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - progress }} />
        </svg>
        <div className="loader-title">الجسد</div>
        <div className="loader-pct">{pct}<span>%</span></div>
        <div className="loader-note">تحميل نماذج تشريحية حقيقية من BodyParts3D…</div>
      </div>
    </div>
  )
}
