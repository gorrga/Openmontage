#!/usr/bin/env python3
"""Transcribe the song with word-level timestamps using faster-whisper.

Outputs JSON: {"duration": float, "words": [{"word","start","end"}, ...]}
Used to align the known lyric lines to the real audio timeline.
"""
import json
import sys
from faster_whisper import WhisperModel

audio = sys.argv[1] if len(sys.argv) > 1 else "remotion-composer/public/song/a-is-for-amazing.mp3"
out = sys.argv[2] if len(sys.argv) > 2 else "scratch/song_words.json"
model_size = sys.argv[3] if len(sys.argv) > 3 else "small"

print(f"Loading model '{model_size}'...", flush=True)
model = WhisperModel(model_size, device="cpu", compute_type="int8")

print("Transcribing (word timestamps)...", flush=True)
segments, info = model.transcribe(
    audio,
    word_timestamps=True,
    beam_size=5,
    vad_filter=False,
    language="en",
)

words = []
seg_list = []
for seg in segments:
    seg_list.append({"start": round(seg.start, 3), "end": round(seg.end, 3), "text": seg.text.strip()})
    for w in (seg.words or []):
        words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
    print(f"  [{seg.start:6.2f}-{seg.end:6.2f}] {seg.text.strip()}", flush=True)

import os
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump({"duration": info.duration, "words": words, "segments": seg_list}, f, indent=2)
print(f"\nWrote {out}: {len(words)} words, duration {info.duration:.2f}s")
