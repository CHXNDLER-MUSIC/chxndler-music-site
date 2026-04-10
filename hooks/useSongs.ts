import { useEffect, useState } from "react";
import { fetchReleasedSongs, fetchSongs } from "@/lib/songs";
import { SONG_ELEMENT_MAPPING } from "@/data/songElements";
import type { SongRow, ElementType } from "@/types/song";

export interface SongWithElement extends SongRow {
  element: ElementType;
}

function addElements(data: SongRow[]): SongWithElement[] {
  return data.map(song => {
    let element: ElementType;
    if (song.element && ['heart', 'water', 'lightning', 'darkness'].includes(song.element.toLowerCase())) {
      element = song.element.toLowerCase() as ElementType;
    } else {
      element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
    }
    return { ...song, element };
  });
}

export function useSongs() {
  const [songs, setSongs] = useState<SongWithElement[]>([]);
  const [allSongs, setAllSongs] = useState<SongWithElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSongs() {
      try {
        const [released, all] = await Promise.all([fetchReleasedSongs(), fetchSongs()]);

        // Sort alphabetically by title (case-insensitive)
        const sortByTitle = (a: SongRow, b: SongRow) =>
          (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });

        if (isMounted) {
          setSongs(addElements([...released].sort(sortByTitle)));
          setAllSongs(addElements([...all].sort(sortByTitle)));
          setLoading(false);
        }
      } catch (err: any) {
        console.error("useSongs error", err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    loadSongs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Group released songs by element for easier consumption
  const songsByElement = songs.reduce((acc, song) => {
    const element = song.element;
    if (!acc[element]) {
      acc[element] = [];
    }
    acc[element].push(song);
    return acc;
  }, {} as Record<ElementType, SongWithElement[]>);

  // Group all songs (released + unreleased) by element
  const songsByElementAll = allSongs.reduce((acc, song) => {
    const element = song.element;
    if (!acc[element]) {
      acc[element] = [];
    }
    acc[element].push(song);
    return acc;
  }, {} as Record<ElementType, SongWithElement[]>);

  return { songs, allSongs, songsByElement, songsByElementAll, loading, error };
}
