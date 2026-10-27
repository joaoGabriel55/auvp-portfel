// Turns out/timeline.json + frames into out/portfel-promo.mp4 with a synthesized soundtrack and PT/EN subtitle tracks.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import ffmpeg from 'ffmpeg-static'

const { frames, end, subs, clicks } = JSON.parse(readFileSync('out/timeline.json', 'utf8'))
const at = en => subs.find(s => s.en.startsWith(en)).start

// ---- frames -> concat list (each frame lasts until the next one arrived)
const list = frames.map((f, i) => `file 'frames/${basename(f.file)}'\nduration ${((frames[i + 1]?.t ?? end) - (i ? f.t : 0)).toFixed(4)}`)
writeFileSync('out/frames.txt', `${list.join('\n')}\nfile 'frames/${basename(frames.at(-1).file)}'\n`)

// ---- subtitles
const ts = s => new Date(Math.max(0, s) * 1000).toISOString().slice(11, 23).replace('.', ',')
const srt = key => subs.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end ?? end)}\n${s[key]}\n`).join('\n')
writeFileSync('out/portfel_pt_BR.srt', srt('pt'))
writeFileSync('out/portfel_en_US.srt', srt('en'))

// ---- soundtrack: 100 bpm, Am9 · Fmaj9 · C · G pad, plucked arpeggio, soft kick/hat while the app is on screen
const SR = 44100, N = Math.ceil((end + 0.5) * SR), L = new Float32Array(N), R = new Float32Array(N)
const beat = 0.6, bar = 4 * beat
const hz = m => 440 * 2 ** ((m - 69) / 12)
const CHORDS = [[45, 60, 64, 67, 71], [41, 57, 60, 64, 67], [48, 64, 67, 71, 74], [43, 59, 62, 67, 69]]
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan) } }
let seed = 7
const noise = () => ((seed = (seed * 16807) % 2147483647) / 1073741823.5) - 1

for (let c = 0, s = 0; s < end; c++, s += 2 * bar) {
  const notes = CHORDS[c % 4], len = 2 * bar
  notes.forEach((m, k) => {
    const f = hz(m), amp = k ? 0.022 : 0.05, pan = k ? (k % 2 ? -0.35 : 0.35) : 0
    for (let t = 0; t < len + 2.5; t += 1 / SR) {
      const env = Math.min(1, t / 0.9) * (t > len ? Math.exp(-(t - len) / 0.6) : 1)
      let v = 0
      for (const d of [-0.12, 0.12]) for (let h = 1; h <= 4; h++) v += Math.sin(2 * Math.PI * f * h * (1 + d / 100) * t) / (h * h)
      add(Math.round((s + t) * SR), amp * env * v, pan)
    }
  })
  // arpeggio: eighth notes over the chord, one octave up
  for (let e = 0; e < 16; e++) {
    const m = notes[1 + ((e * 3) % 4)] + 12, f = hz(m), t0 = s + e * beat / 2
    if (t0 > end - 3) break
    for (let t = 0; t < 0.9; t += 1 / SR) {
      const v = 0.035 * Math.exp(-t / 0.22) * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t))
      add(Math.round((t0 + t) * SR), v, e % 2 ? 0.5 : -0.5)
      // ping-pong echo
      add(Math.round((t0 + t + 0.45) * SR), v * 0.35, e % 2 ? -0.6 : 0.6)
      add(Math.round((t0 + t + 0.9) * SR), v * 0.15, e % 2 ? 0.6 : -0.6)
    }
  }
}
// rhythm only while the app is on screen
const drumsFrom = at('Connect'), drumsTo = at('A volunteer')
for (let b = Math.ceil(drumsFrom / beat); b * beat < drumsTo; b++) {
  const t0 = b * beat, fade = Math.min(1, (t0 - drumsFrom) / 2, (drumsTo - t0) / 2)
  if (b % 2 === 0) for (let t = 0, ph = 0; t < 0.35; t += 1 / SR) {
    ph += 2 * Math.PI * (45 + 75 * Math.exp(-t / 0.04)) / SR
    add(Math.round((t0 + t) * SR), 0.22 * fade * Math.exp(-t / 0.12) * Math.sin(ph))
  }
  let prev = 0
  for (let t = 0; t < 0.04; t += 1 / SR) { const n = noise(), v = n - prev; prev = n; add(Math.round((t0 + beat / 2 + t) * SR), 0.025 * fade * v * Math.exp(-t / 0.012), 0.2) }
}
// UI clicks
for (const c of clicks) for (let t = 0; t < 0.03; t += 1 / SR) add(Math.round((c + t) * SR), 0.05 * Math.exp(-t / 0.006) * Math.sin(2 * Math.PI * 1800 * t))

const wav = Buffer.alloc(44 + N * 4)
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28)
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const g = Math.min(1, i / SR / 1.5, (N / SR - i / SR) / 3)
  wav.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32000), 44 + i * 4)
  wav.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32000), 46 + i * 4)
}
writeFileSync('out/music.wav', wav)

// ---- encode
execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', 'out/frames.txt', '-i', 'out/music.wav',
  '-i', 'out/portfel_pt_BR.srt', '-i', 'out/portfel_en_US.srt',
  '-map', '0:v', '-map', '1:a', '-map', '2', '-map', '3',
  '-vf', `fps=30,fade=in:st=0:d=0.6,fade=out:st=${(end - 1).toFixed(2)}:d=1,format=yuv420p`,
  '-af', 'aecho=0.8:0.6:70|110:0.18|0.12,loudnorm=I=-16:TP=-1.5',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-c:s', 'mov_text', '-metadata:s:s:0', 'language=por', '-metadata:s:s:1', 'language=eng',
  '-t', end.toFixed(2), '-movflags', '+faststart', 'out/portfel-promo.mp4'], { stdio: 'inherit' })
console.log(`out/portfel-promo.mp4 · ${end.toFixed(1)}s · ${subs.length} subtitles`)
