import { useEffect, useState } from "react";
import { fetchReleasedSongs } from "@/lib/songs";
import { SONG_ELEMENT_MAPPING } from "@/data/songElements";
import type { SongRow, ElementType } from "@/types/song";

export interface SongWithElement extends SongRow {
  element: ElementType;
}

export function useSongs() {
  const [songs, setSongs] = useState<SongWithElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSongs() {
      try {
        const data = await fetchReleasedSongs();
        
        if (isMounted) {
          // Use element from database, fallback to mapping if needed
          const songsWithElements: SongWithElement[] = data.map(song => {
            let element: ElementType;
            
            if (song.element && ['heart', 'water', 'lightning', 'darkness'].includes(song.element.toLowerCase())) {
              element = song.element.toLowerCase() as ElementType;
            } else {
              // Fallback to slug mapping if element column is empty or invalid
              element = SONG_ELEMENT_MAPPING[song.slug] || 'heart';
            }
            
            return {
              ...song,
              element
            };
          });
          
          setSongs(songsWithElements);
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

  // Group songs by element for easier consumption
  const songsByElement = songs.reduce((acc, song) => {
    const element = song.element;
    if (!acc[element]) {
      acc[element] = [];
    }
    acc[element].push(song);
    return acc;
  }, {} as Record<ElementType, SongWithElement[]>);

  return { songs, songsByElement, loading, error };
}