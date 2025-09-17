import { notFound } from "next/navigation";
import { getSongBySlug, getNextSongSlug } from "@/lib/songs-consolidated";
import SongRouteClient from "@/components/SongRouteClient";

export default function SongPage({ params }: { params: { slug: string } }) {
  const slug = (params?.slug || '').toLowerCase();
  const song = getSongBySlug(slug);
  if (!song) return notFound();
  const nextSlug = getNextSongSlug(song.slug);
  return <SongRouteClient song={song} nextSlug={nextSlug} />;
}
