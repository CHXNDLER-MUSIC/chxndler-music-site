import Image from 'next/image';

// Using string paths instead of static imports due to Git LFS pointer files
export const elementIcons = {
  chxndler: '/elements/chxndler.png',
  heart: '/elements/heart.png',
  lightning: '/elements/lightning.png',
  darkness: '/elements/darkness.png',
  water: '/elements/water.png',
  music: '/elements/music.png',
  instagram: '/elements/instagram.png',
  tiktok: '/elements/tiktok.png',
  youtube: '/elements/youtube.png',
  spotify: '/elements/spotify.png',
  apple: '/elements/apple.png',
  comms: '/elements/comms.png',
  join: '/elements/join.png',
  power: '/elements/power.png',
  start: '/elements/start.png?v=20250915c',
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
