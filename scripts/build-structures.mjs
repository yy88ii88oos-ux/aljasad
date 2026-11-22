// Builds data/structures.json from data/geometry.json + Arabic terminology & knowledge base.
import fs from 'node:fs';
import path from 'node:path';
import { T, ORD_PATTERNS, ORD_EN, DIGITS, PHALANX } from './ar-dict.mjs';
import { INFO, CAT } from './ar-info.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/geometry.json'), 'utf8'));

const SIDE = { right: { m: 'الأيمن', f: 'اليمنى' }, left: { m: 'الأيسر', f: 'اليسرى' } };

function base(en) {
  let side = null;
  let s = en.replace(/, nsn$/, '');
  let m = s.match(/^(right|left) (.*)$/);
  if (m) { side = m[1]; s = m[2]; }
  m = s.match(/^(.*) of (right|left) (.*)$/);
  if (m) { side = m[2]; s = `${m[1]} of ${m[3]}`; }
  m = s.match(/^(.*) (right|left) (.*)$/);
  if (m) { side = m[2]; s = `${m[1]} ${m[3]}`; }
  return { side, base: s };
}

function arName(en) {
  const { side, base: b } = base(en);
  let term = T[b];
  if (!term) {
    for (const [re, fn] of ORD_PATTERNS) {
      const m = b.match(re);
      if (m && ORD_EN[m[1]]) { term = fn(ORD_EN[m[1]]); break; }
    }
  }
  if (!term) {
    let m = b.match(/^(proximal|middle|distal) phalanx of (.+)$/);
    if (m && DIGITS[m[2]]) term = [`السُّلامى ${PHALANX[m[1]]} ل${DIGITS[m[2]].startsWith('ال') ? DIGITS[m[2]] : DIGITS[m[2]]}`, 'f'];
    m = b.match(/^intervertebral disk of (.+)$/);
    if (m) {
      const v = m[1] === 'axis' ? ['المحور', 'm'] : (ORD_PATTERNS.map(([re, fn]) => { const x = m[1].match(re); return x && ORD_EN[x[1]] ? fn(ORD_EN[x[1]]) : null; }).find(Boolean));
      if (v) term = [`القرص بين الفقرات أسفل ${v[0].replace(/^ال/, 'ال')}`, 'm'];
    }
  }
  if (!term) return null;
  let [ar, g] = term;
  // fix phalanx genitive: «ل» + «ال» → «لل»
  ar = ar.replace(/ لال/g, ' لل');
  if (side) ar = `${ar} ${SIDE[side][g]}`;
  return { ar, base: b, side };
}

function info(b) {
  if (INFO[b] && INFO[b].fn) return INFO[b];
  for (const [re, v] of CAT) if (re.test(b)) return v;
  return null;
}

// ---------- layers ----------
const SUPERFICIAL = /pectoralis major|deltoid|trapezius|latissimus|serratus anterior|rectus abdominis|external oblique|biceps brachii|triceps|brachioradialis|flexor carpi|palmaris|extensor carpi|^extensor digitorum$|extensor digiti minimi|abductor pollicis longus|extensor pollicis brevis|anconeus|gluteus maximus|gluteus medius|tensor fasciae|sartorius|rectus femoris|vastus lateralis|vastus medialis|gracilis|adductor longus|pectineus|long head of biceps femoris|semitendinosus|gastrocnemius|soleus|tibialis anterior|fibularis longus|extensor digitorum longus|sternocleidomastoid|platysma|frontalis|occipitalis|epicranius|temporoparietalis|temporalis|superficial part of masseter|orbicularis|zygomaticus|levator labii|levator anguli|depressor|mentalis|nasalis|procerus|risorius|buccinator|corrugator|teres major|infraspinatus|external anal|calcaneal tendon|iliotibial|linea alba|inguinal ligament|flexor retinaculum|abductor hallucis|abductor digiti minimi of foot|plantaris|fibularis brevis/;
function layerOf(g, b) {
  if (g.group === 'skin') return 'skin';
  if (g.group === 'muscles') return SUPERFICIAL.test(b) ? 'superficial' : 'deep';
  if (g.group === 'skeleton') return /ligament|tract|membrane|retinaculum|linea alba|tendon|tendinous/.test(b) ? 'deep' : 'bones';
  return 'organs';
}

// ---------- adjacency (bbox proximity) ----------
const ids = Object.keys(geo);
function gap(a, b) {
  let d = 0;
  for (let k = 0; k < 3; k++) { const g = Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k]); d += g * g; }
  return Math.sqrt(d);
}
const dist = (a, b) => Math.hypot(a.centroid[0] - b.centroid[0], a.centroid[1] - b.centroid[1], a.centroid[2] - b.centroid[2]);

const out = {};
const missing = [];
for (const id of ids) {
  const g = geo[id];
  const n = arName(g.en);
  if (!n) missing.push(g.en);
  const b = n ? n.base : g.en;
  const inf = info(b);
  const near = ids.filter((o) => o !== id && geo[o].group !== 'skin' && gap(g, geo[o]) < 0.004)
    .sort((x, y) => dist(g, geo[x]) - dist(g, geo[y])).slice(0, 6);
  out[id] = {
    id, ar: n ? n.ar : g.en, en: g.en.replace(/, nsn$/, ''), system: g.system, group: g.group, layer: layerOf(g, b),
    side: n?.side || null, fn: inf?.fn || '', fact: inf?.fact || '', connected: near,
    c: g.centroid, min: g.min, max: g.max,
  };
}
fs.writeFileSync(path.join(ROOT, 'data/structures.json'), JSON.stringify(out, null, 0));
console.log('structures', ids.length, 'missing arabic:', missing.length);
if (missing.length) console.log(missing.join('\n'));
console.log('without fn:', Object.values(out).filter((s) => !s.fn).map((s) => s.en).join(' | '));
const layers = {}; for (const s of Object.values(out)) layers[s.layer] = (layers[s.layer] || 0) + 1; console.log(layers);
