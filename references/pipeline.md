# 工序（9 步）

设 `SK = ~/.workbuddy/skills/root-word-animation`，工作目录为本次词根的项目目录。

---

## 目录约定

```
<工作目录>/
├── design.json            数据（词表 / 线型 / 音效）
├── scenes.js              7 场动作逻辑
├── _vo/                   w_<word>.mp3 + .wav
├── _frames/               逐帧 png
├── _snap/                 预检截图
├── index-<root>.html      动画页
├── timeline.json          时间轴（自动生成）
├── cues.json              音效绝对时刻表（自动生成）
├── audio-<root>.wav       成品音轨
├── <root>-1080x1920.mp4   抖音 9:16
└── <root>.mp4             750×1334
```

---

## 第 1 步 · 接词根

用户给一个词根（如 `spect`）。无需追问，直接进入第 2 步。

## 第 2 步 · 查词典选词

读 `dict/词根词典.csv`，筛出该词根的行：

1. 只留 `可演性` 为 3 或 2 的词（1 分丢弃）
2. 词数按实际，**3 个起、7 个封顶**，不硬凑
3. 若不足 3 个，告知用户「该词族过小，不建议单独成片」并停在构思表

## 第 3 步 · 构思（产出构思表，用户点头再往下）

按 `references/design-table.md` 出**四张表**（词表与线型 / 五要素 / 元素进出场 / 词义对应）。五要素是：

- **线型**（横线 / V 形 / Λ 形 / 杯形 / 自定义 4 顶点）
- **球体形态**（怎么变：缩放、拉伸、裂开、融合、变色、伸手）
- **道具**（有没有；用什么）
- **镜头**（推近 / 跟拍 / 上摇 / 震动，峰值倍数）
- **音效点**（3–6 个，标出对应动作）

**这一份必须给用户看**，因为渲染一次要 4–5 分钟，方向错了全废。

## 第 4 步 · 落成两个文件

写 `design.json` + `scenes.js`。格式与可用 API 见 `references/design-format.md`。

先写 `design.json` 时不填 `speech` / `voDur`（下一步自动回填）。

## 第 5 步 · 生成配音并回填时长

```bash
python $SK/scripts/tts.py --dir .
```

自动做：TTS → 裁前后静音 → 转 wav → 测时长 → 回填 `speech` 与 `voDur` 到 `design.json`。

音色固定 `en-US-AriaNeural`，语速 `-8%`。

## 第 6 步 · 生成动画页与时间轴

```bash
node $SK/scripts/build-root.js --dir .
```

产出 `index-<root>.html` + `timeline.json`。会打印总长与帧数。

## 第 7 步 · 预检截图

```bash
node $SK/scripts/snap.js --dir .
```

每场 2 张（动作中 + 冻结态）→ `_snap/`。**逐张看一遍**，重点查：

- 球是不是被道具挡住了、形态读不读得出来
- 表情有没有撑破轮廓
- 冻结态里词和释义是否都在、球和钩爪是否同色糊在一起
- 有没有元素跑出画面

有问题回第 4 步改，不要往下跑。

## 第 8 步 · 出音轨与成片

```bash
node $SK/scripts/make-audio.js --dir .            # 成品音轨
VO_ONLY=1  node $SK/scripts/make-audio.js --dir .  # 独立配音轨（校验用）
SFX_ONLY=1 node $SK/scripts/make-audio.js --dir .  # 独立音效轨（校验用）

rm -rf _frames          # 超过 50 个文件会被安全守卫拦截，必须先手动清
node $SK/scripts/render.js --dir .                 # 逐帧，约 4–5 分钟
node $SK/scripts/mix.js --dir .                    # 两版 mp4
```

## 第 9 步 · 五道校验

```bash
node $SK/scripts/verify.js --dir . --mp4 <root>-1080x1920.mp4
```

| 项 | 标准 |
|---|---|
| 配音起音 | 最大偏差 ≤ 50 ms |
| 音效起音 | 全部 ≤ 33 ms（渐入噪声可能误报，需人工判断） |
| 响度时长 | 时长 ≈ timeline，mean −19 ± 2.5 dB，max ≤ −0.5 dB |
| 冻结静止 | 段内两帧 PSNR > 45 dB（目检 `-frozen.png` 或抽两帧比） |
| 成片偏移 | 0 ms |

冻结静止无法用脚本自动判，靠第 7 步的 `-frozen.png` 目检（或对比同场两张冻结图的 PSNR，应 > 45 dB）。

---

## 交付

| 文件 | 说明 |
|---|---|
| `<root>-1080x1920.mp4` | 主交付，抖音 9:16 |
| `<root>.mp4` | 750×1334 原尺寸 |
| `index-<root>.html` | 网页预览 |
| 构思表 + 校验结果 | 文本，附在回复里 |
