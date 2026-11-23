// Quiet ambience synthesised in WebAudio (no audio files): a slow evolving pad + a soft 72 bpm heartbeat.
// Browsers only allow sound after a user gesture, so it starts on the first tap/click.
let ctx: AudioContext | null = null
let master: GainNode | null = null
let beatTimer = 0
let wanted = true
let beating = true

function start() {
  if (ctx || !wanted) return
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 4)
  // pad: A2 / E3 / A3 through a breathing low-pass
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.045
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 260
  lfo.connect(lfoGain).connect(lp.frequency); lfo.start()
  const pad = ctx.createGain(); pad.gain.value = 0.03
  for (const [f, type, g] of [[110, 'sine', 1], [164.8, 'sine', 0.7], [220.6, 'triangle', 0.25], [329.2, 'sine', 0.12]] as const) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8
    const og = ctx.createGain(); og.gain.value = g
    o.connect(og).connect(lp); o.start()
  }
  lp.connect(pad).connect(master)
  // heartbeat: lub-dub every 60/72 s
  const thump = (t: number, gain: number, f: number) => {
    const o = ctx!.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.12)
    const g = ctx!.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g).connect(master!); o.start(t); o.stop(t + 0.2)
  }
  let next = ctx.currentTime + 0.3
  beatTimer = window.setInterval(() => {
    if (!ctx) return
    while (next < ctx.currentTime + 0.5) {
      if (beating) { thump(next, 0.09, 62); thump(next + 0.24, 0.06, 55) }
      next += 60 / 72
    }
  }, 120)
}

export function initAudio() {
  const go = () => { start(); window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
  window.addEventListener('pointerdown', go)
  window.addEventListener('keydown', go)
}
export function setSound(on: boolean) {
  wanted = on
  if (on && !ctx) { start(); return }
  if (ctx && master) master.gain.linearRampToValueAtTime(on ? 1 : 0, ctx.currentTime + 0.4)
}
export function setHeartbeat(on: boolean) { beating = on }
export function stopAudio() { clearInterval(beatTimer); ctx?.close(); ctx = null }
