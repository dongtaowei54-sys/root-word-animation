"""tts.py — 按 design.json 的词表批量生成整词配音

用法：python tts.py [--dir .] [--voice en-US-AriaNeural] [--rate -8%]

做三件事：
  1. 生成 _vo/w_<word>.mp3
  2. 裁掉前后静音，转 _vo/w_<word>.wav（44.1k 单声道）
  3. 把实测语音时长写回 design.json 的 speech 字段，并按公式算 voDur

依赖：edge-tts（需装在能 import 的 Python 里）+ ffmpeg
"""
import argparse
import json
import os
import subprocess
import sys

import asyncio
import edge_tts

TRIM = ("silenceremove=start_periods=1:start_silence=0.02:start_threshold=-42dB:"
        "stop_periods=-1:stop_silence=0.06:stop_threshold=-42dB")


def dur_of(p):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", p],
        capture_output=True, text=True)
    return float(out.stdout.strip())


async def synth(words, voice, rate, vo_dir):
    for w in words:
        mp3 = os.path.join(vo_dir, "w_%s.mp3" % w)
        await edge_tts.Communicate(w, voice, rate=rate).save(mp3)
        print("  tts", w)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=".")
    ap.add_argument("--voice", default="en-US-AriaNeural")
    ap.add_argument("--rate", default="-8%")
    a = ap.parse_args()

    d = os.path.abspath(a.dir)
    design_path = os.path.join(d, "design.json")
    design = json.load(open(design_path, encoding="utf-8"))
    vo_dir = os.path.join(d, "_vo")
    os.makedirs(vo_dir, exist_ok=True)

    words = [x["word"] for x in design["words"]]
    asyncio.run(synth(words, a.voice, a.rate, vo_dir))

    for item in design["words"]:
        w = item["word"]
        mp3 = os.path.join(vo_dir, "w_%s.mp3" % w)
        wav = os.path.join(vo_dir, "w_%s.wav" % w)
        subprocess.run(["ffmpeg", "-y", "-i", mp3, "-af", TRIM,
                        "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", wav,
                        "-loglevel", "error"], check=True)
        speech = round(dur_of(wav), 3)
        item["speech"] = speech
        # 槽位 = 语音时长 + 0.10s 缓冲，向上取到 0.05 的整数倍
        item["voDur"] = round((speech + 0.10) * 20 + 0.4999) / 20
        print("  %-10s speech %.3fs  voDur %.2fs" % (w, speech, item["voDur"]))

    json.dump(design, open(design_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    total = sum(5.2 + x["voDur"] for x in design["words"])
    print("\n✓ 配音 %d 条，估总长 %.2fs（%d 帧）" %
          (len(words), total, round(total * 30)))


if __name__ == "__main__":
    main()
