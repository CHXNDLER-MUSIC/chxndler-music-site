import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { previewMusicVideoPlanImport, validateMusicVideoPlan, unresolvedMusicVideoPlanConflicts } from "../lib/musicVideoPlan.mjs";

const example = JSON.parse(await readFile(new URL("../docs/music-video-plan.example.json", import.meta.url), "utf8"));
const song = { id: example.project.songId, title: example.project.songTitle };

test("illustrative versioned plan validates and previews its full production plan", () => {
  assert.equal(validateMusicVideoPlan(example).valid, true);
  const preview = previewMusicVideoPlanImport({ plan: example, song, allowCreateProject: true });
  assert.equal(preview.counts.scenes.created, 3);
  assert.equal(preview.counts.shots.created, 6);
  assert.equal(preview.counts.tasks.created, 5);
  assert.equal(preview.counts.schedule.created, 3);
});

test("rejects an invalid song ID and invalid scene status", () => {
  const invalid = structuredClone(example);
  invalid.project.songId = "not-a-uuid";
  invalid.scenes[0].status = "booked";
  const result = validateMusicVideoPlan(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(issue => issue.path.includes("songId")));
  assert.ok(result.errors.some(issue => issue.path.includes("status")));
});

test("reimport is idempotent and preserves completed tasks", () => {
  const first = previewMusicVideoPlanImport({ plan: example, song, allowCreateProject: true });
  const workspace = structuredClone(first.candidateWorkspace);
  workspace.production.tasks[0].status = "Done";
  const second = previewMusicVideoPlanImport({ plan: example, song, project: { id: "video-1", status: "planning", workspace, public_concept: example.vision.concept } });
  assert.equal(second.counts.scenes.created, 0);
  assert.equal(second.counts.scenes.unchanged, 3);
  assert.equal(second.candidateWorkspace.production.tasks[0].status, "Done");
  assert.equal(second.candidateWorkspace.creative.concepts[0].scenes.length, 3);
});

test("conflicting scene descriptions require a choice and keep current by default", () => {
  const first = previewMusicVideoPlanImport({ plan: example, song, allowCreateProject: true });
  const workspace = structuredClone(first.candidateWorkspace);
  workspace.creative.concepts[0].scenes[0].description = "Existing approved scene description.";
  const project = { id: "video-1", status: "planning", workspace, public_concept: example.vision.concept };
  const preview = previewMusicVideoPlanImport({ plan: example, song, project });
  assert.ok(unresolvedMusicVideoPlanConflicts([preview]).length > 0);
  assert.equal(preview.candidateWorkspace.creative.concepts[0].scenes[0].description, "Existing approved scene description.");
  const key = `${song.id}::scene.room-intro.description`;
  const replace = previewMusicVideoPlanImport({ plan: example, song, project, choices: { [key]: "replace" } });
  assert.equal(replace.candidateWorkspace.creative.concepts[0].scenes[0].description, example.scenes[0].description);
  assert.equal(replace.candidateWorkspace.creative.concepts[0].scenes[1].description, workspace.creative.concepts[0].scenes[1].description);
});

test("published and completed projects are protected from release or scene regression", () => {
  const complete = previewMusicVideoPlanImport({ plan: example, song, project: { id: "done", status: "complete", workspace: { release: {}, creative: {} } } });
  assert.equal(complete.skipped, true);
  assert.equal(complete.candidateWorkspace, null);
  const published = previewMusicVideoPlanImport({ plan: example, song, project: { id: "published", status: "complete", workspace: { release: { publicationStatus: "Published", publicationConfirmed: true }, creative: {} } } });
  assert.equal(published.skipped, true);
  const songVideo = previewMusicVideoPlanImport({ plan: example, song: { ...song, youtube_music_video_url: "https://example.com/music-video" }, allowCreateProject: true });
  assert.equal(songVideo.skipped, true);
});

test("preliminary concept-only plan is valid and imports without invented scenes", () => {
  const preliminary = structuredClone(example);
  preliminary.project.developmentStatus = "needs_development";
  preliminary.project.planningStatus = "concept";
  preliminary.vision.narrativeOverview = "";
  preliminary.vision.format = null;
  preliminary.scenes = [];
  preliminary.production.castCrew = [];
  preliminary.production.locations = [];
  preliminary.production.wardrobe = [];
  preliminary.production.props = [];
  preliminary.production.shootSchedule = [];
  const result = validateMusicVideoPlan(preliminary);
  assert.equal(result.valid, true);
  const preview = previewMusicVideoPlanImport({ plan: preliminary, song, allowCreateProject: true });
  assert.equal(preview.counts.scenes.created, 0);
  assert.equal(preview.candidateWorkspace.creative.concepts[0].developmentStatus, "needs_development");
});
