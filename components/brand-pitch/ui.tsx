import React, { useEffect, useState } from "react";

/**
 * A brand_pitches row only stores a storage *path* — it has no way to know
 * whether that object was ever actually uploaded. This turns a real load
 * failure (404, removed asset, typo'd path) into the same "no asset" state
 * as a null/empty path, so every section's existing empty-state fallback
 * (hide the element, or show its placeholder) handles both cases identically
 * instead of a broken-image icon appearing wherever an upload is still pending.
 */
export function useAssetAvailable(src: string | null): { src: string | null; onError: () => void } {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  return { src: failed ? null : src, onError: () => setFailed(true) };
}

/**
 * Tries each candidate URL in order (most preferred first) and advances to
 * the next on a real load failure (404 — e.g. a brand hasn't uploaded that
 * particular derived asset yet). Returns null once every candidate has
 * failed, so the caller's own empty-state fallback shows through.
 */
export function useAssetChain(candidates: Array<string | null | undefined>): { src: string | null; onError: () => void } {
  const clean = candidates.filter((c): c is string => !!c);
  const key = clean.join("|");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [key]);
  return { src: clean[index] ?? null, onError: () => setIndex((i) => i + 1) };
}

export function Eyebrow({
  children,
  color,
  className = "",
  style,
}: {
  children?: React.ReactNode;
  color?: string;
  /** Additive — appended after the default classes so a caller can bump
   * spacing/etc. for one instance without affecting every other Eyebrow on
   * the page. Not reliable for overriding text size (Tailwind's own
   * cascade order, not className order, decides conflicting utilities) —
   * use `style` for that instead, since inline styles always win. */
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!children) return null;
  return (
    <p
      className={`text-[0.75rem] sm:text-[0.8125rem] font-semibold tracking-[0.3em] uppercase mb-[1rem] ${className}`}
      style={{ color: color || "currentColor", ...style }}
    >
      {children}
    </p>
  );
}

export function SectionShell({
  id,
  className = "",
  style,
  textureUrl,
  backgroundImage,
  backgroundOverlay,
  children,
}: {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Optional, subtle full-bleed atmosphere texture — not required content,
   * any section can opt in via this prop. Rendered at low opacity behind
   * the section's own background color, never affecting legibility. */
  textureUrl?: string | null;
  /** An optional full-strength background image layered over the section's
   * own solid backgroundColor (set via `style`) — used sparingly, only where
   * a section explicitly wants photographic texture instead of a flat color.
   * If unset, or it 404s, the solid color alone shows through untouched. */
  backgroundImage?: string | null;
  /** A CSS color/gradient layered over `backgroundImage` for legibility. Ignored if no image loads. */
  backgroundOverlay?: string;
  children: React.ReactNode;
}) {
  const texture = useAssetAvailable(textureUrl ?? null);
  const bg = useAssetAvailable(backgroundImage ?? null);
  return (
    <section
      id={id}
      className={`relative px-[6vw] sm:px-[8vw] py-[6rem] sm:py-[9rem] overflow-hidden ${className}`}
      style={style}
    >
      {bg.src && (
        <div className="absolute inset-0" aria-hidden="true">
          {/* data-no-lazy on every plain <img> in the brand-pitch template:
              components/LazyLoadEnhancer.tsx (mounted sitewide in app/layout.tsx)
              scans the whole document in a useEffect and stamps
              loading="lazy"/decoding="async"/fetchpriority="low" onto any <img>
              missing them. Since this app streams via React Server Components,
              that DOM mutation can land on a brand-pitch image before React
              finishes hydrating a later-arriving streamed chunk, which then
              sees "extra" attributes it didn't render and logs a hydration
              mismatch — a real race, not a content bug (confirmed: server
              HTML and a JS-disabled DOM both lack these attributes; they
              appear only once LazyLoadEnhancer's effect runs, in both dev and
              prod). `data-no-lazy` is LazyLoadEnhancer's own existing escape
              hatch (already used elsewhere in the codebase) — using it here
              opts these SSR'd images (whose src is already in the initial
              HTML, so the browser's own eager fetch has already started
              before this effect could ever run) out of a mutation that was
              already a no-op for them, removing the race with zero change to
              actual loading behavior. suppressHydrationWarning does NOT fix
              this — it only silences text-node mismatches, not attribute
              ones, which is why it was tried and removed. */}
          <img
            src={bg.src}
            alt=""
            onError={bg.onError}
            className="absolute inset-0 w-full h-full object-cover"
            data-no-lazy=""
          />
          {backgroundOverlay && <div className="absolute inset-0" style={{ background: backgroundOverlay }} />}
        </div>
      )}
      {texture.src && (
        <img
          src={texture.src}
          alt=""
          aria-hidden="true"
          onError={texture.onError}
          className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none"
          data-no-lazy="" // see the note above, on SectionShell's background <img>
        />
      )}
      <div className="relative max-w-[75rem] mx-auto">{children}</div>
    </section>
  );
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
