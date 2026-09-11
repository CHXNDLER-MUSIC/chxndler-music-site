import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { Eyebrow, SectionShell } from "./ui";

export default function BrandFit({ pitch, accent }: { pitch: BrandPitch; accent: string }) {
  if (!pitch.fit_headline && !pitch.fit_intro && pitch.fit_points.length === 0) return null;

  return (
    <SectionShell className="border-t border-current/10">
      <Eyebrow color={accent}>{pitch.fit_eyebrow || "Why It Fits"}</Eyebrow>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-[1.5rem] mb-[3.5rem]">
        {pitch.fit_headline && (
          <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem] max-w-[38rem]">
            {pitch.fit_headline}
          </h2>
        )}
        {pitch.fit_intro && (
          <p className="text-[1.0625rem] leading-relaxed opacity-75 max-w-[26rem]">{pitch.fit_intro}</p>
        )}
      </div>

      {pitch.fit_points.length > 0 && (
        <ol className="divide-y divide-current/10 border-t border-b border-current/10">
          {pitch.fit_points.map((point, i) => (
            <li key={`${point.title}-${i}`} className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[6rem_1fr] gap-[1rem] py-[2rem]">
              <span
                className="text-[1.5rem] sm:text-[2rem] font-bold tabular-nums leading-none pt-[0.15rem]"
                style={{ color: accent }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[1.125rem] sm:text-[1.375rem] font-bold tracking-tight uppercase">
                  {point.title}
                </h3>
                {point.body && (
                  <p className="mt-[0.5rem] text-[1rem] leading-relaxed opacity-70 max-w-[36rem]">{point.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionShell>
  );
}
