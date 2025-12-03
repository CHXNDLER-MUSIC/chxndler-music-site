import { useEffect, useState } from "react";
import { fetchSongs } from "@/lib/songs";
import type { SongRow } from "@/types/song";

export function useSongs() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSongs() {
      try {
        const data = await fetchSongs();
        if (isMounted) {
          setSongs(data);
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

  return { songs, loading, error };
}