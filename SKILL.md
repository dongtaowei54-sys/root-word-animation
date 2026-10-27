---
name: root-word-animation
description: 制作英语词根记忆短视频（词根动画 / 记单词 / root word video）。用户给出一个词根（如 spect、port、dict、tract）并要求做动画或记忆视频时使用：查词典筛出该词族 → 给用户一份构思表 → 设计极简几何动画（以一条线 + 一颗小球为起点，球和线可长成卡车、门、栅栏等任意形态，必要时现场造新元素，配道具与镜头）→ edge-tts 生成整词配音 → 混 BGM 与音效 → 逐帧渲染 → 五道校验，产出 9:16 抖音成片。Also use when the user asks to build a "词根动画" video, or sends a bare English root expecting a video.
agent_created: true
---

# 词根动画视频

把一个词根做成 30–50 秒的记忆短片。画面以**一条线 + 一颗球**为起点，但**不局限于此**：球可以变成卡车、猫、箱子，线可以变成门、栅栏、报纸、屋顶；必要时线可以退场、元素可以进出画面；球和线都不够用时，**可以为这个词现场造一个新元素**（印章、界栏、台阶、证件）。每场演完后**画面冻结**，念一遍整词，再进下一场。

**唯一总纲：词义决定画面，元素不许反过来限制表现。**

## 何时使用

- 用户发来一个英文词根（可能只有一个词，如 `spect`）
- 用户说「做 XX 的词根动画 / 记单词视频 / 记忆短片」
- 用户要延续或重做已有的词根动画系列

## 核心流程

| 步 | 动作 | 产出 |
|---|---|---|
| 1 | 接词根，不追问 | — |
| 2 | 查 `dict/词根词典.csv`，按可演性筛词（3 分 2 分留，1 分丢；3–7 个） | 词表 |
| 3 | **逐词答四问**（主角是谁 / 谁变身退场 / 什么动作 / 冻结帧能不能当单词卡），再填构思表 | **构思表 → 必须给用户看** |
| 4 | 写 `design.json` + `scenes.js`（起步可抄 `assets/template-scenes.js`） | 两个文件 |
| 5 | `python $SK/scripts/tts.py --dir .` | 配音 + 回填 voDur |
| 6 | `node $SK/scripts/build-root.js --dir .` | `index-<root>.html` + `timeline.json` |
| 7 | `node $SK/scripts/snap.js --dir .` 并**逐张看** | `_snap/*.png` |
| 8 | 音轨 → 渲染 → 混流 | 两个 mp4 |
| 9 | `node $SK/scripts/verify.js --dir . --mp4 <root>-1080x1920.mp4` | 校验报告 |

`$SK = ~/.workbuddy/skills/root-word-animation`

**第 3 步不能跳过。** 渲染一次 4–5 分钟，方向错了全废。构思表控制在 30 秒能扫完。

## 详细文档

| 文件 | 何时读 |
|---|---|
| `references/pipeline.md` | 每一步的完整命令与目录约定 |
| `references/design-principles.md` | **设计任何一场之前必读**：四问、角色最小化、元素调色盘、进出场规则、反例 |
| `references/design-patterns.md` | 写 `scenes.js` 时查：车/门/箱子/纸/传送带/钩爪/形变/粒子，含可直接抄的代码 |
| `references/design-format.md` | **写 `design.json` / `scenes.js` 前必读**：字段、4 种球形态、6 种表情、道具原语、音效名 |
| `references/design-table.md` | 出构思表时用，含填表硬约束 |
| `references/dictionary.md` | 查词典、判断可演性时用 |
| `references/pitfalls.md` | 出问题先查这里，每条都是真踩过的 |

## 固定常量（不要改）

| 项 | 值 |
|---|---|
| 每场动画 | 5.2s |
| 冻结点 | 4.42s（动作演完、词与释义都完整可见） |
| 冻结段 | 4.42 → 4.42+voDur，画面完全静止，播整词配音 |
| 帧率 / 画幅 | 30fps / 1080×1920（9:16，抖音） |
| 音色 | `en-US-AriaNeural`，rate −8% |
| 品牌色 | 球 `#1a6ff0`，受惊橙 `#ef5b3d`，墨 `#121316` |
| 字体 | Roboto Bold（已 base64 内嵌在母版里） |

## 交付

| 文件 | 说明 |
|---|---|
| `<root>-1080x1920.mp4` | 主交付 |
| `<root>.mp4` | 750×1334 原尺寸 |
| `index-<root>.html` | 网页预览（无配音，但节奏与成片一致） |
| 构思表 + 校验结果 | 文本，附在回复里 |

## 四条底线

1. **音效时刻从动画分支点抄，不凭听感调。** 改动作就同步改 `cues`；`pop`（1.60s）前后 ±0.15s 内不放任何音效，否则基线被污染、校验误报。
2. **冻结态是观众停留最久的一帧**，球和道具必须分得开（同色就会糊在一起）。
3. **每个词根一套独立文件，不覆盖旧版。**
4. **元素的出现和消失必须有理由。** 换角色一律用位移（滚出 / 驶入 / 掉落 / 被吊走），不靠 `opacity` 淡入淡出；只有"整场都不再需要它"才允许淡出。进场前留 0.2–0.4s 空场。
