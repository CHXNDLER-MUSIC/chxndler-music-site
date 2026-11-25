"use client";

import { useEffect, useState } from "react";
import { PRODUCTION_MILESTONES, PRODUCTION_MILESTONE_LABELS, milestoneValue, type ProductionMilestone, type ProductionStage } from "@/lib/songWorkflow";

type SongProgress = {
  id: string; title: string; workflow_stage?: string | null; production_stages?: Record<string, boolean> | null;
  production_progress_verified?: boolean; next_action?: string | null; is_released?: boolean;
};

export function ProductionStageIcon({ stage, complete = true, className, dimIncomplete = true }: { stage: ProductionStage | null; complete?: boolean; className?: string; dimIncomplete?: boolean }) {
  const color = stage === "Idea" ? "#EF43A3" : stage === "Writing" ? "#A78BFA" : stage === "Recording" ? "#F2B84B" : stage === "Mixing" || stage === "Mastering" ? "#55D6A4" : "#8b8b96";
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className || "h-4 w-4"} shrink-0 ${!dimIncomplete || complete ? "opacity-100" : "opacity-30"}`}>
    {stage === "Idea" ? <><path d="M9 18h6M10 22h4M8.2 14.5a7 7 0 1 1 7.6 0c-.9.6-1.3 1.4-1.4 2.5h-4.8c-.1-1.1-.5-1.9-1.4-2.5Z"/><path d="M12 4v2M5.6 6.6 7 8M18.4 6.6 17 8"/></>
      : stage === "Writing" ? <><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/><path d="m13 6 5 5"/></>
      : stage === "Recording" ? <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M9 22h6"/></>
      : stage === "Mixing" ? <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="#0d0d12"/><circle cx="15" cy="12" r="2" fill="#0d0d12"/><circle cx="8" cy="18" r="2" fill="#0d0d12"/></>
      : stage === "Mastering" ? <><path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/></>
      : <><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>}
  </svg>;
}

function milestonesForSong(song: SongProgress) {
  return Object.fromEntries(PRODUCTION_MILESTONES.map(key => [key, milestoneValue(song, key)])) as Record<ProductionMilestone, boolean>;
}
const DISPLAY_MILESTONES: ProductionMilestone[] = ["lyrics", "recorded", "mixed"];
const milestoneStage: Record<ProductionMilestone, ProductionStage> = { concept: "Idea", lyrics: "Writing", recorded: "Recording", mixed: "Mixing", mastered: "Mastering" };

export default function SongProductionProgress({ song, onSaved, compact = false }: { song: SongProgress; onSaved?: (song: Partial<SongProgress>) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [milestones, setMilestones] = useState<Record<ProductionMilestone, boolean>>(() => milestonesForSong(song));
  const [instrumental, setInstrumental] = useState(song.production_stages?.instrumental === true);
  const [nextAction, setNextAction] = useState(song.next_action || "");
  const [saving, setSaving] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState<ProductionMilestone | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) return;
    setMilestones(milestonesForSong(song));
    setInstrumental(song.production_stages?.instrumental === true);
    setNextAction(song.next_action || "");
  }, [song, open]);

  const visibleMilestones = song.is_released ? milestonesForSong(song) : milestones;
  const completedStages = DISPLAY_MILESTONES.filter(key => visibleMilestones[key]).length;
  const completed = completedStages + (instrumental ? 1 : 0);

  async function save() {
    setSaving(true); setError("");
    const response = await fetch("/api/admin/song-tracker", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, production_milestones: visibleMilestones, production_progress_verified: true, next_action: nextAction }),
    });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { setError(body.error || "Unable to save production progress."); return; }
    const updated = body.song || {};
    const savedSong = { ...song, ...updated, production_stages: updated.production_stages || visibleMilestones, production_progress_verified: true, next_action: updated.next_action ?? nextAction };
    onSaved?.(savedSong);
    window.dispatchEvent(new CustomEvent("song-production-updated", { detail: savedSong }));
    setOpen(false);
  }

  async function toggleMilestone(key: ProductionMilestone) {
    if (savingMilestone) return;
    const updatedMilestones = { ...visibleMilestones, [key]: !visibleMilestones[key] };
    setSavingMilestone(key);
    setError("");
    const response = await fetch("/api/admin/song-tracker", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, production_milestones: updatedMilestones, production_progress_verified: true }),
    });
    const body = await response.json();
    setSavingMilestone(null);
    if (!response.ok) { setError(body.error || "Unable to update this milestone."); return; }
    const savedSong = { ...song, ...body.song, production_stages: body.song?.production_stages || updatedMilestones, production_progress_verified: true };
    setMilestones(updatedMilestones);
    onSaved?.(savedSong);
    window.dispatchEvent(new CustomEvent("song-production-updated", { detail: savedSong }));
  }

  async function toggleInstrumental() {
    if (savingMilestone) return;
    const next = !instrumental;
    setSavingMilestone("mixed");
    setError("");
    const response = await fetch("/api/admin/song-tracker", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, stage: "instrumental", complete: next }),
    });
    const body = await response.json();
    setSavingMilestone(null);
    if (!response.ok) { setError(body.error || "Unable to update instrumental status."); return; }
    const updatedStages = { ...(song.production_stages || {}), instrumental: next };
    setInstrumental(next);
    const savedSong = { ...song, ...body.song, production_stages: body.song?.production_stages || updatedStages };
    onSaved?.(savedSong);
    window.dispatchEvent(new CustomEvent("song-production-updated", { detail: savedSong }));
  }

  if (compact) return <div>
    <div className="flex items-center gap-1 sm:gap-2" aria-label={`Music production: ${completedStages} of 3 milestones complete`}>
      {DISPLAY_MILESTONES.map(key => <button key={key} type="button" disabled={savingMilestone !== null} aria-pressed={visibleMilestones[key]} aria-label={`${PRODUCTION_MILESTONE_LABELS[key]} ${visibleMilestones[key] ? "complete" : "incomplete"} for ${song.title}. Click to toggle.`} title={`${PRODUCTION_MILESTONE_LABELS[key]} · ${visibleMilestones[key] ? "Complete" : "Incomplete"} · Click to toggle`} onClick={() => void toggleMilestone(key)} className="rounded-md transition hover:bg-white/[.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"><ProductionStageIcon stage={milestoneStage[key]} complete={visibleMilestones[key]} className="h-6 w-6 sm:h-7 sm:w-7" /></button>)}
    </div>
    {error && <p role="alert" className="mt-1 max-w-52 text-[.62rem] leading-tight text-rose-200">{error}</p>}
  </div>;

  return <section className="relative rounded-xl border border-white/[.08] bg-[#111116] p-4 sm:p-5" aria-labelledby="music-production-heading">
    <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 id="music-production-heading" className="text-sm font-bold uppercase tracking-[.08em]">MUSIC PRODUCTION</h2></div></div>
    <div className="mt-5 flex justify-center">
      <div className="relative h-64 w-64 max-w-full rounded-full border border-white/10 bg-[#09090d] p-2 shadow-[0_0_40px_rgba(239,67,163,.08)]" aria-label="Music production progress flow">
        <div className="relative h-full w-full overflow-hidden rounded-full" style={{ background: `conic-gradient(from 0deg, ${visibleMilestones.lyrics ? "#A78BFA" : "#24232b"} 0deg 88deg, #09090d 88deg 92deg, ${visibleMilestones.recorded ? "#F2B84B" : "#24232b"} 92deg 178deg, #09090d 178deg 182deg, ${visibleMilestones.mixed ? "#55D6A4" : "#24232b"} 182deg 268deg, #09090d 268deg 272deg, ${instrumental ? "#42B8E8" : "#24232b"} 272deg 358deg, #09090d 358deg 360deg)` }}>
          {([
            { key: "instrumental", label: "Instrumental", complete: instrumental, position: "left-0 top-0", stage: null },
            { key: "lyrics", label: "Lyrics", complete: visibleMilestones.lyrics, position: "right-0 top-0", stage: "Writing" },
            { key: "recorded", label: "Recorded", complete: visibleMilestones.recorded, position: "right-0 bottom-0", stage: "Recording" },
            { key: "mixed", label: "Mixed", complete: visibleMilestones.mixed, position: "left-0 bottom-0", stage: "Mixing" },
          ] as const).map(item => <button key={item.key} type="button" disabled={savingMilestone !== null} aria-pressed={item.complete} aria-label={`${item.label} ${item.complete ? "complete" : "incomplete"} for ${song.title}. Click to toggle.`} title={`${item.label} · ${item.complete ? "Complete" : "Incomplete"} · Click to toggle`} onClick={() => item.key === "instrumental" ? void toggleInstrumental() : void toggleMilestone(item.key)} className={`absolute ${item.position} z-10 flex h-1/2 w-1/2 flex-col items-center justify-center gap-1.5 text-[.68rem] font-semibold transition hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 ${item.complete ? "text-white" : "text-white/45"}`}>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-[#101014]/90 shadow-md">
              {item.stage === null ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#42B8E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> : <ProductionStageIcon stage={item.stage} complete={item.complete} className="h-6 w-6"/>}
            </span>
            <span>{item.label}</span>
          </button>)}
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/10 bg-[#111116] text-center shadow-inner">
            <span className="text-xl font-black text-white">{completed}<span className="text-sm text-white/40">/4</span></span>
          </div>
        </div>
      </div>
    </div>
    {song.next_action && <p className="mt-3 text-xs text-white/45"><span className="font-semibold text-white/60">Next production action:</span> {song.next_action}</p>}
    {open && <div role="dialog" aria-label={`Edit production progress for ${song.title}`} className="absolute right-3 top-14 z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#17171c] p-4 text-left shadow-2xl sm:right-4">
      <div className="mb-3"><p className="text-[.58rem] font-bold uppercase tracking-[.16em] text-[#EF43A3]">Music Production</p><h3 className="mt-0.5 text-sm font-bold text-white">Milestones &amp; next step</h3></div>
      <fieldset><legend className="mb-2 text-[.65rem] font-semibold text-white/45">Milestones</legend><div className="space-y-1">{DISPLAY_MILESTONES.map(key => <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-xs hover:bg-white/[.04]"><input type="checkbox" checked={visibleMilestones[key]} onChange={event => setMilestones(current => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-[#EF43A3]"/><ProductionStageIcon stage={milestoneStage[key]}/><span className="font-medium text-white/75">{PRODUCTION_MILESTONE_LABELS[key]}</span></label>)}</div></fieldset>
      <label className="mt-3 block text-[.65rem] font-semibold text-white/45">Next action<input maxLength={240} value={nextAction} onChange={event => setNextAction(event.target.value)} placeholder="Add a confirmed next step" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0f0f13] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#EF43A3]/50"/></label>
      {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:text-white">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-[#EF43A3] px-4 py-2 text-xs font-bold text-[#170d14] disabled:opacity-50">{saving ? "Saving…" : "Save progress"}</button></div>
    </div>}
  </section>;
}
