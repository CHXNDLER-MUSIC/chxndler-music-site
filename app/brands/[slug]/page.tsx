import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBrandPitch, fetchAllBrandPitchSummaries } from "@/lib/brandPitch";
import { getBrandArtUrl } from "@/lib/brandPitchStorage";
import BrandPitchPage from "@/components/brand-pitch/BrandPitchPage";
import type { StudioProject } from "@/components/brand-pitch/StudioPortfolioLauncher";

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

  // "EXPLORE THE STUDIO" gallery — every other published project, excluded
  // by comparing the row's own slug (never the URL/pathname), so this stays
  // correct regardless of how a page got linked to.
  const allProjects = await fetchAllBrandPitchSummaries();
  const otherProjects: StudioProject[] = allProjects
    .filter((p) => p.slug !== pitch.slug.trim().toLowerCase())
    .map((p) => ({
      slug: p.slug,
      brandName: p.brand_name,
      projectTitle: p.song_title,
      coverArt: getBrandArtUrl(p.cover_art_path || p.hero_art_path),
      href: `/brands/${p.slug}`,
    }));

  return <BrandPitchPage pitch={pitch} otherProjects={otherProjects} />;
}
