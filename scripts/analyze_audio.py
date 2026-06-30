#!/usr/bin/env python3
"""Acoustic analysis for lyric timing — fully local (ffmpeg decode + numpy).

No model downloads. Detects:
  - duration
  - lead_in: first sustained energy onset (instrumental intro length)
  - tail:    last sustained energy (so the outro word doesn't hang in silence)
  - gaps:    internal low-energy stretches (section breaks / instrumental fills)

Prints a JSON summary on stdout.
"""
import json
import subprocess
import sys
import numpy as np

audio = sys.argv[1] if len(sys.argv) > 1 else "remotion-composer/public/song/a-is-for-amazing.mp3"
SR = 16000

# Decode to mono 16-bit PCM via ffmpeg.
raw = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
    capture_output=True, check=True,
).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
duration = len(x) / SR

# Short-time RMS energy, 50 ms hop.
hop = int(SR * 0.05)
frames = len(x) // hop
rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(frames)])
t = np.arange(frames) * 0.05

# Smooth and threshold relative to the loud part of the track.
def smooth(a, k=5):
    ker = np.ones(k) / k
    return np.convolve(a, ker, mode="same")

env = smooth(rms, 5)
peak = np.percentile(env, 95)
thr = peak * 0.18  # "active" if above ~18% of the loud level
active = env > thr

# lead_in: first active frame.
lead_in = float(t[np.argmax(active)]) if active.any() else 0.0
# tail: last active frame.
last_idx = len(active) - 1 - np.argmax(active[::-1]) if active.any() else len(active) - 1
tail = float(t[last_idx])

# Internal gaps: runs of inactive frames >= 0.7s, between lead_in and tail.
gaps = []
i = 0
min_gap = 0.7
while i < len(active):
    if not active[i] and t[i] > lead_in and t[i] < tail:
        j = i
        while j < len(active) and not active[j]:
            j += 1
        gs, ge = t[i], t[min(j, len(t) - 1)]
        if ge - gs >= min_gap:
            gaps.append([round(gs, 2), round(ge, 2)])
        i = j
    else:
        i += 1

print(json.dumps({
    "duration": round(duration, 2),
    "lead_in": round(lead_in, 2),
    "tail": round(tail, 2),
    "gaps": gaps,
}, indent=2))
