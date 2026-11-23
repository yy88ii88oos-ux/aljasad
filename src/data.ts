import structuresJson from '../data/structures.json'
import flowJson from '../data/flow.json'

export type Layer = 'skin' | 'superficial' | 'deep' | 'organs' | 'bones'
export type Group = 'skin' | 'skeleton' | 'muscles' | 'cardio' | 'nervous' | 'organs'
export interface Structure {
  id: string; ar: string; en: string; la?: string; system: string; group: Group; layer: Layer; side: string | null
  fn: string; fact: string; connected: string[]; c: [number, number, number]; min: [number, number, number]; max: [number, number, number]
}
export const STRUCTURES = structuresJson as unknown as Record<string, Structure>
export const FLOW = flowJson as unknown as Record<string, { length: number; points: [number, number, number][] }>

export interface SystemMeta { key: string; ar: string; color: string }
export const SYSTEMS: SystemMeta[] = [
  { key: 'integumentary', ar: 'الجلد', color: '#e6b39a' },
  { key: 'muscular', ar: 'الجهاز العضلي', color: '#d0403b' },
  { key: 'skeletal', ar: 'الجهاز الهيكلي', color: '#e8dcc4' },
  { key: 'cardiovascular', ar: 'القلب والأوعية', color: '#ff3b4e' },
  { key: 'nervous', ar: 'الجهاز العصبي', color: '#f2cf3a' },
  { key: 'respiratory', ar: 'الجهاز التنفسي', color: '#7fd3f7' },
  { key: 'digestive', ar: 'الجهاز الهضمي', color: '#f39a5b' },
  { key: 'urinary', ar: 'الجهاز البولي', color: '#e8d25a' },
  { key: 'genital', ar: 'الجهاز التناسلي', color: '#d68bd9' },
  { key: 'endocrine', ar: 'الغدد الصماء', color: '#9be29b' },
  { key: 'lymphoid', ar: 'الجهاز اللمفاوي', color: '#3fb86b' },
  { key: 'sense', ar: 'أعضاء الحس', color: '#7ff0d6' },
]
export const SYSTEM_BY_KEY = Object.fromEntries(SYSTEMS.map((s) => [s.key, s]))

export const LAYERS: { key: Layer; ar: string }[] = [
  { key: 'skin', ar: 'الجلد' },
  { key: 'superficial', ar: 'عضلات سطحية' },
  { key: 'deep', ar: 'عضلات عميقة' },
  { key: 'organs', ar: 'الأعضاء' },
  { key: 'bones', ar: 'العظام' },
]
export const LAYER_INDEX: Record<Layer, number> = { skin: 0, superficial: 1, deep: 2, organs: 3, bones: 4 }

// Arabic search normalisation: strip tashkeel/tatweel, unify hamza forms, ta marbuta, alif maqsura and drop the article «ال»
export function normalizeAr(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[()«»،,.\-–]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^(و|ب|ل|ف)?ال(?=..)/, '').replace(/^لل(?=..)/, ''))
    .filter(Boolean)
    .join(' ')
}
const INDEX = Object.values(STRUCTURES).map((s) => ({ s, k: normalizeAr(s.ar) + ' | ' + s.en.toLowerCase() }))
export function search(q: string, limit = 12) {
  const n = normalizeAr(q).trim()
  if (!n) return []
  const terms = n.split(' ')
  const res = INDEX.filter((e) => terms.every((t) => e.k.includes(t)))
  res.sort((a, b) => a.k.indexOf(terms[0]) - b.k.indexOf(terms[0]) || a.s.ar.length - b.s.ar.length)
  return res.slice(0, limit).map((e) => e.s)
}

export const isMobile = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820)
// ?lod=m forces the light models (handy on weak GPUs)
export const lightModels = isMobile || (typeof location !== 'undefined' && /[?&]lod=m/.test(location.search))
