import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { Eyebrow, SectionShell } from "./ui";

export default function BrandOffer({ pitch, accent }: { pitch: BrandPitch; accent: string }) {
  if (!pitch.offer_headline && !pitch.offer_intro && pitch.deliverables.length === 0) return null;

  const primary = pitch.deliverables.slice(0, 4);
  const secondary = pitch.deliverables.slice(4);

  return (
    <SectionShell className="border-t border-current/10">
      <Eyebrow color={accent}>{pitch.offer_eyebrow || "What I'm Proposing"}</Eyebrow>

      {pitch.offer_headline && (
        <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem] max-w-[42rem]">
          {pitch.offer_headline}
        </h2>
      )}
      {pitch.offer_intro && (
        <p className="mt-[1.25rem] text-[1.0625rem] leading-relaxed opacity-75 max-w-[40rem]">{pitch.offer_intro}</p>
      )}

      {primary.length > 0 && (
        <div className="mt-[3.5rem] grid grid-cols-1 sm:grid-cols-2 gap-[1.5rem]">
          {primary.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className="group rounded-[1.25rem] p-[1.75rem] sm:p-[2rem] bg-current/[0.06] border border-current/10 transition-all duration-300 hover:bg-current/[0.1] hover:-translate-y-[0.15rem]"
            >
              <span
                className="inline-flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-full text-[0.9375rem] font-bold tabular-nums mb-[1.25rem]"
                style={{ backgroundColor: accent, color: "#fff" }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[1.25rem] sm:text-[1.5rem] font-black tracking-tight uppercase">{item.title}</h3>
              {item.body && (
                <p className="mt-[0.5rem] text-[0.9375rem] leading-relaxed opacity-70">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {secondary.length > 0 && (
        <div className="mt-[1.5rem] rounded-[1.25rem] border border-current/10 bg-current/[0.03] p-[1.5rem] sm:p-[1.75rem] flex flex-col sm:flex-row sm:items-start gap-[0.75rem] sm:gap-[2.5rem]">
          <span className="text-[0.75rem] font-semibold tracking-[0.15em] uppercase opacity-45 flex-shrink-0">
            Also Included
          </span>
          <div className="flex flex-col gap-[0.5rem]">
            {secondary.map((item, i) => (
              <p key={`${item.title}-${i}`} className="text-[0.9375rem] leading-relaxed opacity-70">
                <span className="font-semibold">{item.title}</span>
                {item.body ? ` — ${item.body}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
