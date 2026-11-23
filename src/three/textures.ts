// Tissue textures (public/tex): detail albedo (×2 multiplier around the palette colour) + tangent normal map.
// Materials bind these uniform slots at once; they hold neutral 1×1 textures until the real ones stream in.
import * as THREE from 'three'
import { lightModels, isMobile } from '../data'

export type TexName = 'muscle' | 'bone' | 'skin' | 'liver' | 'brain' | 'lung' | 'cartilage' | 'fat'
// skin first: it is what a phone shows before any layer is peeled
const NAMES: TexName[] = ['skin', 'fat', 'muscle', 'bone', 'liver', 'brain', 'lung', 'cartilage']
// phones: no normal maps (the shaders are compiled without them) and no image larger than 1024 px
export const NO_NORMALS = isMobile
const MAX_PX = isMobile ? 1024 : 4096

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
    const img = t.image as HTMLImageElement
    if (img && Math.max(img.width, img.height) > MAX_PX) {
      const k = MAX_PX / Math.max(img.width, img.height), c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      t.image = c
    }
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.NoColorSpace // data: a multiplier and a normal, not display colours
    t.anisotropy = aniso
    return t
  }
  // one at a time so the first frames after loading stay smooth on phones
  let chain = Promise.resolve()
  for (const n of NAMES) {
    chain = chain.then(() => Promise.all([
      loader.loadAsync(base + n + sfx + '.webp'), NO_NORMALS ? null : loader.loadAsync(base + n + '_n' + sfx + '.webp'),
    ]).then(([a, b]) => { TEX[n].alb.value = prep(a); if (b) TEX[n].nrm.value = prep(b) }).catch((e) => console.warn('texture', n, e)))
  }
  chain.then(() => loader.loadAsync(base + 'iris' + sfx + '.webp')).then((t) => {
    prep(t); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace
    IRIS.value = t; IRIS_ON.value = 1
  }).catch(() => {})
}
