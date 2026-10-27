#!/usr/bin/env node
/* render.js — 逐帧渲染（读 timeline.json）
 *
 * 用法：
 *   node <skill>/scripts/render.js [--dir .] [--fps 30] [--from 0] [--to <帧数>]
 *
 * 输出：<dir>/_frames/f0000.png ...
 * 注意：帧目录超过 50 个文件时，删除会被安全守卫拦截 —— 先手动清空再跑。
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(getArg('dir', '.'));
const FPS = +getArg('fps', 30);

/* playwright：先找本地依赖，再找环境变量，最后找 WorkBuddy 内置目录 */
const os = require('os');
const tryReq = m => { try { return require(m); } catch (e) { return null; } };
const pw = (() => {
  const cands = [
    'playwright',
    ...(process.env.PLAYWRIGHT_PATH ? [process.env.PLAYWRIGHT_PATH] : []),
    path.join(os.homedir(), '.workbuddy/binaries/node/workspace/node_modules/playwright'),
  ];
  for (const c of cands) { const m = tryReq(c); if (m) return m; }
  throw new Error('缺少 playwright：在项目里执行 `npm i playwright` 后重试（或设 PLAYWRIGHT_PATH 指向已装目录）');
})();

/* Chrome：$CHROME_PATH > 各系统默认安装位 > 交给 playwright 自带 chromium */
function chromeExe() {
  const env = process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const c = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find(p => fs.existsSync(p));
  return c;                       /* undefined = 用 playwright 自带的 chromium */
}

const TL = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'));
const ROOT = TL.scenes[0] && JSON.parse(fs.readFileSync(path.join(DIR, 'design.json'), 'utf8')).root;
const HTML = path.join(DIR, 'index-' + ROOT + '.html');
const OUT = path.join(DIR, '_frames');

const N = Math.round(TL.total * FPS);
const from = +getArg('from', 0);
const to = Math.min(N, +getArg('to', N));

if (from === 0 && fs.existsSync(OUT)) {
  const n = fs.readdirSync(OUT).length;
  if (n > 50) {
    console.error('✗ 帧目录已有 ' + n + ' 个文件，请先手动清空：rm -rf "' + OUT + '"');
    process.exit(1);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await pw.chromium.launch({
    executablePath: chromeExe(),
  });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + HTML.replace(/\\/g, '/'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => { paused = true; });

  for (let f = from; f < to; f++) {
    const t = f / FPS;
    await page.evaluate(v => { T = v; renderAt(v); }, t);
    await page.screenshot({ path: path.join(OUT, 'f' + String(f).padStart(4, '0') + '.png') });
    if (f % 200 === 0) console.log('  frame ' + f + ' / ' + to);
  }
  await browser.close();
  if (errs.length) { console.error('✗ 页面报错：', errs); process.exit(1); }
  console.log('✓ 渲染完成 ' + (to - from) + ' 帧 → ' + OUT);
})();
