"use client";

import React, { useState, useEffect } from "react";
import { getClickAnalyticsLocal } from "../lib/analytics";
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
  songPlays: Record<string, { count: number; title?: string }>;
  coverClicks: Record<string, { count: number; title?: string }>;
};

export default function MusicAnalyticsVisual({ onClose }: MusicAnalyticsVisualProps) {
  const [stats, setStats] = useState<MusicStats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [songsOpen, setSongsOpen] = useState(false);
  const [coversOpen, setCoversOpen] = useState(false);
  const [igOpen, setIgOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [spOpen, setSpOpen] = useState(false);
  const [amOpen, setAmOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(true);
  const [joinOpen, setJoinOpen] = useState(true);

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
        totalMusicInteractions: 0,
        totalButtonClicks: 0,
      });
      return;
    }

    // Use enhanced labels for better categorization
    const socialButtons: Record<string, number> = {};
    const controlButtons: Record<string, number> = {};
    const musicButtons: Record<string, number> = {};
    const songSelections: Record<string, { count: number; title?: string }> = {};
    const coverClicks: Record<string, { count: number; title?: string }> = {};
    const cardClicks: Record<string, { count: number; title?: string }> = {};
    const collectCardClicks: Record<string, { count: number; title?: string }> = {};

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
      } else if (label.includes('📱 YouTube')) {
        socialButtons['YouTube'] = (socialButtons['YouTube'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🎵 Spotify')) {
        musicButtons['Spotify'] = (musicButtons['Spotify'] || 0) + 1;
        totalButtonClicks++;
      } else if (label.includes('🎵 Apple Music')) {
        musicButtons['Apple Music'] = (musicButtons['Apple Music'] || 0) + 1;
        totalButtonClicks++;
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
      collectCardClicks: Object.entries(collectCardClicks)
        .map(([song, data]) => ({ song, count: data.count, title: data.title }))
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

  useEffect(() => {
    loadServerMetrics();
    loadMusicAnalytics();
  }, []);

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
              onClick={() => { loadServerMetrics(); loadMusicAnalytics(); }}
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

        <div className="overflow-y-auto max-h-[calc(90vh-100px)] pb-24">
          {(!stats || stats.totalMusicInteractions === 0) && !metrics ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-xl">No music interactions yet!</p>
              <p className="text-sm mt-2">Start clicking songs, covers, and buttons to see analytics here.</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Headline site metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 rounded-xl border border-cyan-500/20">
                  <div className="text-3xl font-bold text-cyan-400">{metrics?.pageViews ?? 0}</div>
                  <div className="text-sm text-cyan-300/70">Page Views</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/20">
                  <div className="text-3xl font-bold text-purple-400">{metrics?.startClicks ?? (stats?.controlButtons.find(b=>b.button==='Start')?.count || 0)}</div>
                  <div className="text-sm text-purple-300/70">Start Button Clicks</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 p-4 rounded-xl border border-yellow-500/20">
                  <div className="text-3xl font-bold text-yellow-300">{
                    (metrics?.socials?.instagram || 0) +
                    (metrics?.socials?.tiktok || 0) +
                    (metrics?.socials?.youtube || 0) +
                    (metrics?.socials?.spotify || 0) +
                    (metrics?.socials?.apple || 0)
                  }</div>
                  <div className="text-sm text-yellow-100/80">Social Media Total</div>
                </div>
              </div>

              {/* Social Media clicks (collapsible) */}
              <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10">
                <button className="w-full text-left p-6 border-b border-yellow-400/20 flex items-center justify-between" onClick={() => setSocialOpen(!socialOpen)}>
                  <h3 className="text-lg font-bold text-yellow-200">SOCIAL MEDIA CLICKS</h3>
                  <div className="text-sm text-yellow-100/80 mt-1">
                    Total: {(metrics?.socials?.instagram||0)+(metrics?.socials?.tiktok||0)+(metrics?.socials?.youtube||0)+(metrics?.socials?.spotify||0)+(metrics?.socials?.apple||0)}
                  </div>
                </button>
                {socialOpen && (
                  <div className="divide-y divide-yellow-400/10">
                    {([
                      { key: 'Instagram', value: metrics?.socials?.instagram ?? (stats?.socialButtons.find(b=>b.button==='Instagram')?.count || 0), open: igOpen, setOpen: setIgOpen },
                      { key: 'YouTube', value: metrics?.socials?.youtube ?? (stats?.socialButtons.find(b=>b.button==='YouTube')?.count || 0), open: ytOpen, setOpen: setYtOpen },
                      { key: 'Apple Music', value: metrics?.socials?.apple ?? (stats?.musicButtons.find(b=>b.button==='Apple Music')?.count || 0), open: amOpen, setOpen: setAmOpen },
                      { key: 'Spotify', value: metrics?.socials?.spotify ?? (stats?.musicButtons.find(b=>b.button==='Spotify')?.count || 0), open: spOpen, setOpen: setSpOpen },
                      { key: 'TikTok', value: metrics?.socials?.tiktok ?? (stats?.socialButtons.find(b=>b.button==='TikTok')?.count || 0), open: ttOpen, setOpen: setTtOpen },
                    ] as Array<{key:string;value:number;open:boolean;setOpen:(v:boolean)=>void}>).map((it) => (
                      <div key={it.key}>
                        <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-yellow-500/10" onClick={() => it.setOpen(!it.open)}>
                          <span className="text-white font-medium">{it.key}</span>
                          <span className="text-yellow-200 font-bold">{it.value}</span>
                        </button>
                        {it.open && (
                          <div className="px-6 pb-4 text-sm text-yellow-100/80">
                            {it.value} clicks
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
                  <div className="text-sm text-pink-100/80 mt-1">Total: {metrics?.joinPinkClicks ?? (stats?.controlButtons.find(b=>b.button==='Join Aliens')?.count || 0)}</div>
                </button>
                {joinOpen && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-pink-500/20 p-4 rounded-xl border border-pink-400/30">
                      <div className="text-3xl font-bold text-pink-300">{metrics?.joinPinkClicks ?? (stats?.controlButtons.find(b=>b.button==='Join Aliens')?.count || 0)}</div>
                      <div className="text-sm text-pink-200/90">Total Clicks</div>
                    </div>
                    <div className="bg-emerald-500/20 p-4 rounded-xl border border-emerald-400/30">
                      <div className="text-3xl font-bold text-emerald-300">{metrics?.joinSubmitClicks ?? 0}</div>
                      <div className="text-sm text-emerald-200/90">JOIN THE ALIENS Submits</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Button Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control Buttons */}
                {stats.controlButtons.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <span className="text-2xl mr-2">🎛️</span>
                      Control Buttons
                    </h3>
                    <div className="space-y-3">
                      {stats.controlButtons.map((button) => (
                        <div key={button.button} className="flex justify-between items-center">
                          <span className="text-white font-medium">{button.button}</span>
                          <span className="text-cyan-400 font-bold">{button.count} clicks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Platforms section removed per new Comms/Pink layout */}
              </div>

              {/* Songs (plays) - collapsible list with all songs and total */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
                <button className="w-full text-left p-6 flex items-center justify-between" onClick={() => setSongsOpen(!songsOpen)}>
                  <span className="text-xl font-bold text-white flex items-center">
                    <span className="text-2xl mr-2">🎧</span>
                    Songs (plays)
                    <span className="ml-3 text-cyan-300 text-base font-semibold">Total: {Object.values(metrics?.songPlays || {}).reduce((s: number, v: any)=> s + (v?.count||0), 0)}</span>
                  </span>
                  <span className="text-cyan-300">{songsOpen ? 'Hide' : 'Show'}</span>
                </button>
                {songsOpen && (
                  <div className="px-6 pb-6 space-y-3">
                    {tracks.map((t, idx) => {
                      const slug = (t.slug || '').toLowerCase();
                      const count = metrics?.songPlays?.[slug]?.count || 0;
                      const max = Math.max(1, ...tracks.map(tt => metrics?.songPlays?.[(tt.slug||'').toLowerCase()]?.count || 0));
                      return (
                        <div key={slug || idx} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{t.title}</span>
                              <span className="text-cyan-400 font-bold">{count} plays</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500`} style={{ width: getBarWidth(count, max) }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cover Art - collapsible list with all songs and total */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
                <button className="w-full text-left p-6 flex items-center justify-between" onClick={() => setCoversOpen(!coversOpen)}>
                  <span className="text-xl font-bold text-white flex items-center">
                    <span className="text-2xl mr-2">🖼️</span>
                    Cover Art
                    <span className="ml-3 text-pink-300 text-base font-semibold">Total: {Object.values(metrics?.coverClicks || {}).reduce((s: number, v: any)=> s + (v?.count||0), 0)}</span>
                  </span>
                  <span className="text-cyan-300">{coversOpen ? 'Hide' : 'Show'}</span>
                </button>
                {coversOpen && (
                  <div className="px-6 pb-6 space-y-3">
                    {tracks.map((t, idx) => {
                      const slug = (t.slug || '').toLowerCase();
                      const count = metrics?.coverClicks?.[slug]?.count || 0;
                      const max = Math.max(1, ...tracks.map(tt => metrics?.coverClicks?.[(tt.slug||'').toLowerCase()]?.count || 0));
                      return (
                        <div key={slug || idx} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{t.title}</span>
                              <span className="text-pink-400 font-bold">{count} clicks</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className={`h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500`} style={{ width: getBarWidth(count, max) }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Keep click-category sections for additional context */}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
