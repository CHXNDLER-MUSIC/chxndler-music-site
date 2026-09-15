"use client";

import React, { useState } from "react";
import MediaViewerModal from "./MediaViewerModal";
import TiltSpinCard from "@/components/TiltSpinCard";
import { useInteractionSound } from "./useInteractionSound";

type Stage = "cover" | "cd" | "vinyl" | "cassette";

/** A resolved (or not-yet-uploaded) per-stage mockup photo, from useAssetAvailable. */
type StagePhoto = { src: string | null; onError: () => void };

/**
 * A brand's own uploaded mockup photo (cd.png / vinyl.png / cassette.png,
 * living beside cover art.png in Storage — see getDerivedPhotoAsset) is
 * already a finished, photo-real composition, so it's shown as-is rather
 * than dropped into another CSS frame.
 */
function PhotoMockup({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) {
  return (
    <div className="w-full h-full bg-[#111113] flex items-center justify-center">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        onError={onError}
        draggable={false}
        data-no-lazy="" // see ui.tsx SectionShell for why
      />
    </div>
  );
}

/**
 * Shared presentation shell for every stage's artwork (cover / CD / vinyl /
 * cassette) in the popout — a soft ambient glow that breathes behind the art
 * (matching the collectible card's popout treatment) plus TiltSpinCard so the
 * art itself can be dragged to tilt/spin, not just looked at.
 */
function SpinnableArtStage({
  accent,
  rounded,
  children,
}: {
  accent: string;
  rounded: string;
  children: React.ReactNode;
}) {
  // Drives the actual visible spin. TiltSpinCard's own transform only ever
  // applies the vertical (rotateX) wobble in spin mode — the Y-axis
  // "spin" it reports via onRotationChange has to be applied by the caller,
  // same as the collectible card's front/back faces do it.
  const [rotation, setRotation] = useState(0);

  return (
    <div className="art-stage-float relative mx-auto w-full max-w-[26rem] aspect-square">
      <div
        className={`pulse-glow absolute -inset-[10%] ${rounded} pointer-events-none`}
        aria-hidden="true"
        style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`, filter: "blur(2.5rem)" }}
      />
      <TiltSpinCard
        className={`relative w-full h-full ${rounded} overflow-hidden shadow-[0_2rem_4rem_-1rem_rgba(0,0,0,0.6)]`}
        maxRotateX={10}
        sensitivity={0.3}
        returnDuration={400}
        enableSpin
        spinSensitivity={0.8}
        onRotationChange={setRotation}
      >
        <div
          className="w-full h-full"
          style={{ transform: `rotateY(${rotation}deg)`, backfaceVisibility: "hidden" }}
        >
          {children}
        </div>
      </TiltSpinCard>
      <style jsx>{`
        .art-stage-float {
          animation: artStageFloat 3s ease-in-out infinite;
        }
        @keyframes artStageFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .pulse-glow {
          animation: artStagePulse 3s ease-in-out infinite;
        }
        @keyframes artStagePulse {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Pure-CSS presentation mockups reusing the same uploaded cover artwork — no
 * new assets, no 3D engine. Fallback for CD/vinyl when a brand hasn't
 * uploaded its own cd.png/vinyl.png photo mockup yet; see CoverArtViewer.
 */
function CssCoverArtStage({ stage, src, alt }: { stage: "cd" | "vinyl"; src: string; alt: string }) {
  if (stage === "cd") {
    return (
      <div
        className="relative w-full h-full"
        style={{ background: "linear-gradient(135deg, #f2f2f2 0%, #d9d9d9 45%, #f7f7f7 65%, #cfcfcf 100%)" }}
      >
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,255,255,0.7), rgba(160,160,175,0.15), rgba(255,255,255,0.7), rgba(160,160,175,0.15), rgba(255,255,255,0.7))",
            mixBlendMode: "overlay",
          }}
        />
        <div className="absolute rounded-full overflow-hidden" style={{ inset: "17%" }}>
          <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} data-no-lazy="" />
        </div>
        <div
          className="absolute rounded-full bg-white"
          style={{ inset: "48.5%", boxShadow: "inset 0 0 0 0.05rem rgba(0,0,0,0.15)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{
        background: "repeating-radial-gradient(circle at 50% 50%, #161616 0, #161616 0.1rem, #0a0a0a 0.2rem, #161616 0.3rem)",
      }}
    >
      <div className="absolute rounded-full overflow-hidden" style={{ inset: "32%" }}>
        <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} data-no-lazy="" />
      </div>
      <div
        className="absolute rounded-full bg-black"
        style={{ inset: "48.5%", boxShadow: "inset 0 0 0 0.05rem rgba(255,255,255,0.2)" }}
      />
    </div>
  );
}

/** No pure-CSS fallback exists for cassette (there's no prior mockup to fall back to) — a plain placeholder until the brand uploads cassette.png. */
function CassettePlaceholder({ accent }: { accent: string }) {
  return (
    <div
      className="w-full h-full bg-[#161616] flex flex-col items-center justify-center gap-[0.75rem]"
      aria-hidden="true"
    >
      <span className="text-[2.5rem]">📼</span>
      <span className="text-[0.6875rem] font-bold tracking-[0.15em] uppercase" style={{ color: `${accent}99` }}>
        Cassette artwork coming soon
      </span>
    </div>
  );
}

function CoverArtStage({
  stage,
  src,
  cd,
  vinyl,
  cassette,
  accent,
  alt,
}: {
  stage: Stage;
  src: string;
  cd?: StagePhoto;
  vinyl?: StagePhoto;
  cassette?: StagePhoto;
  accent: string;
  alt: string;
}) {
  // "cover" and any brand-uploaded photo mockup (cd/vinyl/cassette) are
  // finished rectangular compositions, so they stay a soft square — only the
  // CSS-drawn disc fallback (no cd.png/vinyl.png uploaded yet) is a true
  // circle.
  let content: React.ReactNode;
  let rounded = "rounded-[1rem]";

  if (stage === "cover") {
    content = <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} data-no-lazy="" />;
  } else if (stage === "cd") {
    if (cd?.src) {
      content = <PhotoMockup src={cd.src} alt={alt} onError={cd.onError} />;
    } else {
      content = <CssCoverArtStage stage="cd" src={src} alt={alt} />;
      rounded = "rounded-full";
    }
  } else if (stage === "vinyl") {
    if (vinyl?.src) {
      content = <PhotoMockup src={vinyl.src} alt={alt} onError={vinyl.onError} />;
    } else {
      content = <CssCoverArtStage stage="vinyl" src={src} alt={alt} />;
      rounded = "rounded-full";
    }
  } else {
    content = cassette?.src ? (
      <PhotoMockup src={cassette.src} alt={alt} onError={cassette.onError} />
    ) : (
      <CassettePlaceholder accent={accent} />
    );
  }

  return (
    // Keyed by stage so switching tabs (cover/cd/vinyl/cassette) remounts a
    // fresh SpinnableArtStage instead of carrying over the previous tab's
    // spin/tilt state.
    <SpinnableArtStage key={stage} accent={accent} rounded={rounded}>
      {content}
    </SpinnableArtStage>
  );
}

/**
 * The clickable cover-art thumbnail used in "Hear the Concept". Hover gives
 * a subtle scale + "inspect" affordance; click opens the shared
 * MediaViewerModal with the full-resolution artwork and optional CD/vinyl/
 * cassette presentation toggles (COVER is always the default — the mockups
 * are a bonus, never the point). Each toggle prefers the brand's own
 * uploaded photo mockup (cd.png/vinyl.png/cassette.png, see
 * getDerivedPhotoAsset) and falls back to a CSS approximation — or, for
 * cassette, a placeholder — when that file hasn't been uploaded yet.
 */
export default function CoverArtViewer({
  src,
  songTitle,
  accent,
  className = "",
  onError,
  cd,
  vinyl,
  cassette,
}: {
  src: string;
  songTitle: string;
  accent: string;
  className?: string;
  onError?: () => void;
  cd?: StagePhoto;
  vinyl?: StagePhoto;
  cassette?: StagePhoto;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("cover");
  const { playHover, playClick } = useInteractionSound();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playClick();
          setOpen(true);
        }}
        onMouseEnter={playHover}
        aria-haspopup="dialog"
        aria-label={`View ${songTitle} cover art`}
        className={`group relative block w-full rounded-[1rem] overflow-hidden cursor-pointer transition-transform duration-300 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.25rem] ${className}`}
        style={{ outlineColor: accent }}
      >
        <img
          src={src}
          alt={`${songTitle} cover art`}
          className="w-full h-full object-cover"
          onError={onError}
          draggable={false}
          data-no-lazy="" // see ui.tsx SectionShell for why
        />
        <span
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-hidden="true"
        >
          <span className="inline-flex items-center gap-[0.4rem] rounded-full bg-white/90 px-[1rem] py-[0.5rem] text-[0.75rem] font-bold tracking-[0.1em] uppercase text-black shadow-[0_0.5rem_1.5rem_-0.25rem_rgba(0,0,0,0.4)]">
            ⤢ View Artwork
          </span>
        </span>
      </button>

      <MediaViewerModal
        open={open}
        onClose={() => setOpen(false)}
        label={songTitle}
        kind="Cover Art"
        accent={accent}
        headerExtra={
          <div role="tablist" aria-label="Presentation" className="mt-[1.25rem] flex gap-[0.5rem]">
            {(["cover", "cd", "vinyl", "cassette"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={stage === s}
                onClick={() => {
                  playClick();
                  setStage(s);
                }}
                onMouseEnter={playHover}
                className="rounded-full px-[1rem] py-[0.4rem] text-[0.75rem] font-bold tracking-[0.08em] uppercase transition-colors duration-200"
                style={
                  stage === s
                    ? { backgroundColor: accent, color: "#0a0a0c" }
                    : { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
                }
              >
                {s}
              </button>
            ))}
          </div>
        }
      >
        <CoverArtStage stage={stage} src={src} cd={cd} vinyl={vinyl} cassette={cassette} accent={accent} alt={`${songTitle} cover art`} />
      </MediaViewerModal>
    </>
  );
}
