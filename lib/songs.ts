import { supabaseClient } from "./supabaseClient";
import type { SongRow } from "@/types/song";

export async function fetchSongs(): Promise<SongRow[]> {
  const { data, error } = await supabaseClient
    .from("songs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching songs", error);
    return [];
  }

  return data ?? [];
}

export async function fetchReleasedSongs(): Promise<SongRow[]> {
  const { data, error } = await supabaseClient
    .from("songs")
    .select("*")
    .eq("is_released", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching released songs", error);
    return [];
  }

  return data ?? [];
}