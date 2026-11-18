# Collaboration requests setup

1. Apply `supabase/migrations/20261118_collaboration_requests.sql` to the existing Supabase project.
2. Set server environment variables `COLLAB_NOTIFICATION_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`, and `NEXT_PUBLIC_SITE_URL`. `SMTP_FROM` must be an address verified by the configured SMTP provider; it is also the reply-to address.
3. Sign into the site as the configured admin and visit `/admin/collaborations`. Create an invitation using the UUID of a song row. The generated link is displayed once and includes an unguessable bearer token. Share it privately with the intended artist. Creating an invite enables collaboration requests for that song; disabling requests requires setting `collaboration_enabled` false and revokes its outstanding invites (the admin endpoint supports this toggle).
4. Review incoming requests at `/admin/collaborations`; the notification email links to the authenticated detail view.

Requests and private notes are accessible only through server routes using the service role; the tables grant no direct anon or authenticated table access. Terms version `2026-11-18-v1` is seeded from the artist supplied text. Add a new terms row and deactivate the prior row to publish a future version; submissions retain the original version.

## External setup and current limits

- Email delivery requires the listed SMTP configuration and notification address. Failed sends remain stored with status/error details; automatic scheduled retries are not configured.
- The agreement columns track draft metadata and signatures, but private Storage upload, signed document retrieval, and a terms editor are not implemented in this first slice. No electronic signature provider is connected. Do not mark a request signed until signatures are verified separately.
- Rate limiting is an in-process per-IP throttle, so production deployments with multiple instances should use a shared limiter before high-volume use.
- The existing `/collab` gallery and its demo media access are pre-existing behavior; invitations gate request submission. Existing demo playback has not been converted into invite-scoped storage authorization.
