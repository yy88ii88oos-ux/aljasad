// Tissue textures (public/tex): detail albedo (×2 multiplier around the palette colour) + tangent normal map.
// Materials bind these uniform slots at once; they hold neutral 1×1 textures until the real ones stream in.
import * as THREE from 'three'
import { lightModels } from '../data'

export type TexName = 'muscle' | 'bone' | 'skin' | 'liver' | 'brain' | 'lung' | 'cartilage' | 'fat'
const NAMES: TexName[] = ['muscle', 'bone', 'skin', 'liver', 'brain', 'lung', 'cartilage', 'fat']

const neutral = (r: number, g: number, b: number) => {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1)
  t.needsUpdate = true
  return t
}
const GREY = neutral(128, 128, 128), FLAT = neutral(128, 128, 255), CLEAR = neutral(0, 0, 0)

export const TEX: Record<TexName, { alb: { value: THREE.Texture }; nrm: { value: THREE.Texture } }> = Object.fromEntries(
  NAMES.map((n) => [n, { alb: { value: GREY }, nrm: { value: FLAT } }]),
) as never
export const IRIS = { value: CLEAR as THREE.Texture }, IRIS_ON = { value: 0 }

let started = false
export function loadTextures(renderer?: THREE.WebGLRenderer) {
  if (started) return
  started = true
  const base = import.meta.env.BASE_URL + 'tex/'
  const sfx = lightModels ? '.m' : ''
  const loader = new THREE.TextureLoader()
  const aniso = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 4)
  const prep = (t: THREE.Texture) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.NoColorSpace // data: a multiplier and a normal, not display colours
    t.anisotropy = aniso
    return t
  }
  // one at a time so the first frames after loading stay smooth on phones
  let chain = Promise.resolve()
  for (const n of NAMES) {
    chain = chain.then(() => Promise.all([
      loader.loadAsync(base + n + sfx + '.webp'), loader.loadAsync(base + n + '_n' + sfx + '.webp'),
    ]).then(([a, b]) => { TEX[n].alb.value = prep(a); TEX[n].nrm.value = prep(b) }).catch((e) => console.warn('texture', n, e)))
  }
  chain.then(() => loader.loadAsync(base + 'iris' + sfx + '.webp')).then((t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso
    IRIS.value = t; IRIS_ON.value = 1
  }).catch(() => {})
}
