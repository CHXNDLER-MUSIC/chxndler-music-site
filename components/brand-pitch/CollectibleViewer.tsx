"use client";

import React, { useEffect, useRef, useState } from "react";
import MediaViewerModal from "./MediaViewerModal";
import TiltSpinCard, { type TiltSpinCardControls } from "@/components/TiltSpinCard";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { useInteractionSound } from "./useInteractionSound";
import { sfx } from "@/lib/sfx";

/**
 * The clickable collectible card in the "Collectible" section. The teaser
 * button just opens the popout; the popout itself mirrors the
 * CHXNDLERverse/Heartverse card experience on chxndler.world (see
 * CoverHologram + TiltSpinCard) — a gently floating card you can drag to
 * tilt/spin, and tap to flip to its back. The back is the same universal
 * CHXNDLER card-back art used for every card in the Heartverse (getCardImageUrl
 * "BACK"), not brand content, so it needs no per-brand asset and stays
 * consistent across every future /brands/[slug] pitch.
 */
export default function CollectibleViewer({
  src,
  songTitle,
  accent,
  onError,
}: {
  src: string;
  songTitle: string;
  accent: string;
  onError?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [cardRotation, setCardRotation] = useState(0);
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false);
  const tiltControlsRef = useRef<TiltSpinCardControls | null>(null);
  const { playHover, playClick } = useInteractionSound();

  // Reset to front-facing, untilted whenever the popout is reopened.
  useEffect(() => {
    if (!open) {
      setCardRotation(0);
      setIsAnimatingFlip(false);
    }
  }, [open]);

  const handleFlip = () => {
    try {
      sfx.play("flip", 0.5);
    } catch {
      // Missing/unavailable asset — never block the interaction it's attached to.
    }
    setIsAnimatingFlip(true);
    // Goes through the hook's own rotation tracking (not a local +180) so a
    // drag right after a flip continues from the angle actually on screen
    // instead of snapping back to wherever the last drag left off.
    tiltControlsRef.current?.addSpinRotation(180);
    setTimeout(() => setIsAnimatingFlip(false), 500);
  };

  return (
    <div className="w-full max-w-[22rem] sm:max-w-[26rem]">
      <button
        type="button"
        onClick={() => {
          playClick();
          setOpen(true);
        }}
        onMouseEnter={playHover}
        aria-haspopup="dialog"
        aria-label={`View ${songTitle} collectible card`}
        className="group relative block w-full aspect-[5/7] rounded-[1.5rem] overflow-hidden cursor-pointer shadow-[0_3rem_6rem_-2rem_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out hover:-translate-y-[0.5rem] hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem]"
        style={{ backgroundColor: `${accent}14`, outlineColor: accent }}
      >
        <img
          src={src}
          alt={`${songTitle} collectible card`}
          className="w-full h-full object-contain"
          onError={onError}
          data-no-lazy="" // see ui.tsx SectionShell for why
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
          style={{ boxShadow: `0 0 0 0.125rem ${accent}80, 0 1.5rem 3rem -0.75rem ${accent}66` }}
        />
        <span
          className="absolute bottom-[1rem] inset-x-[1rem] flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm py-[0.5rem] text-[0.75rem] font-bold tracking-[0.1em] uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        >
          ⤢ Inspect Card
        </span>
      </button>

      <MediaViewerModal open={open} onClose={() => setOpen(false)} label={songTitle} kind="Collectible Card" accent={accent}>
        <div className="relative mx-auto w-full max-w-[20rem] collectible-float" style={{ aspectRatio: "5 / 7" }}>
          <TiltSpinCard
            className="relative w-full h-full rounded-[1.25rem] overflow-hidden shadow-[0_2rem_4rem_-1rem_rgba(0,0,0,0.6)]"
            style={{ backgroundColor: `${accent}14` }}
            maxRotateX={10}
            sensitivity={0.3}
            returnDuration={400}
            enableSpin
            spinSensitivity={0.8}
            onRotationChange={setCardRotation}
            onClick={handleFlip}
            controlsRef={tiltControlsRef}
          >
            <img
              src={src}
              alt={`${songTitle} collectible card`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                backfaceVisibility: "hidden",
                transform: `rotateY(${cardRotation}deg)`,
                transition: isAnimatingFlip ? "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              }}
              draggable={false}
              data-no-lazy="" // see ui.tsx SectionShell for why
            />
            <img
              src={getCardImageUrl("BACK")}
              alt={`${songTitle} collectible card back`}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                backfaceVisibility: "hidden",
                transform: `rotateY(${cardRotation + 180}deg)`,
                transition: isAnimatingFlip ? "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              }}
              draggable={false}
              data-no-lazy="" // see ui.tsx SectionShell for why
            />
          </TiltSpinCard>
        </div>
        <style jsx>{`
          .collectible-float {
            animation: collectibleCardFloat 3s ease-in-out infinite;
          }
          @keyframes collectibleCardFloat {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }
        `}</style>
      </MediaViewerModal>
    </div>
  );
}
