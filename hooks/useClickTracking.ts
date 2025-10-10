"use client";

import { useEffect } from "react";
import { trackClick, generateClickId, storeClickData, type ClickData } from "../lib/analytics";

// Enhanced element identification function
function identifyElement(element: HTMLElement): string {
  const text = element.textContent?.toLowerCase().trim() || '';
  const className = String(element.className || '').toLowerCase();
  const href = element.getAttribute('href')?.toLowerCase() || '';
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
  const title = element.getAttribute('title')?.toLowerCase() || '';
  const dataId = element.getAttribute('data-id')?.toLowerCase() || '';
  const dataSong = element.getAttribute('data-song') || '';
  const dataSlug = element.getAttribute('data-slug') || '';
  const tagName = element.tagName.toLowerCase();
  const parentElement = element.parentElement;
  const parentClass = String(parentElement?.className || '').toLowerCase();

  // Prefer explicit cover art identification before any card logic
  try {
    const isCollectBtn = className.includes('btn-ocean') || (!!(element as any).closest && !!(element as any).closest('.btn-ocean'));
    const isCoverContext = !isCollectBtn && (
      className.includes('cover-hologram') ||
      className.includes('cover') ||
      (!!(element as any).closest && !!(element as any).closest('.cover-hologram-container'))
    );
    if (isCoverContext) {
      // Try to resolve song name from data attributes or aria-label
      let songName = dataSong || '';
      if (!songName) {
        const elWithSong = ((element as any).closest && (element as any).closest('[data-song]')) as HTMLElement | null;
        songName = elWithSong?.getAttribute('data-song') || '';
      }
      if (!songName) {
        const m = (element.getAttribute('aria-label') || '').match(/view\s+(.+?)\s+card/i);
        if (m && m[1]) songName = m[1];
      }
      if (songName) return `🖼️ Cover Art: ${songName}`;
      return '🖼️ Cover Art';
    }
  } catch {}

  // Beam Color Buttons (Power/Blue, Comms/Yellow, Join/Pink)
  if (ariaLabel.includes('power') || title.includes('power') || className.includes('power-btn')) {
    return '⚡ Power Button';
  }
  // Only track the actual pink JOIN THE ALIENS button, not input fields
  if (tagName === 'button' && (text.includes('join the aliens') || text.includes('welcome aboard') || text.includes('submitting') || text.includes('try again'))) {
    return '🚀 Join Aliens';
  }
  // Check if this is a social media button first, then fall back to general comms hub
  if ((className.includes('holo-hub') || className.includes('yellow') || parentClass.includes('yellow') || 
      (element.closest && element.closest('[class*="holo-hub"]'))) && 
      !dataId && !title.includes('instagram') && !title.includes('tiktok') && !title.includes('youtube') && 
      !title.includes('spotify') && !title.includes('apple')) {
    return '📡 Comms Hub';
  }

  // Social Media Buttons (enhanced with data-id detection)
  if (text.includes('instagram') || href.includes('instagram') || className.includes('instagram') || title.includes('instagram') || dataId === 'ig') {
    return '📱 Instagram';
  }
  if (text.includes('tiktok') || href.includes('tiktok') || className.includes('tiktok') || title.includes('tiktok') || dataId === 'tt') {
    return '📱 TikTok';
  }
  if (text.includes('youtube') || href.includes('youtube') || className.includes('youtube') || title.includes('youtube') || dataId === 'yt') {
    return '📱 YouTube';
  }
  if (text.includes('spotify') || href.includes('spotify') || className.includes('spotify') || title.includes('spotify') || dataId === 'sp') {
    // Try to include song context when available (waveform/HUD buttons)
    let songName = dataSong;
    if (!songName) {
      // Try closest ancestor carrying data-song
      try {
        const elWithSong = (element.closest && element.closest('[data-song]')) as HTMLElement | null;
        songName = elWithSong?.getAttribute('data-song') || '';
      } catch {}
    }
    if (!songName) {
      // Try to parse from aria-label like "Open <Song> on Spotify"
      const m = (element.getAttribute('aria-label') || '').match(/open\s+(.+?)\s+on\s+spotify/i);
      if (m && m[1]) songName = m[1];
    }
    return songName ? `🎵 Spotify: ${songName}` : '🎵 Spotify';
  }
  if ((text.includes('apple') && (text.includes('music') || href.includes('music'))) || href.includes('apple') || className.includes('apple') || title.includes('apple') || dataId === 'am') {
    // Try to include song context when available (waveform/HUD buttons)
    let songName = dataSong;
    if (!songName) {
      try {
        const elWithSong = (element.closest && element.closest('[data-song]')) as HTMLElement | null;
        songName = elWithSong?.getAttribute('data-song') || '';
      } catch {}
    }
    if (!songName) {
      const m = (element.getAttribute('aria-label') || '').match(/open\s+(.+?)\s+on\s+apple\s+music/i);
      if (m && m[1]) songName = m[1];
    }
    return songName ? `🎵 Apple Music: ${songName}` : '🎵 Apple Music';
  }

  // Start/Play Button
  if ((text.includes('start') || className.includes('start') || className.includes('wheel-play')) && !text.includes('music')) {
    return '🎮 Start Button';
  }
  // Only count play/pause from the waveform media player button
  if (className.includes('hud-play-btn')) {
    return '▶️ Play/Pause';
  }

  // All Songs - Check for specific song titles and slugs (from songs-consolidated.ts)
  const songPatterns = [
    { pattern: ['game boy heart', 'gameboy', 'game-boy', 'ゲームボーイ'], name: 'Game Boy Heart' },
    { pattern: ['kid forever', 'kidforever', 'kid-forever', '永遠の子供'], name: 'Kid Forever' },
    { pattern: ['brain freeze', 'brainfreeze', 'brain-freeze'], name: 'Brain Freeze' },
    { pattern: ['mickey jas remix', 'mickey-jas', 'mickeyjasremix'], name: 'We\'re Just Friends (Mickey Jas Remix)' },
    { pattern: ['be my bee', 'bemybee', 'be-my-bee'], name: 'Be My Bee' },
    { pattern: ['we\'re just friends', 'were just friends', 'just friends', 'friends'], name: 'We\'re Just Friends' },
    { pattern: ['paris'], name: 'Paris' },
    { pattern: ['pokémon', 'pokemon'], name: 'Pokémon' },
    { pattern: ['alien', 'house party', 'houseparty', 'house-party'], name: 'Alien (House Party)' },
    { pattern: ['dmvrco remix', 'dmvrco', 'dmvrcoremix'], name: 'We\'re Just Friends (DMVRCO Remix)' },
    { pattern: ['baby'], name: 'Baby' },
    { pattern: ['ocean girl', 'oceangirl', 'ocean-girl'], name: 'Ocean Girl' },
    { pattern: ['alone'], name: 'Alone' },
    { pattern: ['always on my mind', 'alwaysonmymind', 'always-on'], name: 'Always On My Mind' },
    { pattern: ['believe in me', 'believeinme', 'believe-in'], name: 'Believe In Me' },
    { pattern: ['collide'], name: 'Collide' },
    { pattern: ['colors of our home', 'colorsofourhome', 'colors-of'], name: 'Colors Of Our Home' },
    { pattern: ['cookies'], name: 'Cookies' },
    { pattern: ['do you want to play house', 'playhouse', 'play-house'], name: 'Do You Want To Play House' },
    { pattern: ['feeling this', 'blink-182', 'blink182', 'feeling-this'], name: 'Feeling This (Blink-182 Cover)' },
    { pattern: ['home'], name: 'Home' },
    { pattern: ['i might fall in love', 'mightfall', 'fall-in-love'], name: 'I Might Fall In Love With You' },
    { pattern: ['letting go', 'lettinggo', 'letting-go'], name: 'Letting Go' },
    { pattern: ['little black heart', 'blackheart', 'little-black'], name: 'Little Black Heart' },
    { pattern: ['love'], name: 'Love' },
    { pattern: ['merry go round', 'merrygoround', 'merry-go'], name: 'Merry Go Round' },
    { pattern: ['mr brightside', 'mrbrightside', 'killers', 'brightside'], name: 'Mr. Brightside (Killers Cover)' },
    { pattern: ['neon skies', 'neonskies', 'neon-skies'], name: 'Neon Skies' },
    { pattern: ['somebody to love', 'somebodytolove', 'somebody-to'], name: 'Somebody To Love' },
    { pattern: ['studio'], name: 'Studio' },
    { pattern: ['they feel too', 'theyfeeltoo', 'they-feel'], name: 'They Feel Too' },
    { pattern: ['tienes un amigo', 'tienesun', 'amigo'], name: 'Tienes Un Amigo' }
  ];

  for (const song of songPatterns) {
    const matchesSong = song.pattern.some(pattern => 
      text.includes(pattern) || href.includes(pattern.replace(/\s+/g, '-')) || 
      className.includes(pattern.replace(/\s+/g, '-'))
    );
    
    if (matchesSong) {
      if (text.includes('collect') || className.includes('collect') || className.includes('btn-')) {
        return `🎴 Collect Card: ${song.name}`;
      }
      if (tagName === 'img' || className.includes('cover') || className.includes('album')) {
        return `🖼️ Cover Art: ${song.name}`;
      }
      return `🎧 Song: ${song.name}`;
    }
  }

  // Generic collect card (enhanced with data attributes + aria-label)
  if (text.includes('collect card') || ariaLabel.includes('collect') || className.includes('collect') || className.includes('btn-ocean')) {
    // Prefer explicit data-song on target or ancestors
    const ownSong = dataSong || element.getAttribute('data-song');
    if (ownSong) return `🎴 Collect Card: ${ownSong}`;
    try {
      const elWithSong = element.closest('[data-song]') as HTMLElement | null;
      const song = elWithSong?.getAttribute('data-song');
      if (song) return `🎴 Collect Card: ${song}`;
    } catch {}
    // Parse from aria-label like "Collect Card: Be My Bee"
    const m = (element.getAttribute('aria-label') || '').match(/collect\s*card\s*:\s*(.+)/i);
    if (m && m[1]) return `🎴 Collect Card: ${m[1]}`;
    return '🎴 Collect Card';
  }

  // Cover art (generic)
  if (tagName === 'img' && (className.includes('cover') || className.includes('album'))) {
    return '🖼️ Cover Art';
  }

  // Card modal clicks
  if (className.includes('card-modal') || className.includes('card-') || className.includes('modal')) {
    return '🎴 Card Modal';
  }

  // Analytics buttons
  if (text.includes('analytics') || className.includes('analytics')) {
    return '📊 Analytics';
  }

  // Default fallback
  if (text) {
    return `${tagName}: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`;
  }
  if (className) {
    return `${tagName}.${className.split(' ')[0]}`;
  }
  return tagName;
}

export function useClickTracking() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const raw = event.target as HTMLElement;
      if (!raw || !raw.tagName || typeof raw.tagName !== 'string') return;

      // Prefer the closest interactive/labelled ancestor for accurate identification
      const target = (raw.closest && raw.closest('button, a, [role="button"], [aria-label], [data-id], [data-song], [data-slug]')) as HTMLElement || raw;

      // Skip tracking for certain elements if needed
      if (target.closest('[data-no-track]')) return;

      // Enhanced element identification
      const enhancedLabel = identifyElement(target);
      
      // Debug logging to help troubleshoot tracking
      if (enhancedLabel.includes('📱') || enhancedLabel.includes('🎵')) {
        console.log('Social/Music button clicked:', enhancedLabel, target);
      }
      
      const clickData: ClickData = {
        id: generateClickId(),
        timestamp: Date.now(),
        element: {
          tagName: target.tagName.toLowerCase(),
          className: String(target.className || ""),
          id: target.id || "",
          textContent: target.textContent?.trim().slice(0, 100) || "",
          href: target.getAttribute('href') || undefined,
          role: target.getAttribute('role') || undefined,
          ariaLabel: target.getAttribute('aria-label') || undefined,
          dataId: target.getAttribute('data-id') || undefined,
        },
        position: {
          x: event.clientX,
          y: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        page: {
          url: window.location.href,
          title: document.title,
        },
        userAgent: navigator.userAgent,
        enhancedLabel,
      };

      // Store locally for dashboard
      storeClickData(clickData);
      // Send to server for analytics
      trackClick(clickData);
    }

    // Add global click listener
    document.addEventListener('click', handleClick, { capture: true });

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);
}
