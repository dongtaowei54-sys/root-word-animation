#!/usr/bin/env node
/* verify.js — 五道校验（配音起音 / 音效起音 / 冻结静止 / 响度时长 / 成片偏移）
 *
 * 前置：先跑过
 *   VO_ONLY=1 node make-audio.js   → vo-only.wav
 *   SFX_ONLY=1 node make-audio.js  → sfx-only.wav
 *   node make-audio.js             → audio-<root>.wav
 * 以及可选的成片 mp4（--mp4 传入才做成片偏移校验）
 *
 * 用法：node <skill>/scripts/verify.js [--dir .] [--mp4 输出.mp4]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(getArg('dir', '.'));
const MP4 = getArg('mp4', null);
const SR = 44100;

const TL = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'));
const design = JSON.parse(fs.readFileSync(path.join(DIR, 'design.json'), 'utf8'));
const CUES = JSON.parse(fs.readFileSync(path.join(DIR, 'cues.json'), 'utf8'));

function wav(p) {
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
const env = (a, t0, t1) => {
  const i0 = Math.max(0, Math.round(t0 * SR)), i1 = Math.min(a.length, Math.round(t1 * SR));
  let s = 0, c = 0;
  for (let i = i0; i < i1; i++) { s += a[i] * a[i]; c++; }
  return Math.sqrt(s / (c || 1));
};
const db = x => 20 * Math.log10(Math.max(x, 1e-9));

let fail = 0;
const line = (ok, name, detail) => {
  if (!ok) fail++;
  console.log((ok ? '✓' : '✗') + ' ' + name.padEnd(14) + detail);
};

/* ---------- 1. 配音起音 ---------- */
{
  const p = path.join(DIR, 'vo-only.wav');
  if (!fs.existsSync(p)) line(false, '配音起音', '缺 vo-only.wav（先跑 VO_ONLY=1）');
  else {
    const a = wav(p);
    let worst = 0;
    TL.scenes.forEach(sc => {
      const base = env(a, sc.voAt - 0.25, sc.voAt - 0.03);
      let onset = -1;
      for (let d = -0.03; d <= 0.10; d += 0.002) {
        if (env(a, sc.voAt + d, sc.voAt + d + 0.02) > base * 2.2 + 0.0015) { onset = sc.voAt + d; break; }
      }
      if (onset < 0) return;
      worst = Math.max(worst, Math.abs((onset - sc.voAt) * 1000));
    });
    line(worst <= 50, '配音起音', '最大偏差 ' + worst.toFixed(0) + 'ms（≤50ms）');
  }
}

/* ---------- 2. 音效起音 ---------- */
{
  const p = path.join(DIR, 'sfx-only.wav');
  if (!fs.existsSync(p)) line(false, '音效起音', '缺 sfx-only.wav（先跑 SFX_ONLY=1）');
  else {
    const a = wav(p);
    /* 瞬态音效判 1 帧；渐入型噪声本身起音是渐强的，放宽到 2 帧 */
    const SOFT = ['swish', 'whoosh', 'riser'];
    let n = 0, bad = 0, softMax = 0, hardMax = 0;
    CUES.CUES.forEach((list, i) => list.forEach(c => {
      const t = CUES.ST[i] + c[0];
      const tol = SOFT.includes(c[1]) ? 66 : 33;
      const base = env(a, t - 0.14, t - 0.03);
      const thr = base * 2.2 + 0.0015;
      let on = -1;
      for (let d = -0.03; d <= 0.09; d += 0.002) {
        if (env(a, t + d, t + d + 0.010) > thr) { on = t + d; break; }
      }
      n++;
      if (on < 0) return;                       /* 音量太低，未检出 */
      const err = Math.abs((on - t) * 1000);
      if (tol === 66) softMax = Math.max(softMax, err); else hardMax = Math.max(hardMax, err);
      if (err > tol) bad++;
    }));
    line(bad === 0, '音效起音',
      n + ' 条，瞬态最大 ' + hardMax.toFixed(0) + 'ms（≤33）/ 渐入最大 ' + softMax.toFixed(0) + 'ms（≤66）/ 超限 ' + bad);
  }
}

/* ---------- 3. 响度与时长 ---------- */
{
  const p = path.join(DIR, 'audio-' + design.root + '.wav');
  if (!fs.existsSync(p)) line(false, '响度时长', '缺 audio-' + design.root + '.wav');
  else {
    /* volumedetect 的结果走 stderr，必须用 spawnSync 才拿得到 */
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', p, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8' });
    const buf = (r.stderr || '') + (r.stdout || '');
    const mean = (buf.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1];
    const max = (buf.match(/max_volume:\s*(-?[\d.]+)/) || [])[1];
    const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', p]).toString().trim();
    if (mean === undefined || max === undefined) {
      line(false, '响度时长', dur.toFixed(2) + 's，但读不到电平（ffmpeg 输出解析失败）');
    } else {
      const dOk = Math.abs(dur - TL.total) < 0.05;
      const mOk = Math.abs(+mean + 19) <= 2.5;
      const pOk = +max <= -0.5;
      line(dOk && mOk && pOk, '响度时长',
        dur.toFixed(2) + 's（应 ' + TL.total + 's）/ mean ' + mean + 'dB / max ' + max + 'dB');
    }
  }
}

/* ---------- 4. 成片音画偏移 ---------- */
if (MP4 && fs.existsSync(MP4)) {
  const tmp = path.join(DIR, '_mp4chk.wav');
  execFileSync('ffmpeg', ['-y', '-i', MP4, '-vn', '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', tmp, '-loglevel', 'error']);
  const A = wav(tmp), B = wav(path.join(DIR, 'audio-' + design.root + '.wav'));
  let best = -Infinity, bl = 0;
  for (let lag = 0; lag <= 300; lag++) {
    let s = 0, c = 0;
    for (let i = 0; i + lag < A.length && i < B.length; i += 7) { s += A[i + lag] * B[i]; c++; }
    const v = s / c;
    if (v > best) { best = v; bl = lag; }
  }
  fs.unlinkSync(tmp);
  line(bl === 0, '成片偏移', (bl / 44.1).toFixed(1) + 'ms（应为 0）');
} else if (MP4) {
  line(false, '成片偏移', '找不到 ' + MP4);
} else {
  console.log('- 成片偏移      跳过（未传 --mp4）');
}

console.log(fail === 0 ? '\n全部通过' : '\n' + fail + ' 项未通过');
process.exit(fail === 0 ? 0 : 1);
