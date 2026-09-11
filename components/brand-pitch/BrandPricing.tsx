import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { Eyebrow, SectionShell } from "./ui";

export default function BrandPricing({ pitch, accent }: { pitch: BrandPitch; accent: string }) {
  if (!pitch.pricing_name && pitch.starting_price === null && !pitch.pricing_note) return null;

  const price =
    typeof pitch.starting_price === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
          pitch.starting_price
        )
      : null;

  return (
    <SectionShell className="border-t border-current/10 text-center">
      <Eyebrow color={accent}>{pitch.pricing_eyebrow || "The Package"}</Eyebrow>

      {pitch.pricing_name && (
        <p className="text-[1rem] sm:text-[1.125rem] font-semibold tracking-[0.06em] uppercase opacity-70 max-w-[32rem] mx-auto">
          {pitch.pricing_name}
        </p>
      )}

      {price && (
        <div className="mt-[1.5rem]">
          <p className="text-[0.8125rem] font-semibold tracking-[0.2em] uppercase opacity-50">Starting At</p>
          <p className="mt-[0.5rem] font-bold tracking-tight text-[3.5rem] sm:text-[5rem] leading-none" style={{ color: accent }}>
            {price}
          </p>
        </div>
      )}

      {pitch.pricing_note && (
        <p className="mt-[2rem] text-[0.9375rem] sm:text-[1rem] leading-relaxed opacity-65 max-w-[34rem] mx-auto">
          {pitch.pricing_note}
        </p>
      )}
    </SectionShell>
  );
}
