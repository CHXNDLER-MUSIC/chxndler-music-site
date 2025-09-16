"use client";

import React, { useState, useEffect } from "react";
import { getClickAnalyticsLocal } from "../lib/analytics";

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

export default function MusicAnalyticsVisual({ onClose }: MusicAnalyticsVisualProps) {
  const [stats, setStats] = useState<MusicStats | null>(null);

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
        const songKey = 'unknown';
        collectCardClicks[songKey] = collectCardClicks[songKey] || { count: 0, title: 'Unknown Song' };
        collectCardClicks[songKey].count++;
        totalInteractions++;
      } else if (label.includes('🖼️ Cover Art')) {
        const songKey = 'unknown';
        coverClicks[songKey] = coverClicks[songKey] || { count: 0, title: 'Unknown Song' };
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

  useEffect(() => {
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
              🎵 Music Analytics Dashboard
            </h2>
            <p className="text-cyan-300/70 mt-1">Visual insights into your music engagement</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadMusicAnalytics}
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

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {stats.totalMusicInteractions === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-xl">No music interactions yet!</p>
              <p className="text-sm mt-2">Start clicking songs, covers, and buttons to see analytics here.</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-4 rounded-xl border border-cyan-500/20">
                  <div className="text-3xl font-bold text-cyan-400">{stats.totalMusicInteractions}</div>
                  <div className="text-sm text-cyan-300/70">Music Interactions</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/20">
                  <div className="text-3xl font-bold text-purple-400">{stats.totalButtonClicks}</div>
                  <div className="text-sm text-purple-300/70">Button Clicks</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/20">
                  <div className="text-3xl font-bold text-green-400">{stats.collectCardClicks.reduce((sum, item) => sum + item.count, 0)}</div>
                  <div className="text-sm text-green-300/70">Cards Collected</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 p-4 rounded-xl border border-orange-500/20">
                  <div className="text-3xl font-bold text-orange-400">{stats.socialButtons.reduce((sum, item) => sum + item.count, 0) + stats.musicButtons.reduce((sum, item) => sum + item.count, 0)}</div>
                  <div className="text-sm text-orange-300/70">Social/Music Links</div>
                </div>
              </div>

              {/* Button Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Social Media Buttons */}
                {stats.socialButtons.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <span className="text-2xl mr-2">📱</span>
                      Social Media
                    </h3>
                    <div className="space-y-3">
                      {stats.socialButtons.map((button) => (
                        <div key={button.button} className="flex justify-between items-center">
                          <span className="text-white font-medium">{button.button}</span>
                          <span className="text-pink-400 font-bold">{button.count} clicks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Music Platform Buttons */}
                {stats.musicButtons.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <span className="text-2xl mr-2">🎵</span>
                      Music Platforms
                    </h3>
                    <div className="space-y-3">
                      {stats.musicButtons.map((button) => (
                        <div key={button.button} className="flex justify-between items-center">
                          <span className="text-white font-medium">{button.button}</span>
                          <span className="text-green-400 font-bold">{button.count} clicks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Song Selections Chart */}
              {stats.songSelections.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">🎧</span>
                    Most Selected Songs
                  </h3>
                  <div className="space-y-3">
                    {stats.songSelections.slice(0, 5).map((song, index) => {
                      const maxCount = stats.songSelections[0]?.count || 1;
                      return (
                        <div key={song.song} className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center text-xs text-black font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{song.title || song.song}</span>
                              <span className="text-cyan-400 font-bold">{song.count} plays</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full ${getBarColor(index)} transition-all duration-500`}
                                style={{ width: getBarWidth(song.count, maxCount) }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cover Clicks Chart */}
              {stats.coverClicks.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">🖼️</span>
                    Most Clicked Cover Art
                  </h3>
                  <div className="space-y-3">
                    {stats.coverClicks.slice(0, 5).map((cover, index) => {
                      const maxCount = stats.coverClicks[0]?.count || 1;
                      return (
                        <div key={cover.song} className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-xs text-black font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{cover.title || cover.song}</span>
                              <span className="text-purple-400 font-bold">{cover.count} clicks</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full ${getBarColor(index + 1)} transition-all duration-500`}
                                style={{ width: getBarWidth(cover.count, maxCount) }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collect Card Clicks Chart */}
              {stats.collectCardClicks.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="text-2xl mr-2">🎴</span>
                    Most Collected Cards
                  </h3>
                  <div className="space-y-3">
                    {stats.collectCardClicks.slice(0, 5).map((card, index) => {
                      const maxCount = stats.collectCardClicks[0]?.count || 1;
                      return (
                        <div key={card.song} className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-xs text-black font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{card.title || card.song}</span>
                              <span className="text-orange-400 font-bold">{card.count} collections</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full ${getBarColor(index + 2)} transition-all duration-500`}
                                style={{ width: getBarWidth(card.count, maxCount) }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
