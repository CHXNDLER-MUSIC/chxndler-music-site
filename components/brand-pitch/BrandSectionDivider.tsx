"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInteractionSound } from "./useInteractionSound";

// Same smooth-scroll behavior as /studio's scrollTo.ts — kept local (not
// imported from components/studio) so this template stays independent of
// the studio page's own module.
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

/**
 * A tiny centered "keep scrolling" mark between the brand-pitch template's
 * major sections — same idle-attention treatment as /studio's
 * StudioSectionDivider (grows on hover, plays the sitewide hover sound,
 * scrolls to the next section on click), but always white rather than the
 * current pitch's own accent color: this template's sections swap between
 * the brand's campaign palette and flat dark surfaces section to section, so
 * white is the one mark color legible against all of them without
 * per-section color logic.
 *
 * Zero-height wrapper, not its own padded block: the arrow is pulled up via
 * a negative offset to sit inside the END of the PRECEDING section — on top
 * of that section's own background, not in a neutral strip between two
 * sections. Paints above the preceding section for free (later in DOM order
 * = later paint), so no z-index trick is needed for that; the explicit
 * z-index below only guards against a section's own inner stacking context.
 */
export default function BrandSectionDivider({ targetId }: { targetId: string }) {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound();

  return (
    <div className="relative h-0">
      {/* Positioning (absolute + centering translate) lives on this static
          wrapper, not on the motion.button below — framer-motion writes its
          own `transform` inline style for whileHover's `scale`, which would
          otherwise silently replace (not merge with) Tailwind's
          `-translate-x-1/2` class, snapping the button off-center on hover. */}
      <div className="absolute -top-[3.5rem] sm:-top-[4.5rem] left-1/2 -translate-x-1/2 z-20">
        <motion.button
          type="button"
          onClick={() => {
            playClick();
            scrollToSection(targetId);
          }}
          onMouseEnter={playHover}
          whileHover={reduceMotion ? undefined : { scale: 1.4 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-label="Scroll to next section"
          className="inline-flex items-center justify-center w-[2.75rem] h-[2.75rem] text-[1.75rem] leading-none text-white rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem] focus-visible:outline-white"
        >
          <span aria-hidden="true">↓</span>
        </motion.button>
      </div>
    </div>
  );
}
