"use client";

import React, { useState, useEffect } from "react";
import { getClickAnalyticsLocal, clearClickAnalyticsLocal, clearAnalyticsCache, getRunningMetricsLocal, clearRunningMetricsLocal } from "../lib/analytics";
import { tracks } from "@/lib/songs-consolidated";

interface MusicStats {
  // Button Categories
  socialButtons: Array<{ button: string; count: number }>;
  controlButtons: Array<{ button: string; count: number }>;
  musicButtons: Array<{ button: string; count: number }>;
  
  // Music Interactions
  songSelections: Array<{ song: string; count: number; title?: string }>;
  coverClicks: Array<{ song: string; count: number; title?: string }>;
  cardClicks: Array<{ song: string; count: number; title?: string }>;
  collectCardClicks: Array<{ song: string; count: number; title?: string }>;
  youtubeSongClicks?: Array<{ song: string; count: number; title?: string }>;
  spotifySongClicks?: Array<{ song: string; count: number; title?: string }>;
  appleSongClicks?: Array<{ song: string; count: number; title?: string }>;
  lyricsSongClicks?: Array<{ song: string; count: number; title?: string }>;
  storeItems?: Array<{ id: string; title: string; count: number }>;
  
  totalMusicInteractions: number;
  totalButtonClicks: number;
}

interface MusicAnalyticsVisualProps {
  onClose?: () => void;
}

type Metrics = {
  pageViews: number;
  startClicks: number;
  commsClicks: number;
  socials: { instagram: number; tiktok: number; youtube: number; spotify: number; apple: number };
  joinPinkClicks: number;
  joinSubmitClicks: number;
  brandClicks?: number;
  songPlays: Record<string, { count: number; title?: string }>;
  coverClicks: Record<string, { count: number; title?: string }>;
  youtubeSongClicks?: Record<string, { count: number; title?: string }>;
  spotifySongClicks?: Record<string, { count: number; title?: string }>;
  appleSongClicks?: Record<string, { count: number; title?: string }>;
  lyricsSongClicks?: Record<string, { count: number; title?: string }>;
  storeButtonClicks?: number;
  storeItemClicks?: Record<string, { id: string; title: string; count: number }>;
  heartCoinClicks?: number;
};

export default function MusicAnalyticsVisual({ onClose }: MusicAnalyticsVisualProps) {
  const [stats, setStats] = useState<MusicStats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [eventsV2Data, setEventsV2Data] = useState<Record<string, number> | null>(null);
  const [songsOpen, setSongsOpen] = useState(false);
  const [coversOpen, setCoversOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [spOpen, setSpOpen] = useState(false);
  const [amOpen, setAmOpen] = useState(false);
  const [ytSongsOpen, setYtSongsOpen] = useState(false);
  const [spSongsOpen, setSpSongsOpen] = useState(false);
  const [amSongsOpen, setAmSongsOpen] = useState(false);
  const [lySongsOpen, setLySongsOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(true);
  const [joinOpen, setJoinOpen] = useState(true);
  const [musicOpen, setMusicOpen] = useState(true);

  const loadMusicAnalytics = () => {
    const clicks = getClickAnalyticsLocal();
    
    if (!Array.isArray(clicks)) {
      setStats({
        socialButtons: [],
        controlButtons: [],
        musicButtons: [],
        songSelections: [],
        coverClicks: [],
        cardClicks: [],
        collectCardClicks: [],
        youtubeSongClicks: [],
        spotifySongClicks: [],
        appleSongClicks: [],
        storeItems: [],
        totalMusicInteractions: 0,
        totalButtonClicks: 0,
      });
      return;
    }

    // Use enhanced labels for better categorization
    const socialButtons: Record<string, number> = {};
    const controlButtons: Record<string, number> = {};
    const musicButtons: Record<string, number> = {};
    const youtubeBySong: Record<string, { count: number; title?: string }> = {};
    const spotifyBySong: Record<string, { count: number; title?: string }> = {};
    const appleBySong: Record<string, { count: number; title?: string }> = {};
    const lyricsBySong: Record<string, { count: number; title?: string }> = {};
    const songSelections: Record<string, { count: number; title?: string }> = {};
    const coverClicks: Record<string, { count: number; title?: string }> = {};
    const cardClicks: Record<string, { count: number; title?: string }> = {};
    const collectCardClicks: Record<string, { count: number; title?: string }> = {};
    const storeItems: Record<string, { count: number; title: string; id: string }> = {};

    let totalInteractions = 0;
    let totalButtonClicks = 0;

    clicks.forEach(click => {
      const label = click.enhancedLabel || '';
      
      // Social Media Buttons
      if (label.includes('📱 Instagram')) {
        socialButtons['Instagram'] = (socialButtons['Instagram'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('📱 TikTok')) {
        socialButtons['TikTok'] = (socialButtons['TikTok'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🎥 YouTube')) {
        // Per-song YouTube clicks (from waveform/HUD)
        const m = label.match(/^🎥 YouTube:\s*(.+)$/);
        if (m && m[1]) {
          const name = m[1].trim();
          const key = name.toLowerCase();
          youtubeBySong[key] = youtubeBySong[key] || { count: 0, title: name };
          youtubeBySong[key].count++;
        }
        totalButtonClicks++;
      } else if (label.includes('📱 YouTube')) {
        socialButtons['YouTube'] = (socialButtons['YouTube'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🎵 Spotify')) {
        musicButtons['Spotify'] = (musicButtons['Spotify'] || 0) + 1;
        totalButtonClicks++;
        // Per-song breakdown when label carries a song
        const m = label.match(/^🎵 Spotify:\s*(.+)$/);
        if (m && m[1]) {
          const name = m[1].trim();
          const key = name.toLowerCase();
          spotifyBySong[key] = spotifyBySong[key] || { count: 0, title: name };
          spotifyBySong[key].count++;
        }
      } else if (label.includes('🎵 Apple Music')) {
        musicButtons['Apple Music'] = (musicButtons['Apple Music'] || 0) + 1;
        totalButtonClicks++;
        const m = label.match(/^🎵 Apple Music:\s*(.+)$/);
        if (m && m[1]) {
          const name = m[1].trim();
          const key = name.toLowerCase();
          appleBySong[key] = appleBySong[key] || { count: 0, title: name };
          appleBySong[key].count++;
        }
      } else if (label.includes('📝 Lyrics')) {
        // Lyrics per-song
        const m = label.match(/^📝\s*Lyrics:\s*(.+)$/);
        if (m && m[1]) {
          const name = m[1].trim();
          const key = name.toLowerCase();
          lyricsBySong[key] = lyricsBySong[key] || { count: 0, title: name };
          lyricsBySong[key].count++;
        } else {
          // Generic lyrics click (no song name)
          lyricsBySong['chxndler'] = lyricsBySong['chxndler'] || { count: 0, title: 'CHXNDLER' };
          lyricsBySong['chxndler'].count++;
        }
      }
      
      // Control Buttons  
      else if (label.includes('⚡ Power Button')) {
        controlButtons['Power'] = (controlButtons['Power'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🚀 Join Aliens')) {
        controlButtons['Join Aliens'] = (controlButtons['Join Aliens'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('📡 Comms Hub')) {
        controlButtons['Comms'] = (controlButtons['Comms'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🎮 Start Button')) {
        controlButtons['Start'] = (controlButtons['Start'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('▶️ Play/Pause')) {
        controlButtons['Play/Pause'] = (controlButtons['Play/Pause'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('⭐ CHXNDLER Button') || label.trim().toLowerCase() === 'chxndler') {
        controlButtons['CHXNDLER'] = (controlButtons['CHXNDLER'] || 0) + 1;
        totalButtonClicks++;
      }
      
      // Song/Music Interactions
      else if (label.includes('🎧 Song:')) {
        const songName = label.replace('🎧 Song: ', '');
        const songKey = songName.toLowerCase().replace(/\s+/g, '-');
        songSelections[songKey] = songSelections[songKey] || { count: 0, title: songName };
        songSelections[songKey].count++;
        totalInteractions++;
      } else if (label.includes('🖼️ Cover Art:')) {
        const songName = label.replace('🖼️ Cover Art: ', '');
        const songKey = songName.toLowerCase().replace(/\s+/g, '-');
        coverClicks[songKey] = coverClicks[songKey] || { count: 0, title: songName };
        coverClicks[songKey].count++;
        totalInteractions++;
      } else if (label.includes('🎴 Collect Card:')) {
        const songName = label.replace('🎴 Collect Card: ', '');
        const songKey = songName.toLowerCase().replace(/\s+/g, '-');
        collectCardClicks[songKey] = collectCardClicks[songKey] || { count: 0, title: songName };
        collectCardClicks[songKey].count++;
        totalInteractions++;
      }
      
      // Generic collect card or cover art
      else if (label.includes('🎴 Collect Card')) {
        const songKey = 'chxndler';
        collectCardClicks[songKey] = collectCardClicks[songKey] || { count: 0, title: 'CHXNDLER' };
        collectCardClicks[songKey].count++;
        totalInteractions++;
      } else if (label.includes('🖼️ Cover Art')) {
        const songKey = 'chxndler';
        coverClicks[songKey] = coverClicks[songKey] || { count: 0, title: 'CHXNDLER' };
        coverClicks[songKey].count++;
        totalInteractions++;
      }
      // Store: Add to Collection (merch)
      else if (label.startsWith('🛍️ Store:')) {
        const title = label.replace('🛍️ Store:', '').trim();
        const key = title.toLowerCase();
        const idGuess = key.replace(/\s+/g, '-');
        storeItems[key] = storeItems[key] || { count: 0, title: title || 'Item', id: idGuess };
        storeItems[key].count++;
      }
    });

    setStats({
      socialButtons: Object.entries(socialButtons)
        .map(([button, count]) => ({ button, count }))
        .sort((a, b) => b.count - a.count),
      controlButtons: Object.entries(controlButtons)
        .map(([button, count]) => ({ button, count }))
        .sort((a, b) => b.count - a.count),
      musicButtons: Object.entries(musicButtons)
        .map(([button, count]) => ({ button, count }))
        .sort((a, b) => b.count - a.count),
      songSelections: Object.entries(songSelections)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      coverClicks: Object.entries(coverClicks)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      cardClicks: Object.entries(cardClicks)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      youtubeSongClicks: Object.entries(youtubeBySong)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      spotifySongClicks: Object.entries(spotifyBySong)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      appleSongClicks: Object.entries(appleBySong)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      lyricsSongClicks: Object.entries(lyricsBySong)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      collectCardClicks: Object.entries(collectCardClicks)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
        .sort((a, b) => b.count - a.count),
      storeItems: Object.entries(storeItems)
        .map(([k, v]) => ({ id: v.id, title: v.title, count: v.count }))
        .sort((a, b) => b.count - a.count),
      totalMusicInteractions: totalInteractions,
      totalButtonClicks: totalButtonClicks,
    });
  };


  const getBarWidth = (count: number, maxCount: number): string => {
    return `${Math.max((count / maxCount) * 100, 5)}%`;
  };

  const getBarColor = (index: number): string => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-cyan-500',
      'bg-gradient-to-r from-purple-500 to-pink-500', 
      'bg-gradient-to-r from-green-500 to-emerald-500',
      'bg-gradient-to-r from-orange-500 to-red-500',
      'bg-gradient-to-r from-indigo-500 to-purple-500',
    ];
    return colors[index % colors.length];
  };

  async function loadServerMetrics() {
    try {
      const res = await fetch('/api/metrics', { cache: 'no-store' });
      if (!res.ok) throw new Error('metrics failed');
      const json = await res.json();
      setMetrics(json);
    } catch {
      setMetrics(null);
    }
  }

  async function loadEventsV2Data() {
    try {
      // Import createClient from the correct path
      const { createClient } = await import('@/lib/supabaseClient');
      const supabase = createClient();

      // Get counts for different event types using count: 'exact', head: true
      const eventQueries = [
        { name: 'start_click', key: 'startClicks' },
        { name: 'instagram_click', key: 'instagramClicks' },
        { name: 'tiktok_click', key: 'tiktokClicks' },
        { name: 'youtube_click', key: 'youtubeClicks' },
        { name: 'power_click', key: 'powerClicks' },
        { name: 'signal_click', key: 'signalClicks' },
        { name: 'binder_click', key: 'binderClicks' },
        { name: 'journal_click', key: 'journalClicks' },
      ];

      const results: Record<string, number> = {};
      
      for (const query of eventQueries) {
        const { count, error } = await supabase
          .from('events_v2')
          .select('*', { count: 'exact', head: true })
          .eq('event_name', query.name);
        
        if (error) {
          console.error(`[Analytics] Failed to load ${query.name} count:`, error);
          results[query.key] = 0;
        } else {
          results[query.key] = count || 0;
        }
      }
      
      setEventsV2Data(results);
    } catch (error) {
      console.error('[Analytics] Exception loading events_v2 analytics:', error);
      setEventsV2Data({});
    }
  }

  useEffect(() => {
    // Only load when modal is open - this component is only rendered when modal is open
    loadServerMetrics();
    loadMusicAnalytics();
    loadEventsV2Data();
  }, []); // Load once when component mounts (modal opens)

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading music analytics...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-cyan-500/20">
        <div className="p-6 border-b border-cyan-500/20 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              🌐 Website Analytics
            </h2>
            <p className="text-cyan-300/70 mt-1">Site-wide events, buttons, and music</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const ok = typeof window === 'undefined' ? false : window.confirm('Are you sure you want to reset analytics?');
                if (!ok) return;
                const attempt = async (adminKey?: string) => {
                  const headers: Record<string, string> = {};
                  if (adminKey) headers['x-admin-key'] = adminKey;
                  const res = await fetch('/api/reset-analytics', { method: 'POST', headers });
                  return res;
                };
                try {
                  let res = await attempt();
                  if (res.status === 401) {
                    const key = typeof window !== 'undefined' ? window.prompt('Enter admin key to reset analytics:') || '' : '';
                    if (!key) return;
                    res = await attempt(key);
                  }
                  if (!res.ok) throw new Error(`reset failed (${res.status})`);
                  // Clear local click analytics, running totals and deduplication cache
                  try { clearClickAnalyticsLocal(); } catch {}
                  try { clearRunningMetricsLocal(); } catch {}
                  try { clearAnalyticsCache(); } catch {}
                  // Reload server + local metrics
                  await loadServerMetrics();
                  loadMusicAnalytics();
                  try { const json = await res.json(); void json; } catch {}
                  if (typeof window !== 'undefined') alert('Analytics reset complete.');
                } catch (e) {
                  console.warn('reset analytics failed:', e);
                  if (typeof window !== 'undefined') alert('Reset failed. Check admin key or server logs.');
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              🗑️ Reset Analytics
            </button>
            <button
              onClick={() => { loadServerMetrics(); loadMusicAnalytics(); loadEventsV2Data(); }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              🔄 Refresh
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)] pb-24 holo-scrollbar-yellow">
          {(!stats || stats.totalMusicInteractions === 0) && !metrics ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-xl">No music interactions yet!</p>
              <p className="text-sm mt-2">Start clicking songs, covers, and buttons to see analytics here.</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Headline site metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 rounded-xl border border-cyan-500/20">
                  <div className="text-3xl font-bold text-cyan-400">{(() => { const local = getRunningMetricsLocal(); return (metrics?.pageViews ?? local.pageViews) || 0; })()}</div>
                  <div className="text-sm text-cyan-300/70">Page Views</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/20">
                  <div className="text-3xl font-bold text-purple-400">{(() => { 
                    // Prefer events_v2 data, then metrics, then local
                    const eventsV2Count = eventsV2Data?.startClicks;
                    const local = getRunningMetricsLocal(); 
                    return eventsV2Count ?? metrics?.startClicks ?? local.startClicks ?? (stats?.controlButtons.find(b=>b.button==='Start')?.count || 0); 
                  })()}</div>
                  <div className="text-sm text-purple-300/70">Start Button Clicks {eventsV2Data?.startClicks !== undefined ? '(events_v2)' : ''}</div>
                </div>
                
              </div>

              {/* Social Media clicks (collapsible) */}
              <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10">
                <button className="w-full text-left p-6 border-b border-yellow-400/20 flex items-center justify-between" onClick={() => setSocialOpen(!socialOpen)}>
                  <h3 className="text-lg font-bold text-yellow-200">SOCIAL MEDIA</h3>
                  {(() => {
                    // Total should reflect yellow-hub platform clicks (IG + YouTube + TikTok + Apple + Spotify)
                    // Prefer events_v2 data, then server metrics; fall back to local click analytics
                    const haveEventsV2 = eventsV2Data && Object.keys(eventsV2Data).some(k => k.includes('Clicks'));
                    if (haveEventsV2) {
                      const ig = eventsV2Data?.instagramClicks || 0;
                      const yt = eventsV2Data?.youtubeClicks || 0;
                      const tt = eventsV2Data?.tiktokClicks || 0;
                      // Note: Apple Music and Spotify not yet in events_v2, use fallback
                      const am = metrics?.socials?.apple || 0;
                      const sp = metrics?.socials?.spotify || 0;
                      return <div className="text-2xl font-extrabold text-yellow-100">{ig + yt + tt + am + sp}</div>;
                    }
                    const haveServer = !!metrics;
                    if (haveServer) {
                      const ig = metrics?.socials?.instagram || 0;
                      const yt = metrics?.socials?.youtube || 0;
                      const tt = metrics?.socials?.tiktok || 0;
                      const am = metrics?.socials?.apple || 0;
                      const sp = metrics?.socials?.spotify || 0;
                      return <div className="text-2xl font-extrabold text-yellow-100">{ig + yt + tt + am + sp}</div>;
                    }
                    try {
                      const clicks = getClickAnalyticsLocal();
                      const sum = (id: string) => clicks.filter(c => (c.element?.dataId || '').toLowerCase() === id).length;
                      const total = sum('ig') + sum('yt') + sum('tt') + sum('am') + sum('sp');
                      return <div className="text-2xl font-extrabold text-yellow-100">{total}</div>;
                    } catch {
                      const ig = stats?.socialButtons.find(b=>b.button==='Instagram')?.count || 0;
                      const yt = stats?.socialButtons.find(b=>b.button==='YouTube')?.count || 0;
                      const tt = stats?.socialButtons.find(b=>b.button==='TikTok')?.count || 0;
                      const am = stats?.musicButtons.find(b=>b.button==='Apple Music')?.count || 0;
                      const sp = stats?.musicButtons.find(b=>b.button==='Spotify')?.count || 0;
                      return <div className="text-2xl font-extrabold text-yellow-100">{ig + yt + tt + am + sp}</div>;
                    }
                  })()}
                </button>
                {socialOpen && (
                  <div className="divide-y divide-yellow-400/10">
                    {([
                      { key: 'Instagram', value: eventsV2Data?.instagramClicks ?? metrics?.socials?.instagram ?? (stats?.socialButtons.find(b=>b.button==='Instagram')?.count || 0), open: igOpen, setOpen: setIgOpen, fromV2: eventsV2Data?.instagramClicks !== undefined },
                      { key: 'YouTube', value: eventsV2Data?.youtubeClicks ?? metrics?.socials?.youtube ?? (stats?.socialButtons.find(b=>b.button==='YouTube')?.count || 0), open: ytOpen, setOpen: setYtOpen, fromV2: eventsV2Data?.youtubeClicks !== undefined },
                      { key: 'TikTok', value: eventsV2Data?.tiktokClicks ?? metrics?.socials?.tiktok ?? (stats?.socialButtons.find(b=>b.button==='TikTok')?.count || 0), open: ttOpen, setOpen: setTtOpen, fromV2: eventsV2Data?.tiktokClicks !== undefined },
                      // Keep streaming platforms listed below for convenience, but exclude from Social total
                      { key: 'Apple Music', value: metrics?.socials?.apple ?? (stats?.musicButtons.find(b=>b.button==='Apple Music')?.count || 0), open: amOpen, setOpen: setAmOpen, fromV2: false },
                      { key: 'Spotify', value: metrics?.socials?.spotify ?? (stats?.musicButtons.find(b=>b.button==='Spotify')?.count || 0), open: spOpen, setOpen: setSpOpen, fromV2: false },
                    ] as Array<{key:string;value:number;open:boolean;setOpen:(v:boolean)=>void;fromV2:boolean}>).map((it) => (
                      <div key={it.key}>
                        <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-yellow-500/10" onClick={() => it.setOpen(!it.open)}>
                          <span className="text-white font-medium">{it.key}</span>
                          <span className="text-yellow-200 font-bold">{it.value}</span>
                        </button>
                        {it.open && (
                          <div className="px-6 pb-4 text-sm text-yellow-100/80">
                            {it.value} clicks {it.fromV2 ? '(events_v2)' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pink: Join Aliens section (collapsible) */}
              <div className="rounded-xl border border-pink-400/30 bg-pink-500/10">
                <button className="w-full text-left p-6 border-b border-pink-400/20 flex items-center justify-between" onClick={() => setJoinOpen(!joinOpen)}>
                  <h3 className="text-lg font-bold text-pink-200">JOIN ALIENS</h3>
                  <div className="text-2xl font-extrabold text-pink-100">{(() => { const local = getRunningMetricsLocal(); return metrics?.joinSubmitClicks ?? local.joinSubmitClicks ?? 0; })()}</div>
                </button>
                {joinOpen && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-pink-500/20 p-4 rounded-xl border border-pink-400/30">
                      <div className="text-3xl font-bold text-pink-300">{(() => { const local = getRunningMetricsLocal(); return metrics?.joinPinkClicks ?? local.joinPinkClicks ?? (stats?.controlButtons.find(b=>b.button==='Join Aliens')?.count || 0); })()}</div>
                      <div className="text-sm text-pink-200/90">Total Clicks</div>
                    </div>
                    <div className="bg-emerald-500/20 p-4 rounded-xl border border-emerald-400/30">
                      <div className="text-3xl font-bold text-emerald-300">{(() => { const local = getRunningMetricsLocal(); return metrics?.joinSubmitClicks ?? local.joinSubmitClicks ?? 0; })()}</div>
                      <div className="text-sm text-emerald-200/90">JOIN THE ALIENS Submits</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Blue Display: Songs, Cover Art, Cards */
              }
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10">
                <button className="w-full text-left p-6 border-b border-cyan-400/20 flex items-center justify-between" onClick={() => setMusicOpen(!musicOpen)}>
                  <h3 className="text-lg font-bold text-cyan-200">MUSIC</h3>
                  <div className="text-sm text-cyan-100/80 mt-1">{musicOpen ? 'Hide' : 'Show'}</div>
                </button>
                {musicOpen && (
                  <>
                    {/* Control counters at top: POWER then Play/Pause */}
                    <div className="divide-y divide-cyan-400/10">
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">Power</span>
                        <span className="text-cyan-200 font-bold">{(() => {
                          const eventsV2Count = eventsV2Data?.powerClicks;
                          const localCount = stats?.controlButtons.find(b=>b.button==='Power')?.count || 0;
                          return eventsV2Count ?? localCount;
                        })()}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">Play/Pause</span>
                        <span className="text-cyan-200 font-bold">{stats?.controlButtons.find(b=>b.button==='Play/Pause')?.count || 0}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">Signal</span>
                        <span className="text-cyan-200 font-bold">{(() => {
                          const eventsV2Count = eventsV2Data?.signalClicks;
                          const localCount = stats?.controlButtons.find(b=>b.button==='Join Aliens')?.count || 0;
                          return eventsV2Count ?? localCount;
                        })()}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">Binder</span>
                        <span className="text-cyan-200 font-bold">{eventsV2Data?.binderClicks ?? 0} {eventsV2Data?.binderClicks !== undefined ? '(events_v2)' : ''}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">Journal</span>
                        <span className="text-cyan-200 font-bold">{eventsV2Data?.journalClicks ?? 0} {eventsV2Data?.journalClicks !== undefined ? '(events_v2)' : ''}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium text-sm">chxndler</span>
                        <span className="text-cyan-200 font-bold">{(() => { const fallback = stats?.controlButtons.find(b=>b.button==='CHXNDLER')?.count || 0; return (metrics?.brandClicks ?? fallback); })()}</span>
                      </div>
                      <div className="w-full px-6 py-4 flex items-center justify-between">
                        <span className="text-white font-medium">HEART Coin</span>
                        <span className="text-cyan-200 font-bold">
                          {(() => {
                            // Prefer server metric; fallback to local click analytics label match
                            if (typeof metrics?.heartCoinClicks === 'number') return metrics.heartCoinClicks;
                            try {
                              const clicks = getClickAnalyticsLocal();
                              return clicks.filter(c => (c.enhancedLabel || '').includes('HEART Coin')).length;
                            } catch { return 0; }
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Spotify per-song (from waveform/HUD) */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setSpSongsOpen(!spSongsOpen)}>
                      <span className="text-white font-medium">Spotify</span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          if (metrics?.spotifySongClicks && Object.keys(metrics.spotifySongClicks).length) {
                            return Object.values(metrics.spotifySongClicks).reduce((sum, it) => sum + (it?.count || 0), 0);
                          }
                          const list = stats?.spotifySongClicks || [];
                          return list.reduce((sum, it) => sum + (it.count || 0), 0);
                        })()}
                      </span>
                    </button>
                    {spSongsOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {tracks.map((t, idx) => {
                          const lower = (t.title || '').toLowerCase();
                          // Prefer server metrics; fall back to local click analytics
                          const serverCount = metrics?.spotifySongClicks?.[lower]?.count || 0;
                          const localEntry = (stats?.spotifySongClicks || []).find(s => (s.title || '').toLowerCase() === lower);
                          const count = serverCount || localEntry?.count || 0;
                          const max = Math.max(1, ...tracks.map(tt => {
                            const lt = (tt.title || '').toLowerCase();
                            const sCount = metrics?.spotifySongClicks?.[lt]?.count || 0;
                            if (sCount > 0) return sCount;
                            const e = (stats?.spotifySongClicks || []).find(s => (s.title || '').toLowerCase() === lt);
                            return e?.count || 0;
                          }));
                          return (
                            <div key={(t.slug||'')+':sp' || idx} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{t.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* YouTube per-song (from waveform/HUD) */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setYtSongsOpen(!ytSongsOpen)}>
                      <span className="text-white font-medium">YouTube</span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          const list = stats?.youtubeSongClicks || [];
                          return list.reduce((sum, it) => sum + (it.count || 0), 0);
                        })()}
                      </span>
                    </button>
                    {ytSongsOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {tracks.map((t, idx) => {
                          const lower = (t.title || '').toLowerCase();
                          const localEntry = (stats?.youtubeSongClicks || []).find(s => (s.title || '').toLowerCase() === lower);
                          const count = localEntry?.count || 0;
                          const max = Math.max(1, ...tracks.map(tt => {
                            const lt = (tt.title || '').toLowerCase();
                            const e = (stats?.youtubeSongClicks || []).find(s => (s.title || '').toLowerCase() === lt);
                            return e?.count || 0;
                          }));
                          return (
                            <div key={(t.slug||'')+':yt' || idx} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{t.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Apple Music per-song (from waveform/HUD) */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setAmSongsOpen(!amSongsOpen)}>
                      <span className="text-white font-medium">Apple Music</span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          if (metrics?.appleSongClicks && Object.keys(metrics.appleSongClicks).length) {
                            return Object.values(metrics.appleSongClicks).reduce((sum, it) => sum + (it?.count || 0), 0);
                          }
                          const list = stats?.appleSongClicks || [];
                          return list.reduce((sum, it) => sum + (it.count || 0), 0);
                        })()}
                      </span>
                    </button>
                    {amSongsOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {tracks.map((t, idx) => {
                          const lower = (t.title || '').toLowerCase();
                          const serverCount = metrics?.appleSongClicks?.[lower]?.count || 0;
                          const localEntry = (stats?.appleSongClicks || []).find(s => (s.title || '').toLowerCase() === lower);
                          const count = serverCount || localEntry?.count || 0;
                          const max = Math.max(1, ...tracks.map(tt => {
                            const lt = (tt.title || '').toLowerCase();
                            const sCount = metrics?.appleSongClicks?.[lt]?.count || 0;
                            if (sCount > 0) return sCount;
                            const e = (stats?.appleSongClicks || []).find(s => (s.title || '').toLowerCase() === lt);
                            return e?.count || 0;
                          }));
                          return (
                            <div key={(t.slug||'')+':am' || idx} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{t.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-pink-500 to-red-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Lyrics per-song */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setLySongsOpen(!lySongsOpen)}>
                      <span className="text-white font-medium">Lyrics</span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          if (metrics?.lyricsSongClicks && Object.keys(metrics.lyricsSongClicks).length) {
                            return Object.values(metrics.lyricsSongClicks).reduce((sum, it) => sum + (it?.count || 0), 0);
                          }
                          const list = stats?.lyricsSongClicks || [];
                          return list.reduce((sum, it) => sum + (it.count || 0), 0);
                        })()}
                      </span>
                    </button>
                    {lySongsOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {/* CHXNDLER homepage lyrics button */}
                        {(() => {
                          const lower = 'chxndler';
                          const serverCount = metrics?.lyricsSongClicks?.[lower]?.count || 0;
                          const localEntry = (stats?.lyricsSongClicks || []).find(s => (s.title || '').toLowerCase() === 'chxndler');
                          const count = serverCount || localEntry?.count || 0;
                          const max = Math.max(1, count, ...tracks.map(tt => {
                            const lt = (tt.title || '').toLowerCase();
                            const sCount = metrics?.lyricsSongClicks?.[lt]?.count || 0;
                            if (sCount > 0) return sCount;
                            const e = (stats?.lyricsSongClicks || []).find(s => (s.title || '').toLowerCase() === lt);
                            return e?.count || 0;
                          }));
                          return (
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">CHXNDLER (Homepage Lyrics)</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        {tracks.map((t, idx) => {
                          const lower = (t.title || '').toLowerCase();
                          const serverCount = metrics?.lyricsSongClicks?.[lower]?.count || 0;
                          const localEntry = (stats?.lyricsSongClicks || []).find(s => (s.title || '').toLowerCase() === lower);
                          const count = serverCount || localEntry?.count || 0;
                          const max = Math.max(1, ...tracks.map(tt => {
                            const lt = (tt.title || '').toLowerCase();
                            const sCount = metrics?.lyricsSongClicks?.[lt]?.count || 0;
                            if (sCount > 0) return sCount;
                            const e = (stats?.lyricsSongClicks || []).find(s => (s.title || '').toLowerCase() === lt);
                            return e?.count || 0;
                          }));
                          return (
                            <div key={(t.slug||'')+':ly' || idx} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{t.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                {/* Songs */}
                <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setSongsOpen(!songsOpen)}>
                  <span className="text-white font-medium">Songs</span>
                  <span className="text-cyan-200 font-bold">
                    {(() => {
                      // Sum per-track counts using the same server/local fallback as row values
                      const total = (tracks || []).reduce((sum, t) => {
                        const slug = (t.slug || '').toLowerCase();
                        const server = metrics?.songPlays?.[slug]?.count || 0;
                        if (server > 0) return sum + server;
                        const local = (stats?.songSelections || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase())?.count || 0;
                        return sum + local;
                      }, 0);
                      return total;
                    })()}
                  </span>
                </button>
                {songsOpen && (
                  <div className="px-6 pb-6 space-y-3">
                    {tracks.map((t, idx) => {
                      const slug = (t.slug || '').toLowerCase();
                      // Fallback to local click analytics if server metrics are unavailable or zero
                      const localSongCount = (() => {
                        const match = (stats?.songSelections || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase());
                        return match?.count || 0;
                      })();
                      const count = metrics?.songPlays?.[slug]?.count || localSongCount || 0;
                      const max = Math.max(1, ...tracks.map(tt => {
                        const s = (tt.slug || '').toLowerCase();
                        const server = metrics?.songPlays?.[s]?.count || 0;
                        if (server > 0) return server;
                        const local = (stats?.songSelections || []).find(ss => (ss.title || '').toLowerCase() === (tt.title || '').toLowerCase())?.count || 0;
                        return local;
                      }));
                      return (
                        <div key={slug || idx} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{t.title}</span>
                              <span className="text-cyan-400 font-bold">{count} plays</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cover Art */}
                <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-b border-cyan-400/10" onClick={() => setCoversOpen(!coversOpen)}>
                  <span className="text-white font-medium">Cover Art</span>
                  <span className="text-cyan-200 font-bold">
                    {(() => {
                      // Sum per-track counts using the same server/local fallback as row values
                      const total = (tracks || []).reduce((sum, t) => {
                        const slug = (t.slug || '').toLowerCase();
                        const server = metrics?.coverClicks?.[slug]?.count || 0;
                        if (server > 0) return sum + server;
                        const local = (stats?.coverClicks || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase())?.count || 0;
                        return sum + local;
                      }, 0);
                      return total;
                    })()}
                  </span>
                </button>
                {coversOpen && (
                  <div className="px-6 pb-6 space-y-3">
                    {tracks.map((t, idx) => {
                      const slug = (t.slug || '').toLowerCase();
                      const localCoverCount = (() => {
                        const match = (stats?.coverClicks || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase());
                        return match?.count || 0;
                      })();
                      const count = metrics?.coverClicks?.[slug]?.count || localCoverCount || 0;
                      const max = Math.max(1, ...tracks.map(tt => {
                        const s = (tt.slug || '').toLowerCase();
                        const server = metrics?.coverClicks?.[s]?.count || 0;
                        if (server > 0) return server;
                        const local = (stats?.coverClicks || []).find(ss => (ss.title || '').toLowerCase() === (tt.title || '').toLowerCase())?.count || 0;
                        return local;
                      }));
                      return (
                        <div key={slug || idx} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{t.title}</span>
                              <span className="text-cyan-400 font-bold">{count} clicks</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                    {/* Cards */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10" onClick={() => setCardsOpen(!cardsOpen)}>
                      <span className="text-white font-medium">Cards</span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          // Sum per-track counts using the same pattern as Cover Art and Songs
                          const total = (tracks || []).reduce((sum, t) => {
                            const localCardCount = (() => {
                              const match = (stats?.collectCardClicks || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase());
                              return match?.count || 0;
                            })();
                            return sum + localCardCount;
                          }, 0);
                          return total;
                        })()}
                      </span>
                    </button>
                    {cardsOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {tracks.map((t, idx) => {
                          const slug = (t.slug || '').toLowerCase();
                          const localCardCount = (() => {
                            const match = (stats?.collectCardClicks || []).find(s => (s.title || '').toLowerCase() === (t.title || '').toLowerCase());
                            return match?.count || 0;
                          })();
                          const count = localCardCount || 0;
                          const max = Math.max(1, ...tracks.map(tt => {
                            const local = (stats?.collectCardClicks || []).find(ss => (ss.title || '').toLowerCase() === (tt.title || '').toLowerCase())?.count || 0;
                            return local;
                          }));
                          return (
                            <div key={slug || idx} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{t.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} clicks</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500`} style={{ width: `${Math.max((count / max) * 100, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Store */}
                    <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 border-t border-cyan-400/10" onClick={() => setStoreOpen(!storeOpen)}>
                      <span className="text-white font-medium flex items-center gap-3">
                        Store
                        <span className="text-xs font-semibold text-cyan-200/80 bg-cyan-500/10 border border-cyan-400/20 rounded-full px-2 py-0.5">
                          opens: {metrics?.storeButtonClicks ?? 0}
                        </span>
                      </span>
                      <span className="text-cyan-200 font-bold">
                        {(() => {
                          // Prefer server: sum of all store item clicks
                          if (metrics?.storeItemClicks && Object.keys(metrics.storeItemClicks).length) {
                            return Object.values(metrics.storeItemClicks).reduce((sum, it:any) => sum + (it?.count || 0), 0);
                          }
                          const list = stats?.storeItems || [];
                          return list.reduce((sum, it:any) => sum + (it.count || 0), 0);
                        })()}
                      </span>
                    </button>
                    {storeOpen && (
                      <div className="px-6 pb-6 space-y-3">
                        {([
                          { id: 'sticker', title: 'STICKER' },
                          { id: 'pin', title: 'PIN' },
                          { id: 'patch', title: 'PATCH' },
                          { id: 'necklace', title: 'NECKLACE' },
                          { id: 'beanie', title: 'BEANIE' },
                          { id: 'hat', title: 'HAT' },
                          { id: 'house-party-poster', title: 'HOUSE PARTY POSTER' },
                          { id: 'button', title: 'BUTTON' },
                          { id: 'keychain', title: 'KEYCHAIN' },
                          // Newly added items
                          { id: 'pick', title: 'PICK' },
                          { id: 'bracelet', title: 'BRACELET' },
                        ] as Array<{id:string;title:string}>).map((prod) => {
                          const serverCount = metrics?.storeItemClicks?.[prod.id]?.count || 0;
                          const localCount = (() => {
                            const found = (stats?.storeItems || []).find((s:any) => (s.title || '').toLowerCase() === prod.title.toLowerCase());
                            return found?.count || 0;
                          })();
                          const count = serverCount || localCount || 0;
                          return (
                            <div key={prod.id} className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white font-medium">{prod.title}</span>
                                  <span className="text-cyan-400 font-bold">{count} adds</span>
                                </div>
                                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full bg-gradient-to-r from-amber-400 to-pink-500 transition-all duration-500`} style={{ width: `${Math.max(count > 0 ? (count / Math.max(1, count)) * 100 : 5, 5)}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Control Buttons grid removed; surfaced in MUSIC section */}


              {/* Keep click-category sections for additional context */}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
