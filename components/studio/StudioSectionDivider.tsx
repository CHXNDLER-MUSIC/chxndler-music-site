"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { scrollToSection } from "./scrollTo";
import { STUDIO_PINK } from "./identity";
import { useInteractionSound } from "@/components/brand-pitch/useInteractionSound";

/**
 * A tiny centered "keep scrolling" affordance between /studio's major
 * sections — grows on hover and plays the sitewide hover sound, same as
 * every other interactive element on the page. Clicking scrolls smoothly to
 * the next section (scrollToSection), so it's a real wayfinding control, not
 * just decoration.
 */
export default function StudioSectionDivider({ targetId }: { targetId: string }) {
  const reduceMotion = useReducedMotion();
  const { playHover, playClick } = useInteractionSound();

  return (
    <div className="flex justify-center py-[0.875rem] sm:py-[1.125rem]">
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
        className="inline-flex items-center justify-center w-[2.25rem] h-[2.25rem] text-[1.375rem] leading-none rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[0.2rem]"
        style={{ color: STUDIO_PINK, outlineColor: STUDIO_PINK }}
      >
        <span aria-hidden="true">↓</span>
      </motion.button>
    </div>
  );
}
