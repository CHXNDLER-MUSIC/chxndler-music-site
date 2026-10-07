export type SongRow = {
  id: string;
  title: string;
  slug: string;
  is_released: boolean;
  created_at: string;
  element?: string; // Optional in case not all songs have it set
  // Song-specific links (authoritative; null/empty → generic fallback, see lib/chxndlerLinks.ts)
  spotify_url?: string | null;
  apple_music_url?: string | null;
  youtube_music_video_url?: string | null;
  karaoke_url?: string | null;
  // Cockpit/Heartverse background video — NOT the music video
  sky_video_url?: string | null;
};

export type ElementType = 'heart' | 'water' | 'lightning' | 'darkness';

export type TrackWithMetadata = SongRow & {
  audioSrc: string;
  coverSrc: string;
  element: ElementType;
  spotify?: string;
  apple?: string;
  sections?: Array<{ time: number; label: string; kind?: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' }>;
};