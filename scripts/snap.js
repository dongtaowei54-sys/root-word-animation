#!/usr/bin/env node
/* snap.js — 关键帧预检截图（每场 2 张：动作中 + 冻结态）
 *
 * 用法：node <skill>/scripts/snap.js [--dir .] [--at 1.5]
 * 输出：<dir>/_snap/<word>-anim.png、<word>-frozen.png
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DIR = path.resolve(getArg('dir', '.'));
const AT = +getArg('at', 1.5);

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
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find(p => fs.existsSync(p));       /* undefined = 用 playwright 自带的 chromium */
}

const TL = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'));
const design = JSON.parse(fs.readFileSync(path.join(DIR, 'design.json'), 'utf8'));
const HTML = path.join(DIR, 'index-' + design.root + '.html');
const OUT = path.join(DIR, '_snap');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await pw.chromium.launch({
    executablePath: chromeExe(),
  });
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + HTML.replace(/\\/g, '/'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { paused = true; });

  for (const sc of TL.scenes) {
    for (const [tag, t] of [['anim', sc.start + AT], ['frozen', sc.voAt + 0.25]]) {
      await p.evaluate(v => { T = v; renderAt(v); }, t);
      await p.waitForTimeout(40);
      await p.screenshot({ path: path.join(OUT, sc.word + '-' + tag + '.png') });
    }
  }
  await b.close();
  if (errs.length) { console.error('✗ 页面报错：', errs); process.exit(1); }
  console.log('✓ 预检截图 ' + TL.scenes.length * 2 + ' 张 → ' + OUT);
})();
