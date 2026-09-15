"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eyebrow, SectionShell } from "@/components/brand-pitch/ui";
import { STUDIO_BG_ALT, STUDIO_PINK } from "./identity";

const SERVICES = [
  {
    number: "01",
    title: "Original Music",
    body: "Original songs built around a brand's identity, culture and audience.",
  },
  {
    number: "02",
    title: "Sonic Identity",
    body: "Ownable sonic signatures, mnemonics and recurring sounds that make a brand recognizable with your eyes closed.",
  },
  {
    number: "03",
    title: "Creative Direction",
    body: "Turning the music into a world — visuals, content, campaigns and physical concepts.",
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
    <SectionShell id="services" className="scroll-mt-[4.5rem]" style={{ backgroundColor: STUDIO_BG_ALT, color: "#ffffff" }}>
      <Eyebrow color={STUDIO_PINK}>What We Do</Eyebrow>

      <div className="mt-[2.5rem] sm:mt-[3.5rem] grid grid-cols-1 sm:grid-cols-3 gap-[2.5rem] sm:gap-[2rem] divide-y sm:divide-y-0 divide-white/10">
        {SERVICES.map((service, i) => (
          <motion.div key={service.number} {...fade(i * 0.08)} className={`pt-[2.5rem] sm:pt-0 first:pt-0 sm:border-l sm:first:border-l-0 sm:pl-[2rem] sm:first:pl-0 border-white/10`}>
            <p className="text-[0.8125rem] font-bold tracking-[0.2em]" style={{ color: STUDIO_PINK }}>
              {service.number}
            </p>
            <h3 className="mt-[0.75rem] font-bold uppercase tracking-tight text-[1.5rem] sm:text-[1.75rem]">
              {service.title}
            </h3>
            <p className="mt-[0.875rem] text-[1rem] leading-relaxed text-white/60 max-w-[22rem]">{service.body}</p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
