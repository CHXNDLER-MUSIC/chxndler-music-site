"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useInteractionSound } from "./useInteractionSound";

// Open viewers, oldest first. A viewer can open on top of another (e.g. a
// collectible card from inside the studio gallery); only the top one
// handles Escape/Tab, so Escape closes one layer at a time.
const openViewers: object[] = [];

/**
 * One generic, brand-agnostic fullscreen viewer shared by the cover-art and
 * collectible-card experiences on /brands/[slug] — a campaign's palette
 * drives only the accent glow/outline; everything else (dark theatrical
 * backdrop, chrome, focus/close behavior) stays identical across brands.
 * Deliberately independent of the CHXNDLERverse card system elsewhere in the
 * repo (CoverHologram, PopoutShell, HeartCoinModal): those are hardwired to
 * the game's neon palette and sound effects and aren't portaled to
 * document.body, so reusing them here would leak game styling into brand
 * pitches rather than adapt to each brand's own colors.
 */
export default function MediaViewerModal({
  open,
  onClose,
  onEscape,
  label,
  kind,
  accent,
  headerExtra,
  header,
  maxWidthClassName,
  background,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Overrides what Escape does (defaults to onClose) — e.g. stepping back
   * out of a nested view before a second Escape closes the viewer. The ×
   * button and backdrop click always use onClose. */
  onEscape?: () => void;
  /** The dynamic, brand-specific value — e.g. the song title. Still used for
   * the dialog's accessible name (`aria-label`) even when `header` overrides
   * the visual rendering below. */
  label: string;
  /** The static category caption — e.g. "Cover Art" or "Collectible Card". */
  kind: string;
  accent: string;
  headerExtra?: React.ReactNode;
  /** Overrides the default label/kind title block entirely — for a caller
   * whose header needs a different visual hierarchy (e.g. a small eyebrow
   * above a larger headline) than the standard big-title/small-caption
   * layout. `label`/`kind` are still used for the dialog's aria-label. */
  header?: React.ReactNode;
  /** Overrides the default `max-w-[40rem]` — for content wider than a
   * single-media viewer, e.g. a multi-column grid. */
  maxWidthClassName?: string;
  /** Optional layer that fills the whole dialog behind its content and stays
   * put while the content scrolls — e.g. a song's sky video. */
  background?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Dedicated "close" sound (close.mp3), distinct from the generic hover/click
  // bus every trigger elsewhere uses — every /brands/[slug] viewer (cover art,
  // collectible card, campaign lookbook, the studio portfolio launcher) is
  // built on this one modal, so wiring it here covers every top-right × in
  // the template with zero per-caller code.
  const { playClick: playClose } = useInteractionSound({ clickKey: "close" });

  // Kept in a ref so a caller passing an inline onClose (re-created every
  // render) doesn't re-run the open effect below — that would re-focus the
  // close button and re-order the viewer stack on every parent re-render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!open) return;

    const token = {};
    openViewers.push(token);
    const isTopmost = () => openViewers[openViewers.length - 1] === token;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        (onEscapeRef.current ?? onCloseRef.current)();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const index = openViewers.indexOf(token);
      if (index !== -1) openViewers.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-[1.25rem] sm:p-[2.5rem]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${label} — ${kind}`}
            className={`relative grid grid-cols-1 w-full ${maxWidthClassName || "max-w-[40rem]"} max-h-[90vh] overflow-hidden rounded-[1.5rem]`}
            style={{
              backgroundColor: "rgba(16,16,20,0.94)",
              boxShadow: `0 0 0 0.0625rem ${accent}33, 0 2rem 4rem -1rem rgba(0,0,0,0.6)`,
            }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background and content share one grid cell, so the background
                fills the dialog while only the content layer scrolls. */}
            {background && <div className="[grid-area:1/1] min-h-0">{background}</div>}

            <div data-modal-scroll="" className="[grid-area:1/1] relative min-h-0 max-h-[90vh] overflow-y-auto p-[1.5rem] sm:p-[2rem]">
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  playClose();
                  onClose();
                }}
                aria-label="Close"
                className="absolute top-[1rem] right-[1rem] inline-flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.15rem]"
                style={{ outlineColor: accent }}
              >
                <span aria-hidden="true" className="text-[1.25rem] leading-none">
                  ×
                </span>
              </button>

              {header || (
                <div className="pr-[2.5rem]">
                  <h2 className="text-[1.25rem] sm:text-[1.5rem] font-bold tracking-tight text-white">{label}</h2>
                  <p className="mt-[0.25rem] text-[0.6875rem] font-semibold tracking-[0.25em] uppercase text-white/50">
                    {kind}
                  </p>
                </div>
              )}

              {headerExtra}

              <div className="mt-[1.5rem]">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
