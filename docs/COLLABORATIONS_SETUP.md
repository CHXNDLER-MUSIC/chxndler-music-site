# Collaboration system setup

## Database

Apply these migrations to the existing Supabase project, in filename order:

1. `20261118_collaboration_requests.sql` — requests, terms, event history, and the song opt-in flag.
2. `20261126_collaboration_system_completion.sql` — idempotency, atomic rate limits, agreement fields, and the private agreement bucket.
3. `20261127_personalized_collaboration_invites.sql` — expiring named invitation sessions and request-to-invite association.
4. `20261129_collaboration_invites_per_song.sql` — permits multiple distinct song invitations for one collaborator.
5. `20261201_restore_collab_authorized_people.sql` — retains the private approved-person allowlist (including Ari Ness) for first/last-name or artist-name entry to `/collab`, and links their subsequent collaboration requests to that person.
6. `20261202_music_workspace_refactor.sql` — adds the canonical admin workflow fields used by song and outreach workspaces.
7. `20261203120000_collab_catalog_opportunities.sql` — adds independent audio status and opportunity fields, invitation scope/email, music-video collaboration stages, and makes the existing `tracks` bucket private.

Requests, terms history, invite tokens, rate-limit records, and event history are accessible through server routes using the Supabase service role. Anonymous visitors cannot read these tables. The invite link contains a random bearer token; Supabase stores only its SHA-256 hash. A signed, HTTP-only session cookie is rechecked against the invitation row, so expiration and revocation take effect on subsequent requests.

## Email configuration

Set these server-only deployment variables:

- `COLLAB_NOTIFICATION_EMAIL` — destination for new request notifications; no address is hardcoded.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (or `RESEND_FROM`) — Resend delivery for finalized collaboration agreements. The sender must be verified in Resend.
- `COLLAB_REPLY_TO` — verified address for collaborator replies. If omitted, the configured Resend sender is used.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Nodemailer delivery for collaboration request notifications; agreement delivery does not depend on SMTP.
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used for email links and artwork.

Request notification emails are attempted after a request is saved, with admin and artist sends independent. Agreement email delivery uses Resend and includes the private, version-specific review link. Provider message IDs and delivery failures are recorded in request events. Configure the relevant sender credentials in each deployment environment.

## Admin workflow

Visit `/admin/collaborations` while signed in as an authorized admin. Create a catalog, video-opportunity, or song-specific invitation; an invite email is optional and prefills the interest form when set. Copy and privately send the generated link; it is only shown once. Revoke an invite from the list to end access. Every successfully entered invite can browse the full collaboration catalog; song-specific links open the selected song, and video invites open Video Needed.

In `/admin`, open Songs and a song workspace to set Audio status and the independent Feature, Video Needed, and Remix opportunities. Video concept text is public to invited collaborators only when the song is shown in the catalog. Setting audio status never changes `is_released` or `release_date`.

The public form stores the exact active terms version and acknowledgment timestamp. Approved people can enter `/collab` with the first and last name in the private allowlist or a qualifying approved request; other collaborators use their personalized invitation link. Admins can publish a new version from the terms editor; prior versions remain available for audit. Review and manage requests in the Requests, Active, and Completed tabs. Notification emails link to `/admin/collaborations?request=<request-id>` and require admin authentication.

## Agreements and limitations

Reviewed and executed PDFs are stored in the private `collaboration-agreements` bucket. Admin routes issue short-lived signed URLs after checking admin authentication. A request cannot be marked Signed until an executed PDF exists and an admin confirms the signatures were reviewed. No custom e-signature system or signing provider is connected; obtain signatures through a trusted provider or another appropriate process, then upload the executed PDF. Approval is not a signed agreement. The project status is tracked separately from the agreement status.

Audio requests go through `/api/audio`, which checks release state or a live collaboration session before issuing a short-lived signed URL. Apply the catalog/opportunity migration only after deploying this code so the shared audio URL helper is live before the existing `tracks` bucket becomes private. Existing storage objects remain in place; no songs, projects, or audio objects are duplicated.
