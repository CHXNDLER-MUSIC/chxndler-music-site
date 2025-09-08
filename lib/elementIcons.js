import Image from 'next/image';
import chxndlerIcon from '../public/elements/chxndler.png';
import heartIcon from '../public/elements/heart.png';
import lightingIcon from '../public/elements/lighting.png';
import darknessIcon from '../public/elements/darkness.png';
import waterIcon from '../public/elements/water.png';
import musicIcon from '../public/elements/music.png';
import instagramIcon from '../public/elements/instagram.png';
import tiktokIcon from '../public/elements/tiktok.png';
import youtubeIcon from '../public/elements/youtube.png';
import spotifyIcon from '../public/elements/spotify.png';
import appleIcon from '../public/elements/apple.png';
import commsIcon from '../public/elements/comms.png';
import joinIcon from '../public/elements/join.png';
import powerIcon from '../public/elements/power.png';
import startIcon from '../public/elements/start.png';

export const elementIcons = {
  chxndler: chxndlerIcon,
  heart: heartIcon,
  lighting: lightingIcon,
  darkness: darknessIcon,
  water: waterIcon,
  music: musicIcon,
  instagram: instagramIcon,
  tiktok: tiktokIcon,
  youtube: youtubeIcon,
  spotify: spotifyIcon,
  apple: appleIcon,
  comms: commsIcon,
  join: joinIcon,
  power: powerIcon,
  start: startIcon,
};

export function ElementIcon({ name, alt, className, width = 20, height = 20, priority = false }) {
  const icon = elementIcons[name];
  if (!icon) return null;
  
  return (
    <Image
      src={icon}
      alt={alt || name}
      className={className}
      width={width}
      height={height}
      priority={priority}
      draggable={false}
    />
  );
}