import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { previewMusicVideoPlanImport, validateMusicVideoPlan } from "../lib/musicVideoPlan.mjs";

const sourcePath = "supabase/chxndler_music_video_import_source_60.json";
const outputPath = "supabase/chxndler_music_video_import_preview_60";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase URL/service key are not configured in the environment.");
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const norm = value => String(value || "").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLocaleLowerCase();
const editDistance = (a, b) => { const row = Array.from({ length: b.length + 1 }, (_, index) => index); for (let i = 1; i <= a.length; i++) { let diagonal = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const above = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)); diagonal = above; } } return row[b.length]; };
const slug = value => String(value).normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80) || "item";
const resourceKey = (kind, value, index) => `${slug(kind)}-${slug(value).slice(0, 70)}-${index + 1}`;
const unique = rows => [...new Map(rows.map(row => [norm(row.name), row])).values()];
const list = value => Array.isArray(value) ? value : value == null || value === "" ? [] : [value];

const { data: songs, error: songsError } = await db.from("songs").select("id,title,slug,youtube_music_video_url");
if (songsError) throw new Error(`Song lookup failed (${songsError.code}).`);
const matches = source.plans.map(entry => ({ entry, songs: songs.filter(song => norm(song.title) === norm(entry.song_title)) }));
const uniqueMatches = matches.filter(row => row.songs.length === 1);
const matchedIds = uniqueMatches.map(row => row.songs[0].id);
const [projectResult, contentResult] = await Promise.all([
  matchedIds.length ? db.from("music_video_projects").select("id,song_id,project_type,status,public_concept,workspace,updated_at").eq("project_type", "primary").in("song_id", matchedIds) : Promise.resolve({ data: [], error: null }),
  matchedIds.length ? db.from("content_items").select("id,song_id,music_video_project_id,content_template_key,published,recorded,edited,post_ready").in("song_id", matchedIds).eq("content_template_key", "official_music_video") : Promise.resolve({ data: [], error: null }),
]);
if (projectResult.error || contentResult.error) throw new Error("Existing project/release check failed; no preview was written.");
const projects = new Map((projectResult.data || []).map(row => [row.song_id, row]));
const contentBySong = new Map();
for (const row of contentResult.data || []) contentBySong.set(row.song_id, [...(contentBySong.get(row.song_id) || []), row]);
const contentPublished = new Set((contentResult.data || []).filter(row => row.published === true).map(row => row.song_id));

function convert(entry, song) {
  const sourceSlug = entry.source_slug || slug(entry.song_title);
  const developmentStatus = entry.development_status === "concept_developed" ? "developed" : "needs_development";
  const isPreliminary = developmentStatus === "needs_development";
  const sourceScenes = [...list(entry.storyboard)].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const castCrew = unique(list(entry.production?.characters_proposed).map((raw, index) => {
    const text = typeof raw === "string" ? raw : raw?.name || "";
    const parts = text.split(/\s+[—–]\s+/);
    return { importKey: resourceKey(`${sourceSlug}-cast`, text, index), name: (parts[0] || text).slice(0, 180), role: (parts.slice(1).join(" — ") || "Proposed participant").slice(0, 120), status: "Planned", notes: `PROPOSED from source; not contacted, hired, or confirmed. Source wording: ${text}`.slice(0, 4000) };
  }));
  const locations = unique(list(entry.production?.locations_proposed).map((raw, index) => {
    const name = typeof raw === "string" ? raw : raw?.name || "";
    return { importKey: resourceKey(`${sourceSlug}-location`, name, index), name: name.slice(0, 180), status: "Idea", notes: "PROPOSED from source; not verified, booked, or confirmed. No address supplied." };
  }));
  const sourceProps = entry.production?.props_notes;
  const propNames = Array.isArray(sourceProps) ? sourceProps.map(row => typeof row === "string" ? row : row?.name || "") : typeof sourceProps === "string" ? sourceProps.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean) : [];
  const props = unique(propNames.map((name, index) => ({ importKey: resourceKey(`${sourceSlug}-prop`, name, index), name: name.slice(0, 180), description: `Proposed source prop/set-dressing detail: ${name}`.slice(0, 4000), status: "Needed", notes: "PROPOSED only; sourcing and safety review remain TBD." })));
  const wardrobe = unique(list(entry.production?.wardrobe).map((raw, index) => {
    const name = typeof raw === "string" ? raw : raw?.name || "";
    if (!name) return null;
    return { importKey: resourceKey(`${sourceSlug}-wardrobe`, name, index), name: name.slice(0, 180), description: typeof raw === "object" ? String(raw.description || "") : "", status: "Needed", notes: "PROPOSED only; not sourced or confirmed." };
  }).filter(Boolean));
  const visionNotes = [
    `Source development status: ${entry.development_status}${isPreliminary ? " — NEEDS DEVELOPMENT" : " — DEVELOPED SOURCE CONCEPT"}.`,
    entry.vision?.song_meaning ? `Song meaning: ${entry.vision.song_meaning}` : "",
    entry.vision?.visual_style_notes ? `Visual style notes: ${entry.vision.visual_style_notes}` : "",
    entry.vision?.mood_notes ? `Mood notes: ${entry.vision.mood_notes}` : "",
    entry.vision?.signature_visual ? `Signature visual: ${entry.vision.signature_visual}` : "",
    entry.vision?.ending ? `Ending: ${entry.vision.ending}` : "",
  ].filter(Boolean).join("\n");
  const narrativeOverview = sourceScenes.map(scene => `Scene ${scene.order}: ${scene.description}`).filter(Boolean).join("\n\n");
  const scenePlans = sourceScenes.map(scene => ({
    importKey: scene.import_key || `${sourceSlug}-scene-${scene.order}`,
    order: Number(scene.order), title: scene.title,
    description: scene.description,
    status: ["planned", "ready", "filmed"].includes(scene.status) ? scene.status : "planned",
    ...(scene.location ? { locationKey: null } : {}),
    castKeys: [], wardrobeKeys: [], propKeys: [], referenceImages: [],
    shots: list(scene.shots).map((shot, index) => typeof shot === "string" ? { importKey: `${scene.import_key}-shot-${index + 1}`, order: index + 1, description: shot } : ({ importKey: shot.import_key || `${scene.import_key}-shot-${index + 1}`, order: Number(shot.order || index + 1), description: shot.description || shot.text || "", ...(shot.framing ? { framing: shot.framing } : {}), ...(shot.reference_image ? { referenceImage: shot.reference_image } : {}) })),
    ...(scene.notes ? { notes: scene.notes } : {}),
  }));
  const durationText = entry.production?.estimated_shoot_hours;
  const numericDuration = typeof durationText === "number" ? durationText : typeof durationText === "string" && /^\d+(?:\.\d+)?$/.test(durationText.trim()) ? Number(durationText) : null;
  const productionNotes = [
    isPreliminary ? "NEEDS DEVELOPMENT. This is a preliminary source entry; no missing scenes or schedule have been invented." : "Source concept marked developed; production details remain proposals until confirmed.",
    durationText != null ? `Source estimated shoot duration (preserved as written): ${durationText}.` : "",
    entry.production?.production_notes || "",
    entry.production?.props_notes && typeof entry.production.props_notes !== "string" ? `Source prop notes: ${JSON.stringify(entry.production.props_notes)}` : "",
  ].filter(Boolean).join("\n");
  const conceptTitle = entry.vision?.concept_title && !/^not yet developed$/i.test(entry.vision.concept_title) ? entry.vision.concept_title : undefined;
  const plan = {
    schemaVersion: "chxndler.music-video-plan.v1",
    project: { songId: song.id, songTitle: song.title, videoType: "Official Music Video", ...(conceptTitle ? { projectTitle: conceptTitle } : {}), planningStatus: isPreliminary ? "concept" : "planning", developmentStatus },
    vision: { concept: entry.vision?.concept || "", narrativeOverview, format: null, visualStyles: [], moods: [], inspirationLinks: [], referenceImages: [], colorPalette: [], notes: visionNotes },
    scenes: scenePlans,
    production: { shootDate: null, shootDateStatus: "tbd", estimatedShootHours: numericDuration, budget: null, notes: productionNotes, tasks: list(entry.production?.tasks).map((task, index) => ({ importKey: task.import_key || resourceKey(`${sourceSlug}-task`, task.title || task.name || String(index), index), title: task.title || task.name, status: ["To Do", "In Progress", "Done"].includes(task.status) ? task.status : "To Do", ...(task.notes ? { notes: task.notes } : {}) })), castCrew, locations, wardrobe, props, shootSchedule: [] },
    release: { editingStatus: "Not Started", finalVideoApproved: false, targetVideoReleaseDate: null, publishedVideoUrl: null, publicationStatus: "Not published", actualPublicationDate: null },
    extensions: { source: "chxndler_music_video_import_source_60.json", sourceSlug, sourceDevelopmentStatus: entry.development_status, reviewRequired: entry.review_required === true, existingVideoCheckRequired: entry.existing_video_check_required === true },
  };
  return plan;
}

const sourceOrder = new Map(source.plans.map((entry, index) => [entry.source_slug, index]));
const plans = uniqueMatches.map(({ entry, songs: [song] }) => ({ entry, song, plan: convert(entry, song) })).sort((a, b) => Number(b.entry.development_status === "concept_developed") - Number(a.entry.development_status === "concept_developed") || sourceOrder.get(a.entry.source_slug) - sourceOrder.get(b.entry.source_slug));
const planResults = plans.map(({ entry, song, plan }) => {
  const project = projects.get(song.id) || null;
  const songForPreview = { ...song, existingPublishedVideo: contentPublished.has(song.id) };
  const validation = validateMusicVideoPlan(plan);
  const preview = previewMusicVideoPlanImport({ plan, project, song: songForPreview, allowCreateProject: true });
  return { entry, song, plan, project, validation, preview };
});

const countsFor = predicate => planResults.filter(predicate).length;
const proposedTotals = {};
for (const { preview } of planResults.filter(row => !row.preview.skipped)) for (const [type, counts] of Object.entries(preview.counts)) {
  proposedTotals[type] ||= { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  for (const key of Object.keys(proposedTotals[type])) proposedTotals[type][key] += counts[key] || 0;
}
const manifest = {
  generatedAt: new Date().toISOString(), sourceFile: sourcePath,
  status: "PREVIEW ONLY — no Supabase writes performed",
  sourceCount: source.plans.length,
  exactUniqueMatches: uniqueMatches.length,
  ambiguousMatches: matches.filter(row => row.songs.length > 1).map(row => ({ sourceTitle: row.entry.song_title, matchedSongs: row.songs.map(song => ({ id: song.id, title: song.title })) })),
  unmatched: matches.filter(row => row.songs.length === 0).map(row => ({ sourceTitle: row.entry.song_title, sourceSlug: row.entry.source_slug, developmentStatus: row.entry.development_status, possibleTitleMatches: songs.map(song => ({ id: song.id, title: song.title, similarity: 1 - editDistance(norm(row.entry.song_title), norm(song.title)) / Math.max(norm(row.entry.song_title).length, norm(song.title).length, 1) })).filter(candidate => candidate.similarity >= 0.55).sort((a, b) => b.similarity - a.similarity).slice(0, 3) })),
  matchedCounts: {
    developed: countsFor(row => row.entry.development_status === "concept_developed"),
    needsDevelopment: countsFor(row => row.entry.development_status !== "concept_developed"),
    sourceHadStoryboard: countsFor(row => row.entry.storyboard?.length > 0),
    conceptOnly: countsFor(row => !row.entry.storyboard?.length),
    protectedSkipped: countsFor(row => row.preview.skipped),
    validationErrors: countsFor(row => !row.validation.valid),
  },
  proposedTotals,
  projects: planResults.map(({ entry, song, project, validation, preview }) => ({
    songTitle: song.title, songId: song.id, sourceTitle: entry.song_title, sourceSlug: entry.source_slug,
    developmentStatus: entry.development_status, projectId: project?.id || null, existingProjectStatus: project?.status || null,
    existingSongVideoUrl: Boolean(song.youtube_music_video_url), existingPublishedContentItem: contentPublished.has(song.id),
    contentItemAction: preview.skipped ? "none (published plan protected)" : project ? "no content item update by the existing-project importer path" : (contentBySong.get(song.id) || []).some(item => !item.music_video_project_id) ? "link existing official-video checklist item (preserve its progress)" : "create one official-video content item",
    protectedSkip: preview.skipped,
    changes: preview.counts,
    conflictCount: preview.conflicts.length,
    conflicts: preview.conflicts.map(conflict => ({ path: conflict.path, reason: conflict.reason, locked: conflict.locked })),
    validationErrors: validation.errors,
    warnings: preview.warnings,
    scenesInSource: entry.storyboard?.length || 0,
    scheduleBlocksInSource: 0,
  })),
};

const ready = planResults.filter(row => row.validation.valid).map(row => row.plan);
const importable = planResults.filter(row => row.validation.valid && !row.preview.skipped).map(row => row.plan);
const developed = importable.filter(plan => plan.project.developmentStatus === "developed");
const preliminary = importable.filter(plan => plan.project.developmentStatus === "needs_development");
let batchNumber = 0;
const batches = [developed, preliminary].flatMap((group, groupIndex) => {
  const batchSize = 20;
  const output = [];
  for (let i = 0; i < group.length; i += batchSize) output.push({ batch: ++batchNumber, phase: groupIndex === 0 ? "developed" : "needs_development", plans: group.slice(i, i + batchSize) });
  return output;
});
await writeFile(`${outputPath}.json`, JSON.stringify({ ...manifest, plans: ready }, null, 2));
await writeFile(`${outputPath}.batches.json`, JSON.stringify(batches, null, 2));
for (const batch of batches) await writeFile(`${outputPath}.batch-${String(batch.batch).padStart(2, "0")}-${batch.phase}.json`, JSON.stringify(batch.plans, null, 2));
const reportLines = [
  "# CHXNDLER Music Video Import Preview",
  "",
  `Generated ${manifest.generatedAt}. PREVIEW ONLY; no Supabase rows were written.`,
  "",
  `Source: ${manifest.sourceCount}; unique title matches: ${manifest.exactUniqueMatches}; ambiguous: ${manifest.ambiguousMatches.length}; unmatched: ${manifest.unmatched.length}.`,
  `Matched developed: ${manifest.matchedCounts.developed}; preliminary: ${manifest.matchedCounts.needsDevelopment}; protected skips: ${manifest.matchedCounts.protectedSkipped}; validation errors: ${manifest.matchedCounts.validationErrors}.`,
  `Eligible proposals: ${planResults.filter(row => !row.preview.skipped).length} plans; projects created ${proposedTotals.projects?.created || 0}, updated ${proposedTotals.projects?.updated || 0}; scenes ${proposedTotals.scenes?.created || 0}; resources ${proposedTotals.resources?.created || 0}; tasks ${proposedTotals.tasks?.created || 0}; schedule blocks ${proposedTotals.schedule?.created || 0}.`,
  "",
  "## Matched songs and proposed changes",
  "",
  "| Song (ID) | Source status | Existing state | Proposed change | Conflicts |",
  "|---|---|---|---|---:|",
  ...manifest.projects.map(row => `| ${row.songTitle} (${row.songId}) | ${row.developmentStatus} | ${row.existingProjectStatus || (row.existingSongVideoUrl ? "Published video URL" : "No project")} | ${row.protectedSkip ? "Skip; protect linked video" : `${row.changes.projects.created ? "Create" : "Update"}; ${row.changes.scenes.created} scenes; ${row.changes.resources.created} resources; ${row.contentItemAction}`} | ${row.conflictCount} |`),
  "",
  "## Unmatched titles (no import plan will be made until the song is identified)",
  "",
  ...manifest.unmatched.map(row => `- ${row.sourceTitle} [${row.developmentStatus}]${row.possibleTitleMatches.length ? ` — possible title matches to verify: ${row.possibleTitleMatches.map(candidate => `${candidate.title} (${candidate.similarity.toFixed(2)})`).join(", ")}` : " — no close match"}`),
  "",
  "## Conflicts",
  "",
  ...manifest.projects.filter(row => row.conflicts.length).map(row => `- ${row.songTitle}: ${row.conflicts.map(conflict => conflict.path).join(", ")}; keeping the current status is safest.`),
  "",
  "No scenes or schedule blocks were invented. Preliminary entries have no scenes when absent in source; proposed people and locations are not confirmed.",
];
await writeFile(`${outputPath}.md`, reportLines.join("\n"));
console.log(JSON.stringify({ status: manifest.status, sourceCount: manifest.sourceCount, exactUniqueMatches: manifest.exactUniqueMatches, ambiguous: manifest.ambiguousMatches, unmatched: manifest.unmatched, matchedCounts: manifest.matchedCounts, proposedTotals, conflicts: manifest.projects.filter(row => row.conflictCount).map(row => ({ title: row.songTitle, status: row.existingProjectStatus, paths: row.conflicts.map(conflict => conflict.path) })), protected: manifest.projects.filter(row => row.protectedSkip).map(row => row.songTitle), batchSizes: batches.map(batch => ({ phase: batch.phase, count: batch.plans.length })), artifacts: [`${outputPath}.md`, `${outputPath}.json`, ...batches.map(batch => `${outputPath}.batch-${String(batch.batch).padStart(2, "0")}-${batch.phase}.json`)] }, null, 2));
