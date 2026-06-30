#!/usr/bin/env python3
"""Build timed-lyrics props for the AlphabetSong composition from a Suno block.

Parses a lyrics file (Suno format with [Intro]/[Verse]/[Chorus]/[Outro] tags),
optionally takes sync anchors ("mm:ss substring" per line), and writes a props
JSON. Timing is interpolated between anchors by word-count weight; with no
anchors it spreads all lines across [lead-in, end].

Usage:
  python3 scripts/build_song_props.py \
      --lyrics scratch/count_lyrics.txt \
      --anchors scratch/count_anchors.txt \
      --audio song/count-to-20.mp3 \
      --title "Count to 20 — Superhero Style!" \
      --lead-in 0.5 --end 112 \
      --blocks numbers20 --palette superhero \
      --out remotion-composer/public/song-props/count-to-20.json
"""
import argparse
import json
import re
from pathlib import Path

SECTION_MAP = [
    ("intro", "intro"),
    ("chorus", "chorus"),
    ("outro", "outro"),
    ("verse", "verse"),
    ("bridge", "verse"),
    ("pre-chorus", "verse"),
]

PALETTES = {
    "primary": ["#FF5A5F", "#FFC93C", "#2EC4F3", "#4CC76E", "#9B5DE5", "#FF924C", "#FF6FB5"],
    "superhero": ["#E63946", "#2563EB", "#FFD23F", "#22B14C", "#FF7B00", "#7C3AED"],
    "pastel": ["#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#BDB2FF", "#FFC6FF"],
    "candy": ["#FF4D6D", "#FF8FA3", "#FFB3C1", "#A0C4FF", "#BDB2FF", "#FFD23F"],
}


def section_for(tag: str) -> str:
    t = tag.lower()
    for key, val in SECTION_MAP:
        if key in t:
            return val
    return "verse"


def parse_lyrics(text: str):
    lines = []
    section = "verse"
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        m = re.match(r"^\[(.+?)\]", s)
        if m:
            section = section_for(m.group(1))
            # A tag line may also carry text after the bracket; capture it.
            rest = s[m.end():].strip()
            if rest:
                lines.append((rest, section))
            continue
        lines.append((s, section))
    return lines


def parse_time(ts: str) -> float:
    ts = ts.strip()
    if ":" in ts:
        mm, ss = ts.split(":")
        return int(mm) * 60 + float(ss)
    return float(ts)


def parse_anchors(text: str, lines):
    """Each anchor line: 'mm:ss some substring of the target lyric line'.
    Bracketed section tags in the anchor text are ignored for matching."""
    anchors = {}  # line_index -> time
    search_from = 0
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        m = re.match(r"^(\d+:\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s+(.*)$", s)
        if not m:
            continue
        t = parse_time(m.group(1))
        needle = re.sub(r"\[.*?\]", "", m.group(2)).strip().lower()
        needle = needle.strip('"').strip()
        if not needle:
            continue
        # Match the first lyric line at/after search_from that contains the needle
        # (fall back to a shorter prefix if the full needle isn't found).
        idx = None
        for probe in (needle, " ".join(needle.split()[:3]), needle.split()[0] if needle.split() else needle):
            for i in range(search_from, len(lines)):
                if probe and probe in lines[i][0].lower():
                    idx = i
                    break
            if idx is not None:
                break
        if idx is not None:
            anchors[idx] = t
            search_from = idx + 1
    return anchors


def build_timing(lines, anchors, lead_in, end):
    n = len(lines)
    weights = [max(3, len(text.split())) for text, _ in lines]
    cum = [0.0] * (n + 1)
    for i in range(n):
        cum[i + 1] = cum[i] + weights[i]

    # Boundary anchors: boundary i = start of line i.
    pts = {0: lead_in, n: end}
    for li, t in anchors.items():
        pts[li] = t
    keys = sorted(pts)

    times = [0.0] * (n + 1)
    for a, b in zip(keys, keys[1:]):
        ta, tb = pts[a], pts[b]
        span = cum[b] - cum[a]
        for k in range(a, b + 1):
            frac = 0.0 if span == 0 else (cum[k] - cum[a]) / span
            times[k] = ta + (tb - ta) * frac

    out = []
    for i, (text, sec) in enumerate(lines):
        out.append({
            "text": text,
            "inSeconds": round(times[i], 2),
            "outSeconds": round(times[i + 1], 2),
            "section": sec,
        })
    return out


def resolve_blocks(spec: str):
    if not spec or spec == "letters":
        return None  # composition default A-Z
    if spec == "numbers20":
        return [str(i) for i in range(1, 21)]
    if spec == "numbers10":
        return [str(i) for i in range(1, 11)]
    if spec == "digits":
        return list("0123456789")
    return [tok.strip() for tok in spec.split(",") if tok.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lyrics", required=True)
    ap.add_argument("--anchors", default="")
    ap.add_argument("--audio", default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--lead-in", type=float, default=0.5)
    ap.add_argument("--end", type=float, required=True, help="End of singing (seconds), e.g. the analyze tail.")
    ap.add_argument("--blocks", default="letters", help="letters | numbers20 | numbers10 | digits | comma,list")
    ap.add_argument("--palette", default="primary", help="primary | superhero | pastel | candy")
    ap.add_argument("--card", action="store_true", help="Render lyric lines on high-contrast flashcards.")
    ap.add_argument("--decor", default="", help="Comma-separated emoji to sprinkle as pop-ups.")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    lines = parse_lyrics(Path(args.lyrics).read_text(encoding="utf-8"))
    anchors = {}
    if args.anchors and Path(args.anchors).exists():
        anchors = parse_anchors(Path(args.anchors).read_text(encoding="utf-8"), lines)

    lyrics = build_timing(lines, anchors, args.lead_in, args.end)

    props = {"audioSrc": args.audio, "title": args.title, "lyrics": lyrics}
    blocks = resolve_blocks(args.blocks)
    if blocks:
        props["blockTokens"] = blocks
    if args.palette in PALETTES and args.palette != "primary":
        props["palette"] = PALETTES[args.palette]
    if args.card:
        props["cardStyle"] = True
    if args.decor:
        props["decor"] = [d.strip() for d in args.decor.split(",") if d.strip()]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(props, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}: {len(lyrics)} lines, {len(anchors)} anchors matched, "
          f"blocks={args.blocks}, palette={args.palette}")
    for li in sorted(anchors):
        print(f"  anchor: {anchors[li]:6.1f}s -> [{lyrics[li]['section']}] {lyrics[li]['text'][:42]}")


if __name__ == "__main__":
    main()
