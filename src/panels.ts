// illustrated panels (public/panels): index cards and organ cards
const B = import.meta.env.BASE_URL + 'panels/'
export const SYSTEM_PANEL: Record<string, string> = {
  cardiovascular: B + 'heart.webp', digestive: B + 'digestive.webp', urinary: B + 'kidney.webp', sense: B + 'eye.webp',
  nervous: B + 'brain.webp', respiratory: B + 'lungs.webp',
}
export const STUDY_PANEL = { clavicle: B + 'clavicle.webp', knee: B + 'knee-left.webp' }
// organ card illustration by structure
export function panelFor(id: string, en: string, system: string): string | null {
  if (id === 'FMA7274' || /heart|valve|papillary|coronary|cardiac/.test(en)) return B + 'heart.webp'
  if (/lung|trachea|bronch/.test(en)) return B + 'lungs.webp'
  if (/kidney|ureter/.test(en)) return B + 'kidney.webp'
  if (id === 'FMA12513' || id.startsWith('EYE_')) return B + 'eye.webp'
  if (system === 'digestive') return B + 'digestive.webp'
  if (system === 'nervous' && /gyrus|lobe|lobule|cerebellum|insula|brain|hippocampus|thalamus/.test(en)) return B + 'brain.webp'
  return null
}
