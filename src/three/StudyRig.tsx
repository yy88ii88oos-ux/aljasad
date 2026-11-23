import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { knee, resetKnee, updateKnee } from './myBody'

const MAX = 1.92 // ≈ 110° of flexion
let phase = 0
// drives the knee flexion (slow play or the slider) while the knee study is open
export default function StudyRig() {
  useFrame((_, dt) => {
    const st = useStore.getState()
    if (st.study !== 'knee' || !knee.ready) { if (knee.ready && knee.angle !== 0) resetKnee(); return }
    let f = st.kneeFlex
    if (st.kneePlay) {
      phase += Math.min(dt, 0.1) * 0.55 // one bend-and-straighten every ~11 s
      f = 0.5 - 0.5 * Math.cos(phase)
      if (Math.abs(f - st.kneeFlex) > 0.01) st.set({ kneeFlex: f })
    } else phase = Math.acos(1 - 2 * f)
    if (Math.abs(f * MAX - knee.angle) > 1e-4) updateKnee(f * MAX)
  })
  return null
}
