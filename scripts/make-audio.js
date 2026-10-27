/* v2 音轨生成器 · 节奏强化版
 * 相较上一版的核心变化：
 *   1. 补上军鼓（2、4 拍）做节奏骨架，之前只有底鼓所以听着"软"
 *   2. hi-hat 从八分改十六分，并做三层轻重音，制造律动颗粒
 *   3. 底鼓改成切分 pattern（0 / 1.5 / 2.75 拍），不再是死板的四平八稳
 *   4. 和弦从长音 pad 换成 FM 电钢（Rhodes 味），带切分重音，节奏清晰
 *   5. 贝斯跟着切分走，并加 sidechain ducking，让整轨有"泵感"
 *   6. 14 小节分成 intro / build / groove / break / drop 五段，有起伏
 *   7. 关键位置加 fill（军鼓滚奏），推着段落往前走
 */
const fs = require('fs');

const SFX_ONLY = process.env.SFX_ONLY === '1';   // 只有音效、无 BGM，用于对齐校验
const BGM_ONLY = process.env.BGM_ONLY === '1';
const VO_ONLY  = process.env.VO_ONLY === '1';   // 只导出配音轨，用于对齐校验   // 只有 BGM，用于量音效信噪比
const SR = 44100;
const path = require('path');
const ARGS = process.argv.slice(2);
const ai = ARGS.indexOf('--dir');
const DIR = ai >= 0 ? path.resolve(ARGS[ai + 1]) : process.cwd();
const TL = require(path.join(DIR, 'timeline.json'));
const SCENE = TL.anim;
const SCENES = TL.scenes.length;
const ST = TL.scenes.map(function (x) { return x.start; });
const DUR = TL.total;
const N = Math.ceil(SR * DUR);

const L = new Float32Array(N);
const R = new Float32Array(N);
/* 音效单独一条总线，最后才与 BGM 合并 —— 这样能对 BGM 做"让位"（音效 ducking），
 * 否则 thud 会跟底鼓撞在同一个频段上，听起来像"音效没响"或"慢了半拍" */
const S_L = new Float32Array(N);
const S_R = new Float32Array(N);
let TARGET = null;

const addStereo = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  const a = (pan + 1) * Math.PI / 4;
  const l = v * Math.cos(a), r = v * Math.sin(a);
  if (TARGET) { TARGET[0][i] += l; TARGET[1][i] += r; }
  else { L[i] += l; R[i] += r; }
};

/* ================= 乐器 ================= */

/* FM 电钢：音头亮、尾巴暖，比正弦 pad 有节奏颗粒 */
function rhodes(freq, t0, dur, gain, pan) {
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(t0 * SR);
  const w = 2 * Math.PI * freq;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const idx = 2.7 * Math.exp(-t * 10);        // FM 指数快速衰减
    const mod = Math.sin(w * 2 * t) * idx;
    const v = Math.sin(w * t + mod);
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 2.9);
    addStereo(i0 + k, v * env * gain, pan);
  }
}

function pad(freq, t0, dur, gain, pan, duckFn) {
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(t0 * SR);
  const w1 = 2 * Math.PI * freq;
  const w2 = 2 * Math.PI * freq * 1.0018;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.4) * Math.min(1, Math.max(0, (dur - t) / 1.0));
    const d = duckFn ? duckFn(t) : 1;
    const v = Math.sin(w1 * t) * 0.5 + Math.sin(w2 * t) * 0.42 + Math.sin(w1 * 2 * t) * 0.1;
    addStereo(i0 + k, v * env * gain * d, pan);
  }
}

function bassTone(freq, t0, dur, gain, duckFn) {
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(t0 * SR);
  const w = 2 * Math.PI * freq;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const d = duckFn ? duckFn(t) : 1;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 3.2) * Math.min(1, Math.max(0, (dur - t) / 0.06));
    const v = Math.sin(w * t) * 1.0 + 0.26 * Math.sin(2 * w * t) + 0.10 * Math.sin(3 * w * t);
    addStereo(i0 + k, Math.tanh(v * 1.25) * env * gain * d, 0);
  }
}

function kick(t0, gain) {
  const n = Math.floor(0.30 * SR);
  const i0 = Math.floor(t0 * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const f = 46 + 118 * Math.exp(-t * 34);
    ph += 2 * Math.PI * f / SR;
    const env = Math.exp(-t * 13);
    const click = Math.exp(-t * 180) * 0.35;
    addStereo(i0 + k, (Math.sin(ph) + click * (Math.random() * 2 - 1)) * env * gain, 0);
  }
}

function snare(t0, gain, pan = 0.06) {
  const n = Math.floor(0.18 * SR);
  const i0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = Math.random() * 2 - 1;
    lp += (x - lp) * 0.52;
    const noise = x - lp * 0.86;
    const envN = Math.exp(-t * 24);
    const body = Math.sin(2 * Math.PI * 188 * t) * Math.exp(-t * 42) * 0.55;
    addStereo(i0 + k, (noise * 0.82 + body) * envN * gain, pan);
  }
}

function hat(t0, gain, pan = 0.32, decay = 72) {
  const n = Math.floor(0.07 * SR);
  const i0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = Math.random() * 2 - 1;
    lp += (x - lp) * 0.74;
    const v = x - lp * 0.94;
    addStereo(i0 + k, v * Math.exp(-t * decay) * gain, pan);
  }
}

function shaker(t0, gain, pan = -0.34) {
  const n = Math.floor(0.045 * SR);
  const i0 = Math.floor(t0 * SR);
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const x = Math.random() * 2 - 1;
    lp += (x - lp) * 0.62;
    const v = x - lp * 0.9;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 95);
    addStereo(i0 + k, v * env * gain, pan);
  }
}

/* 音效用到的通用件 */
function noiseSweep(t0, dur, gain, f0, f1, q, pan) {
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(t0 * SR);
  let lp1 = 0, bp = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const p = t / dur;
    const fc = f0 * Math.pow(f1 / f0, p);
    const a = 1 - Math.exp(-2 * Math.PI * fc / SR);
    const x = Math.random() * 2 - 1;
    lp1 += a * (x - lp1);
    bp += a * (lp1 - bp);
    const v = (lp1 - bp) * 3.2;
    const env = Math.min(1, p / 0.25) * Math.pow(1 - p, 1.4);
    addStereo(i0 + k, v * env * gain, pan);
  }
}

function tone(type, t0, dur, gain, f0, f1, pan = 0) {
  const n = Math.floor(dur * SR);
  const i0 = Math.floor(t0 * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR, p = t / dur;
    const f = f0 * Math.pow(f1 / f0, p);
    ph += 2 * Math.PI * f / SR;
    let v;
    if (type === 'sine') v = Math.sin(ph);
    else if (type === 'tri') v = 2 * Math.abs(((ph / (2 * Math.PI)) % 1) * 2 - 1) - 1;
    else v = Math.sin(ph) * 0.7 + Math.sin(2 * ph) * 0.2;
    addStereo(i0 + k, v * Math.exp(-t * (3.2 / dur)) * gain, pan);
  }
}

/* ================= 编曲 ================= */
const CHORDS = [
  [130.81, 164.81, 196.00, 246.94],  // Cmaj7
  [196.00, 246.94, 293.66, 329.63],  // G6
  [220.00, 261.63, 329.63, 392.00],  // Am7
  [174.61, 220.00, 261.63, 329.63],  // Fmaj7
];
const ROOTS = [65.41, 98.00, 110.00, 87.31];

const BAR = 2.6;
const BEAT = BAR / 4;              // 0.65s
const BARS = Math.ceil(DUR / BAR); // 14

/* 切分节奏（单位：拍） */
const KICKS  = [0, 1.5, 2.75];
const SNARES = [1, 3];
const BASS   = [[0, 0.52, 1.00], [1.5, 0.26, 0.72], [2.25, 0.22, 0.60], [2.75, 0.20, 0.50]];
const CHORD  = [[0, 1.10, 1.00], [1.625, 0.40, 0.56], [2.25, 0.34, 0.46], [3.25, 0.30, 0.38]];

/* sidechain：底鼓一响，pad/bass 让路，产生泵感 */
function duck(barPos) {
  let d = 999;
  for (const kp of KICKS) {
    const kt = kp * BEAT;
    if (barPos >= kt) d = Math.min(d, barPos - kt);
  }
  const win = 0.34;
  if (d > win) return 1;
  return 0.46 + 0.54 * (d / win);
}

function sectionOf(b) {
  if (b < 1)  return 'intro';    // 只有 1 小节引入，第 2 小节就上鼓，避免开头闷
  if (b < 3)  return 'build';
  if (b < 10) return 'groove';
  if (b < 12) return 'break';
  return 'drop';
}

if (!SFX_ONLY) for (let b = 0; b < BARS; b++) {   // 校验模式跳过整段 BGM
  const t0 = b * BAR;
  const ci = b % 4;
  const sec = sectionOf(b);
  const last = b === BARS - 1;

  const dk = (barPos) => duck(barPos);

  /* --- 电钢（全程都有，节奏主角） --- */
  CHORD.forEach(([at, dur, g], hi) => {
    // intro 只弹轻的两下，别一上来就满
    if (sec === 'intro' && hi > 1) return;
    CHORDS[ci].forEach((f, k) => {
      rhodes(f, t0 + at * BEAT, dur, g * 0.055, (k - 1.5) * 0.30);
      rhodes(f * 2, t0 + at * BEAT, dur * 0.5, g * 0.012, (k - 1.5) * 0.30);
    });
  });

  /* --- 贝斯 --- */
  BASS.forEach(([at, dur, g]) => {
    if (sec === 'intro' && at > 0) return;
    bassTone(ROOTS[ci], t0 + at * BEAT, dur, g * 0.30, dk);
  });

  /* --- 铺底 pad（只在有鼓的段落出现，音量很轻） --- */
  if (sec === 'groove' || sec === 'drop' || sec === 'break') {
    CHORDS[ci].forEach((f, k) => {
      pad(f, t0, BAR + 0.3, 0.042, (k - 1.5) * 0.32, dk);
    });
  }

  /* --- 鼓组 --- */
  if (sec === 'intro') {
    for (let h = 0; h < 8; h++) hat(t0 + h * BEAT / 2, h % 2 ? 0.016 : 0.028);
  } else if (sec === 'build') {
    KICKS.forEach(kp => kick(t0 + kp * BEAT, 0.30));
    for (let h = 0; h < 16; h++) hat(t0 + h * BEAT / 4, h % 4 === 0 ? 0.042 : h % 2 === 0 ? 0.026 : 0.015);
    SNARES.forEach(sp => snare(t0 + sp * BEAT, 0.10));
  } else if (sec === 'groove' || sec === 'drop') {
    KICKS.forEach(kp => kick(t0 + kp * BEAT, sec === 'drop' ? 0.36 : 0.32));
    SNARES.forEach(sp => snare(t0 + sp * BEAT, sec === 'drop' ? 0.17 : 0.145));
    for (let h = 0; h < 16; h++) {
      hat(t0 + h * BEAT / 4,
        h % 4 === 0 ? 0.050 : h % 2 === 0 ? 0.030 : 0.017);
    }
    for (let h = 0; h < 8; h++) shaker(t0 + h * BEAT / 2 + BEAT / 4, h % 2 ? 0.018 : 0.024);
  } else { /* break：抽掉底鼓和军鼓，只留气声与沙锤，形成呼吸口 */
    for (let h = 0; h < 16; h++) hat(t0 + h * BEAT / 4, h % 4 === 0 ? 0.026 : 0.012);
    for (let h = 0; h < 8; h++) shaker(t0 + h * BEAT / 2, 0.020);
  }

  /* --- fill：段落交界处推一下 --- */
  if (b === 2 || b === 9 || last) {
    for (let f = 0; f < 4; f++) {
      snare(t0 + BAR - BEAT + f * (BEAT / 4), 0.055 + f * 0.018);
    }
  }
}

/* ================= 音效（时间点与动画严格对齐） ================= */
/* 撞击：0.20s 收干，避免长尾盖住 0.18s 后的释义 pop（inject 场景两者只差 180ms） */
function thud(t0, g = 0.34) { tone('sine', t0, 0.20, g, 150, 46); noiseSweep(t0, 0.12, g * 0.35, 900, 260, 1, 0); }
function tick(t0, g = 0.28) { noiseSweep(t0, 0.075, g, 2600, 4200, 1, 0.15); tone('tri', t0, 0.07, g * 0.4, 1700, 900); }
function whoosh(t0, g = 0.21) { noiseSweep(t0, 0.46, g, 420, 2800, 1, -0.1); }
function riser(t0, g = 0.15) { noiseSweep(t0, 0.80, g, 260, 2400, 1, 0.1); tone('sine', t0, 0.80, g * 0.5, 88, 210); }
function thoom(t0, g = 0.32) { tone('sine', t0, 0.44, g, 96, 40); noiseSweep(t0, 0.36, g * 0.3, 520, 130, 1, 0); }
function pop(t0, g = 0.16) { tone('sine', t0, 0.12, g, 620, 1180); }
function swish(t0, g = 0.055) { noiseSweep(t0, 0.58, g, 1000, 240, 1, -0.2); }
/* 蓄力：短促上扬 + 低频托底。第 2 参数是时长（蓄力越久数值越大） */
function charge(t0, dur = 0.32, g = 0.12) {
  noiseSweep(t0, dur, g, 320, 1500, 1, 0.15);
  tone('sine', t0, dur, g * 0.45, 70, 152);
}

/* ================= 音效时间表 =================
 * 每个时刻都直接取自 index-v3.html 里该场景 dot()/fx() 的关键分支点，
 * 绝对时刻 = 场景序号 × 5.2 + at。视频 OFFSET = 0，所以音轨与画面同刻起跑。
 *   0.05  swish  点从上场位置飞到本场起始位
 *   charge       蓄力（ject 回缩 / eject 杯底压 / subject 横线下压）
 *   whoosh       高速位移段开始（甩出 / 急坠 / 冲墙 / 弹出 / 抛出）
 *   thud         硬着陆（落地 / 触底 / 撞墙）
 *   thoom        重物到位（横线砸实 / 物体冲到面前）
 *   riser        由远及近的逼近感（object 放大段）
 *   tick         轻触（备用）
 *   pop          中文释义淡入（固定 1.60，与文字动画一致）
 */
const CUES = require(path.join(DIR, 'design.json')).cues;
const SFX = { swish, thud, tick, whoosh, riser, thoom, pop, charge };
TARGET = [S_L, S_R];                     // 之后的音效只进音效总线
if (!BGM_ONLY) for (let i = 0; i < SCENES; i++) {
  CUES[i].forEach(([at, kind, arg]) => SFX[kind](ST[i] + at, arg));
}
TARGET = null;
/* 导出时间表给 verify-sync.js 用，避免两处各写一份 */
fs.writeFileSync(path.join(DIR, 'cues.json'),
  JSON.stringify({ SCENE, SCENES, ST, CUES }, null, 1));


/* ================= 配音轨（整词，每场 4.42s 处插入） ================= */
const VOICE = process.env.VOICE === 'm' ? 'm' : 'f';
const V_L = new Float32Array(N), V_R = new Float32Array(N);
const VENV = new Float32Array(N);

function readWav16(p) {
  const b = fs.readFileSync(p);
  let o = 12, d = null, ch = 1;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === 'fmt ') ch = b.readUInt16LE(o + 10);
    else if (id === 'data') { d = b.slice(o + 8, o + 8 + sz); break; }
    o += 8 + sz + (sz % 2);
  }
  const n = Math.floor(d.length / 2 / ch), a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = d.readInt16LE(i * 2 * ch) / 32768;
  return a;
}

if (!SFX_ONLY && !BGM_ONLY) {
  TL.scenes.forEach(function (sc) {
    /* 优先找不带音色后缀的（tts.py 默认输出），兼容旧的 w_<word>_<voice>.wav */
    let p = path.join(DIR, '_vo', 'w_' + sc.word + '.wav');
    if (!fs.existsSync(p)) p = path.join(DIR, '_vo', 'w_' + sc.word + '_' + VOICE + '.wav');
    if (!fs.existsSync(p)) { console.log('!! 缺配音', p); return; }
    const w = readWav16(p);
    let sum = 0;
    for (let k = 0; k < w.length; k++) sum += w[k] * w[k];
    const rms = Math.sqrt(sum / w.length) || 1e-9;
    const g = Math.pow(10, -20 / 20) / rms;
    const s0 = Math.round(sc.voAt * SR);
    for (let k = 0; k < w.length && s0 + k < N; k++) {
      const v = w[k] * g;
      V_L[s0 + k] += v; V_R[s0 + k] += v;
    }
    /* 人声期间让路：BGM 压到 48%，音效压到 70% */
    const e1 = Math.min(N, s0 + w.length);
    const att = Math.round(0.012 * SR), rel = Math.round(0.10 * SR);
    for (let k = s0; k < e1; k++) {
      let a = 1;
      if (k - s0 < att) a = (k - s0) / att;
      if (e1 - k < rel) a = Math.min(a, (e1 - k) / rel);
      if (a > VENV[k]) VENV[k] = a;
    }
  });
}

/* ================= 后处理 ================= */
function lowpass(buf, fc, q = 0.707) {
  const w = 2 * Math.PI * fc / SR;
  const alpha = Math.sin(w) / (2 * q);
  const cosw = Math.cos(w);
  const b0 = (1 - cosw) / 2, b1 = 1 - cosw, b2 = (1 - cosw) / 2;
  const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; buf[i] = y;
  }
}
lowpass(L, 6800); lowpass(R, 6800);

/* 音效 let-way：撞击/重物/蓄力/释义出现时，BGM 立刻压到 55%，70ms 内回升。
 * 只在"要听见的那一下"起作用，整体律动不变，但冲击点会明显跳出来。 */
const DUCK = new Float32Array(N).fill(1);
CUES.forEach((list, i) => list.forEach(([at, kind]) => {
  if (!['thud', 'thoom', 'pop', 'charge'].includes(kind)) return;
  const s = Math.floor((ST[i] + at) * SR), len = Math.floor(0.22 * SR);
  for (let k = 0; k < len && s + k < N; k++) {
    const d = 0.55 + 0.45 * Math.min(1, (k / SR) / 0.07);
    if (d < DUCK[s + k]) DUCK[s + k] = d;
  }
}));
for (let i = 0; i < N; i++) {
  const v = VENV[i];
  if (VO_ONLY) { L[i] = V_L[i]; R[i] = V_R[i]; continue; }
  L[i] = L[i] * DUCK[i] * (1 - 0.52 * v) + S_L[i] * (1 - 0.30 * v) + V_L[i];
  R[i] = R[i] * DUCK[i] * (1 - 0.52 * v) + S_R[i] * (1 - 0.30 * v) + V_R[i];
}

for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.75);
  R[i] = Math.tanh(R[i] * 1.75);
}

const FO = Math.floor(0.5 * SR);
for (let i = 0; i < FO; i++) { const g = i / FO; L[N - 1 - i] *= g; R[N - 1 - i] *= g; }
const FI = Math.floor(0.08 * SR);
for (let i = 0; i < FI; i++) { const g = i / FI; L[i] *= g; R[i] *= g; }

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? 0.89 / peak : 1;
for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }

/* ================= 输出 WAV ================= */
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);

for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
}

const ROOTTAG = (require(path.join(DIR, 'design.json')).root) || 'root';
const OUTFILE = path.join(DIR, VO_ONLY ? 'vo-only.wav' : SFX_ONLY ? 'sfx-only.wav' : BGM_ONLY ? 'bgm-only.wav' : ('audio-' + ROOTTAG + '.wav'));
fs.writeFileSync(OUTFILE, buf);
console.log('生成完成', OUTFILE, DUR.toFixed(1) + 's', (buf.length / 1048576).toFixed(2) + 'MB', '归一系数', g.toFixed(3));
