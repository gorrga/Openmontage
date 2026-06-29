import { AbsoluteFill, useVideoConfig } from "remotion";
import React from "react";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";

const { fontFamily: fredoka } = loadFredoka("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const PALETTE = ["#FF5A5F", "#FFC93C", "#2EC4F3", "#4CC76E", "#9B5DE5", "#FF924C"];

const OUTLINE =
  "-5px -5px 0 #1b2a4a, 5px -5px 0 #1b2a4a, -5px 5px 0 #1b2a4a, 5px 5px 0 #1b2a4a," +
  "0px -6px 0 #1b2a4a, 0px 6px 0 #1b2a4a, -6px 0px 0 #1b2a4a, 6px 0px 0 #1b2a4a";

export interface AlphabetThumbnailProps {
  text: string; // e.g. "A is for AMAZING!"
}

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const Block: React.FC<{ letter: string; color: string; x: number; y: number; size: number; rot: number }> = ({
  letter,
  color,
  x,
  y,
  size,
  rot,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size * 0.16,
      background: color,
      transform: `rotate(${rot}deg)`,
      boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.14), 0 10px 0 rgba(0,0,0,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: fredoka,
      fontWeight: 700,
      fontSize: size * 0.6,
      color: "#fff",
      textShadow: "0 3px 0 rgba(0,0,0,0.2)",
    }}
  >
    {letter}
  </div>
);

export const AlphabetThumbnail: React.FC<AlphabetThumbnailProps> = ({ text }) => {
  const { width, height } = useVideoConfig();
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const scatter = Array.from({ length: 10 }, (_, i) => ({
    letter: letters[Math.floor(rand(i * 5 + 1) * letters.length)],
    color: PALETTE[i % PALETTE.length],
    x: rand(i * 7 + 2) * (width - 110),
    y: rand(i * 11 + 3) * (height - 110),
    size: 70 + rand(i * 13 + 4) * 40,
    rot: rand(i * 17 + 5) * 40 - 20,
  }));

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFD23F 0%, #FFB02E 100%)",
      }}
    >
      {/* sunburst */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
        <div style={{ position: "relative", width: 1000, height: 1000 }}>
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 70,
                height: 700,
                marginLeft: -35,
                marginTop: -350,
                background: "rgba(255,255,255,0.35)",
                transform: `rotate(${i * 22.5}deg)`,
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
      </AbsoluteFill>

      {/* scattered alphabet blocks around the edges */}
      {scatter.map((b, i) => (
        <Block key={i} {...b} />
      ))}

      {/* giant smiling A on the right */}
      <div style={{ position: "absolute", right: 60, top: 120 }}>
        <div
          style={{
            fontFamily: fredoka,
            fontWeight: 700,
            fontSize: 460,
            color: "#FF5A5F",
            textShadow: OUTLINE,
            lineHeight: 0.9,
            position: "relative",
          }}
        >
          A
          {/* eyes */}
          <div style={{ position: "absolute", left: 150, top: 150, display: "flex", gap: 24 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1b2a4a" }} />
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1b2a4a" }} />
          </div>
          {/* smile */}
          <div
            style={{
              position: "absolute",
              left: 150,
              top: 205,
              width: 92,
              height: 46,
              borderBottomLeftRadius: 92,
              borderBottomRightRadius: 92,
              border: "10px solid #1b2a4a",
              borderTop: "none",
            }}
          />
        </div>
      </div>

      {/* main title text, lower-left */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 180,
          width: 720,
          fontFamily: fredoka,
          fontWeight: 700,
          fontSize: 150,
          lineHeight: 0.98,
          color: "#FFFFFF",
          textShadow: OUTLINE,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
