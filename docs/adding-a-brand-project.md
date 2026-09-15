# Adding a CHXNDLER STUDIO Brand Project

Every `/brands/[slug]` page — Oatly, Mr. Charlie's, Converse, Tinder, Vacation,
and any future one — is the same shared architecture rendering one row of
data. There is no per-brand page, no per-brand component, and nothing here
should ever be duplicated per brand.

## 1. Where project data lives

One row per brand in the Supabase `brand_pitches` table (public "Brands"
bucket for assets). This table is the single canonical project registry —
not a static TS file — because it needs to be editable without a redeploy and
supports an `is_published` gate (an unpublished row 404s in production but
still previews locally). The full column set and its TypeScript shape live in
`lib/brandPitch.ts` (`BrandPitch` type + `normalizeBrandPitch`).

To add a project: insert a new `brand_pitches` row with a unique `slug` and
`is_published = true` when ready.

## 2. Where assets go

Supabase Storage, public "Brands" bucket, one folder per brand/song:

```
Brands/<Brand Name>/<SONG TITLE>/PHOTO/cover art.png
Brands/<Brand Name>/<SONG TITLE>/PHOTO/background 1.png
Brands/<Brand Name>/<SONG TITLE>/AUDIO/...
```

Reference these as storage *paths* (e.g. `"Oatly/WOW NO COW/PHOTO/cover art.png"`)
in the row's path columns (`cover_art_path`, `hero_art_path`, etc.) — never a
resolved URL. `lib/brandPitchStorage.ts#getBrandArtUrl` resolves a path to a
public URL; every component already does this, never hardcode a bucket URL.

## 3. Choosing/registering a slug

`slug` is just a column on the row — lowercase, URL-safe. `fetchBrandPitch`
looks it up case-insensitively. There is no separate slug registry to update;
the row itself IS the registration. Visiting `/brands/<slug>` immediately
works once the row exists and `is_published` is true (or in local dev,
regardless of publish state).

## 4. How sections are enabled/disabled

There is no `sections: { ... }` config object, and there shouldn't be one yet.
Every shared section component (`BrandAbout`, `BrandCTA`, `BrandMoments`,
`CreativeIdea`, `HearTheConcept`, `SonicIdentity`, `SecondaryCampaignImage`,
`Collectible`) already renders `null` when its own relevant pitch fields are
empty. Leaving a field blank IS how you disable a section for one brand. If a
genuine need for independent enable/disable (separate from "has content")
ever comes up, that's the moment to add an explicit `sections` column — don't
add it speculatively.

## 5. How section variants work

There's currently no `variant` prop on any section — every brand's visual
difference comes entirely from its own data (colors, copy, art), not from
forking a component's markup. If a brand ever needs a structurally different
layout for one section (not just different content), add an explicit,
typed variant prop to that one component (e.g. `<BrandHero variant="editorial" />`)
rather than a slug/pathname check inside it.

## 6. How project-specific themes work

Four columns — `background_color`, `accent_color`, `secondary_color`,
`text_color` — feed `lib/brandPitchPalette.ts#buildPitchPalette`, which
derives every tint/shade and the correct WCAG-contrast text color
automatically. `BrandPitchPage` exposes the result as CSS custom properties
(`--campaign-primary`, `--campaign-accent`, etc.) at the page root. Leave a
color column blank and the brand gets sane, legible defaults — you never need
to touch a shared component to give a new brand its own palette.

## 7. How "Explore the Studio" discovers the project

`StudioPortfolioLauncher` (rendered once, inside `BrandAbout`) is fed by
`lib/brandPitch.ts#fetchAllBrandPitchSummaries()`, which lists every
published `brand_pitches` row. `app/brands/[slug]/page.tsx` calls it and
excludes the current project by comparing `slug` — never a route/pathname
check. A new published row automatically appears in every *other* project's
gallery with zero code changes.

## 8. What should never be duplicated

Do not create:
- a new `app/brands/<slug>/page.tsx` (the dynamic route handles every slug)
- a per-brand copy of any `components/brand-pitch/*` component
- a second "other projects" list/array anywhere
- a pathname/slug conditional inside a shared component

If a brand needs something no other brand has, either (a) it's content —
add the field's value to that row, or (b) it's a genuine structural
difference — add a typed variant to the relevant shared component. Never
fork the page.
