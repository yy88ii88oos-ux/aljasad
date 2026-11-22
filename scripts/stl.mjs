import fs from 'node:fs';
// Binary (or ASCII) STL reader -> {positions: Float32Array (non-indexed), triCount}
export function readSTL(file) {
  const buf = fs.readFileSync(file);
  const n = buf.readUInt32LE(80);
  if (84 + n * 50 === buf.length) {
    const pos = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) pos[i * 9 + k] = buf.readFloatLE(o + k * 4);
    }
    return pos;
  }
  const txt = buf.toString('latin1');
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const out = []; let m;
  while ((m = re.exec(txt))) out.push(+m[1], +m[2], +m[3]);
  return new Float32Array(out);
}
