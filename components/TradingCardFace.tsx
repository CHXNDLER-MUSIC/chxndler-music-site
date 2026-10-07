"use client";

import React from "react";
import { useTiltSpinCardTilt } from "@/components/TiltSpinCard";
import { CARD_ASPECT_RATIO, CARD_CORNER_RADIUS } from "@/lib/cardStyle";

const FLIP_TRANSITION = "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * One side (front or back) of a trading card inside a TiltSpinCard.
 *
 * - Fills its parent and centers a real card-shaped (63×88) face in it, so the
 *   rounded corners always land on the card art — never on letterbox space.
 * - Turns with `rotation` (rotateY) and hides its back, like the old <img> faces.
 * - Holo shine: a soft light band that slides across as the card is tilted or
 *   spun, invisible when the card is held flat.
 * - Edge highlight: a thin light rim so the printed frame reads against any background.
 *
 * The parent must have a size (e.g. `relative w-full h-full`).
 */
export default function TradingCardFace({
  src,
  alt,
  rotation = 0,
  animating = false,
  transition,
  shine = true,
  onError,
}: {
  src: string;
  alt: string;
  /** Full rotateY of this face in degrees (back faces pass rotation + 180). */
  rotation?: number;
  /** True while a tap-flip is animating — eases the turn. */
  animating?: boolean;
  /** Overrides the turn transition entirely (e.g. a view that always eases). */
  transition?: string;
  shine?: boolean;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}) {
  const tilt = useTiltSpinCardTilt();

  // How far the card is turned away from flat, each axis in -1..1
  const tiltY = tilt
    ? tilt.enableSpin
      ? Math.sin((rotation * Math.PI) / 180)
      : tilt.rotateY / (tilt.maxRotateY || 1)
    : 0;
  const tiltX = tilt ? tilt.rotateX / (tilt.maxRotateX || 1) : 0;
  const shineStrength = shine ? Math.min(1, Math.hypot(tiltX, tiltY)) : 0;
  const settle = tilt?.isInteracting ? "none" : "opacity 400ms ease, background-position 400ms ease";

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "absolute",
        inset: 0,
        containerType: "size",
        display: "grid",
        placeItems: "center",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: `rotateY(${rotation}deg)`,
        transition: transition ?? (animating ? FLIP_TRANSITION : "none"),
      }}
    >
      <div
        style={{
          position: "relative",
          // Largest card-shaped box that fits the parent
          width: "min(100cqw, calc(100cqh * 63 / 88))",
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: CARD_CORNER_RADIUS,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.14), 0 10px 28px rgba(0,0,0,0.45)",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={onError}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Holo shine */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.55) 46%, rgba(255,255,255,0.18) 53%, transparent 68%)",
            backgroundSize: "250% 250%",
            backgroundPosition: `${50 + tiltY * 50}% ${50 + tiltX * 50}%`,
            mixBlendMode: "screen",
            opacity: shineStrength * 0.6,
            transition: settle,
          }}
        />
        {/* Edge highlight */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), inset 0 0 8px rgba(255,255,255,0.12)",
          }}
        />
      </div>
    </div>
  );
}
