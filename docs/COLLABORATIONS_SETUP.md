# Collaboration system setup

## Database

Apply these migrations to the existing Supabase project, in filename order:

1. `20261118_collaboration_requests.sql` — requests, terms, event history, and the song opt-in flag.
2. `20261126_collaboration_system_completion.sql` — idempotency, atomic rate limits, agreement fields, and the private agreement bucket.
3. `20261127_personalized_collaboration_invites.sql` — expiring named invitation sessions and request-to-invite association.
4. `20261129_collaboration_invites_per_song.sql` — permits multiple distinct song invitations for one collaborator.
5. `20261201_restore_collab_authorized_people.sql` — retains the private approved-person allowlist (including Ari Ness) for first/last-name or artist-name entry to `/collab`, and links their subsequent collaboration requests to that person.

Requests, terms history, invite tokens, rate-limit records, and event history are accessible through server routes using the Supabase service role. Anonymous visitors cannot read these tables. The invite link contains a random bearer token; Supabase stores only its SHA-256 hash. A signed, HTTP-only session cookie is rechecked against the invitation row, so expiration and revocation take effect on subsequent requests.

## Email configuration

Set these server-only deployment variables:

- `COLLAB_NOTIFICATION_EMAIL` — destination for new request notifications; no address is hardcoded.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — existing Nodemailer SMTP integration. `SMTP_FROM` must be authorized by the provider.
- `COLLAB_REPLY_TO` — verified address for artist replies. If omitted, `SMTP_FROM` is used.
- `NEXT_PUBLIC_SITE_URL` — canonical site origin used for email links and artwork.

Emails are attempted after the request is saved. Admin and artist sends are independent. SMTP acceptance, provider message IDs, failures, and retry attempts are recorded on the request. Failed sends can be retried from its admin detail view. Configure SMTP and the notification address in every deployment environment before inviting artists.

## Admin workflow

Visit `/admin/collaborations` while signed in as an authorized admin. Create an invitation by entering a display name, choosing a song, and choosing an expiration. Copy and privately send the generated link; it is only shown once. The invite enables requests for that song. Revoke an invite from the list to end access. Invitees can access the private collaboration experience and submit for the associated song only.

The public form stores the exact active terms version and acknowledgment timestamp. Approved people can enter `/collab` with the first and last name in the private allowlist or a qualifying approved request; other collaborators use their personalized invitation link. Admins can publish a new version from the terms editor; prior versions remain available for audit. Review and manage requests in the Requests, Active, and Completed tabs. Notification emails link to `/admin/collaborations?request=<request-id>` and require admin authentication.

## Agreements and limitations

Reviewed and executed PDFs are stored in the private `collaboration-agreements` bucket. Admin routes issue short-lived signed URLs after checking admin authentication. A request cannot be marked Signed until an executed PDF exists and an admin confirms the signatures were reviewed. No custom e-signature system or signing provider is connected; obtain signatures through a trusted provider or another appropriate process, then upload the executed PDF. Approval is not a signed agreement. The project status is tracked separately from the agreement status.

Private demo playback uses the existing `tracks` bucket and current media setup. The invite page reveals only the invited song and signs unreleased audio URLs for invitees; however, any audio object already in a public bucket remains addressable through that bucket's public URL model. Migrating existing media to private storage would be a separate infrastructure change and is not performed here.
