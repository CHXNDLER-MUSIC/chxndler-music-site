import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBrandPitch } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import BrandPitchPage from "@/components/brand-pitch/BrandPitchPage";

// Private/direct-link creative presentations — always fresh, never indexed.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pitch = await fetchBrandPitch(slug || "");
  if (!pitch) return { robots: { index: false, follow: false } };

  const title = pitch.seo_title || `${pitch.brand_name} × ${pitch.artist_name} — ${pitch.song_title}`;
  const description = pitch.seo_description || pitch.hero_supporting_text || undefined;
  const ogImage = getBrandArtUrl(pitch.cover_art_path || pitch.hero_art_path);

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const pitch = await fetchBrandPitch(slug || "");
  if (!pitch) return notFound();
  return <BrandPitchPage pitch={pitch} />;
}
