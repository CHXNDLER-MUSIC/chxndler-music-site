"use client";

import React, { useState, useEffect } from "react";
import { 
  getAllABTestAssignments, 
  clearABTestAssignments,
  getUserFlowSession,
  type ABTestAssignment,
  type UserFlowEvent 
} from "../lib/abTesting";
import { getMusicAnalytics } from "../lib/analytics";

interface ABTestingDashboardProps {
  onClose?: () => void;
  embedded?: boolean;
}

export default function ABTestingDashboard({ onClose, embedded = false }: ABTestingDashboardProps) {
  const [isVisible, setIsVisible] = useState(!embedded);
  const [assignments, setAssignments] = useState<ABTestAssignment[]>([]);
  const [flowEvents, setFlowEvents] = useState<UserFlowEvent[]>([]);
  const [musicEvents, setMusicEvents] = useState<any[]>([]);

  const loadData = () => {
    setAssignments(getAllABTestAssignments());
    setFlowEvents(getUserFlowSession());
    setMusicEvents(getMusicAnalytics());
  };

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  const handleClearTests = () => {
    if (confirm("Are you sure you want to clear all A/B test assignments? This will reset your test variants.")) {
      clearABTestAssignments();
      loadData();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getFlowSummary = () => {
    const stepCounts: Record<string, number> = {};
    flowEvents.forEach(event => {
      stepCounts[event.step] = (stepCounts[event.step] || 0) + 1;
    });
    return Object.entries(stepCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const getMusicEventSummary = () => {
    const eventCounts: Record<string, number> = {};
    const songCounts: Record<string, number> = {};
    
    musicEvents.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
      if (event.song_id) {
        songCounts[event.song_id] = (songCounts[event.song_id] || 0) + 1;
      }
    });

    return {
      events: Object.entries(eventCounts).sort((a, b) => b[1] - a[1]),
      songs: Object.entries(songCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-28 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-colors"
        >
          🧪 A/B Testing
        </button>
      </div>
    );
  }

  const flowSummary = getFlowSummary();
  const musicSummary = getMusicEventSummary();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-orange-50 to-yellow-50">
          <h2 className="text-2xl font-bold text-gray-900">🧪 A/B Testing & User Flow Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearTests}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🗑️ Clear Tests
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
          <div className="p-6 space-y-8">
            {/* A/B Test Assignments */}
            <div>
              <h3 className="text-lg font-semibold mb-4">🎯 Current A/B Test Assignments</h3>
              {assignments.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  No A/B tests assigned yet. Tests will appear when you start using A/B testing features.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.map((assignment, index) => (
                    <div key={index} className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                      <div className="font-semibold text-orange-800">{assignment.test}</div>
                      <div className="text-lg font-bold text-orange-600">{assignment.variant}</div>
                      <div className="text-xs text-gray-600 mt-2">
                        Assigned: {formatTimestamp(assignment.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Session: {assignment.sessionId.slice(0, 12)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Flow Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">📈 User Flow (Current Session)</h3>
              {flowEvents.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  No user flow events tracked yet. Events will appear as you navigate the site.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-3">Flow Steps (Top 10)</h4>
                    {flowSummary.map(([step, count], index) => (
                      <div key={index} className="flex justify-between items-center py-1 text-sm">
                        <span className="text-blue-700 capitalize">{step.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-blue-600">{count}×</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-3">Recent Flow Events</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto holo-scrollbar-yellow">
                      {flowEvents.slice(-10).reverse().map((event, index) => (
                        <div key={index} className="text-xs border-b border-green-200 pb-1">
                          <div className="font-medium text-green-700 capitalize">
                            {event.step.replace(/_/g, ' ')}
                          </div>
                          <div className="text-green-600">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Music Events Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">🎵 Music Interaction Summary</h3>
              {musicEvents.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  No music events tracked yet. Start interacting with songs to see data.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-800 mb-3">Event Types</h4>
                    {musicSummary.events.map(([event, count], index) => (
                      <div key={index} className="flex justify-between items-center py-1 text-sm">
                        <span className="text-purple-700 capitalize">{event.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-purple-600">{count}×</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-pink-50 rounded-lg p-4">
                    <h4 className="font-semibold text-pink-800 mb-3">Popular Songs</h4>
                    {musicSummary.songs.map(([songId, count], index) => (
                      <div key={index} className="flex justify-between items-center py-1 text-sm">
                        <span className="text-pink-700 truncate">{songId}</span>
                        <span className="font-semibold text-pink-600">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-4">📊 Session Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
                  <div className="text-sm text-blue-800">Active Tests</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{flowEvents.length}</div>
                  <div className="text-sm text-green-800">Flow Events</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{musicEvents.length}</div>
                  <div className="text-sm text-purple-800">Music Events</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(musicEvents.map(e => e.song_id).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-orange-800">Unique Songs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
