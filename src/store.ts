import { create } from 'zustand'
import { SYSTEMS } from './data'

export type Mode = 'layers' | 'xray' | 'section' | 'explode'
export type Axis = 'x' | 'y' | 'z'
export type TourId = 'blood' | 'food' | 'arm'

interface State {
  mode: Mode
  depth: number // 0 = skin visible … 4 = bones only
  systems: Record<string, boolean>
  selected: string | null
  hovered: string | null
  isolated: boolean
  focusTick: number // increments to request camera fly-to on `selected`
  focused: boolean // camera has flown to `selected` → ghost occluders, depth of field
  sectionAxis: Axis
  sectionPos: number // -1..1
  explode: number // 0..1
  life: boolean
  tour: TourId | null
  caption: string | null
  highlight: string[]
  progress: number // 0..1 initial load
  ready: boolean
  streaming: number // 0..1 background (muscles) load
  page: 'viewer' | 'sources'
  set: (p: Partial<State>) => void
  select: (id: string | null, fly?: boolean) => void
  toggleSystem: (k: string) => void
}

// deep links: ?mode=xray&depth=3&sys=skeletal,muscular&sel=FMA7274&fly=1&tour=blood&axis=y&pos=0.4
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
const qSys = Q.get('sys')?.split(',')
const initial: Partial<State> = {
  ...(Q.get('mode') ? { mode: Q.get('mode') as Mode } : {}),
  ...(Q.get('depth') ? { depth: +Q.get('depth')! } : {}),
  ...(qSys ? { systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, qSys.includes(s.key)])) } : {}),
  ...(Q.get('axis') ? { sectionAxis: Q.get('axis') as Axis } : {}),
  ...(Q.get('pos') ? { sectionPos: +Q.get('pos')! } : {}),
  ...(Q.get('explode') ? { explode: +Q.get('explode')! } : {}),
}
export const deepLink = { sel: Q.get('sel'), fly: Q.get('fly') === '1', tour: Q.get('tour') as TourId | null, iso: Q.get('iso') === '1' }

export const useStore = create<State>((set) => ({
  mode: 'layers',
  depth: 0,
  systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, true])),
  selected: null,
  hovered: null,
  isolated: false,
  focusTick: 0,
  focused: false,
  sectionAxis: 'x',
  sectionPos: 0.2,
  explode: 0.6,
  life: true,
  tour: null,
  caption: null,
  highlight: [],
  progress: 0,
  ready: false,
  streaming: 0,
  page: typeof location !== 'undefined' && location.hash === '#sources' ? 'sources' : 'viewer',
  ...initial,
  set: (p) => set(p),
  select: (id, fly) => set((s) => ({ selected: id, isolated: id ? s.isolated : false, focusTick: fly ? s.focusTick + 1 : s.focusTick, focused: !!(id && (fly || (s.focused && id === s.selected))) })),
  toggleSystem: (k) => set((s) => ({ systems: { ...s.systems, [k]: !s.systems[k] } })),
}))
