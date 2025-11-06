export type ElementKind = 'WATER' | 'HEART' | 'LIGHTNING' | 'DARKNESS';

export type Song = {
  title: string;
  slug: string;
  audioSrc: string;
  coverSrc: string;
  bg: 'space' | 'ocean' | 'paris' | 'generic';
  element: ElementKind;
  theme: Record<string, string>; // CSS variables
};

export const songs: Song[] = [
  {
    title: 'OCEAN GIRL',
    slug: 'ocean-girl',
    audioSrc: '/tracks/ocean-girl.mp3',
    coverSrc: 'https://ik.imagekit.io/CHXNDLER/cover/ocean-girl.png?updatedAt=1762361386944',
    bg: 'ocean',
    element: 'WATER',
    theme: {
      '--color-primary': '#19E3FF',
      '--glow-1': 'rgba(25,227,255,0.6)',
      '--glow-2': 'rgba(25,227,255,0.25)',
    },
  },
  {
    title: 'PARIS',
    slug: 'paris',
    audioSrc: '/tracks/paris.mp3',
    coverSrc: 'https://ik.imagekit.io/CHXNDLER/cover/paris.png?updatedAt=1762361385345',
    bg: 'paris',
    element: 'HEART',
    theme: {
      '--color-primary': '#FC54AF',
      '--glow-1': 'rgba(252,84,175,0.6)',
      '--glow-2': 'rgba(252,84,175,0.25)',
    },
  },
  {
    title: 'BRAIN FREEZE',
    slug: 'brain-freeze',
    audioSrc: '/tracks/brain-freeze.mp3',
    coverSrc: 'https://ik.imagekit.io/CHXNDLER/cover/brain-freeze.png?updatedAt=1762361385723',
    bg: 'space',
    element: 'LIGHTNING',
    theme: {
      '--color-primary': '#F2EF1D',
      '--glow-1': 'rgba(242,239,29,0.6)',
      '--glow-2': 'rgba(242,239,29,0.25)',
    },
  },
];

export function getSongBySlug(slug: string): Song | undefined {
  const s = String(slug || '').toLowerCase();
  return songs.find(x => x.slug === s);
}

export function getNextSongSlug(slug: string): string {
  const idx = songs.findIndex(s => s.slug === slug);
  if (idx < 0) return songs[0]?.slug || '';
  const next = (idx + 1) % songs.length;
  return songs[next].slug;
}
