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

export const useStore = create<State>((set) => ({
  mode: 'layers',
  depth: 0,
  systems: Object.fromEntries(SYSTEMS.map((s) => [s.key, true])),
  selected: null,
  hovered: null,
  isolated: false,
  focusTick: 0,
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
  page: typeof location !== 'undefined' && location.hash === '#/sources' ? 'sources' : 'viewer',
  set: (p) => set(p),
  select: (id, fly) => set((s) => ({ selected: id, isolated: id ? s.isolated : false, focusTick: fly ? s.focusTick + 1 : s.focusTick })),
  toggleSystem: (k) => set((s) => ({ systems: { ...s.systems, [k]: !s.systems[k] } })),
}))
