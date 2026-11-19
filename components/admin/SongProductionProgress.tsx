"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PRODUCTION_MILESTONES, PRODUCTION_MILESTONE_LABELS, PRODUCTION_STAGE_ORDER,
  completedProductionMilestones, effectiveProductionStage, milestoneValue,
  requiredMilestonesForStage, type ProductionMilestone, type ProductionStage,
} from "@/lib/songWorkflow";

type SongProgress = {
  id: string; title: string; workflow_stage?: string | null; production_stages?: Record<string, boolean> | null;
  production_progress_verified?: boolean; next_action?: string | null; is_released?: boolean;
};

function ProductionStageIcon({ stage, complete = true, label }: { stage: ProductionStage | null; complete?: boolean; label?: string }) {
  const color = stage === "Idea" ? "#FD52AF" : stage === "Writing" ? "#A78BFA" : stage === "Recording" ? "#42B8E8" : stage === "Mixing" ? "#F2B84B" : stage === "Mastering" ? "#55D6A4" : "#8b8b96";
  return <svg aria-hidden="true" title={label} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 ${complete ? "opacity-100" : "opacity-25"}`}>
    {stage === "Idea" ? <><path d="M9 18h6M10 22h4M8.2 14.5a7 7 0 1 1 7.6 0c-.9.6-1.3 1.4-1.4 2.5h-4.8c-.1-1.1-.5-1.9-1.4-2.5Z"/><path d="M12 4v2M5.6 6.6 7 8M18.4 6.6 17 8"/></>
      : stage === "Writing" ? <><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/><path d="m13 6 5 5"/></>
      : stage === "Recording" ? <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M9 22h6"/></>
      : stage === "Mixing" ? <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="#0d0d12"/><circle cx="15" cy="12" r="2" fill="#0d0d12"/><circle cx="8" cy="18" r="2" fill="#0d0d12"/></>
      : stage === "Mastering" ? <><path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/></>
      : <><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>}
  </svg>;
}

function milestonesForSong(song: SongProgress) {
  return Object.fromEntries(PRODUCTION_MILESTONES.map(key => [key, song.is_released === true || milestoneValue(song, key)])) as Record<ProductionMilestone, boolean>;
}

const milestoneStage: Record<ProductionMilestone, ProductionStage> = {
  concept: "Idea", lyrics: "Writing", recorded: "Recording", mixed: "Mixing", mastered: "Mastering",
};

export default function SongProductionProgress({ song, onSaved, compact = false }: { song: SongProgress; onSaved?: (song: Partial<SongProgress>) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<ProductionStage | "">(effectiveProductionStage(song) || "");
  const [milestones, setMilestones] = useState<Record<ProductionMilestone, boolean>>(() => milestonesForSong(song));
  const [nextAction, setNextAction] = useState(song.next_action || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) return;
    setStage(effectiveProductionStage(song) || "");
    setMilestones(milestonesForSong(song));
    setNextAction(song.next_action || "");
  }, [song, open]);

  const required = useMemo(() => requiredMilestonesForStage(stage || null), [stage]);
  const visibleMilestones = song.is_released ? milestonesForSong(song) : milestones;
  const missing = required.filter(key => !visibleMilestones[key]);
  const order = [...PRODUCTION_MILESTONES];
  const stagePosition = stage ? PRODUCTION_STAGE_ORDER.indexOf(stage) : -1;
  const laterCompleted = stagePosition < 0 ? [] : order.slice(stagePosition + (stage === "Mastering" ? 1 : 0)).filter(key => visibleMilestones[key]);
  const completed = song.is_released ? PRODUCTION_MILESTONES.length : completedProductionMilestones({ production_stages: visibleMilestones });
  const verified = song.production_progress_verified === true || song.is_released === true;

  async function save() {
    setSaving(true); setError("");
    const response = await fetch("/api/admin/song-tracker", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ songId: song.id, workflow_stage: stage || null, production_milestones: visibleMilestones, production_progress_verified: true, next_action: nextAction }),
    });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { setError(body.error || "Unable to save production progress."); return; }
    const updated = body.song || {};
    const savedSong = { ...song, ...updated, workflow_stage: stage || null, production_stages: updated.production_stages || visibleMilestones, production_progress_verified: true, next_action: updated.next_action ?? nextAction };
    onSaved?.(savedSong);
    window.dispatchEvent(new CustomEvent("song-production-updated", { detail: savedSong }));
    setOpen(false);
  }

  return <div className="relative min-w-0">
    <button type="button" aria-expanded={open} aria-label={`Production progress for ${song.title}: ${verified ? effectiveProductionStage(song) || "Stage not set" : "Set progress"}. Edit progress`} onClick={() => { setError(""); setOpen(value => !value); }} className={`group w-full rounded-xl text-left transition ${compact ? "p-1 hover:bg-white/[.04]" : "rounded-xl border border-white/[.08] bg-[#111116] p-4 hover:border-[#FD52AF]/25"}`}>
      <span className="flex items-center gap-2"><ProductionStageIcon stage={verified ? effectiveProductionStage(song) : null}/><span className={`text-sm font-bold ${verified ? "text-white" : "text-white/55"}`}>{verified ? effectiveProductionStage(song) || "Stage not set" : "Set progress"}</span><span aria-hidden="true" className="text-xs text-[#FD52AF] opacity-70 group-hover:opacity-100">✎</span></span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[.08]"><span className={`block h-full rounded-full bg-gradient-to-r from-violet-400 to-[#FD52AF] transition-[width] ${verified ? "" : "opacity-40"}`} style={{ width: verified ? `${completed / PRODUCTION_MILESTONES.length * 100}%` : "0%" }}/></span>
      <span className="mt-1.5 block text-[.66rem] text-white/45">{verified ? `${completed}/${PRODUCTION_MILESTONES.length} milestones complete` : "Production progress not reviewed"}</span>
      <span className="mt-2 flex items-center gap-2" aria-label={`Milestones: ${PRODUCTION_MILESTONES.map(key => `${PRODUCTION_MILESTONE_LABELS[key]} ${visibleMilestones[key] ? "complete" : "incomplete"}`).join(", ")}`}>
        {PRODUCTION_MILESTONES.map(key => <ProductionStageIcon key={key} stage={milestoneStage[key]} complete={visibleMilestones[key]} label={PRODUCTION_MILESTONE_LABELS[key]} />)}
      </span>
    </button>
    {open && <div role="dialog" aria-label={`Edit production progress for ${song.title}`} className="absolute left-0 top-full z-[80] mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#17171c] p-4 text-left shadow-2xl sm:w-80">
      <div className="mb-3 flex items-center"><div className="mr-auto"><p className="text-[.58rem] font-bold uppercase tracking-[.16em] text-[#FD52AF]">Production progress</p><h3 className="mt-0.5 text-sm font-bold text-white">{song.title}</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Close production editor" className="rounded-md px-2 py-1 text-lg text-white/45 hover:bg-white/5 hover:text-white">×</button></div>
      {!verified && <p className="mb-3 rounded-lg border border-amber-200/10 bg-amber-200/[.04] p-2.5 text-[.68rem] leading-relaxed text-amber-100/70">Saved defaults are unreviewed. Confirm each milestone and stage before this row shows a progress count.</p>}
      <label className="block text-[.65rem] font-semibold text-white/45">Current production stage<select value={stage} onChange={event => setStage(event.target.value as ProductionStage | "")} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0f0f13] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FD52AF]/50"><option value="">Stage not set</option>{PRODUCTION_STAGE_ORDER.map(item => <option key={item}>{item}</option>)}</select></label>
      <fieldset className="mt-3"><legend className="mb-1.5 text-[.65rem] font-semibold text-white/45">Production milestones</legend><div className="space-y-1">{PRODUCTION_MILESTONES.map(key => <label key={key} className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-white/75 ${song.is_released ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/[.04]"}`}><input type="checkbox" checked={visibleMilestones[key]} disabled={song.is_released} onChange={event => setMilestones(current => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-[#FD52AF]"/><ProductionStageIcon stage={milestoneStage[key]}/><span className="flex-1">{PRODUCTION_MILESTONE_LABELS[key]}</span><span className={visibleMilestones[key] ? "text-emerald-200" : "text-rose-200/65"}>{visibleMilestones[key] ? "✓" : "×"}</span></label>)}</div></fieldset>
      {missing.length > 0 && <p className="mt-2 text-[.65rem] leading-relaxed text-amber-100/75">To set {stage}, confirm completed prerequisites: {missing.map(key => PRODUCTION_MILESTONE_LABELS[key]).join(", ")}.</p>}
      {laterCompleted.length > 0 && <p className="mt-2 text-[.65rem] leading-relaxed text-amber-100/75">The selected stage conflicts with later completed milestones: {laterCompleted.map(key => PRODUCTION_MILESTONE_LABELS[key]).join(", ")}.</p>}
      <label className="mt-3 block text-[.65rem] font-semibold text-white/45">Next action<input maxLength={240} value={nextAction} onChange={event => setNextAction(event.target.value)} placeholder="Add a confirmed next step" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0f0f13] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#FD52AF]/50"/></label>
      {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
      <div className="mt-4 flex items-center justify-between gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:text-white">Cancel</button><button type="button" disabled={saving || missing.length > 0 || laterCompleted.length > 0} onClick={() => void save()} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-xs font-extrabold text-[#170d14] disabled:cursor-not-allowed disabled:opacity-45">{saving ? "Saving…" : "Save progress"}</button></div>
    </div>}
  </div>;
}
