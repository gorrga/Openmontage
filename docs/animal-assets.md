# Cartoon Animal Pack — asset notes

Source: the "Cartoon Animals Alphabet Pack" design handoff.

## ⚠️ What this pack actually is
It is **not** a set of illustration files. The original pack generates all art from
**emoji glyphs on an HTML canvas at runtime** — there are no SVG/PNG/WebM files in it.
What it provides that's reusable is a **curated content manifest** + a card design language.

Extracted to: [`remotion-composer/src/data/animal-assets.json`](../remotion-composer/src/data/animal-assets.json)

Contents:
- `alphabet` — 31 entries, each `{ letter, name, emoji }` (A→Alligator 🐊, B→Bear 🐻 / Butterfly 🦋, …)
- `megaPack` — 100 `{ name, emoji }` animals
- `animatedLoops` — 10 `{ name, emoji }` (the "nicest" set, meant for bouncing loops)
- `palettes` — `bright` / `pastel` / `candy` color cycles

## How we use it in the song pipeline
Our compositions render emoji natively (Noto Color Emoji is installed), so the manifest
plugs straight in:

- **Animal decor pop-ups** on any song:
  ```
  python3 scripts/build_song_props.py ... --decor animals          # mixed dozen
  python3 scripts/build_song_props.py ... --decor animals-loops     # the 10 loop animals
  python3 scripts/build_song_props.py ... --decor animals-alphabet  # all 31 A–Z animals
  ```
- **Animal-alphabet song** (future): use `alphabet[]` to show the right animal per letter
  (e.g. "A is for Alligator 🐊") on the lyric cards / floating blocks.
- **Palettes**: `bright`/`pastel`/`candy` match the `--palette` options already in the builder.

## If you want REAL illustrated animals (not emoji)
Emoji render differently per platform and aren't true illustrations. For consistent custom art
you'd need actual SVG/PNG/Lottie files. Those don't exist in this pack and can't be generated in
this environment (no image-generation credits). Options later: add an image-gen API key, commission
art, or I can hand-author simple SVG animals.
