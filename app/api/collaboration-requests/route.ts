import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateCollaborationSubmission } from "@/lib/collaborationRules.mjs";
import { sendCollaborationEmails } from "@/lib/collaborationEmails";
import { getCollabInviteSession } from "@/lib/collabAccess";

export const runtime = "nodejs";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

function normalizeProfileLink(value: string): string | null {
  if (!value) return null;
  const handle = value.match(/^@?([A-Za-z0-9._]{1,30})$/);
  if (handle) return `https://instagram.com/${handle[1]}`;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (clean(body.website, 100)) return NextResponse.json({ ok: true }); // honeypot
    const songId = clean(body.songId, 80), submissionKey = clean(body.submissionKey, 80), termsVersion = clean(body.termsVersion, 80);
    const submittedEmail = clean(body.email, 320).toLowerCase();
    const firstName = clean(body.firstName, 80), lastName = clean(body.lastName, 80), submittedArtistName = clean(body.artistName, 120);
    const rawProfile = clean(body.profileLink, 500), profile = normalizeProfileLink(rawProfile), portfolio = clean(body.portfolioUrl, 500), estimatedRate = clean(body.estimatedRate, 120), phone = clean(body.phone, 40), contribution = clean(body.contributionType, 40), message = clean(body.message, 1200), videoProjectId = clean(body.videoProjectId, 80);
    if (!firstName || !lastName) return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    if (!submittedArtistName) return NextResponse.json({ error: "Artist name is required." }, { status: 400 });
    if (rawProfile && !profile) return NextResponse.json({ error: "Enter an Instagram handle or a valid http(s) profile URL." }, { status: 400 });
    const invite = await getCollabInviteSession();
    const isVideoApplication = contribution === "Music Video";
    const isSonglessIdea = !songId && (contribution === "Songwriting" || contribution === "Other");
    const allowSonglessIdea = isSonglessIdea && invite?.scope === "catalog";
    const publicVideoApplication = !invite && isVideoApplication;
    if (!invite && !publicVideoApplication) return NextResponse.json({ error: "Enter with your approved name or open your active personal invitation before submitting a collaboration request." }, { status: 403 });
    const email = submittedEmail || invite?.email || "";
    const artistName = submittedArtistName;
    if (!validateCollaborationSubmission({ songId, inviteId: invite?.id, allowPublicApplication: publicVideoApplication, allowSonglessIdea, submissionKey, termsVersion, artistName, email, contributionType: contribution })) {
      return NextResponse.json({ error: "Check the required fields and try again." }, { status: 400 });
    }
    const db = getSupabaseAdmin();
    const [{ data: song }, { data: terms }, videoProjectResult] = await Promise.all([
      songId ? db.from("songs").select("id,title,slug,ready_for_collab,is_released,audio_status").eq("id", songId).maybeSingle() : Promise.resolve({ data: null }),
      db.from("collaboration_terms").select("version").eq("version", termsVersion).eq("active", true).maybeSingle(),
      isVideoApplication && /^[0-9a-f-]{36}$/i.test(videoProjectId)
        ? db.from("music_video_projects").select("id,song_id,visibility").eq("id", videoProjectId).eq("song_id", songId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const videoProject = videoProjectResult.data;
    const songInviteMismatch = invite?.scope === "song" && invite.song_id !== songId;
    const remixIsAlwaysOpen = contribution === "Production / Remix";
    const songReleased = !!song && (song.is_released === true || song.audio_status === "Released");
    if ((!song && !allowSonglessIdea) || (publicVideoApplication && (!videoProject || videoProject.visibility !== "public")) || (invite && (invite.scope === "video" || songInviteMismatch || (invite.scope === "song" && !isVideoApplication && song?.ready_for_collab !== true))) || (isVideoApplication && !videoProject && !invite) || (!isVideoApplication && !invite) || (!allowSonglessIdea && !publicVideoApplication && !isVideoApplication && song?.ready_for_collab !== true && !remixIsAlwaysOpen) || (songReleased && !remixIsAlwaysOpen && !isVideoApplication)) return NextResponse.json({ error: "This invitation is invalid, expired, or this song is not open for collaboration." }, { status: 403 });
    if (!terms) return NextResponse.json({ error: "Collaboration terms are not configured." }, { status: 503 });
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`).digest("hex");
    const rate = await db.rpc("consume_collaboration_rate_limit", { p_ip_hash: ipHash });
    if (rate.error || typeof rate.data !== "boolean") {
      console.error("[collab] rate limit check failed", rate.error);
      return NextResponse.json({ error: "Request service is temporarily unavailable. Please try again." }, { status: 503 });
    }
    if (!rate.data) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
    let duplicateQuery = db.from("collaboration_requests").select("id,status").eq("contribution_type", contribution).not("status", "in", "(canceled,declined)").limit(1);
    duplicateQuery = songId ? duplicateQuery.eq("song_id", songId) : duplicateQuery.is("song_id", null);
    if (invite) duplicateQuery = invite.source === "invite" ? duplicateQuery.eq("invite_id", invite.id) : duplicateQuery.eq("authorized_person_id", invite.id);
    else duplicateQuery = duplicateQuery.eq("music_video_project_id", videoProjectId).ilike("email", email);
    const { data: existing } = await duplicateQuery.maybeSingle();
    if (existing) return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
    const submittedAt = new Date().toISOString();
    const requestValues = {
      submission_key: submissionKey, submission_ip_hash: ipHash,
      invite_id: invite?.source === "invite" ? invite.id : null,
      song_id: songId || null, music_video_project_id: isVideoApplication && /^[0-9a-f-]{36}$/i.test(videoProjectId) ? videoProjectId : null, agreement_type: invite?.agreement_type || null, portfolio_url: portfolio || profile || null, estimated_rate: estimatedRate || null, artist_name: artistName, first_name: firstName, last_name: lastName, email, profile_link: profile || null, phone: phone || null,
      contribution_type: contribution, message: message || null, terms_version: terms.version,
      acknowledged_at: null, submitted_at: submittedAt,
    };
    const linkedRequestValues = invite?.source === "authorized_person"
      ? { ...requestValues, authorized_person_id: invite.id }
      : requestValues;
    let { data: row, error } = await db.from("collaboration_requests").insert(linkedRequestValues).select("id").single();
    // The authorized-person association is an additive migration. If an older
    // database has not received it yet, preserve the request and its artist
    // identity while omitting only that optional relationship.
    if (error && invite?.source === "authorized_person" &&
      (error.code === "42703" || error.code === "PGRST204") && error.message?.includes("authorized_person_id")) {
      console.warn("[collab] authorized_person_id is not available; saving request without the optional person link until its migration is applied.");
      ({ data: row, error } = await db.from("collaboration_requests").insert(requestValues).select("id").single());
    }
    if (error?.code === "23505") {
      const { data: prior } = await db.from("collaboration_requests").select("id").eq("submission_key", submissionKey).maybeSingle();
      if (prior) return NextResponse.json({ ok: true, id: prior.id, duplicate: true });
    }
    if (error || !row) {
      console.error("[collab] request save failed", error);
      return NextResponse.json({ error: "Your request could not be saved. Please try again." }, { status: 500 });
    }
    await db.from("collaboration_request_events").insert({ request_id: row.id, event: "requested" });
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const deliveries = await sendCollaborationEmails({ id: row.id, artist_name: artistName, email, profile_link: profile || null, portfolio_url: portfolio || profile || null, estimated_rate: estimatedRate || null, phone: phone || null, contribution_type: contribution, message: message || null, submitted_at: submittedAt, songs: song ? { title: song.title, slug: song.slug } : null }, base);
    const emailError = [deliveries.admin, deliveries.artist].filter((delivery) => delivery.status === "failed").map((delivery) => delivery.error).filter(Boolean).join("; ") || null;
    const emailUpdate = await db.from("collaboration_requests").update({ email_admin_status: deliveries.admin.status, email_admin_id: deliveries.admin.messageId, email_artist_status: deliveries.artist.status, email_artist_id: deliveries.artist.messageId, email_error: emailError, last_email_attempt_at: new Date().toISOString() }).eq("id", row.id);
    if (emailUpdate.error) console.error("[collab] email status update failed", emailUpdate.error);
    return NextResponse.json({ ok: true, id: row.id, emailStatus: { admin: deliveries.admin.status, artist: deliveries.artist.status } });
  } catch (error) {
    console.error("[collab] submission error", error);
    return NextResponse.json({ error: "Unable to submit the request right now." }, { status: 500 });
  }
}
