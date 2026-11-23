// Split-tone grade after tone mapping: cool navy shadows, warm highlights, a gentle S-curve — the atlas-plate palette.
import { Effect } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'

const FRAG = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 cool = vec3(0.9, 0.97, 1.12), warm = vec3(1.07, 1.0, 0.9);
  c *= mix(vec3(1.0), cool, (1.0 - smoothstep(0.0, 0.45, l)) * 0.55);
  c *= mix(vec3(1.0), warm, smoothstep(0.35, 0.9, l) * 0.6);
  vec3 s = c * c * (3.0 - 2.0 * c);                 // contrast
  c = mix(c, s, 0.22);
  float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(g), c, 1.06);                        // a touch more saturation
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}`
class GradeEffect extends Effect {
  constructor() { super('GradeEffect', FRAG) }
}
export const Grade = wrapEffect(GradeEffect)
