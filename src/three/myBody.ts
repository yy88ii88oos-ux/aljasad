// «جسدي» — two focused studies: the right clavicle with an ORIF plate, and the left knee in detail.
// BodyParts3D lacks the plate, the brachial plexus, menisci, knee ligaments and articular cartilage: they are built here
// from the real bone surfaces (attachment points measured on the meshes), only when the study is opened.
import * as THREE from 'three'
import { STRUCTURES, type Structure } from '../data'
import { parts, upgradeGroup, type Part } from './registry'
import { makeMaterial, makeXray } from './materials'

export type Study = 'clavicle' | 'knee'

// ---------- study definitions: which real structures, in which peel step ----------
// step 0 = skin … last step = deepest; a structure is shown while  step <= its level
export const STUDIES: Record<Study, { title: string; steps: string[]; levels: Record<string, number> }> = {
  clavicle: {
    title: 'الترقوة اليمنى — صفيحة التثبيت',
    steps: ['الجلد', 'العضلات', 'الصفيحة والعظم', 'الأوعية والضفيرة'],
    levels: {
      FMA7163: 0,
      FMA34680: 1, FMA34682: 1, FMA34684: 1, FMA33584: 1, FMA33586: 1, FMA34690: 1, FMA79979: 1, FMA13408: 1, FMA13412: 1,
      FMA13322: 2, MY_PLATE: 2, MY_SCREWS: 2, FMA7857: 2, FMA13395: 2, FMA23130: 2, FMA7486: 2,
      FMA3953: 3, FMA4755: 3, MY_PLEXUS: 3,
    },
  },
  knee: {
    title: 'الركبة اليسرى',
    steps: ['الجلد', 'العضلات', 'الأوتار والأربطة', 'الغضاريف والهلالتان', 'العظام'],
    levels: {
      FMA7163: 0,
      FMA38929: 1, FMA38931: 1, FMA38933: 1, FMA38935: 1, FMA22355: 1, FMA43884: 1, FMA22359: 1, FMA22449: 1, FMA45889: 1, FMA45892: 1,
      FMA45958: 1, FMA45961: 1, FMA22561: 1, FMA22592: 1, FMA58777: 1, FMA22545: 1, FMA22553: 1,
      MY_QT: 2, MY_PL: 2, MY_MCL: 2, MY_LCL: 2, MY_ACL: 2, MY_PCL: 2,
      MY_MM: 3, MY_LM: 3, MY_CART_F: 3, MY_CART_T: 3, MY_CART_P: 3,
      FMA24475: 4, FMA24478: 4, FMA24481: 4, FMA24487: 4,
    },
  },
}

// ---------- general, accurate teaching notes ----------
export const NOTES: Record<Study, { h: string; p: string }[]> = {
  clavicle: [
    { h: 'وظيفة الترقوة', p: 'الدعامة الوحيدة التي تربط الذراع بالهيكل المحوري (عبر المفصل القصي الترقوي)، تُبعد الكتف عن الصدر فيتحرك الذراع بحرية، وتحمي الأوعية تحت الترقوة والضفيرة العضدية، وتنقل القوى من الطرف العلوي إلى الجذع.' },
    { h: 'لماذا تُثبّت بصفيحة؟', p: 'كثير من كسور الترقوة يلتئم دون جراحة، لكن الكسر المتزحزح أو المتراكب مع قِصَر واضح، أو المتفتت، أو المهدِّد للجلد، يُثبَّت داخليًا (ORIF): رد الشظايا لموضعها وتثبيتها بصفيحة وبراغي على السطح العلوي أو الأمامي، لتقليل خطر عدم الالتئام أو الالتئام المعيب واستعادة طول الترقوة ووظيفة الكتف أسرع.' },
    { h: 'مراحل التئام العظم', p: '١) الالتهاب وتكوّن الورم الدموي (الأيام الأولى إلى نحو أسبوع). ٢) الدِّشبذ الليّن من غضروف ونسيج ليفي (نحو الأسبوع ٢–٣ إلى ٦). ٣) الدِّشبذ الصلب حين يتمعدن العظم (نحو ٦–١٢ أسبوعًا). ٤) إعادة التشكيل حيث يُعاد ترتيب العظم وفق الأحمال (أشهر إلى سنوات). مع التثبيت المتين قد يلتئم الكسر التئامًا مباشرًا بدشبذ قليل. التوقيت يختلف من شخص لآخر.' },
    { h: 'عضلات تتأثر بحركة الكتف', p: 'الدالية (الجزء الترقوي) ترفع الذراع للأمام، وشبه المنحرفة ترفع الترقوة والكتف وتثبّت لوح الكتف، والصدرية الكبرى (الجزء الترقوي) تثني الذراع وتقرّبه، والقصية الترقوية الخشائية تشد الترقوة لأعلى وتدير الرأس، وتحت الترقوة تثبّت الترقوة أثناء الحركة.' },
    { h: 'ما تحت الترقوة', p: 'يمر تحتها الشريان والوريد تحت الترقويين والضفيرة العضدية في طريقها إلى الذراع؛ لهذا يُراعى الحذر عند الحفر وتثبيت البراغي في السطح السفلي.' },
  ],
  knee: [
    { h: 'تركيب المفصل', p: 'تلتقي لقمتا عظم الفخذ بهضبة الظنبوب، وتنزلق الرضفة في الأخدود البكري للفخذ. تكسو الأسطحَ غضاريفُ زجاجية ملساء، وتعمّق الهلالتان الإنسية (على شكل C) والوحشية (أقرب إلى O) سطح الظنبوب وتوزّعان الحمل.' },
    { h: 'الأربطة الأربعة', p: 'الصليبي الأمامي يمنع انزلاق الظنبوب للأمام ويضبط الدوران، والصليبي الخلفي يمنع انزلاقه للخلف، والجانبي الإنسي يقاوم انفتاح الركبة للداخل، والجانبي الوحشي يقاوم انفتاحها للخارج.' },
    { h: 'آلة البسط', p: 'تتجمع رؤوس العضلة رباعية الرؤوس في وتر رباعي الرؤوس فوق الرضفة، ثم يكمل الرباط الرضفي إلى حدبة الظنبوب. الرضفة رافعة تزيد ذراع العزم فتقوّي البسط.' },
    { h: 'أثناء الثني', p: 'تتدحرج لقمتا الفخذ للخلف وتنزلقان على الظنبوب، وتنزلق الرضفة لأسفل في الأخدود، ويشتد الصليبي الخلفي مع زيادة الثني بينما ترتخي الأربطة الجانبية نسبيًا.' },
  ],
}
export const DISCLAIMER = 'هذا للفهم وليس بديلًا عن طبيبك.'

// ---------- synthetic structure records ----------
const SYN: Record<string, Partial<Structure> & { ar: string; en: string; la?: string; fn: string; fact: string; group: Structure['group']; system: string }> = {
  MY_PLATE: { ar: 'صفيحة تثبيت من التيتانيوم', en: 'titanium fixation plate (illustrative)', group: 'skeleton', system: 'skeletal',
    fn: 'صفيحة مشكّلة على انحناء السطح العلوي للترقوة تثبّت الشظايا في موضعها الصحيح حتى يلتئم العظم (التثبيت الداخلي ORIF). نموذج توضيحي مبني على سطح الترقوة الحقيقي.', fact: 'التيتانيوم خفيف ومتوافق حيويًا ولا يصدأ، ويلتحم به العظم جيدًا؛ لذلك يُستخدم في معظم صفائح الترقوة الحديثة.' },
  MY_SCREWS: { ar: 'براغي التثبيت', en: 'fixation screws (illustrative)', group: 'skeleton', system: 'skeletal',
    fn: 'براغٍ تعبر الصفيحة إلى العظم فتشدّها إليه؛ يكفي عادة ثلاث براغٍ على الأقل على كل جانب من الكسر. نموذج توضيحي.', fact: 'كثير من الصفائح الحديثة «مقفلة»: رأس البرغي يُلولب في الصفيحة نفسها فيصير التثبيت كجسر صلب.' },
  MY_PLEXUS: { ar: 'الضفيرة العضدية', en: 'right brachial plexus (schematic)', la: 'Plexus brachialis', group: 'nervous', system: 'nervous',
    fn: 'شبكة أعصاب من جذور العنق C5–T1 تمر بين العضلتين الأخمعيتين ثم تحت الترقوة إلى الإبط، وتغذّي حركة وإحساس الكتف والذراع واليد. (مسار تقريبي مبني لأن BodyParts3D لا يتضمّن الأعصاب الطرفية.)', fact: 'من هذه الضفيرة تخرج أعصاب الذراع الكبرى: الوسطي والزندي والكعبري والعضلي الجلدي والإبطي.' },
  MY_ACL: { ar: 'الرباط الصليبي الأمامي', en: 'anterior cruciate ligament', la: 'Ligamentum cruciatum anterius', group: 'skeleton', system: 'skeletal',
    fn: 'يمتد من الجدار الداخلي للقمة الفخذ الوحشية إلى المنطقة الأمامية بين اللقمتين في الظنبوب؛ يمنع انزلاق الظنبوب للأمام ويضبط دورانه.', fact: 'تمزقه شائع عند التوقف المفاجئ أو تغيير الاتجاه مع ثبات القدم، وكثيرًا ما يُسمع «طقطقة» لحظة الإصابة.' },
  MY_PCL: { ar: 'الرباط الصليبي الخلفي', en: 'posterior cruciate ligament', la: 'Ligamentum cruciatum posterius', group: 'skeleton', system: 'skeletal',
    fn: 'من الجدار الداخلي للقمة الفخذ الإنسية إلى الحافة الخلفية للظنبوب؛ يمنع انزلاق الظنبوب للخلف، وهو أثخن وأقوى من الأمامي.', fact: 'يُصاب غالبًا بضربة مباشرة على أعلى الساق والركبة مثنية، كما في ارتطام الركبة بلوحة السيارة.' },
  MY_MCL: { ar: 'الرباط الجانبي الإنسي', en: 'medial collateral ligament', la: 'Ligamentum collaterale tibiale', group: 'skeleton', system: 'skeletal',
    fn: 'شريط عريض على الجانب الداخلي من اللقيمة الإنسية للفخذ إلى الظنبوب؛ يقاوم انفتاح الركبة للداخل (الأروح).', fact: 'يتصل جزؤه العميق بالهلالة الإنسية، لذلك قد يصابان معًا.' },
  MY_LCL: { ar: 'الرباط الجانبي الوحشي', en: 'lateral collateral ligament', la: 'Ligamentum collaterale fibulare', group: 'skeleton', system: 'skeletal',
    fn: 'حبل مستدير من اللقيمة الوحشية للفخذ إلى رأس الشظية؛ يقاوم انفتاح الركبة للخارج (الأفحج).', fact: 'لا يلتصق بالهلالة الوحشية، بخلاف الرباط الإنسي مع الهلالة الإنسية.' },
  MY_QT: { ar: 'وتر العضلة رباعية الرؤوس', en: 'quadriceps tendon', la: 'Tendo musculi quadricipitis femoris', group: 'muscles', system: 'muscular',
    fn: 'يجمع رؤوس رباعية الرؤوس الأربعة ويرتكز على قطب الرضفة العلوي لينقل قوة بسط الركبة.', fact: 'هو أحد أقوى الأوتار في الجسم، ويتحمل قوى تبلغ عدة أضعاف وزن الجسم عند القفز.' },
  MY_PL: { ar: 'الرباط الرضفي', en: 'patellar ligament', la: 'Ligamentum patellae', group: 'muscles', system: 'muscular',
    fn: 'امتداد وتر رباعية الرؤوس من قطب الرضفة السفلي إلى حدبة الظنبوب؛ يكمل آلة بسط الركبة.', fact: 'يُطرق عليه في فحص «منعكس الركبة» فتنتفض الساق.' },
  MY_MM: { ar: 'الهلالة الإنسية', en: 'medial meniscus', la: 'Meniscus medialis', group: 'skeleton', system: 'skeletal',
    fn: 'غضروف ليفي على شكل C فوق هضبة الظنبوب الإنسية؛ يعمّق السطح ويوزّع الحمل ويمتص الصدمات.', fact: 'أقل حركة من الوحشية لالتصاقها بالمحفظة والرباط الإنسي، لذلك تتمزق أكثر.' },
  MY_LM: { ar: 'الهلالة الوحشية', en: 'lateral meniscus', la: 'Meniscus lateralis', group: 'skeleton', system: 'skeletal',
    fn: 'غضروف ليفي أقرب إلى الدائرة فوق الهضبة الوحشية؛ يوزّع الحمل ويثبّت المفصل.', fact: 'جزؤها الخارجي فقط له تروية دموية («المنطقة الحمراء»)، لذا يلتئم أفضل من الداخلي.' },
  MY_CART_F: { ar: 'غضروف لقمتي الفخذ', en: 'articular cartilage of femoral condyles', la: 'Cartilago articularis', group: 'skeleton', system: 'skeletal',
    fn: 'غضروف زجاجي أملس يكسو نهاية الفخذ فيقلل الاحتكاك ويوزّع الضغط.', fact: 'الغضروف المفصلي بلا أوعية ولا أعصاب، يتغذى من السائل الزلالي مع الحركة؛ لذلك تفيده الحركة المنتظمة.' },
  MY_CART_T: { ar: 'غضروف هضبة الظنبوب', en: 'articular cartilage of tibial plateau', la: 'Cartilago articularis', group: 'skeleton', system: 'skeletal',
    fn: 'يكسو سطح الظنبوب العلوي تحت الهلالتين.', fact: 'تآكله التدريجي هو ما يُعرف بخشونة الركبة (الفُصال العظمي).' },
  MY_CART_P: { ar: 'غضروف الرضفة', en: 'articular cartilage of patella', la: 'Cartilago articularis', group: 'skeleton', system: 'skeletal',
    fn: 'يكسو السطح الخلفي للرضفة وهو من أثخن الغضاريف في الجسم.', fact: 'تليّنه يسبب ألمًا أمام الركبة يزداد عند صعود الدرج أو الجلوس طويلًا.' },
}

// ---------- geometry helpers ----------
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
function verts(id: string) {
  const p = parts.get(id)
  if (!p) return [] as THREE.Vector3[]
  const P = p.mesh.geometry.attributes.position as THREE.BufferAttribute
  const out: THREE.Vector3[] = []
  for (let i = 0; i < P.count; i++) out.push(V().fromBufferAttribute(P, i))
  return out
}
// cartilage: the bone surface where weight w(v, n) > 0, lifted w·off along the normal — thick in the middle,
// feathering to nothing at the rim, so the edge melts into the bone instead of showing jagged triangles
function shell(id: string, weight: (v: THREE.Vector3, n: THREE.Vector3) => number, off: number) {
  const p = parts.get(id)!
  const g = p.mesh.geometry, P = g.attributes.position as THREE.BufferAttribute, N = g.attributes.normal as THREE.BufferAttribute
  const I = g.index ? g.index.array : Array.from({ length: P.count }, (_, i) => i)
  const w = new Float32Array(P.count), v = V(), n = V()
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); w[i] = Math.max(0, Math.min(1, weight(v, n))) }
  const remap = new Map<number, number>(), pos: number[] = [], nor: number[] = [], idx: number[] = []
  const vid = (i: number) => {
    let j = remap.get(i)
    if (j === undefined) {
      j = remap.size; remap.set(i, j)
      n.fromBufferAttribute(N, i); v.fromBufferAttribute(P, i).addScaledVector(n, off * w[i] + 0.0002)
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z)
    }
    return j
  }
  for (let t = 0; t < I.length; t += 3) if (w[I[t]] > 0.02 || w[I[t + 1]] > 0.02 || w[I[t + 2]] > 0.02) idx.push(vid(I[t]), vid(I[t + 1]), vid(I[t + 2]))
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx)
  return out
}
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// rectangular strip that follows a curve, lying flat (width horizontal)
function strip(curve: THREE.Curve<THREE.Vector3>, width: number, thick: number, n = 48) {
  const pos: number[] = [], idx: number[] = []
  const up = V(0, 1, 0)
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), T = curve.getTangentAt(t)
    const S = V().crossVectors(T, up).normalize(), U = V().crossVectors(S, T).normalize()
    // rounded ends: taper the width over the last 6 %
    const w = width / 2 * Math.sqrt(Math.max(0.08, 1 - Math.pow(Math.max(0, Math.abs(t - 0.5) * 2 - 0.88) / 0.12, 2)))
    for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
      const v = p.clone().addScaledVector(S, sx * w).addScaledVector(U, sy * thick)
      pos.push(v.x, v.y, v.z)
    }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
    const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4
    idx.push(a, c, b, b, c, d)
  }
  idx.push(0, 1, 2, 0, 2, 3); const L = n * 4; idx.push(L, L + 2, L + 1, L, L + 3, L + 2)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return g
}
const merge = (gs: THREE.BufferGeometry[]) => {
  const pos: number[] = [], nor: number[] = []
  for (let g of gs) {
    g = g.index ? g.toNonIndexed() : g
    pos.push(...(g.attributes.position.array as Float32Array)); nor.push(...(g.attributes.normal.array as Float32Array))
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  return out
}
const xray = makeXray()
function add(id: string, geo: THREE.BufferGeometry, opts: { custom?: boolean } = {}) {
  if (parts.has(id)) return parts.get(id)!
  const base = STRUCTURES['FMA7163']
  geo.computeBoundingSphere()
  const bb = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute)
  const c = bb.getCenter(V())
  const s: Structure = { ...base, ...SYN[id], id, la: SYN[id].la ?? '', layer: 'organs', side: null, connected: [], c: c.toArray(), min: bb.min.toArray(), max: bb.max.toArray() } as Structure
  STRUCTURES[id] = s
  const mesh = new THREE.Mesh(geo, makeMaterial(s)); mesh.name = id
  const p: Part = { id, s, mesh, mat: mesh.material as THREE.MeshPhysicalMaterial, xray, center: c, fade: 0, target: 0, glow: 0, ghost: false, explodeDir: V(), study: true, custom: opts.custom }
  parts.set(id, p)
  parts.get('FMA7163')!.mesh.parent!.add(mesh)
  return p
}

// ---------- clavicle: plate + screws + plexus ----------
function buildClavicle() {
  if (parts.has('MY_PLATE') || !parts.has('FMA13322')) return
  const vs = verts('FMA13322')
  // long axis by PCA (power iteration on the covariance)
  const ctr = vs.reduce((a, v) => a.add(v), V()).divideScalar(vs.length)
  let ax = V(1, 0, 0)
  for (let k = 0; k < 10; k++) {
    const nx = V()
    for (const v of vs) { const d = v.clone().sub(ctr); nx.addScaledVector(d, d.dot(ax)) }
    ax = nx.normalize()
  }
  // orient the axis lateral → medial (right clavicle: the lateral end has the more negative x)
  const proj0 = vs.map((v) => v.clone().sub(ctr).dot(ax))
  const lo0 = Math.min(...proj0), hi0 = Math.max(...proj0)
  const meanX = (sel: (p: number) => boolean) => { const xs = vs.filter((_, j) => sel(proj0[j])).map((v) => v.x); return xs.reduce((a, x) => a + x, 0) / xs.length }
  if (meanX((p) => p > hi0 - (hi0 - lo0) * 0.1) < meanX((p) => p < lo0 + (hi0 - lo0) * 0.1)) ax.negate()
  const proj = vs.map((v) => v.clone().sub(ctr).dot(ax))
  const lo = Math.min(...proj), hi = Math.max(...proj)
  const slice = (s: number) => { const w = (hi - lo) * 0.03; return vs.filter((_, j) => Math.abs(proj[j] - s) < w) }
  // superior plate over the lateral-to-middle shaft: ~20 % → ~67 % of the length from the lateral end (≈ ½ the bone)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 12; i++) {
    const sl = slice(lo + (hi - lo) * (0.2 + 0.47 * i / 12))
    if (sl.length) pts.push(sl.reduce((a, v) => (v.y > a.y ? v : a)).clone().add(V(0, 0.0004, 0)))
  }
  // a pre-contoured plate is a smooth arc, not a copy of every bump: least-squares quadratic through the summit points,
  // then lifted so it rests on (never sinks into) the highest of them
  const fit = (k: 'x' | 'y' | 'z') => {
    const n = pts.length; let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0
    pts.forEach((p, i) => { const t = i / (n - 1), y = p[k]; s0++; s1 += t; s2 += t * t; s3 += t ** 3; s4 += t ** 4; b0 += y; b1 += y * t; b2 += y * t * t })
    const M = new THREE.Matrix3().set(s0, s1, s2, s1, s2, s3, s2, s3, s4).invert()
    const c = new THREE.Vector3(b0, b1, b2).applyMatrix3(M)
    return (t: number) => c.x + c.y * t + c.z * t * t
  }
  const fx = fit('x'), fy = fit('y'), fz = fit('z')
  const lift = Math.max(...pts.map((p, i) => p.y - fy(i / (pts.length - 1))), 0)
  const smooth = Array.from({ length: 13 }, (_, i) => V(fx(i / 12), fy(i / 12) + lift, fz(i / 12)))
  const curve = new THREE.CatmullRomCurve3(smooth, false, 'centripetal')
  add('MY_PLATE', strip(curve, 0.0105, 0.0032))
  // 8 bicortical screws (tips just past the inferior cortex): mostly perpendicular, the 3rd clearly oblique (tip medial), the 5th slightly tilted
  const screws: THREE.BufferGeometry[] = []
  const N = 8
  for (let i = 0; i < N; i++) {
    const t = 0.06 + 0.88 * i / (N - 1)
    const p = curve.getPointAt(t)
    const sl = slice(lo + (hi - lo) * (0.2 + 0.47 * t))
    const bottom = sl.length ? Math.min(...sl.map((v) => v.y)) : p.y - 0.012
    const tilt = i === 2 ? 0.5 : i === 4 ? -0.14 : 0 // radians in the frontal plane; + leans the tip medially
    const len = (p.y - bottom) / Math.cos(tilt) + 0.0025
    const head = new THREE.CylinderGeometry(0.0026, 0.0024, 0.0012, 18).translate(p.x, p.y + 0.0036, p.z)
    const slot = new THREE.BoxGeometry(0.0034, 0.0005, 0.0007).translate(p.x, p.y + 0.0043, p.z)
    const shaft = new THREE.CylinderGeometry(0.0013, 0.001, len, 12).translate(0, -len / 2, 0).rotateZ(tilt).translate(p.x, p.y + 0.003, p.z)
    screws.push(head, slot, shaft)
  }
  add('MY_SCREWS', merge(screws))
  // brachial plexus (schematic): five roots C5–T1 from the cervical spine converge, pass under the clavicle to the axilla
  const mid = curve.getPointAt(0.55)
  const roots: THREE.BufferGeometry[] = []
  const axilla = V(mid.x - 0.065, mid.y - 0.05, mid.z - 0.012), arm = V(mid.x - 0.11, mid.y - 0.1, mid.z - 0.01)
  for (let i = 0; i < 5; i++) {
    const r0 = V(-0.022, 0.622 - i * 0.017, -0.035)
    const path = new THREE.CatmullRomCurve3([r0, V(-0.045, 0.585 - i * 0.008, -0.022), V(mid.x + 0.004, mid.y - 0.012 - i * 0.0025, mid.z - 0.016), axilla.clone().add(V(0, -i * 0.003, 0)), arm.clone().add(V((i - 2) * 0.004, 0, 0))])
    roots.push(new THREE.TubeGeometry(path, 40, 0.0019, 8))
  }
  add('MY_PLEXUS', merge(roots))
}

// ---------- knee: ligaments, menisci, cartilage + flexion rig ----------
export const knee = { pivot: V(), axis: V(1, 0, 0), ready: false, angle: 0 }
interface Lig { id: string; a: THREE.Vector3; b: THREE.Vector3; r: number; flat: number; moving: 'b' | 'both' }
const ligs: Lig[] = []
const LOWER = ['FMA24478', 'FMA24481', 'MY_CART_T', 'MY_MM', 'MY_LM']

function buildKnee() {
  if (knee.ready || !parts.has('FMA24475') || !parts.has('FMA24478')) return
  const fem = verts('FMA24475'), tib = verts('FMA24478'), fib = verts('FMA24481'), pat = verts('FMA24487')
  const fMin = Math.min(...fem.map((v) => v.y)), tMax = Math.max(...tib.map((v) => v.y))
  const distal = fem.filter((v) => v.y < fMin + 0.035)
  const db = new THREE.Box3().setFromPoints(distal)
  const xm = (db.min.x + db.max.x) / 2 // left leg: medial = smaller x
  const condM = new THREE.Box3().setFromPoints(distal.filter((v) => v.x < xm)), condL = new THREE.Box3().setFromPoints(distal.filter((v) => v.x >= xm))
  const plateau = tib.filter((v) => v.y > tMax - 0.014)
  const pb = new THREE.Box3().setFromPoints(plateau)
  const pc = pb.getCenter(V())
  const jy = (fMin + tMax) / 2
  knee.pivot.set(xm, fMin + 0.021, (db.min.z + db.max.z) / 2 - 0.004)

  // articular cartilage shells measured on the bone surfaces
  add('MY_CART_F', shell('FMA24475', (v, n) => ss(fMin + 0.036, fMin + 0.026, v.y) * ss(0.85, 0.55, Math.abs(n.x)) * (n.y < 0.25 || v.z > db.max.z - 0.022 ? 1 : 0), 0.0022))
  add('MY_CART_T', shell('FMA24478', (v, n) => ss(tMax - 0.012, tMax - 0.006, v.y) * ss(0.3, 0.6, n.y), 0.0018), { custom: false })
  const pz = new THREE.Box3().setFromPoints(pat)
  add('MY_CART_P', shell('FMA24487', (v, n) => ss(-0.1, -0.45, n.z) * ss(pz.max.z - 0.004, (pz.min.z + pz.max.z) / 2, v.z), 0.0028))

  // menisci: wedge tubes along the rim of each plateau compartment
  const rim = (cx: number, cz: number, rx: number, rz: number, a0: number, a1: number) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * i / 28; pts.push(V(cx + Math.cos(a) * rx, jy - 0.0005, cz + Math.sin(a) * rz)) }
    // flatten into a wedge about its own height (scaling about the origin would lift it away from the joint)
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, 0.0028, 10).translate(0, -jy, 0).scale(1, 0.75, 1).translate(0, jy, 0)
  }
  const mC = condM.getCenter(V()), lC = condL.getCenter(V())
  const rzM = (pb.max.z - pb.min.z) * 0.38, rzL = (pb.max.z - pb.min.z) * 0.33
  // medial: wide open «C» (horns toward the notch); lateral: nearly closed «O»
  add('MY_MM', rim(mC.x, pc.z, (xm - pb.min.x) * 0.62, rzM, Math.PI * 0.62, Math.PI * 2.38), { custom: false })
  add('MY_LM', rim(lC.x, pc.z, (pb.max.x - xm) * 0.55, rzL, -Math.PI * 0.42, Math.PI * 1.42), { custom: false })

  // ligament anchor points measured on the bones (left knee, +z anterior)
  const fibHead = fib.reduce((a, v) => (v.y > a.y ? v : a), fib[0]).clone()
  const tibTub = tib.filter((v) => v.y < tMax - 0.02 && v.y > tMax - 0.05).reduce((a, v) => (v.z > a.z ? v : a))
  const patTop = pat.reduce((a, v) => (v.y > a.y ? v : a)), patBot = pat.reduce((a, v) => (v.y < a.y ? v : a))
  const epiM = distal.filter((v) => v.y > fMin + 0.02).reduce((a, v) => (v.x < a.x ? v : a)), epiL = distal.filter((v) => v.y > fMin + 0.02).reduce((a, v) => (v.x > a.x ? v : a))
  const tibMed = tib.filter((v) => v.y < tMax - 0.055 && v.y > tMax - 0.075).reduce((a, v) => (v.x < a.x ? v : a))
  const notchY = fMin + 0.016
  ligs.push(
    { id: 'MY_ACL', a: V(xm + 0.006, notchY + 0.004, db.min.z + 0.012), b: V(xm - 0.001, jy - 0.002, pc.z + 0.009), r: 0.0042, flat: 0.7, moving: 'b' },
    { id: 'MY_PCL', a: V(xm - 0.006, notchY + 0.002, pc.z + 0.004), b: V(xm + 0.001, jy - 0.012, pb.min.z + 0.003), r: 0.0052, flat: 0.75, moving: 'b' },
    { id: 'MY_MCL', a: epiM.clone().add(V(-0.0015, 0, 0)), b: tibMed.clone().add(V(-0.0012, 0, 0.004)), r: 0.0062, flat: 0.28, moving: 'b' },
    { id: 'MY_LCL', a: epiL.clone().add(V(0.0015, 0, -0.004)), b: fibHead.clone().add(V(0.001, -0.004, 0.002)), r: 0.0026, flat: 1, moving: 'b' },
    { id: 'MY_PL', a: patBot.clone().add(V(0, 0.003, 0.002)), b: tibTub.clone().add(V(0, 0.004, -0.002)), r: 0.0072, flat: 0.32, moving: 'both' },
    { id: 'MY_QT', a: patTop.clone().add(V(0, 0.055, -0.006)), b: patTop.clone().add(V(0, -0.003, 0)), r: 0.0085, flat: 0.32, moving: 'both' },
  )
  const unit = () => new THREE.CylinderGeometry(1, 1, 1, 18, 4)
  for (const l of ligs) add(l.id, unit(), { custom: true })
  knee.ready = true
  updateKnee(0)
}

// patella rides the trochlea: rotates about the condyle centre by ~70 % of the tibial angle
const q = new THREE.Quaternion(), qp = new THREE.Quaternion(), tA = V(), tB = V(), dir = V(), Y = V(0, 1, 0)
const rotAbout = (v: THREE.Vector3, quat: THREE.Quaternion) => v.clone().sub(knee.pivot).applyQuaternion(quat).add(knee.pivot)
export function updateKnee(angle: number) {
  if (!knee.ready) return
  knee.angle = angle
  q.setFromAxisAngle(knee.axis, angle)
  qp.setFromAxisAngle(knee.axis, angle * 0.7)
  for (const id of LOWER) setRot(id, q)
  setRot('FMA24487', qp); setRot('MY_CART_P', qp)
  for (const l of ligs) {
    const p = parts.get(l.id)
    if (!p) continue
    if (l.id === 'MY_PL') { tA.copy(rotAbout(l.a, qp)); tB.copy(rotAbout(l.b, q)) }
    else if (l.id === 'MY_QT') { tA.copy(l.a); tB.copy(rotAbout(l.b, qp)) }
    else { tA.copy(l.a); tB.copy(rotAbout(l.b, q)) }
    dir.subVectors(tB, tA)
    const len = dir.length()
    p.mesh.position.addVectors(tA, tB).multiplyScalar(0.5)
    p.mesh.quaternion.setFromUnitVectors(Y, dir.normalize())
    // flat bands face outward (medial/lateral or anterior)
    p.mesh.scale.set(l.r, len, l.r * l.flat)
    p.mesh.updateMatrix()
  }
}
function setRot(id: string, quat: THREE.Quaternion) {
  const p = parts.get(id)
  if (!p) return
  p.rot = { pivot: knee.pivot, q: quat.clone() }
}
export function resetKnee() { updateKnee(0); for (const id of [...LOWER, 'FMA24487', 'MY_CART_P']) { const p = parts.get(id); if (p) p.rot = undefined } }

// full-resolution bones first (phones start light), so plate and cartilage are shaped on the real surface
export async function buildStudy(s: Study) {
  await upgradeGroup('skeleton')
  if (s === 'clavicle') buildClavicle(); else buildKnee()
}

// camera framing for each study
// flexion reads best from the side: lateral view of the left knee (+x)
export function kneeSideView() {
  const f = STRUCTURES['FMA24475'], t = STRUCTURES['FMA24478'], p = STRUCTURES['FMA24487']
  const j = V(p.c[0], (f.min[1] + t.max[1]) / 2 - 0.03, (f.min[2] + f.max[2]) / 2)
  return { target: j.clone().add(V(0, -0.04, -0.03)), pos: j.clone().add(V(0.6, 0.02, -0.02)) }
}
export function studyFrame(s: Study): { pos: THREE.Vector3; target: THREE.Vector3 } {
  if (s === 'clavicle') {
    const c = V(...STRUCTURES['FMA13322'].c)
    return { target: c.clone().add(V(0, -0.04, 0)), pos: c.clone().add(V(-0.05, 0.09, 0.3)) }
  }
  // from the bone bounds (available before the knee is built): joint line between femur and tibia
  const f = STRUCTURES['FMA24475'], t = STRUCTURES['FMA24478'], p = STRUCTURES['FMA24487']
  const j = V(p.c[0], (f.min[1] + t.max[1]) / 2, (f.min[2] + f.max[2]) / 2)
  return { target: j.clone().add(V(0, -0.055, 0.005)), pos: j.clone().add(V(0.2, 0.04, 0.36)) }
}

// ---------- «تشخيصي»: report wording → structures + plain explanation ----------
export const DIAG_RULES: { re: RegExp; ids: string[]; ar: string }[] = [
  { re: /صليبي\s*امامي|صليبي امامي|anterior cruciate|\bacl\b/i, ids: ['MY_ACL'], ar: 'الرباط الصليبي الأمامي: يربط الفخذ بالظنبوب من الداخل ويمنع انزلاق الساق للأمام. «تمزق جزئي» يعني أن بعض أليافه سليمة، و«كامل» أن الرباط انقطع.' },
  { re: /صليبي\s*خلفي|posterior cruciate|\bpcl\b/i, ids: ['MY_PCL'], ar: 'الرباط الصليبي الخلفي: الأقوى في الركبة، يمنع انزلاق الساق للخلف.' },
  { re: /جانبي\s*انسي|رباط\s*انسي|medial collateral|\bmcl\b/i, ids: ['MY_MCL'], ar: 'الرباط الجانبي الإنسي: على الجانب الداخلي للركبة، يُصاب عند الضغط على الركبة من الخارج. الإصابات تُدرَّج عادة من الأولى (شد) إلى الثالثة (تمزق كامل).' },
  { re: /جانبي\s*وحشي|رباط\s*وحشي|lateral collateral|\blcl\b/i, ids: ['MY_LCL'], ar: 'الرباط الجانبي الوحشي: حبل على الجانب الخارجي يصل الفخذ برأس الشظية.' },
  { re: /هلال(ه|ة)?\s*انسي|غضروف\s*هلالي\s*انسي|medial menisc/i, ids: ['MY_MM'], ar: 'الهلالة الإنسية: وسادة غضروفية داخلية على شكل C. تصف التقارير شكل التمزق (أفقي، طولي، «مقبض السطل») وموضعه (القرن الأمامي أو الخلفي أو الجسم).' },
  { re: /هلال(ه|ة)?\s*وحشي|lateral menisc/i, ids: ['MY_LM'], ar: 'الهلالة الوحشية: وسادة غضروفية خارجية أقرب إلى الدائرة.' },
  { re: /قرن\s*خلفي|posterior horn/i, ids: ['MY_MM', 'MY_LM'], ar: 'القرن الخلفي: الجزء الخلفي من الهلالة، وهو أكثر المواضع شيوعًا للتمزق.' },
  { re: /هلال|menisc/i, ids: ['MY_MM', 'MY_LM'], ar: 'الهلالتان: غضروفان ليفيان بين الفخذ والظنبوب يوزّعان الحمل ويمتصان الصدمات.' },
  { re: /خشون|تاكل|تآكل|osteoarthr|chondral|غضروف\s*مفصلي|articular cartilage/i, ids: ['MY_CART_F', 'MY_CART_T'], ar: 'الغضروف المفصلي: الطبقة الملساء على أطراف العظام. «الخشونة» أو الفُصال العظمي تعني ترقّقه التدريجي، وتُدرَّج حسب العمق.' },
  { re: /رضف|patell(a|ar)\s*(cartilage|chondro)|chondromalacia/i, ids: ['FMA24487', 'MY_CART_P'], ar: 'الرضفة وغضروفها: تليّن غضروف الرضفة يسبب ألمًا أمام الركبة خاصة عند صعود الدرج.' },
  { re: /وتر\s*(ال)?رضف|رباط\s*رضفي|patellar (tendon|ligament)|jumper/i, ids: ['MY_PL'], ar: 'الرباط (الوتر) الرضفي: يصل الرضفة بالظنبوب؛ التهابه شائع عند القفز المتكرر.' },
  { re: /رباعي\S*\s*(ال)?رو+س|quadriceps tendon/i, ids: ['MY_QT'], ar: 'وتر رباعية الرؤوس: فوق الرضفة، ينقل قوة بسط الركبة.' },
  { re: /بيكر|baker|popliteal cyst|ماب(ضي|ض)/i, ids: ['FMA45958', 'FMA22449'], ar: 'كيس بيكر: تجمّع سائل خلف الركبة بين رأس الساقية الإنسي والغشائية، وغالبًا يرافق مشكلة داخل المفصل.' },
  { re: /هضب(ه|ة)|tibial plateau|ظنبوب|tibia/i, ids: ['FMA24478', 'MY_CART_T'], ar: 'الظنبوب وهضبته: السطح العلوي للساق الذي يحمل لقمتي الفخذ.' },
  { re: /لقم(ه|ة)|condyle|فخذ|femur|femoral/i, ids: ['FMA24475', 'MY_CART_F'], ar: 'لقمتا الفخذ: النهاية السفلية المستديرة لعظم الفخذ.' },
  { re: /شظي|fibula/i, ids: ['FMA24481'], ar: 'الشظية: العظم الرفيع خارج الساق، يرتكز عليه الرباط الجانبي الوحشي.' },
  { re: /كدم(ه|ة)\s*عظمي|bone (bruise|marrow edema)|وذم(ه|ة)/i, ids: ['FMA24475', 'FMA24478'], ar: 'الكدمة العظمية (وذمة نقي العظم): نزف/سائل داخل العظم بعد صدمة، تظهر في الرنين وتتحسن غالبًا مع الوقت.' },
  { re: /انصباب|effusion|سائل/i, ids: ['MY_CART_F', 'MY_CART_T'], ar: 'الانصباب المفصلي: زيادة السائل داخل الركبة، علامة على تهيّج المفصل لا تشخيصًا بحد ذاته.' },
]
export const DIAG_KEY = 'jasad.myKnee.diagnosis' // stays in this browser (localStorage) — never sent or committed
