// illustrated panels (public/panels): index cards and organ cards
import { isMobile } from './data'
const B = import.meta.env.BASE_URL + 'panels/'
// phones get the 1024 px copies
const X = isMobile ? '.m.webp' : '.webp'
export const SYSTEM_PANEL: Record<string, string> = {
  cardiovascular: B + 'heart' + X, digestive: B + 'digestive' + X, urinary: B + 'kidney' + X, sense: B + 'eye' + X,
  nervous: B + 'brain' + X, respiratory: B + 'lungs' + X,
}
export const STUDY_PANEL = { clavicle: B + 'clavicle' + X, knee: B + 'knee-left' + X }
// organ card illustration by structure
export function panelFor(id: string, en: string, system: string): string | null {
  if (id === 'FMA7274' || /heart|valve|papillary|coronary|cardiac/.test(en)) return B + 'heart' + X
  if (/lung|trachea|bronch/.test(en)) return B + 'lungs' + X
  if (/kidney|ureter/.test(en)) return B + 'kidney' + X
  if (id === 'FMA12513' || id.startsWith('EYE_')) return B + 'eye' + X
  if (system === 'digestive') return B + 'digestive' + X
  if (system === 'nervous' && /gyrus|lobe|lobule|cerebellum|insula|brain|hippocampus|thalamus/.test(en)) return B + 'brain' + X
  return null
}
