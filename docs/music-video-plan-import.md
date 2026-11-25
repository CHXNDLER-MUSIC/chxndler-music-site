# CHXNDLER Music Video Plan Import

The organizer imports versioned JSON into its existing `music_video_projects.workspace` JSONB record. No database migration or real project population is required. `music_video_projects` is admin/service-role only under the existing RLS policy; the import endpoint checks the signed-in admin before using the server-side Supabase client.

## Format and example

- Schema: `docs/music-video-plan.v1.schema.json`
- Full illustrative plan: `docs/music-video-plan.example.json` (fictional song ID; every production detail is explicitly proposed)
- Validator and merge logic: `lib/musicVideoPlan.mjs`

The version is `chxndler.music-video-plan.v1`. Song IDs must match existing `songs.id` values. Do not use a title as a substitute for the stable ID. Omit unknown addresses, dates, contacts, bookings, reference images and published URLs; use `null` or an empty list as specified. The schedule is an estimate and has a one-day cap. Planning statuses are checked against the organizer’s existing values. Concept-only plans may use `project.developmentStatus: "needs_development"` with an empty narrative overview and no scenes. This lets preliminary concepts be flagged without inventing storyboard or schedule details.

## Import steps

1. Open the existing Music Video Organizer and select **Import Plan**.
2. Paste one plan, or a JSON array of plans (up to 20).
3. Select project creation only if the song exists and intentionally needs a new video project.
4. Choose **Validate and Preview**. Review the matched song/video, counts, warnings and field conflicts.
5. Keep existing values by default; explicitly choose **Use imported** for a conflict that should change.
6. Choose **Confirm Import**. The organizer refreshes the project after success.

The batch endpoint uses the same validator and merge behavior: `POST /api/music-video-projects/import` with `{ "action": "preview", "plans": [...] }`, followed by `{ "action": "import", "plans": [...], "previewTokens": [...] }`. Import requires a fresh preview token and admin authorization. It does not create songs, silently replace completed tasks, or overwrite published projects. Repeated imports use stable resource/scene/shot/task keys and avoid duplicate rows. Batch database writes are individually guarded, not transactional; a failure response identifies any earlier successful plans.

The JSON Schema covers the stable contract. Put extra creative context in `vision.notes`, resource/scene notes, or `extensions`; unsupported fields are not written to database columns. No import has been run against real projects as part of this implementation.

## Prompt for ChatGPT

“Organize this CHXNDLER music video for import. Output exactly one valid `chxndler.music-video-plan.v1` JSON object matching `docs/music-video-plan.v1.schema.json`. Use the existing song ID I provide. Mark all unconfirmed production details as proposed/TBD; never invent bookings, confirmed dates, contacts, or reference images. Keep the plan achievable in one 3–5 hour shoot day, with ordered scene blocks, setup/travel buffers, and the required release fields. Return JSON only.”
