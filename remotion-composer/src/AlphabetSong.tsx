import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";

// Rounded, friendly, preschool-classroom font.
const { fontFamily: fredoka } = loadFredoka("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random — same value every frame for the same seed. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function resolveAsset(src: string): string {
  if (!src) return src;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
  const clean = src.replace(/^file:\/\/\/?/, "");
  if (clean.startsWith("/") || /^[A-Za-z]:[\\/]/.test(clean)) {
    return `file:///${clean.replace(/\\/g, "/")}`;
  }
  return staticFile(clean);
}

// Bright primary palette (red, yellow, blue, green + friends).
const PALETTE = [
  "#FF5A5F", // red
  "#FFC93C", // yellow
  "#2EC4F3", // blue
  "#4CC76E", // green
  "#9B5DE5", // purple
  "#FF924C", // orange
  "#FF6FB5", // pink
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LyricSection = "intro" | "verse" | "chorus" | "outro";

export interface KidLyric {
  text: string;
  inSeconds: number;
  outSeconds: number;
  section?: LyricSection;
}

export interface AlphabetSongProps {
  audioSrc: string;
  title?: string;
  lyrics: KidLyric[];
  /** Tokens shown on the floating background blocks. Defaults to A–Z. */
  blockTokens?: string[];
  /** Accent colors for blocks, confetti, and leading words. Defaults to bright primary. */
  palette?: string[];
  /** Render each lyric line on a high-contrast flashcard (great for sight words). */
  cardStyle?: boolean;
  /** Emoji sprinkled as pop-ups for extra energy (animals/fun pictures). */
  decor?: string[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ---------------------------------------------------------------------------
// Background — sky gradient, sun, clouds, rainbow, floating alphabet blocks
// ---------------------------------------------------------------------------

const Sun: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = (frame / fps) * 12; // slow rotation, degrees
  const pulse = 1 + Math.sin((frame / fps) * 2) * 0.03;
  return (
    <div style={{ position: "absolute", top: -90, left: -90, width: 380, height: 380 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${spin}deg) scale(${pulse})`,
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 26,
              height: 220,
              marginLeft: -13,
              marginTop: -110,
              borderRadius: 14,
              background: "#FFD23F",
              transform: `rotate(${i * 30}deg)`,
              transformOrigin: "center",
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 240,
          height: 240,
          marginLeft: -120,
          marginTop: -120,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #FFE680 0%, #FFC93C 70%)",
          boxShadow: "0 0 60px rgba(255,201,60,0.6)",
          transform: `scale(${pulse})`,
        }}
      />
    </div>
  );
};

const Cloud: React.FC<{ seed: number; y: number; scale: number; speed: number }> = ({
  seed,
  y,
  scale,
  speed,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const drift = ((frame / fps) * speed + seededRandom(seed) * width) % (width + 400) - 200;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: drift,
        transform: `scale(${scale})`,
        filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.05))",
      }}
    >
      <div style={{ position: "relative", width: 220, height: 90 }}>
        {[
          { x: 0, y: 30, s: 70 },
          { x: 55, y: 0, s: 95 },
          { x: 120, y: 18, s: 80 },
          { x: 40, y: 40, s: 70 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.s,
              height: b.s,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.96)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const Rainbow: React.FC = () => {
  const bands = ["#FF5A5F", "#FF924C", "#FFC93C", "#4CC76E", "#2EC4F3", "#9B5DE5"];
  return (
    <div style={{ position: "absolute", right: -160, top: 80, opacity: 0.9 }}>
      {bands.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            right: i * 34,
            top: i * 34,
            width: 520 - i * 68,
            height: 520 - i * 68,
            borderRadius: "50%",
            border: `28px solid ${c}`,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: "rotate(45deg)",
          }}
        />
      ))}
    </div>
  );
};

const FloatingBlocks: React.FC<{ tokens: string[]; palette: string[] }> = ({ tokens, palette }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const letters = tokens.length ? tokens : LETTERS;
  const count = 11;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const letter = letters[Math.floor(seededRandom(i * 5 + 1) * letters.length)];
        const color = palette[i % palette.length];
        const baseX = seededRandom(i * 7 + 2) * (width - 160);
        const baseY = 120 + seededRandom(i * 11 + 3) * (height - 360);
        const bob = Math.sin((frame / fps) * 1.4 + i) * 16;
        const sway = Math.cos((frame / fps) * 0.9 + i) * 14;
        const rot = Math.sin((frame / fps) * 0.8 + i * 2) * 10;
        const size = 78 + seededRandom(i * 13 + 4) * 36;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: baseX + sway,
              top: baseY + bob,
              width: size,
              height: size,
              borderRadius: 18,
              background: color,
              boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.12), 0 10px 0 rgba(0,0,0,0.10)",
              transform: `rotate(${rot}deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.42,
              fontFamily: fredoka,
              fontWeight: 700,
              fontSize: size * (String(letter).length > 1 ? 0.42 : 0.6),
              color: "#fff",
              textShadow: "0 3px 0 rgba(0,0,0,0.18)",
            }}
          >
            {letter}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Background: React.FC<{ tokens: string[]; palette: string[] }> = ({ tokens, palette }) => {
  const { height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #4FB7F0 0%, #8FD6FF 55%, #CDEEFF 100%)",
        }}
      />
      {/* grassy ground */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.16,
          background: "linear-gradient(180deg, #6CCB5A 0%, #4CB13E 100%)",
          borderTopLeftRadius: "50% 60px",
          borderTopRightRadius: "50% 60px",
        }}
      />
      <Rainbow />
      <Sun />
      <Cloud seed={1} y={120} scale={1.0} speed={18} />
      <Cloud seed={2} y={300} scale={0.7} speed={12} />
      <Cloud seed={3} y={70} scale={0.55} speed={26} />
      <FloatingBlocks tokens={tokens} palette={palette} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Confetti — colorful falling bits, boosted during the chorus
// ---------------------------------------------------------------------------

const Confetti: React.FC<{ boost: number; palette: string[] }> = ({ boost, palette }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const count = 50;
  const active = Math.round(count * (0.35 + 0.65 * boost));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        if (i >= active) return null;
        const color = palette[i % palette.length];
        const startX = seededRandom(i * 7 + 1) * width;
        const speed = 70 + seededRandom(i * 3 + 5) * 130;
        const phase = seededRandom(i * 11 + 3) * Math.PI * 2;
        const drift = seededRandom(i * 17 + 4) * 120 - 60;
        const delay = seededRandom(i * 19 + 6) * 2;
        const t = Math.max(0, frame / fps - delay);
        const fallH = height + 80;
        const y = ((t * speed) % fallH) - 40;
        const x = startX + Math.sin(t * 2 + phase) * 40 + drift * (t % 3);
        const rot = (t * 220 + phase * 57) % 360;
        const w = 12 + seededRandom(i * 23 + 7) * 12;
        const h = 7 + seededRandom(i * 29 + 8) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x % (width + 80),
              top: y,
              width: w,
              height: h,
              background: color,
              borderRadius: 3,
              transform: `rotate(${rot}deg)`,
              opacity: 0.9 * (0.4 + 0.6 * boost),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Emoji pop-ups — animals / fun pictures that bounce in around the edges
// ---------------------------------------------------------------------------

const EmojiPopups: React.FC<{ emojis: string[] }> = ({ emojis }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!emojis.length) return null;
  const count = 8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const emoji = emojis[i % emojis.length];
        const x = (seededRandom(i * 7 + 1) * (width - 220)) + 40;
        // Keep emoji out of the central lyric band: top strip or bottom strip.
        const top = i % 2 === 0;
        const y = top
          ? height * (0.06 + seededRandom(i * 13 + 2) * 0.14)
          : height * (0.7 + seededRandom(i * 13 + 2) * 0.18);
        const size = 90 + seededRandom(i * 17 + 4) * 60;
        const cycleLen = Math.round(fps * (3.0 + seededRandom(i * 23 + 8) * 2.5));
        const offset = Math.round(seededRandom(i * 29 + 9) * cycleLen);
        const c = ((frame - offset) % cycleLen + cycleLen) % cycleLen;
        // pop in, hold, pop out
        const appear = spring({ frame: c, fps, config: { damping: 9, stiffness: 170, mass: 0.6 } });
        const out = interpolate(c, [cycleLen * 0.62, cycleLen * 0.8], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(appear, [0, 1], [0, 1]) * out;
        if (scale <= 0.01) return null;
        const wobble = Math.sin((frame + i * 9) / 6) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              fontSize: size,
              lineHeight: 1,
              transform: `scale(${scale}) rotate(${wobble}deg)`,
              filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.18))",
            }}
          >
            {emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Lyric line — big bold rounded text, thick dark outline, pop-in per word
// ---------------------------------------------------------------------------

const OUTLINE =
  "-4px -4px 0 #1b2a4a, 4px -4px 0 #1b2a4a, -4px 4px 0 #1b2a4a, 4px 4px 0 #1b2a4a," +
  "0px -5px 0 #1b2a4a, 0px 5px 0 #1b2a4a, -5px 0px 0 #1b2a4a, 5px 0px 0 #1b2a4a";

const LyricLine: React.FC<{ lyric: KidLyric; index: number; palette: string[]; cardStyle: boolean }> = ({
  lyric,
  index,
  palette,
  cardStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inFrame = lyric.inSeconds * fps;
  const outFrame = lyric.outSeconds * fps;
  if (frame < inFrame - 2 || frame > outFrame + 6) return null;

  const fadeOut = interpolate(frame, [outFrame, outFrame + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const words = lyric.text.split(" ");
  const isChorus = lyric.section === "chorus";
  const isBig = lyric.section === "intro" || lyric.section === "outro";
  const fontSize = isChorus ? 132 : isBig ? 96 : 116;
  const lineColor = isChorus ? "#FFE05A" : "#FFFFFF";

  // Bouncy whole-line pop-in (native text layout handles spacing/wrapping).
  const pop = spring({
    frame: frame - inFrame,
    fps,
    config: { damping: 9, stiffness: 200, mass: 0.7 },
  });
  const scale = interpolate(pop, [0, 1], [0.4, 1]);
  const rise = interpolate(pop, [0, 1], [60, 0]);
  const wiggle = Math.sin((frame - inFrame) / 9) * 1.2; // gentle energy
  const fadeIn = interpolate(frame, [inFrame - 2, inFrame + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Color the leading token of "X - ..." / "X is for ..." lines.
  const hasLeadLetter = words.length > 2 && /^[A-Za-z]+$/.test(words[0]) && words[0].length <= 3 && words[1] === "-";
  const leadColor = palette[index % palette.length];
  const cardBorder = isChorus ? "#FFC93C" : palette[index % palette.length];

  const textNode = hasLeadLetter ? (
    <>
      <span style={{ color: cardStyle ? leadColor : leadColor }}>{words[0]}</span>
      {" " + words.slice(1).join(" ")}
    </>
  ) : (
    lyric.text
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut * fadeIn,
        padding: "0 120px",
      }}
    >
      {cardStyle ? (
        <div
          style={{
            background: "#FFFFFF",
            border: `12px solid ${cardBorder}`,
            borderRadius: 36,
            padding: "34px 64px",
            maxWidth: 1560,
            textAlign: "center",
            boxShadow: "0 18px 0 rgba(0,0,0,0.12), 0 0 0 6px rgba(255,255,255,0.6)",
            transform: `translateY(${rise}px) scale(${scale}) rotate(${wiggle}deg)`,
          }}
        >
          <div
            style={{
              fontFamily: fredoka,
              fontWeight: 700,
              fontSize: Math.round(fontSize * 0.86),
              lineHeight: 1.08,
              color: "#1b2a4a",
            }}
          >
            {textNode}
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: fredoka,
            fontWeight: 700,
            fontSize,
            lineHeight: 1.1,
            color: lineColor,
            textShadow: OUTLINE,
            maxWidth: 1640,
            textAlign: "center",
            transform: `translateY(${rise}px) scale(${scale}) rotate(${wiggle}deg)`,
          }}
        >
          {textNode}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Title card (optional intro branding)
// ---------------------------------------------------------------------------

const TitleCard: React.FC<{ title: string; until: number }> = ({ title, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const untilFrame = until * fps;
  if (frame > untilFrame + 10) return null;
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 140, mass: 0.8 } });
  const exit = interpolate(frame, [untilFrame, untilFrame + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(enter, [0, 1], [0.5, 1]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
      <div
        style={{
          transform: `scale(${scale})`,
          fontFamily: fredoka,
          fontWeight: 700,
          fontSize: 150,
          textAlign: "center",
          color: "#FFFFFF",
          textShadow: OUTLINE,
          lineHeight: 1.0,
          padding: "0 80px",
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const AlphabetSong: React.FC<AlphabetSongProps> = ({
  audioSrc,
  title,
  lyrics,
  blockTokens,
  palette,
  cardStyle,
  decor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = frame / fps;

  const pal = palette && palette.length ? palette : PALETTE;
  const tokens = blockTokens && blockTokens.length ? blockTokens : LETTERS;

  // Chorus boost for confetti — ramps when inside a chorus line.
  const inChorus = lyrics.some(
    (l) => l.section === "chorus" && tSec >= l.inSeconds - 0.3 && tSec <= l.outSeconds + 0.3
  );
  const boost = inChorus ? 1 : 0.5;

  const firstLyricIn = lyrics.length ? lyrics[0].inSeconds : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#4FB7F0" }}>
      {audioSrc ? <Audio src={resolveAsset(audioSrc)} /> : null}
      <Background tokens={tokens} palette={pal} />
      {decor && decor.length ? <EmojiPopups emojis={decor} /> : null}
      <Confetti boost={boost} palette={pal} />
      {lyrics.map((l, i) => (
        <LyricLine key={i} lyric={l} index={i} palette={pal} cardStyle={!!cardStyle} />
      ))}
      {title ? <TitleCard title={title} until={Math.max(0.1, firstLyricIn - 0.2)} /> : null}
    </AbsoluteFill>
  );
};
