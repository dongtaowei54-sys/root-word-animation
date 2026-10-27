#!/usr/bin/env node
/* mix.js — 帧 + 音轨 → 两版成片
 *
 * 用法：node <skill>/scripts/mix.js [--dir .] [--preset fast]
 * 输出：<词根>-1080x1920.mp4（抖音 9:16）、<词根>.mp4（750×1334 原尺寸）
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(getArg('dir', '.'));
const PRESET = getArg('preset', 'fast');

const design = JSON.parse(fs.readFileSync(path.join(DIR, 'design.json'), 'utf8'));
const ROOT = design.root;
const FRAMES = path.join(DIR, '_frames');
const AUDIO = path.join(DIR, 'audio-' + ROOT + '.wav');

if (!fs.existsSync(FRAMES)) { console.error('✗ 缺 _frames，先跑 render.js'); process.exit(1); }
if (!fs.existsSync(AUDIO)) { console.error('✗ 缺 ' + AUDIO + '，先跑 make-audio.js'); process.exit(1); }

const inputs = ['-y', '-loglevel', 'error', '-framerate', '30', '-start_number', '0',
  '-i', path.join(FRAMES, 'f%04d.png'), '-i', AUDIO];
const tail = ['-c:v', 'libx264', '-preset', PRESET, '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart'];

execFileSync('ffmpeg', [...inputs, '-vf', 'scale=1080:1920:flags=lanczos', ...tail,
  path.join(DIR, ROOT + '-1080x1920.mp4')]);
console.log('✓ ' + ROOT + '-1080x1920.mp4');
execFileSync('ffmpeg', [...inputs, ...tail, path.join(DIR, ROOT + '.mp4')]);
console.log('✓ ' + ROOT + '.mp4');
