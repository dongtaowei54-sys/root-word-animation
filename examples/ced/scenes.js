/* ced 走 · 7 场 —— 七个词都在"走"，所以每个走的动作都不一样：
   让开 / 领先 / 推进 / 倒退 / 越过 / 退让 / 登阶。
   副球只在"必须有参照者"的三场出现（cede 让路、precede 领先、succeed 继承）。 */
const SCENES = [
  { /* 0 · cede 让出：主球挡在路中央，货从左边来，它跳起来把地面让出去 */
    root: 'cede', prefix: '', zh: '让出；割让', parts: [['cede', '走']], line: LINES.flat,
    from: { x: 270, y: 132, rx: 10, ry: 16 }, to: { x: 193, y: 180, rx: 7.5, ry: 16 },

    cam(t) {
      const p = eOut(seg(t, 0.95, 1.10));
      return { k: 1 + 0.10 * p, fx: lerp(190, 210, p), fy: 182 };
    },

    /* 另一个球走过来 —— 没有它，"让"就没有对象 */
    sub(t) {
      if (t < 0.50) return null;
      const walk = eInOut(seg(t, 0.50, 1.85));
      const x = lerp(-30, 272, walk);
      const bob = Math.abs(Math.sin(walk * Math.PI * 5)) * 2.5;
      return { x, y: 186.5 - bob, r: 9.5, face: 'none' };
    },

    dot(t) {
      if (t < 0.50) {
        const f = flight(t, 0.05, 0.45, this.from, { x: 187, y: 180, rx: 10, ry: 16 }, 18);
        return { ...f, rot: 0, shape: 'round', face: 'wow', look: -1 };
      }
      if (t < 0.90) return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus', look: -1 };
      if (t < 1.25) {                          /* 跳起：把地面让出来 */
        const p = eOut(seg(t, 0.90, 0.35));
        return { x: 187, y: lerp(180, 128, p), rx: lerp(10, 7.5, p), ry: lerp(16, 15, p),
                 rot: 0, shape: 'round', face: 'wow', look: -1 };
      }
      if (t < 2.15) {                          /* 悬着，等它走过 */
        const fl = 1.4 * Math.sin((t - 1.25) * 7);
        return { x: 187, y: 128 + fl, rx: 7.5, ry: 15, rot: 0, shape: 'round', face: 'wow', look: -1 };
      }
      if (t < 2.50) {                          /* 落回，身体仍窄 */
        const p = eIn(seg(t, 2.15, 0.35));
        return { x: lerp(187, 193, p), y: lerp(128, 180, p), rx: 7.5, ry: 15, rot: 0,
                 shape: 'round', face: 'focus', look: 1 };
      }
      return { x: 193, y: 180, rx: 7.5, ry: 16, rot: 0, shape: 'round', face: 'focus', look: 1 };
    },

    fx(t) {
      const a = pulse(t, 0.92, 0.34, 187, 196, 8, 34, 0.28);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
      const b = pulse(t, 2.20, 0.34, 193, 196, 8, 36, 0.30);
      if (b) {
        fxRing2.setAttribute('cx', b.x); fxRing2.setAttribute('cy', b.y);
        fxRing2.setAttribute('r', Math.max(1, b.r));
        fxRing2.setAttribute('opacity', b.op);
      }
      /* 跳起来的时候要有影子在地上 */
      const air = t > 0.95 && t < 2.45;
      if (air) {
        const h = clamp01((180 - 128) / 52);
        fxShadow.setAttribute('cx', 187); fxShadow.setAttribute('cy', 196);
        fxShadow.setAttribute('rx', 13); fxShadow.setAttribute('ry', 3);
        fxShadow.setAttribute('opacity', (0.22 * h).toFixed(3));
      }
    },

    /* 它走过的路，在地上留几道浅刻线 */
    props(t) {
      const on = seg(t, 0.60, 0.30);
      if (on < 0.02) return;
      const walk = eInOut(seg(t, 0.50, 1.85));
      const x = lerp(-30, 272, walk);
      let d = '';
      for (let i = 1; i <= 2; i++) {
        const px = x - i * 26;
        if (px > 98 && px < 298) d += 'M' + fx1(px) + ',191L' + fx1(px) + ',201';
      }
      if (!d) return;
      pField.setAttribute('d', d);
      pField.setAttribute('opacity', (0.32 * on).toFixed(3));
    }
  },

  { /* 1 · precede 先于：同一起跑线，主球抢到前面，后者落在后头 */
    root: 'cede', prefix: 'pre', zh: '先于；居前', parts: [['pre', '前'], ['cede', '走']], line: LINES.flat,
    from: { x: 193, y: 180, rx: 7.5, ry: 16 }, to: { x: 270, y: 182, rx: 11, ry: 14 },

    cam(t) {
      const p = eOut(seg(t, 0.60, 0.90));
      return { k: 1 + 0.12 * p, fx: lerp(150, 240, p), fy: 182 };
    },

    /* 后面那个 —— "先于"必须有被超过的人 */
    sub(t) {
      if (t < 0.20) return null;
      const go = eOut(seg(t, 0.55, 0.95));
      const bob = Math.abs(Math.sin(go * Math.PI * 5)) * 3;
      return { x: lerp(105, 196, go), y: 186.5 - bob, r: 9.5, face: 'none' };
    },

    dot(t) {
      if (t < 0.30) {
        const f = flight(t, 0.05, 0.25, this.from, { x: 150, y: 180, rx: 10, ry: 16 }, 10);
        return { ...f, rot: 0, shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 0.55) {                          /* 后仰蓄力 */
        const p = eOut(seg(t, 0.30, 0.25));
        const ry = lerp(16, 12.5, p);
        return { x: lerp(150, 143, p), y: 196 - ry, rx: lerp(10, 12.5, p), ry,
                 rot: -6 * p, shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 1.45) {                          /* 冲出去，抢在前面 */
        const p = eOut(seg(t, 0.55, 0.90));
        const st = Math.sin(Math.min(1, p * 1.3) * Math.PI);
        return { x: lerp(143, 270, p), y: 183,
                 rx: 11 * (1 + 0.28 * st), ry: 13 * (1 - 0.16 * st),
                 rot: 0, shape: st > 0.2 ? 'taper' : 'round', face: 'focus', look: 1 };
      }
      if (t < 1.75) {                          /* 急停 */
        const p = eOut(seg(t, 1.45, 0.30));
        const ry = lerp(13, 14, p);
        return { x: 270, y: 196 - ry, rx: lerp(11.8, 11, p), ry, rot: 0, shape: 'round', face: 'shock' };
      }
      return { x: 270, y: 182, rx: 11, ry: 14, rot: 0, shape: 'round', face: 'happy', look: -1 };
    },

    fx(t) {
      const a = pulse(t, 1.47, 0.34, 270, 196, 8, 36, 0.30);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
      const sv = seg(t, 0.62, 0.60);
      if (sv > 0 && sv < 1) {
        const X = lerp(143, 270, eOut(seg(t, 0.55, 0.90)));
        const len = 14 + 16 * (1 - sv);
        fxSpeed.setAttribute('d',
          'M' + fx1(X - 22) + ',180L' + fx1(X - 22 - len) + ',180' +
          'M' + fx1(X - 26) + ',186L' + fx1(X - 26 - len * 1.2) + ',186' +
          'M' + fx1(X - 22) + ',192L' + fx1(X - 22 - len) + ',192');
        fxSpeed.setAttribute('opacity', ((1 - sv) * 0.40).toFixed(3));
      }
    },

    /* 起跑线 */
    props(t) {
      const on = seg(t, 0.30, 0.30) * (1 - seg(t, 1.60, 0.40));
      if (on < 0.02) return;
      pFold.setAttribute('d', 'M95,176L95,196');
      pFold.setAttribute('opacity', (0.75 * on).toFixed(3));
    }
  },

  { /* 2 · proceed 继续进行：走一步，脚下的路就往前长一截 */
    root: 'ceed', prefix: 'pro', zh: '继续进行', parts: [['pro', '向前'], ['ceed', '走']], line: LINES.flat,
    from: { x: 270, y: 182, rx: 11, ry: 14 }, to: { x: 262, y: 180, rx: 10, ry: 16 },

    cam(t) {
      const p = eOut(seg(t, 0.50, 1.20));
      return { k: 1 + 0.08 * p, fx: lerp(180, 226, p), fy: 186 };
    },

    /* 路随着脚步往右延伸 */
    linePts(t) {
      const ext = eOut(seg(t, 0.50, 1.70));
      return [[0, 0], [0, 0], [58 * ext, 0], [58 * ext, 0]];
    },

    dot(t) {
      if (t < 0.50) {
        const f = flight(t, 0.05, 0.45, this.from, { x: 120, y: 180, rx: 10, ry: 16 }, 14);
        return { ...f, rot: 0, shape: 'round', face: 'wow', look: 1 };
      }
      const p = clamp01((t - 0.50) / 1.70);
      if (p >= 1) return { x: 262, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'happy', look: 1 };
      const STEP = [120, 156, 192, 228, 262];
      const i = Math.min(3, Math.floor(p * 4)), u = p * 4 - i;
      const lift = Math.sin(u * Math.PI);
      const ry = 16 - 2 * lift;
      return { x: lerp(STEP[i], STEP[i + 1], u), y: 196 - ry - lift * 8,
               rx: 10 + 1.5 * lift, ry, rot: 0, shape: 'round', face: 'focus', look: 1 };
    },

    fx(t) {
      const p = clamp01((t - 0.50) / 1.70);
      const i = Math.floor(p * 4), u = p * 4 - i;
      if (u < 0.14) {                          /* 每一步落地的小尘 */
        const X = [120, 156, 192, 228][Math.min(3, i)];
        fxDust.setAttribute('d', 'M' + fx1(X - 10) + ',196L' + fx1(X - 17) + ',201');
        fxDust.setAttribute('opacity', (0.30 * (1 - u / 0.14)).toFixed(3));
      }
    },

    /* 脚印 */
    props(t) {
      const on = seg(t, 0.55, 0.25);
      if (on < 0.02) return;
      const p = clamp01((t - 0.50) / 1.70);
      const n = Math.min(4, Math.floor(p * 4));
      if (n < 1) return;
      let d = '';
      for (let k = 0; k < n; k++) {
        const px = [120, 156, 192, 228][k];
        d += 'M' + px + ',191L' + px + ',201';
      }
      pField.setAttribute('d', d);
      pField.setAttribute('opacity', (0.40 * on).toFixed(3));
    }
  },

  { /* 3 · recede 后退：地面像潮水一样往左退走，球站在原地露出干地 */
    root: 'cede', prefix: 're', zh: '后退；消退', parts: [['re', '回'], ['cede', '走']], line: LINES.flat,
    from: { x: 262, y: 180, rx: 10, ry: 16 }, to: { x: 250, y: 180, rx: 12, ry: 13 },

    cam(t) {
      const p = eOut(seg(t, 0.45, 0.95));
      return { k: 1 - 0.10 * p, fx: 230, fy: 190 };
    },

    /* 线右端往左缩 —— 水面退去 */
    linePts(t) {
      const back = eInOut(seg(t, 0.45, 1.10));
      return [[0, 0], [0, 0], [-112 * back, 0], [-112 * back, 0]];
    },

    dot(t) {
      if (t < 0.45) {
        const f = flight(t, 0.05, 0.40, this.from, { x: 250, y: 180, rx: 10, ry: 16 }, 14);
        return { ...f, rot: 0, shape: 'round', face: 'wow', look: -1 };
      }
      const c = eOut(seg(t, 1.55, 0.40));      /* 惊 → 松了口气 */
      const ry = lerp(16, 13, c), rx = lerp(10, 12, c);
      return { x: 250, y: 196 - ry, rx, ry, rot: 0, shape: 'round',
               face: t < 1.95 ? 'shock' : 'happy', look: -1 };
    },

    fx(t) {
      const a = pulse(t, 1.60, 0.40, 220, 196, 30, 6, 0.30);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
    },

    /* 干地接上 + 退潮留下的水痕 */
    props(t) {
      const dry = seg(t, 1.55, 0.40);
      if (dry > 0.02) {
        pFold.setAttribute('d', 'M196,196L330,196');
        pFold.setAttribute('opacity', (0.42 * dry).toFixed(3));
      }
      const wet = seg(t, 0.55, 0.20) * (1 - seg(t, 1.70, 0.40));
      if (wet > 0.02) {
        const back = eInOut(seg(t, 0.45, 1.10));
        const xr = 300 - 112 * back;
        pField.setAttribute('d',
          'M' + fx1(xr - 62) + ',196L' + fx1(xr - 70) + ',202' +
          'M' + fx1(xr - 32) + ',196L' + fx1(xr - 42) + ',203' +
          'M' + fx1(xr - 96) + ',196L' + fx1(xr - 102) + ',201');
        pField.setAttribute('opacity', (0.34 * wet).toFixed(3));
      }
    }
  },

  { /* 4 · exceed 超过：路上立起一道界栏，球助跑、跃过去、落在界外 */
    root: 'ceed', prefix: 'ex', zh: '超过；超越', parts: [['ex', '出'], ['ceed', '走']], line: LINES.flat,
    from: { x: 250, y: 180, rx: 12, ry: 13 }, to: { x: 262, y: 182, rx: 11, ry: 14 },

    cam(t) {
      const up = eOut(seg(t, 1.10, 0.62));
      return { k: 1 + 0.13 * up, fx: lerp(180, 240, up), fy: lerp(190, 156, up) };
    },

    dot(t) {
      if (t < 0.45) {
        const f = flight(t, 0.05, 0.40, this.from, { x: 110, y: 180, rx: 10, ry: 16 }, 16);
        return { ...f, rot: 0, shape: 'round', face: 'wow', look: 1 };
      }
      if (t < 0.85) return { x: 110, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus', look: 1 };
      if (t < 1.10) {                          /* 后仰蓄力 */
        const p = eOut(seg(t, 0.85, 0.25));
        return { x: lerp(110, 104, p), y: 183, rx: 12, ry: 13, rot: -5 * p,
                 shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 1.78) {                          /* 跃过界栏 */
        const f = flight(t, 1.10, 0.68, { x: 104, y: 183, rx: 12, ry: 13 },
                         { x: 262, y: 183, rx: 12, ry: 13 }, 62);
        return { ...f, rot: 0, shape: 'taper', face: 'shock' };
      }
      if (t < 2.10) {                          /* 落地压扁 */
        const p = eOut(seg(t, 1.78, 0.16));
        const ry = lerp(13, 8, p), rx = lerp(13, 17, p);
        return { x: 262, y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'shock' };
      }
      const b = eBack(seg(t, 2.10, 0.35));
      const ry = lerp(8, 14, b), rx = lerp(17, 11, b);
      return { x: 262, y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'happy', look: 1 };
    },

    fx(t) {
      const a = pulse(t, 1.80, 0.36, 262, 196, 8, 40, 0.32);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
      const sv = seg(t, 1.20, 0.50);
      if (sv > 0 && sv < 1) {
        const f = flight(t, 1.10, 0.68, { x: 104, y: 183, rx: 12, ry: 13 },
                         { x: 280, y: 183, rx: 12, ry: 13 }, 62);
        const len = 12 + 14 * (1 - sv);
        fxSpeed.setAttribute('d',
          'M' + fx1(f.x - 20) + ',' + fx1(f.y - 6) + 'L' + fx1(f.x - 20 - len) + ',' + fx1(f.y - 6) +
          'M' + fx1(f.x - 24) + ',' + fx1(f.y + 4) + 'L' + fx1(f.x - 24 - len * 1.2) + ',' + fx1(f.y + 4));
        fxSpeed.setAttribute('opacity', ((1 - sv) * 0.40).toFixed(3));
      }
    },

    /* 界栏：从线上立起来，一直留着 */
    props(t) {
      const up = eOut(seg(t, 0.45, 0.40));
      if (up < 0.02) return;
      const top = 196 - 58 * up;
      pFold.setAttribute('d',
        'M200,196L200,' + fx1(top) +
        'M190,' + fx1(top) + 'L210,' + fx1(top) +
        'M190,' + fx1(top + 20) + 'L210,' + fx1(top + 20));
      pFold.setAttribute('opacity', '0.92');
    }
  },

  { /* 5 · concede 让步：顶着立起来的墙撑不住，退一步、塌下去、举手认输 */
    root: 'cede', prefix: 'con', zh: '承认；让步', parts: [['con', '完全'], ['cede', '走']], line: LINES.flat,
    from: { x: 280, y: 182, rx: 11, ry: 14 }, to: { x: 208, y: 187, rx: 16, ry: 9 },

    cam(t) {
      const p = eOut(seg(t, 0.90, 0.80));
      return { k: 1 + 0.14 * p, fx: 218, fy: lerp(188, 176, p) };
    },

    /* 线的右端立起来成一道墙 */
    linePts(t) {
      const up = eOut(seg(t, 0.45, 0.40));
      return [[0, 0], [0, 0], [0, 0], [0, -70 * up]];
    },

    dot(t) {
      if (t < 0.45) {
        const f = flight(t, 0.05, 0.40, this.from, { x: 160, y: 180, rx: 10, ry: 16 }, 14);
        return { ...f, rot: 0, shape: 'round', face: 'wow', look: 1 };
      }
      if (t < 0.90) {                          /* 走过去顶住墙 */
        const p = eOut(seg(t, 0.45, 0.45));
        return { x: lerp(160, 238, p), y: 180, rx: 10, ry: 16, rot: 0,
                 shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 1.40) {                          /* 顶着，被压扁 */
        const p = eOut(seg(t, 0.90, 0.50));
        const ry = lerp(16, 10, p), rx = lerp(10, 15, p);
        return { x: lerp(238, 246, p), y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 1.85) {                          /* 顶不住，退一步 */
        const p = eOut(seg(t, 1.40, 0.45));
        const ry = lerp(10, 14, p), rx = lerp(15, 12, p);
        return { x: lerp(246, 208, p), y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'shock', look: 1 };
      }
      /* 塌下去 + 举手 */
      const c = eOut(seg(t, 1.85, 0.45));
      const ry = lerp(14, 9, c), rx = lerp(12, 16, c);
      return { x: 208, y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'happy', look: 1 };
    },

    fx(t) {
      const a = pulse(t, 1.42, 0.34, 240, 196, 8, 34, 0.28);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
      const b = pulse(t, 1.92, 0.40, 208, 196, 8, 42, 0.30);
      if (b) {
        fxRing2.setAttribute('cx', b.x); fxRing2.setAttribute('cy', b.y);
        fxRing2.setAttribute('r', Math.max(1, b.r));
        fxRing2.setAttribute('opacity', b.op);
      }
    },

    /* 墙是线的右端；投降的双手用 V 形线画（比单臂清楚） */
    props(t) {
      const c = eOut(seg(t, 1.85, 0.45));
      if (c < 0.02) return;
      const d = SCENES[5].dot(t);
      const top = d.y - d.ry;
      const L = 23 * c, W = 17 * c;        /* 从球顶两侧斜向外举，像举手 */
      const sy = d.y - d.ry + 3;
      pField.setAttribute('d',
        'M' + fx1(d.x - 8) + ',' + fx1(sy) + 'L' + fx1(d.x - 8 - W) + ',' + fx1(sy - L) +
        'M' + fx1(d.x + 8) + ',' + fx1(sy) + 'L' + fx1(d.x + 8 + W) + ',' + fx1(sy - L));
      pField.setAttribute('opacity', (0.9 * c).toFixed(3));
    }
  },

  { /* 6 · succeed 继承：前者先登台阶、随后从另一侧掉下去，后者走上去站到顶上 */
    root: 'ceed', prefix: 'suc', zh: '成功；继承', parts: [['suc', '随后'], ['ceed', '走']], line: LINES.flat,
    from: { x: 208, y: 187, rx: 16, ry: 9 }, to: { x: 268, y: 132, rx: 10, ry: 16 },

    cam(t) {
      const up = eOut(seg(t, 2.10, 0.70));
      return { k: 1 + 0.16 * up, fx: 248, fy: lerp(188, 150, up) };
    },

    /* 前任：先登顶，再从右侧掉下去 */
    sub(t) {
      if (t < 0.05) return null;
      if (t < 1.05) {
        const p = eInOut(seg(t, 0.40, 0.65));
        return { x: lerp(100, 172, p), y: 186.5 - Math.abs(Math.sin(p * Math.PI * 4)) * 2.5,
                 r: 9.5, face: 'none' };
      }
      if (t < 1.30) {
        const p = eOut(seg(t, 1.05, 0.25));
        return { x: lerp(172, 239, p), y: lerp(186.5, 160.5, p) - Math.sin(p * Math.PI) * 16,
                 r: 9.5, face: 'none' };
      }
      if (t < 1.50) {
        const p = eOut(seg(t, 1.30, 0.20));
        return { x: lerp(239, 270, p), y: lerp(160.5, 138.5, p) - Math.sin(p * Math.PI) * 10,
                 r: 9.5, face: 'none' };
      }
      if (t < 1.82) return { x: 270, y: 138.5, r: 9.5, face: 'none' };
      const d = eIn(seg(t, 1.82, 0.35));       /* 掉下台子右侧 */
      return { x: lerp(270, 320, d), y: lerp(138.5, 212, d), r: 9.5, face: 'none',
               op: clamp01(1 - d * 1.15) };
    },

    dot(t) {
      if (t < 0.40) {
        const f = flight(t, 0.05, 0.35, this.from, { x: 128, y: 180, rx: 10, ry: 16 }, 10);
        return { ...f, rot: 0, shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 1.05) {                          /* 跟着走过去 */
        const p = eInOut(seg(t, 0.40, 0.65));
        return { x: lerp(128, 196, p), y: 180 - Math.abs(Math.sin(p * Math.PI * 4)) * 3,
                 rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus', look: 1 };
      }
      if (t < 2.10) {                          /* 在台下等前者让位 */
        return { x: 196, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'wow', look: 1 };
      }
      if (t < 2.35) {                          /* 跳上第一级 */
        const p = eOut(seg(t, 2.10, 0.25));
        return { x: lerp(196, 239, p), y: lerp(180, 154, p) - Math.sin(p * Math.PI) * 22,
                 rx: 11, ry: 15, rot: 0, shape: 'round', face: 'shock', look: 1 };
      }
      if (t < 2.58) {                          /* 跳上第二级 */
        const p = eOut(seg(t, 2.35, 0.23));
        return { x: lerp(239, 268, p), y: lerp(154, 132, p) - Math.sin(p * Math.PI) * 12,
                 rx: 11, ry: 15, rot: 0, shape: 'round', face: 'shock', look: 1 };
      }
      const b = eBack(seg(t, 2.58, 0.35));     /* 站定在顶上 */
      return { x: 268, y: 132, rx: lerp(11, 10, b), ry: lerp(15, 16, b), rot: 0,
               shape: 'round', face: 'happy' };
    },

    fx(t) {
      const a = pulse(t, 1.84, 0.32, 290, 160, 6, 26, 0.26);
      if (a) {
        fxRing.setAttribute('cx', a.x); fxRing.setAttribute('cy', a.y);
        fxRing.setAttribute('r', Math.max(1, a.r));
        fxRing.setAttribute('opacity', a.op);
      }
      const b = pulse(t, 2.60, 0.40, 268, 148, 8, 44, 0.34);
      if (b) {
        fxRing2.setAttribute('cx', b.x); fxRing2.setAttribute('cy', b.y);
        fxRing2.setAttribute('r', Math.max(1, b.r));
        fxRing2.setAttribute('opacity', b.op);
      }
    },

    /* 两级台阶 + 登顶后顶上亮一道 */
    props(t) {
      const on = seg(t, 0.30, 0.40);
      if (on < 0.02) return;
      pFold.setAttribute('d',
        'M230,196L230,170L248,170L248,148L292,148L292,196');
      pFold.setAttribute('opacity', (0.85 * on).toFixed(3));
      const lit = seg(t, 2.62, 0.35);
      if (lit > 0.02) {
        pField.setAttribute('d', 'M248,148L292,148');
        pField.setAttribute('opacity', (0.75 * lit).toFixed(3));
        pField.setAttribute('stroke-width', '4.2');
      }
    }
  },
];
