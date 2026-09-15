"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { STUDIO_BG_ALT, STUDIO_PINK } from "./identity";

const SERVICES = [
  {
    number: "01",
    title: "Original Music",
    body: "Original songs built around your brand, culture and audience — made to live beyond the campaign.",
    Symbol: WaveformSymbol,
  },
  {
    number: "02",
    title: "Sonic Identity",
    body: "Ownable sonic signatures and recurring sounds people recognize in seconds.",
    Symbol: SonicMnemonicSymbol,
  },
  {
    number: "03",
    title: "Creative Worlds",
    body: "We turn the sound into visuals, content, campaigns and real-world experiences.",
    Symbol: WorldExpandSymbol,
  },
];

/** Typography-led, deliberately restrained — no gradient cards, no icons, no borders-as-decoration. */
export default function StudioServices() {
  const reduceMotion = useReducedMotion();

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <SectionShell
      id="services"
      className="scroll-mt-[4.5rem] !py-[3.5rem] sm:!py-[4.5rem]"
      style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}
    >
      <Eyebrow color={STUDIO_PINK} style={{ fontSize: "1.125rem" }}>
        What We Do
      </Eyebrow>

      <div className="mt-[2.75rem] sm:mt-[3.5rem] grid grid-cols-1 sm:grid-cols-3 gap-[1.75rem] sm:gap-[2rem] divide-y sm:divide-y-0 divide-white/10">
        {SERVICES.map((service, i) => {
          const Symbol = service.Symbol;
          return (
            <motion.div
              key={service.number}
              {...fade(i * 0.08)}
              className="group pt-[1.75rem] sm:pt-0 first:pt-0 sm:border-l sm:first:border-l-0 sm:pl-[2rem] sm:first:pl-0 border-white/10 hover:border-white/25 transition-colors duration-300"
            >
              <div className="flex justify-center">
                <Symbol />
              </div>

              <p className="mt-[1.375rem] text-[0.8125rem] font-bold tracking-[0.2em] text-[#EF43A3]/60 transition-colors duration-300 group-hover:text-[#EF43A3]">
                {service.number}
              </p>
              <h3 className="mt-[0.75rem] font-bold uppercase tracking-tight text-[1.5rem] sm:text-[1.75rem] text-white/90 transition-colors duration-300 group-hover:text-white">
                {service.title}
              </h3>
              <p className="mt-[0.875rem] text-[1rem] leading-[1.85] text-white/60 max-w-[22rem] transition-colors duration-300 group-hover:text-white/70">
                {service.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// Shared visual language across all three: viewBox 0 0 80 40 (~70-90px wide,
// ~35-50px tall once rendered), 1.5px rounded-cap strokes, muted silver by
// default, no fill except small nodes/pulses, no background/container —
// meant to read as thin linework related to the alien logo's own strokes,
// not as icon-set clip art. Each brightens toward white and gains one pink
// accent point on hover (via the service column's own `group`), plus a
// restrained one-shot transform — never a looping animation — guarded by
// Tailwind's `motion-safe:` variant so prefers-reduced-motion gets the
// color change only, no movement.
const SYMBOL_WRAPPER = "h-[3.25rem] w-[6.75rem] text-white/45 transition-colors duration-300 group-hover:text-white/85";

// Per-bar hover scale, deliberately uneven (not a uniform bounce) — one shot
// via CSS transition on :hover, never a repeating animation. Each entry is
// the complete Tailwind class (not just the scale value) so the JIT scanner
// can see the literal, whole class name in this file rather than one
// assembled at runtime from a partial string.
const WAVE_HOVER_SCALE = [
  "motion-safe:group-hover:scale-y-110",
  "motion-safe:group-hover:scale-y-90",
  "motion-safe:group-hover:scale-y-125",
  "motion-safe:group-hover:scale-y-95",
  "motion-safe:group-hover:scale-y-100",
  "motion-safe:group-hover:scale-y-115",
  "motion-safe:group-hover:scale-y-90",
  "motion-safe:group-hover:scale-y-120",
  "motion-safe:group-hover:scale-y-95",
  "motion-safe:group-hover:scale-y-110",
  "motion-safe:group-hover:scale-y-90",
];

/** 01 — a musical, slightly irregular waveform (not a uniform equalizer). */
function WaveformSymbol() {
  const bars: Array<[number, number]> = [
    [4, 6],
    [11, 10],
    [18, 15],
    [25, 8],
    [32, 17],
    [39, 11],
    [46, 16],
    [53, 7],
    [60, 13],
    [67, 9],
    [74, 5],
  ];
  return (
    <svg viewBox="0 0 80 40" fill="none" aria-hidden="true" className={SYMBOL_WRAPPER}>
      {bars.map(([x, h], i) => (
        <line
          key={x}
          x1={x}
          y1={20 - h}
          x2={x}
          y2={20 + h}
          strokeWidth="1.5"
          strokeLinecap="round"
          className={
            i === 4
              ? `stroke-white/45 transition-all duration-300 group-hover:stroke-[#EF43A3] ${WAVE_HOVER_SCALE[i]}`
              : `stroke-current motion-safe:transition-transform motion-safe:duration-300 ${WAVE_HOVER_SCALE[i]}`
          }
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

/** 02 — four notes of a short sonic mnemonic, deliberately uneven heights. */
function SonicMnemonicSymbol() {
  const notes: Array<[number, number]> = [
    [14, 10],
    [32, 18],
    [50, 13],
    [68, 22],
  ];
  return (
    <svg viewBox="0 0 80 40" fill="none" aria-hidden="true" className={SYMBOL_WRAPPER}>
      <line x1="10" y1="32" x2="70" y2="32" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
      {notes.map(([x, h], i) => (
        <g
          key={x}
          className="opacity-60 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100"
          style={{ transitionDelay: `${i * 90}ms` }}
        >
          <line x1={x} y1="32" x2={x} y2={32 - h} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle
            cx={x}
            cy={32 - h}
            r="2.4"
            fill={i === notes.length - 1 ? undefined : "currentColor"}
            stroke="none"
            className={i === notes.length - 1 ? "fill-white/45 transition-colors duration-300 group-hover:fill-[#EF43A3]" : undefined}
          />
        </g>
      ))}
    </svg>
  );
}

/** 03 — a small central pulse expanding outward into nested frames (sound → visual → world). */
function WorldExpandSymbol() {
  return (
    <svg viewBox="0 0 80 40" fill="none" aria-hidden="true" className={SYMBOL_WRAPPER}>
      <rect
        x="10"
        y="2"
        width="60"
        height="36"
        rx="6"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
        style={{ transformBox: "fill-box", transformOrigin: "center", transitionDelay: "160ms" }}
      />
      <rect
        x="20"
        y="6"
        width="40"
        height="28"
        rx="5"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
        style={{ transformBox: "fill-box", transformOrigin: "center", transitionDelay: "80ms" }}
      />
      <rect
        x="29"
        y="11"
        width="22"
        height="18"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle
        cx="40"
        cy="20"
        r="2.6"
        stroke="none"
        className="fill-white/45 transition-colors duration-300 group-hover:fill-[#EF43A3]"
      />
    </svg>
  );
}
