import DashboardApp from "@/components/DashboardApp";
import { tracks } from "@/lib/songs-consolidated";
import { notFound } from "next/navigation";

export default function SongPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug?.toLowerCase?.() || "";
  const exists = tracks.some((t) => (t.slug || "").toLowerCase() === slug);
  if (!exists) return notFound();
  return <DashboardApp initialSlug={slug} />;
}

