import { Suspense } from "react";
import DashboardApp from "@/components/DashboardApp";
import { tracks } from "@/lib/songs-consolidated";
import { notFound } from "next/navigation";

export default function SongPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug?.toLowerCase?.() || "";
  const exists = tracks.some((t) => (t.slug || "").toLowerCase() === slug);
  if (!exists) return notFound();
  return (
    <Suspense fallback={<div>Loading song...</div>}>
      <DashboardApp initialSlug={slug} />
    </Suspense>
  );
}

