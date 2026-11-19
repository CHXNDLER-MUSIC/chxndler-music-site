export type SongWorkflowRecord = {
  audio_status?: string | null;
  workflow_stage?: string | null;
  production_tracking_started?: boolean;
  production_stages?: Record<string, boolean> | null;
};

export type SongPipelineKey = "idea" | "progress" | "final" | "unset";

export const PRODUCTION_MILESTONES = ["concept", "lyrics", "recorded", "mix", "mastered", "ready"] as const;

export function songPipelineKey(song: SongWorkflowRecord): SongPipelineKey {
  const stage = song.workflow_stage;
  if (stage === "Ready" || song.audio_status === "Final") return "final";
  if (stage && ["Writing", "Recording", "Mixing", "Mastering"].includes(stage)) return "progress";
  if (song.audio_status === "In Progress") return "progress";
  const milestones = song.production_stages || {};
  if (milestones.ready === true) return "final";
  if (["lyrics", "recorded", "mix", "mastered"].some(key => milestones[key] === true)) return "progress";
  if (stage === "Idea" && (song.production_tracking_started || milestones.concept === true)) return "idea";
  if (song.audio_status === "Demo" && song.production_tracking_started) return "idea";
  if (milestones.concept === true) return "idea";
  return "unset";
}

export function songProductionLabel(song: SongWorkflowRecord): string {
  const stage = song.workflow_stage;
  const milestones = song.production_stages || {};
  const hasMilestoneData = PRODUCTION_MILESTONES.some(key => milestones[key] === true);
  if (stage && (stage !== "Idea" || song.production_tracking_started || hasMilestoneData)) {
    return stage === "Ready" ? "Final / Ready" : stage === "Idea" ? "Idea / Demo" : stage;
  }
  if (song.audio_status === "In Progress" || song.audio_status === "Final") return song.audio_status;
  if (song.audio_status === "Demo" && song.production_tracking_started) return "Idea / Demo";
  if (milestones.ready) return "Final / Ready";
  if (["mastered", "mix", "recorded", "lyrics"].some(key => milestones[key] === true)) return "In Progress";
  if (milestones.concept) return "Idea / Demo";
  return "Production stage not set";
}

export function trackedProductionMilestones(song: SongWorkflowRecord): number | null {
  const milestones = song.production_stages || {};
  if (!PRODUCTION_MILESTONES.some(key => milestones[key] === true)) return null;
  return PRODUCTION_MILESTONES.filter(key => milestones[key] === true).length;
}
