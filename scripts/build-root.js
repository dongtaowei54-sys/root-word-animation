#!/usr/bin/env node
/* build-root.js — 把 design.json + scenes.js 注入母版，产出该词根的动画页与时间轴
 *
 * 用法（在工作目录下，需同时存在 design.json 与 scenes.js）：
 *   node <skill>/scripts/build-root.js [--dir .] [--root spect]
 *
 * design.json 结构见 references/design-format.md
 * 输出：index-<root>.html、timeline.json
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(getArg('dir', '.'));
const SKILL = path.resolve(__dirname, '..');

const design = JSON.parse(fs.readFileSync(path.join(DIR, 'design.json'), 'utf8'));
const ROOT = getArg('root', design.root);
if (!ROOT) throw new Error('design.json 里缺 root，或未传 --root');

const scenesSrc = fs.readFileSync(path.join(DIR, 'scenes.js'), 'utf8');
let src = fs.readFileSync(path.join(SKILL, 'assets/base.html'), 'utf8');

const must = (c, m) => { if (!c) throw new Error('母版锚点失效：' + m); };
const cut = (startMark, endMark) => {
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error('找不到 ' + startMark);
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new Error('找不到 ' + startMark + ' 的结尾 ' + endMark);
  return [a, b + endMark.length];
};

/* ---- 1. 标题 ---- */
src = src.replace(/<title>[^<]*<\/title>/, '<title>词根动画 · ' + ROOT + '（配音版）</title>');

/* ---- 1.5 时长与冻结点（design.dur / design.anchor，缺省 5.2 / 4.42） ---- */
const DUR = design.dur || 5.2;
const ANCHOR = design.anchor || 4.42;
src = src.replace('const DUR   = 5.2;', 'const DUR   = ' + DUR + ';');
src = src.replace('const OUTRO = 4.42;', 'const OUTRO = ' + ANCHOR + ';');
src = src.replace('const ANCHOR = 4.42;', 'const ANCHOR = ' + ANCHOR + ';');

/* ---- 2. 词根字母（网页里显示的默认词根） ---- */
src = src.replace(/<span class="root" id="rootEl">[^<]*<\/span>/,
  '<span class="root" id="rootEl">' + ROOT + '</span>');

/* ---- 3. LINES ---- */
{
  const [a, b] = cut('const LINES = {', '\n};');
  const body = Object.keys(design.lines).map(k => {
    const L = design.lines[k];
    const pts = L.pts.map(p => '[' + p[0] + ',' + p[1] + ']').join(',');
    return '  ' + k + ': { pts: [' + pts + '], lw: ' + L.lw + ' },';
  }).join('\n');
  src = src.slice(0, a) + 'const LINES = {\n' + body + '\n};' + src.slice(b);
}

/* ---- 4. SCENES（整块来自 scenes.js） ---- */
{
  const [a, b] = cut('const SCENES = [', '\n];');
  const s = scenesSrc.indexOf('const SCENES = [');
  if (s < 0) throw new Error('scenes.js 里没有 const SCENES = [');
  const e = scenesSrc.indexOf('\n];', s);
  if (e < 0) throw new Error('scenes.js 的 SCENES 没有闭合');
  /* 连同 SCENES 之前的辅助常量一起注入（NODE / IN 之类） */
  src = src.slice(0, a) + scenesSrc.slice(0, e + 3) + src.slice(b);
}

/* ---- 5. CUES_BY_SCENE ---- */
{
  const [a, b] = cut('const CUES_BY_SCENE = [', '\n];');
  if (!Array.isArray(design.cues) || design.cues.length !== design.words.length) {
    throw new Error('design.cues 数量必须与 words 一一对应（' + design.words.length + ' 场）');
  }
  const body = design.cues.map((list, i) => {
    const items = list.map(c => '[' + c[0] + ", '" + c[1] + "'" + (c[2] !== undefined ? ', ' + c[2] : '') + ']').join(', ');
    return '  /* ' + i + ' ' + design.words[i].word + ' */\n  [' + items + '],';
  }).join('\n');
  src = src.slice(0, a) + 'const CUES_BY_SCENE = [\n' + body + '\n];' + src.slice(b);
}

/* ---- 6. 配音槽 ---- */
{
  const vo = design.words.map(w => w.voDur);
  must(src.includes('const VO_DUR = ['), 'VO_DUR');
  src = src.replace(/const VO_DUR = \[[^\]]*\];/, 'const VO_DUR = [' + vo.join(', ') + '];');
}

/* ---- 7. 字号（长词自动收一档） ---- */
{
  const maxLen = Math.max(...design.words.map(w => (w.prefix || '').length + (w.root || ROOT).length));
  const size = maxLen >= 10 ? 58 : maxLen >= 9 ? 60 : 64;
  src = src.replace(/font:700 \d+px\/1 var\(--en\)/, 'font:700 ' + size + 'px/1 var(--en)');
}

/* ---- 8. 输出 html ---- */
const outHtml = path.join(DIR, 'index-' + ROOT + '.html');
fs.writeFileSync(outHtml, src);

/* ---- 9. 导出 timeline.json ---- */
let acc = 0;
const scenes = design.words.map((w, i) => {
  const start = +acc.toFixed(3);
  acc += DUR + w.voDur;
  return {
    i: i, word: w.word, start: start, voDur: w.voDur,
    voAt: +(start + ANCHOR).toFixed(3), voSpeech: w.speech,
  };
});
const timeline = { anim: DUR, anchor: ANCHOR, total: +acc.toFixed(3), scenes: scenes };
fs.writeFileSync(path.join(DIR, 'timeline.json'), JSON.stringify(timeline, null, 2));

const maxLen = Math.max(...design.words.map(w => (w.prefix || '').length + (w.root || ROOT).length));
console.log('✓ ' + path.basename(outHtml) + '  ' + (src.length / 1024).toFixed(1) + 'KB');
console.log('✓ timeline.json  ' + design.words.length + ' 场 / 总长 ' + timeline.total + 's / ' +
  Math.round(timeline.total * 30) + ' 帧 / 最长词 ' + maxLen + ' 字母');
