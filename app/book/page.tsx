import type { Metadata } from "next";
import { fetchBrandPitch } from "@/lib/brandPitch";
import BookingExperience from "@/components/booking/BookingExperience";

// Never indexed — this is a private continuation of a brand pitch conversation,
// not a page search engines should surface.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ brand?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { brand } = await searchParams;
  const pitch = brand ? await fetchBrandPitch(brand) : null;
  const title = pitch ? `CHXNDLER × ${pitch.brand_name} — Book a Call` : "CHXNDLER Studio — Book a Call";
  return { title, robots: { index: false, follow: false } };
}

/**
 * The one universal booking page for every brand pitch (and for direct,
 * brand-less visits). `?brand=<slug>` is looked up against the same
 * brand_pitches table the pitch pages read — no new data, no per-brand code.
 * An invalid/missing slug is never a 404: it just falls back to the generic
 * CHXNDLER Studio framing.
 */
export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const { brand } = await searchParams;
  const pitch = brand ? await fetchBrandPitch(brand) : null;

  return (
    <BookingExperience
      brandName={pitch?.brand_name || null}
      brandSlug={pitch?.slug || null}
      accentColor={pitch?.accent_color || null}
    />
  );
}
