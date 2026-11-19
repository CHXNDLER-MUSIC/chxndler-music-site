export type ProductionStage = "Idea" | "Writing" | "Recording" | "Mixing" | "Mastering";
export const PRODUCTION_STAGE_ORDER: ProductionStage[] = ["Idea", "Writing", "Recording", "Mixing", "Mastering"];
export const PRODUCTION_MILESTONES = ["concept", "lyrics", "recorded", "mixed", "mastered"] as const;
export type ProductionMilestone = (typeof PRODUCTION_MILESTONES)[number];

export type SongWorkflowRecord = {
  audio_status?: string | null;
  workflow_stage?: string | null;
  production_tracking_started?: boolean;
  production_progress_verified?: boolean;
  production_stages?: Record<string, boolean> | null;
};

export type SongPipelineKey = "idea" | "writing" | "recording" | "mixing" | "mastering" | "unset";

const aliases: Record<ProductionMilestone, string[]> = {
  concept: ["concept"], lyrics: ["lyrics", "write"], recorded: ["recorded", "record"],
  mixed: ["mixed", "mix"], mastered: ["mastered"],
};

export function milestoneValue(song: SongWorkflowRecord, milestone: ProductionMilestone): boolean {
  const values = song.production_stages || {};
  return aliases[milestone].some(key => values[key] === true);
}

export function completedProductionMilestones(song: SongWorkflowRecord): number {
  return PRODUCTION_MILESTONES.filter(milestone => milestoneValue(song, milestone)).length;
}

export function hasVerifiedProductionProgress(song: SongWorkflowRecord): boolean {
  return song.production_progress_verified === true;
}

export function effectiveProductionStage(song: SongWorkflowRecord): ProductionStage | null {
  if (!hasVerifiedProductionProgress(song)) return null;
  return PRODUCTION_STAGE_ORDER.includes(song.workflow_stage as ProductionStage)
    ? song.workflow_stage as ProductionStage : null;
}

export function songPipelineKey(song: SongWorkflowRecord): SongPipelineKey {
  const stage = effectiveProductionStage(song);
  if (!stage) return "unset";
  return stage.toLowerCase() as SongPipelineKey;
}

export function songProductionLabel(song: SongWorkflowRecord): string {
  const stage = effectiveProductionStage(song);
  return stage || "Set progress";
}

export function trackedProductionMilestones(song: SongWorkflowRecord): number | null {
  return hasVerifiedProductionProgress(song) ? completedProductionMilestones(song) : null;
}

export function requiredMilestonesForStage(stage: ProductionStage | null): ProductionMilestone[] {
  if (stage === "Writing") return ["concept"];
  if (stage === "Recording") return ["concept", "lyrics"];
  if (stage === "Mixing") return ["concept", "lyrics", "recorded"];
  if (stage === "Mastering") return ["concept", "lyrics", "recorded", "mixed"];
  return [];
}

export const PRODUCTION_MILESTONE_LABELS: Record<ProductionMilestone, string> = {
  concept: "Concept", lyrics: "Lyrics", recorded: "Recorded", mixed: "Mixed", mastered: "Mastered",
};
