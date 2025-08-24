# CHXNDLER Music Cockpit

Next.js 14 app that presents a cockpit-style music experience: masked skybox video background, HUD-style player, and social rails.

## Run
- Node: `20.x`
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build` / `npm start`

## Environment (optional)
- `NEXT_PUBLIC_GA_ID` — GA4 Measurement ID (e.g., `G-XXXXXXX`)
- `NEXT_PUBLIC_META_PIXEL_ID` — Meta Pixel ID (numeric)
- `JOIN_WEBHOOK_URL` — Endpoint for `/api/join` (defaults to a demo Apps Script)

## Project Structure
- `app/` — App Router pages and layout. The home page composes:
  - `components/SkyboxVideo` — masked video background
  - `components/SocialDock` — social link rail (from `config/socials.ts`)
  - `components/MediaDockFrame` — wraps a lightweight player HUD
- `components/` — UI components (HUD, rails, buttons, etc.)
- `config/` — central configuration for links, tracks, positions, UI tokens
- `lib/` — small utilities (analytics, slug, sky paths)
- `public/` — static assets (`/tracks`, `/cover`, `/skies`, etc.)

## Tracks & Assets
- Tracks are defined in `config/tracks.ts`. Defaults map to existing files:
  - Audio: `/tracks/<slug>.mp3`
  - Cover: `/cover/<slug>-cover.png`
- Background sky video on the landing page uses `/skies/ocean-girl.mp4` (with a `.webm` source if available).

## Notes / TODO
- The classic, more feature-rich dial player (`components/MediaDock.jsx`) is available but not mounted on the home page. The lightweight HUD (`FastAudioBus`) is used by default.
- If you add more skybox videos per track, wire `MediaDock` to the page and connect its `onSkyChange` to `SkyboxVideo` (already done in the current setup).
- SFX: The code currently reuses `/tracks/launch.MP3` for UI click/detent/launch to avoid 404s. To customize, place files in `public/ui/` as `click.mp3`, `detent.mp3`, `launch.mp3` and update references.
- Some legacy components/configs exist (`CockpitHUD`, `DashboardRails`, `config/cockpit.js`) and can be removed or re-integrated based on the desired UX.
