/* ============================================================================
 * scenes.js 起步模板  ——  复制到工作目录后改名 scenes.js，按注释填空
 *
 * 必读要点（都是踩过的坑，详见 references/pitfalls.md）
 *   1. 每一场都必须自己写 props(t)，哪怕是空函数 —— 否则可能跑到母版的默认道具分支
 *   2. linePts(t) 返回的是「每个顶点的偏移量」，不是绝对坐标
 *   3. 4.32s 后母版会自动收回 linePts / lineDelta，别把冻结态全靠形变撑着
 *   4. 动作要在 4.42s 前演进到完成态（之后画面冻结播整词配音）
 *   5. 音效 pop 固定 1.60s，那前后 ±0.15s 内别放别的音效
 *   6. 元素进出场用位移，不要用 opacity 换角色
 *
 * 可用的东西
 *   dot(t)     → { x, y, rx, ry, rot, shape, face, look, split, tint, arm, d }
 *   sub(t)     → { x, y, r|rx,ry, rot, shape, face, look, op, fill }   null 表示不出现
 *   linePts(t) → [[dx,dy] × 4]（左顶 左底 右底 右顶）
 *   lineDelta(t) → [dx, dy]
 *   cam(t)     → { k, fx, fy, sx, sy }   t=0 必须 k=1
 *   props(t)   → 自绘：pField(蓝线) / pFold(黑线) / pGhost(虚线圆) / pHole / pClawG+drawClaw / pBookG / puffs
 *   fx(t)      → fxRing / fxRing2 / fxDust / fxInk / fxSpeed / fxShadow
 *   particles(t) → [{x,y,r,op,fill}] 最多 24 个
 *   seg(t,a,d,e) / eOut / eIn / eIn3 / eInOut / eBack / lerp / pulse / flight / fx1
 * ========================================================================== */

const SCENES = [
  { /* 0 · 示范场：把这一段当成"字段清单"看，写新场时照着填 */
    prefix: '', zh: '中文释义', parts: [['root', '释义']], line: LINES.flat,
    from: { x: 187, y: 40, rx: 13, ry: 13 },   /* 上一场结束时球所在（循环时接上） */
    to:   { x: 187, y: 180, rx: 10, ry: 16 },  /* 这一场结束时球所在 */

    /* 镜头：k 是缩放，fx/fy 是焦点，sx/sy 是抖动。t=0 时 k 必须为 1 */
    cam(t) {
      const p = eOut(seg(t, 0.50, 0.90));
      return { k: 1 + 0.12 * p, fx: 187, fy: lerp(200, 182, p) };
    },

    /* 线在场景内的变形（可选）：返回 4 个偏移量 */
    linePts(t) {
      const e = eOut(seg(t, 0.60, 0.50));
      return [[0, 0], [0, 0], [0, 0], [0, 0]];
    },

    /* 整条线平移（可选） */
    lineDelta(t) {
      return [0, 0];
    },

    /* 球此刻长什么样 —— 必填 */
    dot(t) {
      if (t < 0.62) {                          /* 飞入 */
        const f = flight(t, 0.05, 0.57, this.from, { x: 187, y: 150, rx: 13, ry: 13 }, 24);
        return { ...f, rot: 0, shape: 'round', face: 'wow' };
      }
      if (t < 1.00) {                          /* 落地压扁 */
        const p = eOut(seg(t, 0.62, 0.24));
        const ry = lerp(13, 7, p), rx = lerp(13, 18, p);
        return { x: 187, y: 196 - ry, rx, ry, rot: 0, shape: 'round', face: 'shock' };
      }
      const b = eBack(seg(t, 1.00, 0.35));      /* 弹回立正 */
      const ry = lerp(7, 16, b), rx = lerp(18, 10, b);
      return { x: 187, y: 196 - ry, rx, ry, rot: 0, shape: 'round',
               face: t < 2.2 ? 'focus' : 'happy' };
    },

    /* 副球（可选）：只在"动作必须两个角色"时出现，否则不要写 */
    sub(t) { return null; },

    /* 特效（可选） */
    fx(t) {
      const r = pulse(t, 0.62, 0.36, 187, 196, 8, 40, 0.32);
      if (r) {
        fxRing.setAttribute('cx', r.x); fxRing.setAttribute('cy', r.y);
        fxRing.setAttribute('r', Math.max(1, r.r));
        fxRing.setAttribute('opacity', r.op);
      }
    },

    /* 道具/自绘（每场必写，空也要写） */
    props(t) { /* 无道具 */ }
  },

  /* 1 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },

  /* 2 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },

  /* 3 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },

  /* 4 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },

  /* 5 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },

  /* 6 · 场名 */
  {
    prefix: '', zh: '', parts: [['root', '']], line: LINES.flat,
    from: { x: 187, y: 180, rx: 10, ry: 16 }, to: { x: 187, y: 180, rx: 10, ry: 16 },
    cam(t) { return { k: 1, fx: 187, fy: 196 }; },
    dot(t) { return { x: 187, y: 180, rx: 10, ry: 16, rot: 0, shape: 'round', face: 'focus' }; },
    props(t) {}
  },
];
