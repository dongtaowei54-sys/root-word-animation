# 图形套路库（可直接抄进 scenes.js）

每个套路：**用来演什么 → 几何 → 代码**。能直接抄的给完整代码，只讲形态的标 **〔仅几何〕**（这些形态填进 `design.json` 的 `lines` 就行，不需要写场景代码）。坐标基准：舞台 375×667，地面线 y=196，横线 x 92–300。

---

## 1. 球变成任意形状（★ 车、动物、箱子都靠它）

**用来演**：词义要求角色"就是那个东西"时（transport → 卡车）。
**原理**：球本来就是"按角度采样的闭合多边形"，把目标形状也按**同一组角度**取半径，逐角度插值即可。绝不能用弧长采样 —— 那个会打结。

```js
/* 目标轮廓（绝对坐标，屏幕顺时针） */
const TRUCK = [[142,188],[142,158],[204,158],[204,144],[238,144],[246,164],[246,188]];
const CX = 194, CY = 183, R0 = 13, N = 96;   /* 中心=球心，球底贴地面 */

/* 射线与多边形求最远交点 */
function radiusAt(poly, cx, cy, a) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const ex = q[0] - p[0], ey = q[1] - p[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const px = p[0] - cx, py = p[1] - cy;
    const t = (px * ey - py * ex) / den;
    const u = (px * dy - py * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best || R0;
}

/* 预计算：每个角度的目标半径 + 出发延迟（让形状有方向地长出来） */
const TARGET = -0.35;                        /* 先长的方向：车头右前方 */
const RAYS = [];
for (let i = 0; i < N; i++) {
  const a = i / N * Math.PI * 2;
  const rt = radiusAt(TRUCK, CX, CY, a);
  let d = Math.abs(a - TARGET);
  if (d > Math.PI) d = Math.PI * 2 - d;
  let delay = 0.30 * (1 - Math.cos(d)) / 2;  /* 0 ~ 0.30s，背对方向最晚 */
  delay *= (1 - 0.75 * Math.max(0, Math.sin(a)));  /* 正下方提前收，否则底边出锯齿 */
  RAYS.push({ a, rt, delay });
}

/* 每帧 */
function morphPath(t, t0) {
  const pts = RAYS.map(r => {
    const p = clamp01((t - t0 - r.delay) / 0.55);
    const k = eOut(p);
    const rad = R0 + (r.rt - R0) * k;
    return [CX + Math.cos(r.a) * rad, CY + Math.sin(r.a) * rad];
  });
  return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
}

/* dot() 里返回 —— 母版见到 d 就直接画这个路径，表情仍按 rx/ry 缩放 */
dot(t) {
  if (t < 1.05) return { d: morphPath(t, 0.22), x: 194, y: 183, rx: 13, ry: 13,
                         shape: 'round', face: 'focus' };
  /* 成形后：脸挪到车头，rx/ry 放大到表情该有的尺度；
     halo 给车身上的白色细节（车窗兼脸区 + 两条货板） */
  return { d: 'M142,188L142,158L204,158L204,144L238,144L246,164L246,188Z',
           halo: 'M211,151L234,151L236,165L211,165Z' +
                 'M153,161L159,161L159,178L153,178Z' +
                 'M171,161L177,161L177,178L171,178Z',
           x: 223, y: 158, rx: 17, ry: 17, shape: 'round', face: 'happy' };
}
```

**五个必须知道的点**

| 点 | 说明 |
|---|---|
| 表情位置 | `x/y` 决定脸画在哪（可偏离形状中心）；`rx/ry` 决定脸的大小，跟形状轮廓无关 |
| **车身细节走 `halo`** | 车窗/板条/车灯用 `halo`（白色填充，可多段 `M...M...`）。深蓝五官在蓝车身上几乎看不清，而 `props` 在球体**下层**、画在身上的东西会被车身盖住 —— 只有 halo 能同时解决"细节可见 + 脸有白底" |
| 车外附件走 `props` | 轮子、货斗外框、烟 —— 在下层，正好"半嵌"进车身 |
| 拖影 | 母版对自定义形状自动跳过同形残影，不会糊 |
| 凹角 / 曲线 | 凹角会被"最远交点"抹圆一点（视觉上更顺）；只能出折线，要圆角就多采样几个点 |

**形变时脸怎么跟随（最容易漏的一步）**

上面那段代码分两个分支写，切换的那一刻脸会从 `(194,183) r13` 瞬移到 `(223,158) r17` —— 单帧跳 30px，看得见"脸闪了一下"。让脸跟形变走同一条时间轴即可：

```js
dot(t) {
  const p = eOut(clamp01((t - 0.22) / 0.85));      /* 与形变同步：0.22 起动、约 1.05 结束 */
  return {
    d: morphPath(t, 0.22),
    halo: p > 0.96 ?                              /* 轮廓快成形时才亮车窗 */
      'M211,151L234,151L236,165L211,165Z' +
      'M153,161L159,161L159,178L153,178Z' +
      'M171,161L177,161L177,178L171,178Z' : null,
    x:  lerp(194, 223, p),                        /* 脸从球心滑到车头 */
    y:  lerp(183, 158, p),
    rx: lerp(13, 17, p), ry: lerp(13, 17, p),     /* 脸同时长到表情该有的尺度 */
    shape: 'round',
    face: p > 0.55 ? 'happy' : 'focus',
  };
}
```

| 要点 | 说明 |
|---|---|
| `halo` 没有渐显可用 | 母版只给 `opacity 0 / 1`，所以必须等白区就位（`p > 0.96`）再开 —— 读起来是"车灯亮起"，不是"贴片跳进来" |
| 换表情要和脸的位置错开 | `face` 切到 `happy` 时 `x/y/rx/ry` 应已插值到终值，否则观众会读成"整张脸闪了一下" |
| 轮廓终点别写死 | `p` 只驱动"脸"，轮廓永远由 `morphPath(t, ...)` 算 —— 两套时间轴一混就错位 |

---

## 2. 线型：门框 / 箱体（4 顶点就能画）〔仅几何〕

| 形状 | pts | 用途 |
|---|---|---|
| 门框 Π | `[[110,120],[110,196],[264,196],[264,120]]` | 关口的门、进出、通过 |
| 箱体 U | `[[150,140],[150,196],[224,196],[224,140]]` | 装货箱、容器、被扣住 |
| 杯形 | `[[86,158],[128,252],[247,252],[289,158]]` | 口袋、碗、往里收 |
| V 谷 | `[[80,150],[187,248],[187,248],[294,150]]` | 斜坡、沟、汇聚 |
| Λ 山 | `[[80,250],[187,152],[187,152],[294,250]]` | 要翻过去的坎 |

**换场时的 morph 是自动的**（`design.json` 的 `lines` 里写目标形态，母版从上一场插值 0.05–0.55s）。顶点顺序必须是 **左顶 / 左底 / 右底 / 右顶**，反了会扭。

---

## 3. 线在场景内变形（不必等换场）

### 3.1 一端放倒（开门 / 开口）

```js
linePts(t) {
  const open = eOut(seg(t, 0.40, 0.40));   /* 右柱倒回横线 */
  return [[0,0],[0,0],[36*open, 76*open],[36*open, 76*open]];
}
```
> `linePts` 返回的是**每个顶点的偏移量**，不是绝对坐标。

### 3.2 一柱推进当推杆（把人顶出去）

```js
linePts(t) {
  const push = eOut(seg(t, 0.80, 0.80));
  const k = 1 - eOut(seg(t, 1.95, 0.55));  /* 收势复位 */
  const lX = 136 * push * k;
  return [[lX,0],[lX,0],[0,0],[0,0]];
}
```

### 3.3 中间压成 V 谷（裂出一道沟）

```js
linePts(t) {
  const v = eInOut(seg(t, 0.50, 0.50)) * (1 - eInOut(seg(t, 2.30, 0.50)));
  return [[0,0], [95*v, 44*v], [-113*v, 44*v], [0,0]];
}
```

### 3.4 两端延展（台面铺开）

```js
linePts(t) {
  const e = eOut(seg(t, 1.70, 0.50));
  return [[-40*e,0],[-40*e,0],[40*e,0],[40*e,0]];
}
```

> **复位的坑**：母版在 4.32s 起把 `linePts / lineDelta` 自动收回（`back = 1 − eInOut(seg(t, 4.32, 0.70))`），到冻结帧 4.42s 时 `back ≈ 0.96`。量化的后果与对策见 `design-format.md` §7.2。

---

## 4. 线整体升起当屋顶（支撑 / 天花板）

线升走后地面就没了 —— 用 `pFold` 补一条黑地线接住。

```js
lineDelta(t) {
  const rise  = eOut(seg(t, 0.50, 0.35));
  const press = eOut(seg(t, 1.05, 0.55));
  return [0, -66 * rise + 42 * press];       /* 升到 y=130，再压到 y=172 */
}
props(t) {                                    /* 地线 */
  const on = seg(t, 0.50, 0.30);
  if (on < 0.02) return;
  pFold.setAttribute('d', 'M92,196L300,196'); /* pFold 与主线同色同粗 */
  pFold.setAttribute('opacity', (0.85 * on).toFixed(3));
}
```
球被压扁时让"球顶"跟着梁走：`ry 16 → 12`，梁 `196-66+42 = 172 = 196-2*12`，刚好贴合。

---

## 5. 箱子：扣住 → 封盖 → 吊走（驱逐 / 收押）

```js
lineDelta(t) {                               /* 整箱升到画面上方 */
  const lift = eInOut(seg(t, 1.55, 0.75));
  return [0, -120 * lift];
}
props(t) {
  const lid = seg(t, 0.95, 0.30);            /* 箱盖跟着箱一起升 */
  if (lid > 0.02) {
    const lift = eInOut(seg(t, 1.55, 0.75));
    const y = 140 - 120 * lift;
    pField.setAttribute('d', 'M150,' + fx1(y) + 'L224,' + fx1(y));
    pField.setAttribute('opacity', (0.9 * lid).toFixed(3));
  }
  const g = seg(t, 2.30, 0.35);              /* 原地虚线轮廓 */
  if (g > 0.02) {
    pGhost.setAttribute('cx', fx1(187)); pGhost.setAttribute('cy', fx1(183));
    pGhost.setAttribute('r', fx1(10)); pGhost.setAttribute('opacity', (0.55 * g).toFixed(3));
  }
}
```

---

## 6. 传送带 / 流动刻线（搬运 / 通道 / 数据流）

```js
props(t) {
  const on = seg(t, 1.45, 0.35);
  if (on < 0.02) return;
  let d = '';
  for (let i = 0; i < 6; i++) {
    const x = 96 + ((i * 40 + t * 80) % 208);        /* t 让它持续流动 */
    d += 'M' + fx1(x) + ',191L' + fx1(x) + ',201';
  }
  pField.setAttribute('d', d);
  pField.setAttribute('opacity', (0.42 * on).toFixed(3));
}
```

---

## 7. 纸带 → 报告（信息类词：report / record / message）

同一个 `pField`，先当拖着的纸带，停下后换成格子稿纸。

```js
props(t) {
  const tapeOn = seg(t, 0.72, 0.15) * (1 - seg(t, 1.85, 0.10));
  if (tapeOn > 0.02) {                        /* 纸带：从球身拖到画外 */
    const d = SCENES[i].dot(t);
    const x0 = Math.min(d.x + 16, 378);
    pField.setAttribute('d', 'M' + fx1(x0) + ',184L378,184M' + fx1(x0) + ',190L378,190');
    pField.setAttribute('opacity', (0.5 * tapeOn).toFixed(3));
    return;
  }
  const repOn = seg(t, 1.92, 0.40) * (1 - seg(t, 4.36, 0.08));
  if (repOn > 0.02) {                         /* 报告：方框 + 三行字 */
    pField.setAttribute('d', 'M128,150L238,150L238,192L128,192Z' +
      'M140,163L226,163M140,173L218,173M140,183L206,183');
    pField.setAttribute('opacity', (0.66 * repOn).toFixed(3));
  }
}
```

---

## 8. 载具（卡车 / 小车）：轮廓 + 辐条轮

**轮廓**：货斗低、驾驶室高、前脸一刀斜切，六七个拐点就够（见套路 1）。

**轮子必须有辐条**，纯白圆盘转起来看不出转：

```js
props(t) {
  const d = SCENES[i].dot(t);
  const x = d.x, top = d.y - d.ry, bot = d.y + d.ry;
  const wy = bot + 2.5;                       /* 轮心：一半嵌进车身 */
  const wheel = (cx, cy, r) =>
    'M' + fx1(cx - r) + ',' + fx1(cy) + 'a' + fx1(r) + ',' + fx1(r) + ' 0 1,0 ' + fx1(2*r) +
    ',0a' + fx1(r) + ',' + fx1(r) + ' 0 1,0 ' + fx1(-2*r) + ',0';
  let s = '';
  /* 驾驶棚 */
  s += 'M' + fx1(x - 11) + ',' + fx1(top) + 'L' + fx1(x - 11) + ',' + fx1(top - 8) +
       'L' + fx1(x + 11) + ',' + fx1(top - 8) + 'L' + fx1(x + 11) + ',' + fx1(top);
  /* 货斗 */
  const bx = x - 16 - 46, btop = bot - 23;
  s += 'M' + fx1(bx) + ',' + fx1(btop) + 'L' + fx1(x - 16) + ',' + fx1(btop) +
       'L' + fx1(x - 16) + ',' + fx1(bot) + 'L' + fx1(bx) + ',' + fx1(bot) + 'Z';
  s += wheel(bx + 10, wy, 5.5) + wheel(bx + 30, wy, 5.5);
  s += wheel(x - 9, wy, 5.5) + wheel(x + 9, wy, 5.5);
  pField.setAttribute('d', s);
  pField.setAttribute('opacity', '0.88');
}
```

**轮子要转**就得用 `<g transform="rotate">`（`pField` 画不了转动）。做法：把轮子做成独立 `<g>` 元素，`rotate = 行驶距离 / 轮半径`（无滑移）：

```js
/* 建轮子时 */
const g = el('g');
g.appendChild(el('circle', { cx:0, cy:0, r:9, fill:'#fff', stroke:INK, 'stroke-width':3.2 }));
g.appendChild(el('path', { d:'M-5.6,0L5.6,0M0,-5.6L0,5.6', stroke:INK, 'stroke-width':2 }));
g.appendChild(el('circle', { cx:0, cy:0, r:1.8, fill:INK }));
/* 每帧 */
g.setAttribute('transform', 'translate(' + wx + ',' + wy + ') rotate(' + (dx / 9) + ')');
```
> 只用 `pField` 时没有转动，静态停放可以；要"驶入/驶出"，轮子必须独立。

---

## 9. 钩爪拉货（外部力量把人拽走）

母版自带 `drawClaw(cx, cy, R)` + `pClawG`，环心**贴球缘**：

```js
props(t) {
  const on = seg(t, 0.55, 0.10) * (1 - seg(t, 2.10, 0.35));
  if (on < 0.02) return;
  const d = SCENES[i].dot(t);
  const enter = eOut(seg(t, 0.55, 0.30));
  const exit  = eIn(seg(t, 1.62, 0.60));
  const hc = d.x + d.rx + 1;                  /* 贴球右缘，不要放球心 */
  const cx = lerp(lerp(430, hc, enter), 430, exit);
  drawClaw(cx, d.y, 11);
  pClawG.setAttribute('opacity', (0.95 * on).toFixed(3));
}
```
被拽时球 `shape:'drop'`、`tint:1`（受惊橙）；钩爪是品牌蓝，两者不会糊。

---

## 10. 掉落 + 三连弹（球返场）

```js
/* 下落 0.42s（平方加速），然后三次弹跳：36 → 14 → 5 px */
if (t < d0 + 0.42) { y = lerp(96, 183, eIn(p)); ry = lerp(14, 12, p); }
else if (t < d0 + 0.74) { y = 183 - Math.sin(p * Math.PI) * 36; }
else if (t < d0 + 1.00) { y = 183 - Math.sin(p * Math.PI) * 14; }
else if (t < d0 + 1.16) { y = 183 - Math.sin(p * Math.PI) * 5; }
/* 落地一瞬压扁：ry×0.68 / rx×1.26，0.12s 内衰减 */
```

---

## 11. 粒子爆发（爆炸 / 碎裂 / 尘土）

母版有 24 个粒子，`particles(t)` 返回数组即可，超出 24 个自动忽略：

```js
particles(t) {
  const p = seg(t, 0.30, 0.55);
  if (p <= 0 || p >= 1) return null;
  const out = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + 0.3;
    const r = 6 + 54 * eOut(p);
    out.push({ x: 187 + Math.cos(a) * r, y: 150 + Math.sin(a) * r,
               r: 3.4 * (1 - p), op: 0.8 * (1 - p), fill: '#8b9199' });
  }
  return out;
}
```

---

## 12. 副球当"物件"用

`sub(t)` 支持 `{x,y,r|rx,ry,rot,shape,face,look,op,fill}`，默认灰色 `#8b9199`。

```js
sub(t) {
  const d = SCENES[i].dot(t);
  return { x: d.x, y: d.y - d.ry - 8.6, r: 9.5, face: 'none' };  /* face:'none' = 无脸的货 */
}
```
> 只在"必须是两个角色"时用（见 design-principles.md 第二节）。

---

## 13. 界栏 / 栏杆（over / limit / barrier 类）

从地面**立起**的一道栏，用来把"界"画出来。竖线 + 两道横杠，别画箭头（箭头会读成"向上"）。

```js
props(t) {
  const up = eOut(seg(t, 0.45, 0.40));
  if (up < 0.02) return;
  const top = 196 - 58 * up;                 /* 栏高：58px */
  pFold.setAttribute('d',
    'M200,196L200,' + fx1(top) +                                  /* 立柱 */
    'M190,' + fx1(top) + 'L210,' + fx1(top) +                     /* 顶端横杠 */
    'M190,' + fx1(top + 20) + 'L210,' + fx1(top + 20));           /* 中间横杠 */
  pFold.setAttribute('opacity', '0.92');
}
```
球跳过去时用 `flight(...arc 62)`，弧顶要低于栏顶（`180 - 62 = 118 < 138` ✓）。

---

## 14. 台阶（succeed / climb / rise 类）

两级就够，用 `pFold` 一条 path 画完，底边直接落在地面线上。

```js
/* 一级顶 170、二级顶 148 */
pFold.setAttribute('d', 'M230,196L230,170L248,170L248,148L292,148L292,196');

/* 球站上去：一级球心 = 170 - ry，二级球心 = 148 - ry */
/* 每一级用 flight 跳上去，arc 22 / 12 */
```

登顶后想强调"成功"，在台面补一道蓝线（`pField`，`stroke-width` 加到 4.2）：
```js
pField.setAttribute('d', 'M248,148L292,148');
pField.setAttribute('opacity', (0.75 * seg(t, 2.62, 0.35)).toFixed(3));
```

---

## 15. 举双手（surrender / give up 类）

**不要用 `arm` 原语**：它的手是 3.4px 小环、杆只有 2.6px 粗，从扁球顶上伸出来像天线。

用 `pField` 从球顶两侧斜向外画两条线，一眼就是"举手"：

```js
props(t) {
  const c = eOut(seg(t, 1.85, 0.45));
  if (c < 0.02) return;
  const d = SCENES[i].dot(t);
  const L = 23 * c, W = 17 * c;
  const sy = d.y - d.ry + 3;                 /* 从球顶稍下一点出 */
  pField.setAttribute('d',
    'M' + fx1(d.x - 8) + ',' + fx1(sy) + 'L' + fx1(d.x - 8 - W) + ',' + fx1(sy - L) +
    'M' + fx1(d.x + 8) + ',' + fx1(sy) + 'L' + fx1(d.x + 8 + W) + ',' + fx1(sy - L));
  pField.setAttribute('opacity', (0.9 * c).toFixed(3));
}
```
配 `shape:'round'` + `rx 16 / ry 9`（摊扁）+ `face:'happy'`（认命的笑），整个"认输"就成立。

---

## 16. 现场造一个新元素（某个词专属的符号）

当球和线都撑不起这个词时，**造一个只属于它的东西**：印章、铃铛、界碑、证件、枷锁。

### 母版自带的绘制槽位

| 槽位 | 形状 | 能画什么 |
|---|---|---|
| `pField` | 蓝线 path（2.2px） | 任意多段折线、方框、虚线、圆、车斗、纸格 |
| `pFold` | 黑线 path（2.2px） | 地面、板条、刻度、栏、台阶 |
| `pGhost` / `pHole` | 虚线圆 | 空位、缺口 |
| `pBookG` / `pClawG` | 书 / 钩爪 | 专注对象 / 外部力量 |
| `particles` | 24 个圆 | 碎片、尘土、火花 |

这些够画 80% 的东西。**不够时新建节点** —— 但要注意三个坑。

### 新建节点的写法（照这个骨架）

```js
props(t) {
  /* 1. 懒建：每帧先找，找不到才建；id 必须全局唯一 */
  let el = document.getElementById('cStamp');
  if (!el) {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.id = 'cStamp';
    el.setAttribute('fill', '#ef5b3d');                   /* 印章红 */
    document.getElementById('svg').appendChild(el);       /* 追加 = 画在最上层 */
  }

  /* 2. 每帧只改属性，不要重建节点（重建会掉帧） */
  const k = eIn(seg(t, 0.80, 0.30));                      /* 落下 */
  const y = 118 + 70 * k;
  el.setAttribute('d', 'M0,0L54,0L54,22L0,22ZM19,-14L35,-14L35,0L19,0Z');
  el.setAttribute('transform', 'translate(160,' + y.toFixed(1) + ')');

  /* 3. 本场结束前自己关掉，否则会残留到下一场 */
  el.setAttribute('opacity', t > 4.30 ? 0 : 1);
}
```

### 三个必须注意的坑

| 坑 | 现象 | 解法 |
|---|---|---|
| **每帧重建节点** | 帧率骤降、画面闪 | 一定要 `getElementById` 查缓存，只建一次 |
| **残留到下一场** | 换场后上一个场景的印章还在画面上 | 本场公式里写 `t > 4.30 ? 0 : 1`，让它自己收掉 |
| **场景间变量冲突** | 两个场景都用了 `el` / `id`，互相覆盖 | **每个自定义元素一个唯一 id**，前缀带上词或场景号 |

> `scenes.js` 里 `const SCENES = [...]` 之外的内容不会被注入母版，所以辅助函数不能写在文件顶部 ——
> 只能写在场景方法内部，或者用 `document.getElementById` 全局查找。
