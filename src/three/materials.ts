import * as THREE from 'three'
import type { Structure } from '../data'

// Uniforms shared by every body material (one JS object → one update per frame)
export const SHARED = {
  uTime: { value: 0 },
  uCap: { value: 0 }, // section mode: colour back faces as a solid cut surface
  uBend: { value: 0 }, // elbow flexion angle (rad) for the arm tour
  uPivot: { value: new THREE.Vector3() },
  uAxis: { value: new THREE.Vector3(1, 0, 0) },
}
export const CLIP_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1000)

// ---------------- colour palette (real tissue tones) ----------------
const ORGAN_COLORS: [RegExp, string][] = [
  [/liver/, '#7a2219'], [/gallbladder/, '#4d6b2a'], [/stomach/, '#c9776a'], [/esophagus/, '#c4776c'],
  [/duodenum|jejunum|ileum/, '#d9978a'], [/colon|appendix|rectum|taenia/, '#c88a76'], [/pancrea/, '#e2b27c'],
  [/spleen/, '#5c1a2b'], [/kidney/, '#7b2a22'], [/ureter|urethra/, '#d8b28a'], [/bladder/, '#d2a77e'],
  [/lung/, '#e09a98'], [/trachea|bronch|thyroid cartilage/, '#e6cbb8'], [/thymus/, '#e1b893'], [/adrenal/, '#d9a03c'],
  [/pituitary|pineal/, '#d88f7f'], [/eyeball/, '#f2efe8'], [/ear$/, '#e3a98f'], [/testis|epididymis|deferent|seminal|prostate|penis|glans|corpus/, '#c98a8a'],
  [/gingiva|labial/, '#d4776f'], [/diaphragm/, '#9a2a26'],
]
const VEIN = /vein|vena|sinus/
function baseColor(s: Structure): string {
  const n = s.en
  if (s.group === 'skin') return '#d9a089'
  if (s.group === 'skeleton') {
    if (/tooth/.test(n)) return '#f4efe2'
    if (/cartilage|disk/.test(n)) return '#cfe0dc'
    if (/ligament|tract|membrane|retinaculum|linea alba|tendon|tendinous/.test(n)) return '#d9d2c0'
    return '#e8dcc2'
  }
  if (s.group === 'muscles') {
    if (/tendon|aponeurosis|linea|retinaculum/.test(n)) return '#ddd3c0'
    return '#9b1f22'
  }
  if (s.group === 'cardio') {
    if (/pulmonary artery/.test(n)) return '#3550c8'
    if (/pulmonary vein/.test(n)) return '#c4121f'
    if (/wall of heart|papillary|valve/.test(n)) return '#8f1d1f'
    return VEIN.test(n) ? '#2a45b8' : '#c4121f'
  }
  if (s.group === 'nervous') {
    if (/optic nerve|optic tract|chiasm/.test(n)) return '#f0d78c'
    if (/ventricle|aqueduct|canal|foramen/.test(n)) return '#7fc6ff'
    if (/choroid/.test(n)) return '#c45a6a'
    if (/white matter|callosum|capsule|fornix|commissure/.test(n)) return '#f1e6dc'
    return '#e1b0a6'
  }
  for (const [re, c] of ORGAN_COLORS) if (re.test(n)) return c
  return '#d49a8a'
}

// ---------------- shader patches ----------------
const VERT_HEAD = /* glsl */ `
uniform float uTime; uniform float uBend; uniform vec3 uPivot; uniform vec3 uAxis; uniform float uPush;
attribute vec2 armw; attribute vec3 fdir;
varying vec3 vObj; varying vec3 vFdir;
vec3 rotAxis(vec3 v, vec3 a, float ang){ float c=cos(ang), s=sin(ang); return v*c + cross(a,v)*s + a*dot(a,v)*(1.0-c); }
`
const VERT_BEGIN = /* glsl */ `
vec3 transformed = vec3( position );
vObj = position; vFdir = fdir;
#ifdef SKINPUSH
transformed += normal * uPush;
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
#endif
`
const FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
#ifdef FIBER
float fh = fiberH(vObj, normalize(vFdir + vec3(1e-4)));
normal = jPerturb( -vViewPosition, normal, vec2( dFdx(fh), dFdy(fh) ) * 0.35, faceDirection );
diffuseColor.rgb *= 0.82 + 0.26 * fh;
#endif
#ifdef ORGANIC
float on = jNoise(vObj * 220.0) * 0.6 + jNoise(vObj * 600.0) * 0.4;
normal = jPerturb( -vViewPosition, normal, vec2( dFdx(on), dFdy(on) ) * 0.35, faceDirection );
diffuseColor.rgb *= 0.9 + 0.2 * on;
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
if (uCap > 0.5 && !gl_FrontFacing) { gl_FragColor = vec4(uCapColor, 1.0); }
// guard the half-float HDR buffer: NaN/Inf from razor-sharp clearcoat lobes would smear through bloom
if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(diffuseColor.rgb * 0.4, diffuseColor.a);
gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(24.0));
#include <dithering_fragment>
`

export type Kind = 'bone' | 'muscle' | 'organ' | 'vessel' | 'brain' | 'skin' | 'tooth' | 'tissue'
export function kindOf(s: Structure): Kind {
  if (s.group === 'skin') return 'skin'
  if (s.group === 'skeleton') return /tooth/.test(s.en) ? 'tooth' : /cartilage|disk|ligament|tract|membrane|retinaculum|linea|tendon/.test(s.en) ? 'tissue' : 'bone'
  if (s.group === 'muscles') return /tendon|aponeurosis|linea|retinaculum/.test(s.en) ? 'tissue' : 'muscle'
  if (s.group === 'cardio') return /wall of heart|papillary|valve/.test(s.en) ? 'organ' : 'vessel'
  if (s.group === 'nervous') return 'brain'
  return 'organ'
}

export function makeMaterial(s: Structure): THREE.MeshPhysicalMaterial {
  const kind = kindOf(s)
  const color = new THREE.Color(baseColor(s))
  const m = new THREE.MeshPhysicalMaterial({ color, side: THREE.DoubleSide, clippingPlanes: [CLIP_PLANE] })
  const defines: Record<string, string> = {}
  switch (kind) {
    case 'bone':
      Object.assign(m, { roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#fff4dc'), sheenRoughness: 0.6 })
      defines.ORGANIC = ''
      break
    case 'tooth':
      Object.assign(m, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 })
      break
    case 'tissue':
      Object.assign(m, { roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })
      break
    case 'muscle':
      Object.assign(m, { roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.22, sheen: 0.5, sheenColor: new THREE.Color('#ff6a5a'), sheenRoughness: 0.4 })
      defines.FIBER = ''
      break
    case 'organ':
      Object.assign(m, { roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: new THREE.Color('#ffd0c0') })
      defines.ORGANIC = ''
      break
    case 'vessel':
      Object.assign(m, { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })
      break
    case 'brain':
      Object.assign(m, { roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color('#ffe0d8') })
      defines.ORGANIC = ''
      break
    case 'skin':
      Object.assign(m, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.FrontSide, sheen: 0.5, sheenColor: new THREE.Color('#ffd9c8') })
      defines.GLASS = ''
      defines.SKINPUSH = ''
      break
  }
  m.defines = { ...(m.defines || {}), ...defines }
  const capColor = color.clone().lerp(new THREE.Color('#ffffff'), 0.15).multiplyScalar(1.1)
  m.userData = { baseColor: color.clone(), kind, baseOpacity: m.opacity, transparentBase: m.transparent }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, SHARED, { uCapColor: { value: capColor }, uPush: { value: kind === 'skin' ? 0.0018 : 0 } })
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
