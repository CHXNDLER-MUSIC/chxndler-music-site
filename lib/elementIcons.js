import Image from 'next/image';

// Using string paths instead of static imports due to Git LFS pointer files
export const elementIcons = {
  chxndler: '/elements/logo.webp',
  heart: '/elements/heart.webp',
  lightning: '/elements/lightning.webp',
  darkness: '/elements/darkness.webp',
  water: '/elements/water.webp',
  music: '/elements/music.webp',
  instagram: '/elements/instagram.webp',
  tiktok: '/elements/tiktok.webp',
  youtube: '/elements/youtube.webp',
  spotify: '/elements/spotify.webp',
  apple: '/elements/apple.webp',
  comms: '/elements/comms.webp',
  join: '/elements/join.webp',
  power: '/elements/power.webp',
  start: '/elements/start.webp?v=20250915c',
};

export function ElementIcon({ name, alt, className, width = 20, height = 20, priority = false }) {
  const icon = elementIcons[name];
  if (!icon) return null;
  // Neon white glow specifically for music.png
  const isMusic = String(name).toLowerCase() === 'music';
  const neonWhite = isMusic
    ? {
        filter: 'drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 24px rgba(255,255,255,0.9)) drop-shadow(0 0 48px rgba(255,255,255,0.6))',
      }
    : undefined;
  
  return (
    <Image
      src={icon}
      alt={alt || name}
      className={className}
      width={width}
      height={height}
      priority={priority}
      style={neonWhite}
      draggable={false}
    />
  );
}
