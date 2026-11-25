import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { previewMusicVideoPlanImport, unresolvedMusicVideoPlanConflicts, validateMusicVideoPlan } from "@/lib/musicVideoPlan.mjs";

export const runtime = "nodejs";

function previewToken(plan: unknown, project: { id?: string; updated_at?: string } | null) {
  return createHash("sha256").update(JSON.stringify({ plan, projectId: project?.id || null, updatedAt: project?.updated_at || null })).digest("hex");
}

async function ensureContentLibraryLink(db: ReturnType<typeof getSupabaseAdmin>, projectId: string, songId: string, songTitle: string) {
  const linked = await db.from("content_items").select("id").eq("music_video_project_id", projectId).maybeSingle();
  if (linked.error) return `The project was created, but its Content library link could not be checked: ${linked.error.message}`;
  if (linked.data) return null;
  const checklist = await db.from("content_items").select("id").eq("song_id", songId).eq("content_template_key", "official_music_video").is("music_video_project_id", null).maybeSingle();
  if (checklist.error) return `The project was created, but its existing Content checklist item could not be checked: ${checklist.error.message}`;
  if (checklist.data) {
    const result = await db.from("content_items").update({ music_video_project_id: projectId, is_reportable: false, updated_at: new Date().toISOString() }).eq("id", checklist.data.id);
    return result.error ? `The project was created, but the Content checklist item could not be linked: ${result.error.message}` : null;
  }
  const inserted = await db.from("content_items").insert({
    title: `${songTitle} — Official Music Video`, category: "Music Video", sub_category: "Official Video",
    song_name: songTitle, song_id: songId, recorded: false, edited: false, post_ready: false,
    media_type: "VIDEO", purpose: "Official music video production", music_video_project_id: projectId,
    content_template_key: "official_music_video", content_order: 10, is_reportable: false,
  });
  return inserted.error && inserted.error.code !== "23505" ? `The project was created, but its Content library link could not be saved: ${inserted.error.message}` : null;
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !["preview", "import"].includes(body.action)) return NextResponse.json({ error: "Choose preview or import." }, { status: 400 });
  const plans = Array.isArray(body.plans) ? body.plans : body.plan ? [body.plan] : [];
  if (!plans.length || plans.length > 20) return NextResponse.json({ error: "Provide between 1 and 20 plans." }, { status: 400 });
  if (new Set(plans.map(plan => plan?.project?.songId).filter(Boolean)).size !== plans.length) return NextResponse.json({ error: "Each batch must contain only one plan per existing song." }, { status: 400 });
  const validations = plans.map((plan, index) => ({ index, result: validateMusicVideoPlan(plan) }));
  const invalid = validations.filter(row => !row.result.valid);
  if (invalid.length) return NextResponse.json({ error: "One or more plans need correction before preview.", plans: invalid.map(row => ({ index: row.index, errors: row.result.errors, warnings: row.result.warnings })) }, { status: 400 });
  const allowCreateProject = body.createProjects === true;
  const choices = body.choices && typeof body.choices === "object" && !Array.isArray(body.choices) ? body.choices : {};
  const songIds = plans.map(plan => plan.project.songId);
  const db = getSupabaseAdmin();
  const [{ data: songs, error: songError }, { data: projects, error: projectError }] = await Promise.all([
    db.from("songs").select("id,title").in("id", songIds),
    db.from("music_video_projects").select("id,song_id,project_type,status,public_concept,workspace,updated_at").eq("project_type", "primary").in("song_id", songIds),
  ]);
  if (songError || projectError) return NextResponse.json({ error: "Could not read the existing songs and music video projects." }, { status: 500 });
  const songsById = new Map((songs || []).map(song => [song.id, song]));
  const projectsBySong = new Map((projects || []).map(project => [project.song_id, project]));
  const previews = plans.map((plan, index) => {
    const song = songsById.get(plan.project.songId);
    const project = projectsBySong.get(plan.project.songId) || null;
    const preview = previewMusicVideoPlanImport({ plan, project, song, choices, allowCreateProject });
    return { index, songId: plan.project.songId, planTitle: plan.project.projectTitle || plan.project.songTitle, token: previewToken(plan, project), ...preview, candidateWorkspace: undefined, candidateProject: undefined };
  });
  if (body.action === "preview") return NextResponse.json({ plans: previews, totals: sumPlanCounts(previews), createProjects: allowCreateProject });

  const tokenMismatch = previews.some((preview, index) => typeof body.previewTokens?.[index] !== "string" || body.previewTokens[index] !== preview.token);
  if (tokenMismatch) return NextResponse.json({ error: "The project changed after preview. Preview the current data again before importing.", plans: previews, totals: sumPlanCounts(previews) }, { status: 409 });
  const errors = previews.flatMap(preview => preview.errors.map(issue => ({ songId: preview.songId, ...issue })));
  if (errors.length) return NextResponse.json({ error: "The import was stopped. Fix the plan or select an existing project to create explicitly.", errors, plans: previews, totals: sumPlanCounts(previews) }, { status: 409 });
  const unresolved = unresolvedMusicVideoPlanConflicts(previews, choices);
  if (unresolved.length) return NextResponse.json({ error: "Choose Keep current or Use imported for every conflict before importing.", conflicts: unresolved, plans: previews, totals: sumPlanCounts(previews) }, { status: 409 });

  const results = [];
  for (let index = 0; index < previews.length; index++) {
    const preview = previews[index];
    const plan = plans[index];
    if (preview.skipped) { results.push({ songId: preview.songId, songTitle: preview.songTitle, status: "skipped", warnings: preview.warnings, counts: preview.counts }); continue; }
    let project = projectsBySong.get(preview.songId) || null;
    if (project) {
      const nextProject = preview.candidateProject || previewMusicVideoPlanImport({ plan, project, song: songsById.get(preview.songId), choices, allowCreateProject }).candidateProject;
      const changed = JSON.stringify(project.workspace || {}) !== JSON.stringify(nextProject.workspace || {}) || project.status !== nextProject.status || project.public_concept !== nextProject.public_concept;
      if (!changed) { results.push({ songId: preview.songId, songTitle: preview.songTitle, projectId: project.id, status: "unchanged", warnings: preview.warnings, counts: preview.counts }); continue; }
      const updated = await db.from("music_video_projects").update({ workspace: nextProject.workspace, status: nextProject.status, public_concept: nextProject.public_concept, updated_at: new Date().toISOString() }).eq("id", project.id).eq("updated_at", project.updated_at).select("id,updated_at").maybeSingle();
      if (updated.error || !updated.data) return NextResponse.json({ error: "A project changed during the import. Some earlier plans may have saved; refresh and preview again.", partial: results.length > 0, results, failedSongId: preview.songId }, { status: 409 });
      results.push({ songId: preview.songId, songTitle: preview.songTitle, projectId: project.id, status: "updated", warnings: preview.warnings, counts: preview.counts });
      continue;
    }
    const candidate = preview.candidateProject || previewMusicVideoPlanImport({ plan, project: null, song: songsById.get(preview.songId), choices, allowCreateProject }).candidateProject;
    const inserted = await db.from("music_video_projects").upsert({ song_id: preview.songId, project_type: "primary", status: candidate.status, public_concept: candidate.public_concept, workspace: candidate.workspace }, { onConflict: "song_id,project_type", ignoreDuplicates: true }).select("id,song_id,project_type,status,public_concept,workspace,updated_at").maybeSingle();
    if (inserted.error) return NextResponse.json({ error: "Could not create the official video project.", partial: results.length > 0, results, failedSongId: preview.songId }, { status: 500 });
    project = inserted.data;
    if (!project) {
      const raced = await db.from("music_video_projects").select("id,song_id,project_type,status,public_concept,workspace,updated_at").eq("song_id", preview.songId).eq("project_type", "primary").maybeSingle();
      if (raced.error || !raced.data) return NextResponse.json({ error: "The project may have been created by another request. Refresh and preview again.", partial: results.length > 0, results, failedSongId: preview.songId }, { status: 409 });
      return NextResponse.json({ error: "Another admin created this project after preview. Preview it again before importing into it.", partial: results.length > 0, results, failedSongId: preview.songId }, { status: 409 });
    }
    const linkWarning = await ensureContentLibraryLink(db, project.id, preview.songId, preview.songTitle);
    results.push({ songId: preview.songId, songTitle: preview.songTitle, projectId: project.id, status: "created", warnings: [...preview.warnings, ...(linkWarning ? [{ path: "contentLibrary", message: linkWarning }] : [])], counts: preview.counts });
  }
  return NextResponse.json({ ok: true, results, totals: sumPlanCounts(previews) });
}

function sumPlanCounts(previews: Array<{ counts?: Record<string, Record<string, number>> }>) {
  const totals: Record<string, Record<string, number>> = {};
  for (const preview of previews) for (const [category, counts] of Object.entries(preview.counts || {})) {
    totals[category] ||= { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    for (const key of Object.keys(totals[category])) totals[category][key] += counts[key] || 0;
  }
  return totals;
}
