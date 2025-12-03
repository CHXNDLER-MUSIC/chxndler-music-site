export type SongRow = {
  id: string;
  title: string;
  slug: string;
  is_released: boolean;
  created_at: string;
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