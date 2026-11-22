import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { FLOW, STRUCTURES, SYSTEMS, isMobile } from '../data'
import { useStore, type TourId } from '../store'
import { parts } from './registry'
import { SHARED } from './materials'
import { rig, flyTo, flyHome } from './Scene'

const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2])
const C = (id: string) => V(STRUCTURES[id]?.c || [0, 0, 0])
// centerline oriented so that it starts nearest `from`
function line(id: string, from: THREE.Vector3) {
  const f = FLOW[id]
  if (!f) return [C(id)]
  const pts = f.points.map(V)
  return pts[0].distanceTo(from) <= pts[pts.length - 1].distanceTo(from) ? pts : pts.reverse()
}

interface Seg { pts: THREE.Vector3[]; caption: string; highlight?: string[] }
interface TourDef {
  systems: string[]; depth: number; segs: Seg[]; speed: number; color: THREE.Color; offset: THREE.Vector3; size: number
}

function buildTour(id: TourId): TourDef | null {
  const heart = C('FMA7274')
  if (id === 'blood') {
    const ra = heart.clone().add(new THREE.Vector3(-0.03, 0.01, 0.0))
    const rv = heart.clone().add(new THREE.Vector3(-0.005, -0.02, 0.035))
    const la = heart.clone().add(new THREE.Vector3(0.01, 0.025, -0.03))
    const lv = heart.clone().add(new THREE.Vector3(0.035, -0.02, 0.01))
    const rLung = C('FMA7337').lerp(C('FMA7333'), 0.5)
    const leg = line('FMA18885', heart).reverse()
    const ci = line('FMA21387', heart).reverse()
    const ivc = line('FMA10951', heart).reverse()
    const asc = line('FMA3736', heart)
    const arch = line('FMA3768', asc[asc.length - 1])
    const desc = line('FMA3784', arch[arch.length - 1])
    const renalStart = C('FMA14752')
    const descToRenal = desc.filter((p) => p.y >= renalStart.y - 0.005)
    const renal = line('FMA14752', descToRenal[descToRenal.length - 1] || renalStart)
    return {
      systems: ['cardiovascular', 'respiratory', 'urinary', 'skeletal'], depth: 3, speed: 0.06, color: new THREE.Color(4, 0.35, 0.35),
      offset: new THREE.Vector3(0.12, 0.05, 0.34), size: 0.007,
      segs: [
        { pts: [...leg, ...ci], caption: 'قطرة دم فقيرة بالأكسجين تصعد من الساق عبر الوريد الحرقفي… الأوردة تحمل نحو ثلثي دم الجسم في أي لحظة.', highlight: ['FMA18885', 'FMA21387'] },
        { pts: ivc, caption: 'تدخل الوريد الأجوف السفلي، أكبر أوردة الجسم، متجهة إلى القلب.', highlight: ['FMA10951'] },
        { pts: [ivc[ivc.length - 1], ra, rv], caption: 'الأذين الأيمن ثم البطين الأيمن: يدفعها القلب مع كل نبضة — 72 نبضة في الدقيقة.', highlight: ['FMA7274'] },
        { pts: [rv, C('FMA66326'), rLung], caption: 'الشريان الرئوي يحملها إلى الرئة… هنا تتخلص من ثاني أكسيد الكربون وتلتقط الأكسجين في الأسناخ.', highlight: ['FMA66326', 'FMA7337', 'FMA7333'] },
        { pts: [rLung, C('FMA66643'), la], caption: 'تعود حمراء زاهية عبر الأوردة الرئوية — الأوردة الوحيدة التي تحمل دمًا مؤكسجًا.', highlight: ['FMA66643'] },
        { pts: [la, lv, ...asc], caption: 'من الأذين الأيسر إلى البطين الأيسر، أقوى حجرات القلب، ثم تُقذف إلى الأبهر.', highlight: ['FMA7274', 'FMA3736'] },
        { pts: [...arch, ...descToRenal], caption: 'قوس الأبهر ثم الأبهر النازل… تبلغ سرعة الدم هنا أكثر من متر في الثانية في ذروة الانقباض.', highlight: ['FMA3768', 'FMA3784'] },
        { pts: [...renal, C('FMA7204')], caption: 'الشريان الكلوي يوصلها إلى الكلية التي تصفّي نحو 180 لترًا من البلازما يوميًا. اكتملت الدورة في أقل من دقيقة!', highlight: ['FMA14752', 'FMA7204'] },
      ],
    }
  }
  if (id === 'food') {
    const mouth = C('FMA46841').add(new THREE.Vector3(0, 0, -0.03))
    const eso = line('FMA7131', mouth)
    const st = C('FMA7148')
    const duo = C('FMA7206')
    return {
      systems: ['digestive', 'skeletal', 'endocrine'], depth: 3, speed: 0.07, color: new THREE.Color(3.2, 1.8, 0.6),
      offset: new THREE.Vector3(0.14, 0.04, 0.36), size: 0.009,
      segs: [
        { pts: [mouth.clone().add(new THREE.Vector3(0, 0, 0.04)), mouth, mouth.clone().add(new THREE.Vector3(0, -0.04, -0.03))], caption: 'تبدأ الرحلة في الفم: الأسنان تقطع وتطحن، واللعاب يبدأ هضم النشويات.', highlight: ['FMA46841', 'FMA52748'] },
        { pts: eso, caption: 'البلع ثم المريء: موجات تمعّج تدفع اللقمة نحو المعدة خلال 5–8 ثوانٍ — حتى لو كنت مقلوبًا!', highlight: ['FMA7131'] },
        { pts: [eso[eso.length - 1], st.clone().add(new THREE.Vector3(0.03, 0.03, 0)), st, st.clone().add(new THREE.Vector3(-0.03, -0.02, 0.02))], caption: 'المعدة تمزج الطعام بحمض قوي وإنزيمات لساعتين إلى أربع ساعات، فيتحول إلى «كيموس».', highlight: ['FMA7148'] },
        { pts: [duo.clone().add(new THREE.Vector3(0.03, 0.03, 0)), duo, duo.clone().add(new THREE.Vector3(-0.03, -0.02, 0))], caption: 'العفج: تصب فيه الصفراء من المرارة وعصارة البنكرياس فتُهضم الدهون والبروتينات.', highlight: ['FMA7206', 'FMA7202', 'FMA7198nsn'] },
        { pts: [C('FMA7207'), C('FMA7207').add(new THREE.Vector3(-0.05, -0.03, 0.01)), C('FMA7208').add(new THREE.Vector3(0.05, 0.02, 0)), C('FMA7208')], caption: 'الأمعاء الدقيقة (6–7 أمتار): زغاباتها تمتص المغذيات عبر مساحة تقارب 30 مترًا مربعًا.', highlight: ['FMA7207', 'FMA7208'] },
        { pts: [C('FMA14543nsn').add(new THREE.Vector3(-0.07, -0.05, 0)), C('FMA14543nsn').add(new THREE.Vector3(-0.07, 0.07, 0)), C('FMA14543nsn').add(new THREE.Vector3(0.07, 0.07, 0)), C('FMA14543nsn').add(new THREE.Vector3(0.07, -0.05, 0)), C('FMA14544')], caption: 'القولون يمتص الماء والأملاح، وتعيش فيه تريليونات البكتيريا النافعة… ثم المستقيم. انتهت رحلة تستغرق عادةً 24–72 ساعة.', highlight: ['FMA14543nsn', 'FMA14544'] },
      ],
    }
  }
  return null
}

const ARM_CAPTIONS = [
  'الذراع رافعة من عظام وعضلات: العضد، والكعبرة والزند، يجمعها مفصل المرفق الرزّي.',
  'العضلة ذات الرأسين والعضدية تنقبضان… فتقصران وتسحبان الساعد: انثناء المرفق.',
  'العضلات لا تدفع أبدًا، بل تسحب فقط — لذلك تعمل في أزواج متعاكسة.',
  'العضلة ثلاثية الرؤوس في الخلف تنقبض الآن فتبسط المرفق، بينما ترتخي ذات الرأسين.',
]
const FLEXORS = ['FMA37684', 'FMA37686', 'FMA37668']
const EXTENSORS = ['FMA37695', 'FMA37697', 'FMA37699']

export default function Tours() {
  const tour = useStore((s) => s.tour)
  const drop = useMemo(() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.4), toneMapped: false, depthTest: false }))
    m.visible = false
    m.renderOrder = 30
    return m
  }, [])
  const trail = useMemo(() => {
    const N = 40
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    const m = new THREE.PointsMaterial({ size: 0.004, color: new THREE.Color(3, 0.4, 0.4), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.visible = false
    return p
  }, [])
  const run = useRef<{ curve: THREE.CurvePath<THREE.Vector3> | null; u: { v: number }; def: TourDef | null }>({ curve: null, u: { v: 0 }, def: null })
  const camGoal = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), [])

  useEffect(() => {
    const st = useStore.getState()
    if (!tour) return
    const snapshot = { systems: st.systems, depth: st.depth, mode: st.mode, life: st.life }
    const tl = gsap.timeline({ onComplete: () => useStore.getState().set({ tour: null }) })
    const showOnly = (keys: string[]) => Object.fromEntries(SYSTEMS.map((s) => [s.key, keys.includes(s.key)]))

    if (tour === 'arm') {
      const hum = parts.get('FMA23130')
      if (hum) {
        // elbow pivot = centroid of the distal 2 cm of the humerus
        const P = hum.mesh.geometry.attributes.position
        let minY = Infinity
        for (let i = 0; i < P.count; i++) minY = Math.min(minY, P.getY(i))
        const c = new THREE.Vector3(); let n = 0
        for (let i = 0; i < P.count; i++) if (P.getY(i) < minY + 0.02) { c.x += P.getX(i); c.y += P.getY(i); c.z += P.getZ(i); n++ }
        SHARED.uPivot.value.copy(c.divideScalar(n)).add(new THREE.Vector3(0, 0.012, 0))
        SHARED.uAxis.value.set(-1, 0, 0.18).normalize()
      }
      st.set({ systems: showOnly(['skeletal', 'muscular']), depth: 1, mode: 'layers', caption: ARM_CAPTIONS[0], highlight: [] })
      const piv = SHARED.uPivot.value
      const target = piv.clone().add(new THREE.Vector3(0, 0.06, 0.06))
      flyTo(target.clone().add(new THREE.Vector3(-0.55, 0.12, 0.62).multiplyScalar(isMobile ? 1.3 : 1)), target, 2.2)
      const bend = SHARED.uBend
      tl.to({}, { duration: 3.2 })
        .call(() => st.set({ caption: ARM_CAPTIONS[1], highlight: FLEXORS }))
        .to(bend, { value: 1.75, duration: 2.6, ease: 'power2.inOut' })
        .call(() => st.set({ caption: ARM_CAPTIONS[2] }))
        .to(bend, { value: 0.5, duration: 1.6, ease: 'power2.inOut', delay: 0.8 })
        .to(bend, { value: 1.75, duration: 1.4, ease: 'power2.inOut' })
        .call(() => st.set({ caption: ARM_CAPTIONS[3], highlight: EXTENSORS }))
        .to(bend, { value: 0, duration: 2.6, ease: 'power2.inOut', delay: 0.6 })
        .to({}, { duration: 2.2 })
    } else {
      const def = buildTour(tour)
      if (!def) return
      st.set({ systems: showOnly(def.systems), depth: def.depth, mode: 'xray', life: true, caption: def.segs[0].caption, highlight: def.segs[0].highlight || [] })
      const all: THREE.Vector3[] = []
      const bounds: number[] = []
      def.segs.forEach((s) => { s.pts.forEach((p) => { if (!all.length || all[all.length - 1].distanceTo(p) > 0.002) all.push(p.clone()) }); bounds.push(all.length - 1) })
      const curve = new THREE.CatmullRomCurve3(all, false, 'centripetal')
      const total = curve.getLength()
      run.current = { curve: curve as unknown as THREE.CurvePath<THREE.Vector3>, u: { v: 0 }, def }
      drop.material.color.copy(def.color)
      ;(trail.material as THREE.PointsMaterial).color.copy(def.color).multiplyScalar(0.7)
      drop.scale.setScalar(def.size); drop.visible = true; trail.visible = true
      const start = curve.getPointAt(0)
      camGoal.target.copy(start); camGoal.pos.copy(start).add(def.offset)
      flyTo(camGoal.pos.clone(), start.clone(), 2)
      tl.to({}, { duration: 2.1 })
      // a segment's share of the timeline ∝ its arc length
      let prevU = 0
      const lens = curve.getLengths(all.length * 8)
      bounds.forEach((bi, si) => {
        const uEnd = si === bounds.length - 1 ? 1 : lens[bi * 8] / total
        const dur = Math.max(2.8, ((uEnd - prevU) * total) / def.speed)
        tl.call(() => st.set({ caption: def.segs[si].caption, highlight: def.segs[si].highlight || [] }))
        tl.to(run.current.u, { v: uEnd, duration: dur, ease: 'none' })
        prevU = uEnd
      })
      tl.to({}, { duration: 2 })
    }
    return () => {
      tl.kill()
      gsap.to(SHARED.uBend, { value: 0, duration: 0.6 })
      drop.visible = false; trail.visible = false
      run.current.curve = null
      useStore.getState().set({ ...snapshot, caption: null, highlight: [] })
      flyHome()
    }
  }, [tour, drop, trail, camGoal])

  const hist = useRef<THREE.Vector3[]>([])
  useFrame((_, dt) => {
    const r = run.current
    if (!r.curve || !r.def || !rig.camera || !rig.controls) return
    const p = r.curve.getPointAt(Math.min(1, r.u.v))
    drop.position.copy(p)
    hist.current.unshift(p.clone()); if (hist.current.length > 40) hist.current.pop()
    const P = trail.geometry.attributes.position as THREE.BufferAttribute
    hist.current.forEach((h, i) => P.setXYZ(i, h.x, h.y, h.z)); P.needsUpdate = true
    if (r.u.v > 0.0001) {
      // camera follows the traveller with soft lag
      const k = 1 - Math.exp(-dt * 1.6)
      camGoal.target.lerp(p, k)
      camGoal.pos.lerp(p.clone().add(r.def.offset.clone().multiplyScalar(isMobile ? 1.35 : 1)), k * 0.8)
      rig.controls.target.copy(camGoal.target)
      rig.camera.position.copy(camGoal.pos)
      rig.controls.update()
    }
  })

  return (
    <>
      <primitive object={drop} />
      <primitive object={trail} />
    </>
  )
}
