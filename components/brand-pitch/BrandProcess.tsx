import React from "react";
import type { BrandPitch } from "@/lib/brandPitch";
import { Eyebrow, SectionShell } from "./ui";

// process_steps is a reusable 4-step template (idea → scope → commission →
// produce) used the same way across every brand, so icons are mapped by
// position rather than a per-brand field — no DB change, no code change
// needed when a new brand is added, even though step 4's title varies
// ("WE MAKE IT OATLY", "WE MAKE IT FENDER", etc.).
function IdeaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="10" r="6" />
      <path d="M9.5 18h5" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ScopeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </svg>
  );
}

function CommissionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

function ProduceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 14v-4" />
      <path d="M8 17v-10" />
      <path d="M12 19v-14" />
      <path d="M16 17v-10" />
      <path d="M20 14v-4" />
    </svg>
  );
}

const STEP_ICONS = [IdeaIcon, ScopeIcon, CommissionIcon, ProduceIcon];

export default function BrandProcess({ pitch, accent }: { pitch: BrandPitch; accent: string }) {
  if (!pitch.process_headline && pitch.process_steps.length === 0) return null;

  return (
    <SectionShell className="border-t border-current/10">
      <Eyebrow color={accent}>{pitch.process_eyebrow || "How It Works"}</Eyebrow>

      {pitch.process_headline && (
        <h2 className="font-bold leading-[1.02] tracking-tight text-[2rem] sm:text-[3rem] max-w-[38rem] mb-[3.5rem]">
          {pitch.process_headline}
        </h2>
      )}

      {pitch.process_steps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2rem]">
          {pitch.process_steps.map((step, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <div key={`${step.number}-${i}`} className="pt-[1.5rem] border-t-[0.1875rem]" style={{ borderColor: accent }}>
                <div className="flex items-center gap-[0.75rem] mb-[1.25rem]">
                  <span
                    className="flex-shrink-0 flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  >
                    <Icon className="w-[1.375rem] h-[1.375rem]" style={{ color: "#fff" }} />
                  </span>
                  <span className="text-[0.875rem] font-bold tabular-nums opacity-50">{step.number}</span>
                </div>
                <h3 className="text-[1.0625rem] font-bold tracking-tight uppercase">{step.title}</h3>
                {step.body && <p className="mt-[0.5rem] text-[0.9375rem] leading-relaxed opacity-70">{step.body}</p>}
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
