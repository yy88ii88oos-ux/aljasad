import * as THREE from 'three'
import type { Structure } from '../data'

// Uniforms shared by every body material (one JS object → one update per frame)
export const SHARED = {
  uTime: { value: 0 },
  uCap: { value: 0 }, // section mode: colour back faces as a solid cut surface
  uBend: { value: 0 }, // elbow flexion angle (rad) for the arm tour
  uPivot: { value: new THREE.Vector3() },
  uAxis: { value: new THREE.Vector3(1, 0, 0) },
  uGen: { value: 1 }, // 1 = external genitalia morphed into a smooth surface
}
export const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1000)

// ---------------- colour palette (medical-atlas convention, high contrast) ----------------
export const PALETTE = {
  muscle: '#B8322E', tendon: '#F6F3EC', bone: '#E8DCC4', tooth: '#F7F3EA', cartilage: '#8FC8E0',
  artery: '#D42A2A', vein: '#2E5BD8', nerve: '#F2CF3A', lymph: '#3FB86B', skin: '#C98D74',
}
const ORGAN_COLORS: [RegExp, string][] = [
  [/liver/, '#5A1C14'], [/gallbladder|cystic duct|bile duct/, '#3E7A2C'], [/stomach/, '#D9786E'], [/esophagus/, '#D47B72'],
  [/duodenum|jejunum|ileum/, '#EE8C98'], [/colon|appendix|rectum|taenia|cecum|caecum/, '#E58A8C'], [/pancrea/, '#E9B470'],
  [/spleen/, '#5B2470'], [/kidney/, '#6B2119'], [/ureter|urethra/, '#E3C07A'], [/bladder/, '#E2B07A'],
  [/lung/, '#EE9FB0'], [/trachea|bronch|thyroid cartilage|cricoid|nasal cartilage/, PALETTE.cartilage], [/thymus/, '#9ED08A'], [/adrenal/, '#E2A23A'],
  [/thyroid gland/, '#9C2A3A'], [/pituitary|pineal/, '#D88F7F'], [/eyeball/, '#F4F1EA'], [/ear$/, '#E3A98F'],
  [/testis|epididymis|deferent|seminal|prostate|penis|glans|corpus/, '#D58E94'], [/gingiva|labial/, '#E07A80'],
  [/diaphragm/, PALETTE.muscle], [/lymph/, PALETTE.lymph],
]
const VEIN = /vein|vena|sinus/
export const TENDON = /tendon|aponeurosis|linea alba|retinaculum|fascia lata|iliotibial|ligament|tract|membrane|tendinous|galea/
function baseColor(s: Structure): string {
  const n = s.en
  if (s.en === 'subcutaneous fat') return '#E8BE52'
  if (s.group === 'skin') return PALETTE.skin
  if (n === 'eyeball') return '#F4F1EA'
  if (s.group === 'skeleton') {
    if (/tooth/.test(n)) return PALETTE.tooth
    if (/cartilage|disk|disc|menisc|labrum/.test(n)) return PALETTE.cartilage
    if (TENDON.test(n)) return PALETTE.tendon
    return PALETTE.bone
  }
  if (s.group === 'muscles') return TENDON.test(n) && !/tensor fasciae/.test(n) ? PALETTE.tendon : PALETTE.muscle
  if (s.group === 'cardio') {
    if (/pulmonary artery|pulmonary trunk/.test(n)) return PALETTE.vein // deoxygenated: atlas blue
    if (/pulmonary vein/.test(n)) return PALETTE.artery
    if (/wall of heart|papillary|valve/.test(n)) return '#9E1E22'
    return VEIN.test(n) ? PALETTE.vein : PALETTE.artery
  }
  if (s.group === 'nervous') {
    if (/nerve|optic tract|chiasm|cord|root|ganglion/.test(n)) return PALETTE.nerve
    if (/ventricle|aqueduct|canal|foramen/.test(n)) return '#6FC0F5'
    if (/choroid/.test(n)) return '#C45A6A'
    if (/white matter|callosum|capsule|fornix|commissure/.test(n)) return '#F3EAE0'
    return '#E6B5AA'
  }
  for (const [re, c] of ORGAN_COLORS) if (re.test(n)) return c
  return '#D9958A'
}

// ---------------- shader patches ----------------
const VERT_HEAD = /* glsl */ `
uniform float uTime; uniform float uBend; uniform vec3 uPivot; uniform vec3 uAxis; uniform float uPush; uniform float uGen;
#ifdef GENMORPH
attribute vec3 gpos; attribute vec3 gnor;
#endif
attribute vec2 armw; attribute vec3 fdir;
varying vec3 vObj; varying vec3 vFdir;
vec3 rotAxis(vec3 v, vec3 a, float ang){ float c=cos(ang), s=sin(ang); return v*c + cross(a,v)*s + a*dot(a,v)*(1.0-c); }
`
const VERT_BEGIN = /* glsl */ `
vec3 transformed = vec3( position );
vObj = position; vFdir = fdir;
#ifdef GENMORPH
transformed = mix(transformed, gpos, uGen);
#endif
#ifdef SKINPUSH
transformed += objectNormal * uPush;
#endif
if (armw.x > 0.5 && uBend > 0.0001) {
  float t = smoothstep(0.015, -0.03, transformed.y - uPivot.y);
  float ang = uBend * t;
  transformed = uPivot + rotAxis(transformed - uPivot, uAxis, ang);
  transformed += normal * armw.y * uBend * 0.006 * (1.0 - t);
}
`
const NORMAL_BEGIN = /* glsl */ `
vec3 objectNormal = vec3( normal );
#ifdef GENMORPH
objectNormal = normalize(mix(objectNormal, gnor, uGen));
#endif
if (armw.x > 0.5 && uBend > 0.0001) {
  float tN = smoothstep(0.015, -0.03, position.y - uPivot.y);
  objectNormal = rotAxis(objectNormal, uAxis, uBend * tN);
}
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`
const FRAG_HEAD = /* glsl */ `
uniform float uCap; uniform vec3 uCapColor; uniform float uTime;
uniform vec3 uEyeA; uniform vec3 uEyeB; uniform float uEyeR;
uniform float uGlow; uniform vec3 uGlowColor;
varying vec3 vObj; varying vec3 vFdir;
vec3 jPerturb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir ) {
  vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) ); vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
  vec3 R1 = cross( vSigmaY, surf_norm ); vec3 R2 = cross( surf_norm, vSigmaX );
  float fDet = dot( vSigmaX, R1 ) * faceDir;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
  return normalize( abs( fDet ) * surf_norm - vGrad );
}
float jHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float jNoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(jHash(i),jHash(i+vec3(1,0,0)),f.x),mix(jHash(i+vec3(0,1,0)),jHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(jHash(i+vec3(0,0,1)),jHash(i+vec3(1,0,1)),f.x),mix(jHash(i+vec3(0,1,1)),jHash(i+vec3(1,1,1)),f.x),f.y),f.z); }
#ifdef FIBER
float fiberH(vec3 p, vec3 d){
  vec3 a = normalize(abs(d.y) < 0.9 ? cross(d, vec3(0,1,0)) : cross(d, vec3(1,0,0)));
  vec3 b = cross(d, a);
  // fibres run along d: stripes vary only across it, broken up by low-frequency noise along the fibre
  float w = jNoise(p * 60.0 + d * 0.0) * 3.0 + jNoise(p * 160.0) * 1.2;
  float u = dot(p, a) * 0.8 + dot(p, b) * 0.6;
  // analytic anti-aliasing: fade stripes that get finer than a pixel
  float fw = fwidth(u * 2600.0), fwb = fwidth(u * 420.0);
  float s = sin(u * 2600.0 + w) * (1.0 - smoothstep(0.6, 2.2, fw));
  float bundle = sin(u * 420.0 + w * 0.5) * (1.0 - smoothstep(0.6, 2.2, fwb));
  return 0.55 + 0.3 * s * (0.6 + 0.4 * jNoise(p * 300.0 + d * 40.0)) + 0.15 * bundle;
}
// thin pale lines between fascicles (perimysium), ~1.6 mm apart, anti-aliased and broken along the fibre
float fiberLine(vec3 p, vec3 d){
  vec3 a = normalize(abs(d.y) < 0.9 ? cross(d, vec3(0,1,0)) : cross(d, vec3(1,0,0)));
  vec3 b = cross(d, a);
  float u = (dot(p, a) * 0.8 + dot(p, b) * 0.6) * 520.0 + jNoise(p * 25.0) * 0.8;
  float f = abs(fract(u) - 0.5) * 2.0;           // 0 at the line centre
  float w = fwidth(u) * 1.5 + 0.05;
  float line = 1.0 - smoothstep(0.0, w + 0.06, f);
  float fade = 1.0 - smoothstep(0.07, 0.16, fwidth(u));    // only once each gap is > ~8 px: no pinstripe moiré
  float broken = smoothstep(0.45, 0.75, jNoise(p * 70.0 + d * 180.0));
  return line * fade * broken;
}
#endif
`
const FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
#ifdef FIBER
float fh = fiberH(vObj, normalize(vFdir + vec3(1e-4)));
normal = jPerturb( -vViewPosition, normal, vec2( dFdx(fh), dFdy(fh) ) * 0.35, faceDirection );
diffuseColor.rgb *= 0.86 + 0.22 * fh;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.86, 0.82), fiberLine(vObj, normalize(vFdir + vec3(1e-4))) * 0.4);
#endif
#ifdef ORGANIC
float on = jNoise(vObj * 220.0) * 0.6 + jNoise(vObj * 600.0) * 0.4;
normal = jPerturb( -vViewPosition, normal, vec2( dFdx(on), dFdy(on) ) * 0.35, faceDirection );
diffuseColor.rgb *= 0.9 + 0.2 * on;
#endif
#ifdef FIBER
// fibre-aligned roughness: sheen runs along the fascicles
roughnessFactor = clamp(roughnessFactor * (0.78 + 0.45 * fh), 0.18, 1.0);
#endif
#ifdef BONE
{
  // fine cortical porosity: tiny pits that fade out before they can alias
  float fq = fwidth(vObj.x * 1500.0) + fwidth(vObj.y * 1500.0);
  float pit = smoothstep(0.66, 0.8, jNoise(vObj * 1500.0)) * (1.0 - smoothstep(0.4, 0.9, fq));
  float grain = jNoise(vObj * 480.0);
  diffuseColor.rgb *= 1.0 - 0.22 * pit - 0.06 * grain;
  normal = jPerturb( -vViewPosition, normal, vec2( dFdx(-pit), dFdy(-pit) ) * 0.25, faceDirection );
  roughnessFactor = clamp(roughnessFactor + 0.2 * pit, 0.0, 1.0);
}
#endif
#ifdef SKIN
{
  // pores + mottling, flushed cheeks and lips, faintly glossier lips
  float fq = fwidth(vObj.x * 2200.0) + fwidth(vObj.y * 2200.0);
  float pore = smoothstep(0.64, 0.82, jNoise(vObj * 2200.0)) * (1.0 - smoothstep(0.3, 0.8, fq));
  float mott = jNoise(vObj * 60.0) * 0.6 + jNoise(vObj * 14.0) * 0.4;
  diffuseColor.rgb *= 0.92 + 0.13 * mott - 0.07 * pore;
  vec2 ck = (abs(vObj.xy - vec2(0.0, 0.677)) - vec2(0.036, 0.0)) / vec2(0.022, 0.018);
  float cheeks = exp(-dot(ck, ck)) * smoothstep(0.045, 0.06, vObj.z);
  vec2 lp = (vObj.xy - vec2(0.0, 0.652)) / vec2(0.023, 0.009);
  float lips = exp(-dot(lp, lp) * 1.6) * smoothstep(0.07, 0.08, vObj.z);
  vec2 ns = (vObj.xy - vec2(0.0, 0.688)) / vec2(0.012, 0.016);
  float nose = exp(-dot(ns, ns)) * smoothstep(0.085, 0.1, vObj.z);
  diffuseColor.rgb *= mix(vec3(1.0), vec3(1.06, 0.84, 0.82), clamp(cheeks * 0.6 + nose * 0.35, 0.0, 1.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.27, 0.28), lips * 0.75);
  normal = jPerturb( -vViewPosition, normal, vec2( dFdx(-pore), dFdy(-pore) ) * 0.12, faceDirection );
  roughnessFactor = clamp(roughnessFactor + 0.12 * pore - 0.22 * lips, 0.0, 1.0);
}
#endif
#ifdef FAT
{
  // lobulated adipose: Worley cells (~6 mm lobules), soft glossy domes separated by faint septa
  vec3 q = vObj * 170.0; vec3 iq = floor(q), fq3 = fract(q);
  float f1 = 9.0, f2 = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 h = vec3(jHash(iq + o), jHash(iq + o + 17.1), jHash(iq + o + 41.7));
    float d = length(o + h - fq3);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  float edge = f2 - f1;
  float far = smoothstep(0.08, 0.3, fwidth(q.x) + fwidth(q.y));   // lobules too small on screen → plain fat
  float septa = (1.0 - smoothstep(0.0, 0.12 + fwidth(edge), edge)) * (1.0 - far);
  float bulge = smoothstep(0.0, 0.5, edge) * (1.0 - far);
  diffuseColor.rgb *= 0.92 + 0.12 * bulge;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.86, 0.62), septa * 0.35);
  normal = jPerturb( -vViewPosition, normal, vec2( dFdx(bulge), dFdy(bulge) ) * 0.5, faceDirection );
}
#endif
#ifdef EYE
{
  // procedural eye: sclera, iris with radial stroma, limbal ring, pupil — under a glossy cornea (clearcoat)
  vec3 ec = vObj.x < 0.0 ? uEyeA : uEyeB;
  vec3 q = normalize(vObj - ec);
  vec3 gaze = vec3(0.0, 0.0, 1.0);
  float th = acos(clamp(dot(q, gaze), -1.0, 1.0));
  vec3 side = q - gaze * dot(q, gaze);
  float phi = atan(side.y, side.x);
  float IR = 0.5, PR = 0.17; // angular radii: iris ≈ 6 mm, pupil ≈ 2 mm on a 12 mm globe
  float aa = fwidth(th) * 1.5;
  float irisM = 1.0 - smoothstep(IR - aa, IR + aa, th);
  float pupilM = 1.0 - smoothstep(PR - aa, PR + aa, th);
  float rr = th / IR;
  float streak = jNoise(vec3(cos(phi) * 9.0, sin(phi) * 9.0, rr * 2.5)) * 0.55 + jNoise(vec3(cos(phi) * 30.0, sin(phi) * 30.0, rr * 6.0)) * 0.45;
  vec3 iris = mix(vec3(0.16, 0.085, 0.035), vec3(0.50, 0.32, 0.13), streak);
  iris = mix(iris, vec3(0.62, 0.45, 0.17), (1.0 - smoothstep(0.32, 0.5, rr)) * 0.55);  // golden collarette
  iris *= mix(1.0, 0.35, smoothstep(0.82, 1.0, rr));                                    // dark limbal ring
  vec3 sclera = vec3(0.94, 0.92, 0.88);
  sclera = mix(sclera, vec3(0.86, 0.62, 0.58), smoothstep(0.9, 1.9, th) * 0.45);        // warmer toward the back
  float vessel = smoothstep(0.72, 0.78, jNoise(vec3(phi * 6.0, th * 14.0, 3.0))) * smoothstep(0.7, 1.4, th);
  sclera = mix(sclera, vec3(0.75, 0.25, 0.25), vessel * 0.35);
  vec3 col = mix(sclera, iris, irisM);
  col = mix(col, vec3(0.008), pupilM);
  diffuseColor.rgb = col;
  roughnessFactor = mix(0.35, 0.2, irisM);
}
#endif
`
const FRAG_END = /* glsl */ `
#ifdef GLASS
{
  float fr = pow(clamp(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.2);
  gl_FragColor.a = clamp(gl_FragColor.a + fr * 0.55, 0.0, 1.0);
  gl_FragColor.rgb += fr * vec3(0.35, 0.42, 0.5) * 0.6;
}
#endif
#ifdef SSS
{ float g = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
  gl_FragColor.rgb += diffuseColor.rgb * vec3(1.0, 0.55, 0.45) * pow(g, 2.0) * SSS; }
#endif
if (uCap > 0.5 && !gl_FrontFacing) { gl_FragColor = vec4(uCapColor, 1.0); }
// guard the half-float HDR buffer: NaN/Inf from razor-sharp clearcoat lobes would smear through bloom
if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(diffuseColor.rgb * 0.4, diffuseColor.a);
// only intentional glow (emissive) may exceed the bloom threshold; lit highlights are capped below it
{ vec3 lit = max(gl_FragColor.rgb - totalEmissiveRadiance, vec3(0.0)); gl_FragColor.rgb = min(lit, vec3(1.6)) + min(totalEmissiveRadiance, vec3(8.0)); }
// selection: a soft luminous rim (Fresnel) rather than a flat flash
if (uGlow > 0.001) { float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
  gl_FragColor.rgb += uGlowColor * (rim * 2.6 + 0.3) * uGlow; }
#include <dithering_fragment>
`

export type Kind = 'bone' | 'muscle' | 'organ' | 'vessel' | 'brain' | 'skin' | 'tooth' | 'tissue' | 'eye' | 'fat'
export function kindOf(s: Structure): Kind {
  if (s.en === 'subcutaneous fat') return 'fat'
  if (s.group === 'skin') return 'skin'
  if (s.en === 'eyeball') return 'eye'
  if (s.group === 'skeleton') return /tooth/.test(s.en) ? 'tooth' : /cartilage|disk|disc|menisc/.test(s.en) || TENDON.test(s.en) ? 'tissue' : 'bone'
  if (s.group === 'muscles') return TENDON.test(s.en) && !/tensor fasciae/.test(s.en) ? 'tissue' : 'muscle'
  if (s.group === 'cardio') return /wall of heart|papillary|valve/.test(s.en) ? 'organ' : 'vessel'
  if (s.group === 'nervous') return 'brain'
  return 'organ'
}

export interface EyeInfo { a: THREE.Vector3; b: THREE.Vector3; r: number }
export function makeMaterial(s: Structure, eye?: EyeInfo): THREE.MeshPhysicalMaterial {
  const kind = kindOf(s)
  const color = new THREE.Color(baseColor(s))
  const m = new THREE.MeshPhysicalMaterial({ color, side: THREE.DoubleSide, clippingPlanes: [CLIP_PLANE] })
  const defines: Record<string, string> = {}
  switch (kind) {
    case 'bone':
      Object.assign(m, { roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#fff4dc'), sheenRoughness: 0.6 })
      defines.BONE = ''
      break
    case 'eye':
      Object.assign(m, { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0 })
      defines.EYE = ''
      break
    case 'tooth':
      Object.assign(m, { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 })
      break
    case 'tissue':
      Object.assign(m, { roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })
      break
    case 'muscle':
      Object.assign(m, { roughness: 0.48, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.5, sheenColor: new THREE.Color('#ff6a5a'), sheenRoughness: 0.4 })
      defines.FIBER = ''
      defines.SSS = '0.18'
      break
    case 'organ':
      Object.assign(m, { roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color('#ffd0c0') })
      defines.ORGANIC = ''
      defines.SSS = '0.25'
      break
    case 'vessel':
      Object.assign(m, { roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.18 })
      break
    case 'brain':
      Object.assign(m, { roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.4, sheenColor: new THREE.Color('#ffe0d8') })
      defines.ORGANIC = ''
      break
    case 'skin':
      Object.assign(m, { roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45, side: THREE.FrontSide, sheen: 0.8, sheenColor: new THREE.Color('#ff9f86'), sheenRoughness: 0.5 })
      defines.SKINPUSH = ''
      defines.SKIN = ''
      defines.GENMORPH = ''
      defines.SSS = '0.3'
      break
    case 'fat':
      Object.assign(m, { roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.22, sheen: 0.5, sheenColor: new THREE.Color('#fff0b0'), side: THREE.FrontSide })
      defines.FAT = ''
      defines.GENMORPH = ''
      defines.SKINPUSH = '' // sits 0.8 mm under the skin surface, above any muscle that bulges toward it
      defines.SSS = '0.35'
      break
  }
  m.defines = { ...(m.defines || {}), ...defines }
  // deeper layers and thin sheets (tendons, aponeuroses, cartilage) yield to the surface in front of them
  const off = ({ skin: 0, superficial: 0, deep: 1, organs: 2, bones: 3 } as Record<string, number>)[s.layer] + (kind === 'tissue' ? 1.5 : 0)
  if (off > 0) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: off * 0.5, polygonOffsetUnits: off * 2 })
  const own = { uGlow: { value: 0 }, uGlowColor: { value: new THREE.Color('#ffd9a0') } }
  const capColor = color.clone().multiplyScalar(kind === 'bone' || kind === 'tooth' ? 0.92 : 0.78)
  m.userData = { baseColor: color.clone(), kind, baseOpacity: m.opacity, transparentBase: m.transparent, u: own }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, SHARED, own, { uCapColor: { value: capColor }, uPush: { value: kind === 'skin' ? 0.0018 : kind === 'fat' ? 0.0022 : 0 },
      uEyeA: { value: eye?.a ?? new THREE.Vector3() }, uEyeB: { value: eye?.b ?? new THREE.Vector3() }, uEyeR: { value: eye?.r ?? 0.012 } })
    sh.vertexShader = VERT_HEAD + sh.vertexShader
      .replace('#include <begin_vertex>', VERT_BEGIN)
      .replace('#include <beginnormal_vertex>', NORMAL_BEGIN)
    sh.fragmentShader = FRAG_HEAD + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', FRAG_NORMAL)
      .replace('#include <dithering_fragment>', FRAG_END)
  }
  m.customProgramCacheKey = () => 'jasad-' + kind
  return m
}

// ---------------- X-ray (Fresnel glass) ----------------
export function makeXray(color = '#7fd8ff') {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        gl_FragColor = vec4(uColor * (0.04 + f * 0.9), (0.02 + f * 0.55) * uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
}
