#!/usr/bin/env python3
"""Build the timed-lyrics props JSON for the AlphabetSong Remotion composition.

The real Suno song's per-line timing isn't known until the MP3 exists, so this
distributes the known lyric lines across the track by a word-count weight as a
sensible first pass. Once the MP3 is available, pass --duration with the real
length (and later, fine-tune individual in/out seconds, or replace with
forced-alignment output) and re-render.

Usage:
  python3 scripts/build_alphabet_props.py \
      --audio remotion-composer/public/song/a-is-for-amazing.mp3 \
      --duration 165 \
      --out remotion-composer/public/song-props/alphabet-song.json
"""
import argparse
import json
from pathlib import Path

# (text, section) — section drives styling + confetti boost in the composition.
CHORUS = [
    ("A B C D E F G!", "chorus"),
    ("Every letter is a friend to me!", "chorus"),
    ("H I J K L M N!", "chorus"),
    ("Sing it loud and sing it again!", "chorus"),
    ("O P Q R S T U!", "chorus"),
    ("I love learning, how about you?", "chorus"),
    ("V W X Y Z!", "chorus"),
    ("We know our ABCs, yes we do!", "chorus"),
]

LINES = [
    ("Hey friends! Are you ready to learn your letters?", "intro"),
    ("Let's move, let's sing, let's go!", "intro"),
    # Verse 1
    ("A is for amazing, let's stomp our feet!", "verse"),
    ("B is for bouncing, feel the beat!", "verse"),
    ("C is for clapping, clap along!", "verse"),
    ("D is for dancing to this song!", "verse"),
    *CHORUS,
    # Verse 2
    ("E is for excited, jump up high!", "verse"),
    ("F is for flying, touch the sky!", "verse"),
    ("G is for giggling, hee hee hee!", "verse"),
    ("H is for happy, just like me!", "verse"),
    *CHORUS,
    # Verse 3
    ("I is for incredible, that is you!", "verse"),
    ("J is for jumping, jump jump jump!", "verse"),
    ("K is for kicking, kick kick kick!", "verse"),
    ("L is for leaping, leap leap leap!", "verse"),
    *CHORUS,
    # Outro
    ("We know our letters A through Z!", "outro"),
    ("Learning is so fun, don't you agree?", "outro"),
    ("Let's say them one more time!", "outro"),
    ("A B C D E F G H I J K L M N O P Q R S T U V W X Y Z!", "outro"),
    ("Amazing!", "outro"),
]


def build(duration: float, lead_in: float, audio_src: str):
    # Weight each line by word count (a rough proxy for how long it's sung),
    # with a floor so very short lines still get screen time.
    weights = [max(3, len(text.split())) for text, _ in LINES]
    total_w = sum(weights)
    singing = max(1.0, duration - lead_in)

    lyrics = []
    t = lead_in
    for (text, section), w in zip(LINES, weights):
        dur = singing * (w / total_w)
        lyrics.append(
            {
                "text": text,
                "inSeconds": round(t, 2),
                "outSeconds": round(t + dur, 2),
                "section": section,
            }
        )
        t += dur

    return {
        "audioSrc": audio_src,
        "title": "A is for AMAZING!",
        "lyrics": lyrics,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default="", help="Path/URL to the song audio (relative to composer public/, or absolute).")
    ap.add_argument("--duration", type=float, default=165.0, help="Total song length in seconds.")
    ap.add_argument("--lead-in", type=float, default=0.4, help="Silence/instrumental before first lyric.")
    ap.add_argument("--out", default="remotion-composer/public/song-props/alphabet-song.json")
    args = ap.parse_args()

    props = build(args.duration, args.lead_in, args.audio)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(props, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} — {len(props['lyrics'])} lines over {args.duration:.0f}s "
          f"(audio: {args.audio or '<none yet>'})")


if __name__ == "__main__":
    main()
