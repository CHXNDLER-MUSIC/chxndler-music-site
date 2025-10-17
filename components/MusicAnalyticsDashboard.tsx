"use client";

import React, { useState, useEffect } from "react";
import { getMusicAnalytics, type MusicEventData } from "../lib/analytics";

interface MusicStats {
  totalEvents: number;
  uniqueSongs: number;
  mostPopularSongs: Array<{ song_id: string; song_title: string; count: number; events: string[] }>;
  coverArtClicks: Array<{ song_id: string; song_title: string; count: number }>;
  eventsByType: Array<{ event: string; count: number }>;
  sessionData: Array<{ session_id: string; events: number; songs: string[] }>;
  recentEvents: MusicEventData[];
}

interface MusicAnalyticsDashboardProps {
  onClose?: () => void;
  embedded?: boolean;
}

export default function MusicAnalyticsDashboard({ onClose, embedded = false }: MusicAnalyticsDashboardProps) {
  const [stats, setStats] = useState<MusicStats | null>(null);
  const [isVisible, setIsVisible] = useState(!embedded);

  const loadMusicAnalytics = () => {
    const events = getMusicAnalytics();
    
    if (events.length === 0) {
      setStats({
        totalEvents: 0,
        uniqueSongs: 0,
        mostPopularSongs: [],
        coverArtClicks: [],
        eventsByType: [],
        sessionData: [],
        recentEvents: [],
      });
      return;
    }

    // Song popularity (combining all event types per song)
    const songCounts: Record<string, { count: number; title: string; events: Set<string> }> = {};
    events.forEach(event => {
      if (event.song_id) {
        const key = event.song_id;
        if (!songCounts[key]) {
          songCounts[key] = { count: 0, title: event.song_title || event.song_id, events: new Set() };
        }
        songCounts[key].count++;
        songCounts[key].events.add(event.event);
      }
    });

    const mostPopularSongs = Object.entries(songCounts)
      .map(([song_id, data]) => ({ 
        song_id, 
        song_title: data.title, 
        count: data.count,
        events: Array.from(data.events)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cover art specific clicks
    const coverClicks: Record<string, { count: number; title: string }> = {};
    events
      .filter(event => event.event === "cover_art_clicked")
      .forEach(event => {
        if (event.song_id) {
          const key = event.song_id;
          if (!coverClicks[key]) {
            coverClicks[key] = { count: 0, title: event.song_title || event.song_id };
          }
          coverClicks[key].count++;
        }
      });

    const coverArtClicks = Object.entries(coverClicks)
      .map(([song_id, data]) => ({ song_id, song_title: data.title, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Events by type
    const eventCounts: Record<string, number> = {};
    events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });

    const eventsByType = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    // Session data
    const sessionCounts: Record<string, { events: number; songs: Set<string> }> = {};
    events.forEach(event => {
      const key = event.session_id;
      if (!sessionCounts[key]) {
        sessionCounts[key] = { events: 0, songs: new Set() };
      }
      sessionCounts[key].events++;
      if (event.song_id) {
        sessionCounts[key].songs.add(event.song_id);
      }
    });

    const sessionData = Object.entries(sessionCounts)
      .map(([session_id, data]) => ({ 
        session_id, 
        events: data.events, 
        songs: Array.from(data.songs) 
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 20);

    setStats({
      totalEvents: events.length,
      uniqueSongs: Object.keys(songCounts).length,
      mostPopularSongs,
      coverArtClicks,
      eventsByType,
      sessionData,
      recentEvents: events.slice(-30).reverse(),
    });
  };

  useEffect(() => {
    if (isVisible) {
      loadMusicAnalytics();
    }
  }, [isVisible]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventEmoji = (event: string) => {
    switch (event) {
      case 'song_selected': return '🎵';
      case 'cover_art_clicked': return '🎨';
      case 'start_music': return '▶️';
      default: return '📊';
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'song_selected': return 'bg-blue-50 text-blue-700';
      case 'cover_art_clicked': return 'bg-purple-50 text-purple-700';
      case 'start_music': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-16 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-colors"
        >
          🎵 Music Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-2xl font-bold text-gray-900">🎵 Music Analytics Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={loadMusicAnalytics}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setIsVisible(false);
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)] holo-scrollbar-yellow">
          {!stats ? (
            <div className="p-6 text-center">Loading music analytics...</div>
          ) : stats.totalEvents === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No music events yet. Start interacting with songs and cover art to see analytics!
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
                  <div className="text-sm text-blue-800">Total Music Events</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.uniqueSongs}</div>
                  <div className="text-sm text-purple-800">Songs Interacted With</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.coverArtClicks.reduce((sum, item) => sum + item.count, 0)}</div>
                  <div className="text-sm text-green-800">Cover Art Clicks</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.sessionData.length}</div>
                  <div className="text-sm text-orange-800">Active Sessions</div>
                </div>
              </div>

              {/* Event Types */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Event Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.eventsByType.map((item, index) => (
                    <div key={index} className={`p-4 rounded-lg ${getEventColor(item.event)}`}>
                      <div className="text-2xl mb-2">{getEventEmoji(item.event)}</div>
                      <div className="font-bold text-lg">{item.count}</div>
                      <div className="text-sm capitalize">{item.event.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Popular Songs */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Most Popular Songs</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {stats.mostPopularSongs.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                      <div>
                        <div className="font-semibold">{item.song_title}</div>
                        <div className="text-sm text-gray-600">
                          Events: {item.events.map(e => getEventEmoji(e)).join(' ')}
                        </div>
                      </div>
                      <span className="font-semibold text-blue-600">{item.count} interactions</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cover Art Clicks */}
              {stats.coverArtClicks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">🎨 Most Clicked Cover Art</h3>
                  <div className="bg-purple-50 rounded-lg p-4">
                    {stats.coverArtClicks.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-purple-200 last:border-0">
                        <span className="font-medium">{item.song_title}</span>
                        <span className="font-semibold text-purple-600">{item.count} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Data */}
              <div>
                <h3 className="text-lg font-semibold mb-4">User Sessions</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {stats.sessionData.map((session, index) => (
                    <div key={index} className="py-2 border-b border-gray-200 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <code className="text-xs text-gray-600">{session.session_id.slice(0, 20)}...</code>
                          <div className="text-sm mt-1">
                            {session.events} events • {session.songs.length} unique songs
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Music Events</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {stats.recentEvents.map((event, index) => (
                    <div key={index} className="py-2 px-3 hover:bg-white rounded border-b border-gray-200 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getEventEmoji(event.event)}</span>
                            <span className="font-medium capitalize">{event.event.replace('_', ' ')}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {event.song_title || 'Unknown Song'} • {formatTimestamp(event.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
