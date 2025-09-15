"use client";

import React, { useState, useEffect } from "react";
import { getClickAnalyticsLocal, clearClickAnalyticsLocal, type ClickData } from "../lib/analytics";
import MusicAnalyticsVisual from "./MusicAnalyticsVisual";

interface ClickStats {
  totalClicks: number;
  uniqueElements: number;
  mostClickedElements: Array<{ element: string; count: number }>;
  recentClicks: ClickData[];
  clicksByHour: Array<{ hour: number; count: number }>;
  topPages: Array<{ url: string; count: number }>;
}

interface AnalyticsDashboardProps {
  onClose?: () => void;
  embedded?: boolean;
}

export default function AnalyticsDashboard({ onClose, embedded = false }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<ClickStats | null>(null);
  const [isVisible, setIsVisible] = useState(!embedded);
  const [selectedClick, setSelectedClick] = useState<ClickData | null>(null);
  const [showMusicAnalytics, setShowMusicAnalytics] = useState(false);

  const loadAnalytics = () => {
    const clicks = getClickAnalyticsLocal();
    
    // Safety check: ensure clicks is an array
    if (!Array.isArray(clicks) || clicks.length === 0) {
      setStats({
        totalClicks: 0,
        uniqueElements: 0,
        mostClickedElements: [],
        recentClicks: [],
        clicksByHour: [],
        topPages: [],
      });
      return;
    }

    // Most clicked elements
    const elementCounts: Record<string, number> = {};
    clicks.forEach(click => {
      const key = click.enhancedLabel || `${click.element.tagName}${click.element.className ? '.' + click.element.className.split(' ')[0] : ''}${click.element.textContent ? ` "${click.element.textContent.slice(0, 20)}"` : ''}`;
      elementCounts[key] = (elementCounts[key] || 0) + 1;
    });

    const mostClickedElements = Object.entries(elementCounts)
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Clicks by hour
    const hourCounts: Record<number, number> = {};
    clicks.forEach(click => {
      const hour = new Date(click.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const clicksByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0,
    }));

    // Top pages
    const pageCounts: Record<string, number> = {};
    clicks.forEach(click => {
      const url = new URL(click.page.url).pathname;
      pageCounts[url] = (pageCounts[url] || 0) + 1;
    });

    const topPages = Object.entries(pageCounts)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setStats({
      totalClicks: clicks.length,
      uniqueElements: Object.keys(elementCounts).length,
      mostClickedElements,
      recentClicks: clicks.slice(-50).reverse(),
      clicksByHour,
      topPages,
    });
  };

  useEffect(() => {
    if (isVisible) {
      loadAnalytics();
    }
  }, [isVisible]);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all click analytics data?")) {
      clearClickAnalyticsLocal();
      loadAnalytics();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatElement = (click: ClickData) => {
    if (click.enhancedLabel) return click.enhancedLabel;
    
    const element = click.element;
    let display = element.tagName;
    if (element.className) display += `.${element.className.split(' ')[0]}`;
    if (element.id) display += `#${element.id}`;
    if (element.textContent && element.textContent.length > 0) {
      display += ` "${element.textContent.slice(0, 30)}${element.textContent.length > 30 ? '...' : ''}"`;
    }
    return display;
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-colors"
        >
          📊 Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Click Analytics Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMusicAnalytics(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              🎵 Music Analytics
            </button>
            <a
              href="/health"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              🏥 System Health
            </a>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🗑️ Clear
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

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {!stats ? (
            <div className="p-6 text-center">Loading...</div>
          ) : stats.totalClicks === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No click data yet. Start clicking around the site to see analytics!
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalClicks}</div>
                  <div className="text-sm text-blue-800">Total Clicks</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.uniqueElements}</div>
                  <div className="text-sm text-green-800">Unique Elements</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.topPages.length}</div>
                  <div className="text-sm text-purple-800">Pages Visited</div>
                </div>
              </div>

              {/* Most Clicked Elements */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Most Clicked Elements</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {stats.mostClickedElements.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <code className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">{item.element}</code>
                      <span className="font-semibold text-blue-600">{item.count} clicks</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Pages */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Top Pages</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {stats.topPages.map((page, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <code className="text-sm">{page.url}</code>
                      <span className="font-semibold text-green-600">{page.count} clicks</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clicks by Hour */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Clicks by Hour</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-end space-x-1 h-32">
                    {stats.clicksByHour.map((hourData, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="bg-blue-500 w-full rounded-t"
                          style={{
                            height: `${Math.max((hourData.count / Math.max(...stats.clicksByHour.map(h => h.count))) * 100, 2)}%`,
                          }}
                          title={`${hourData.hour}:00 - ${hourData.count} clicks`}
                        />
                        <div className="text-xs mt-1 text-gray-600">{hourData.hour}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Clicks */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Clicks</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {stats.recentClicks.map((click) => (
                    <div
                      key={click.id}
                      className="py-2 px-3 hover:bg-white rounded cursor-pointer border-b border-gray-200 last:border-0"
                      onClick={() => setSelectedClick(click)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <code className="text-sm font-mono">{formatElement(click)}</code>
                          <div className="text-xs text-gray-500 mt-1">
                            {new URL(click.page.url).pathname} • {formatTimestamp(click.timestamp)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 ml-2">
                          {click.position.x}, {click.position.y}
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

      {/* Click Detail Modal */}
      {selectedClick && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">Click Details</h3>
              <button
                onClick={() => setSelectedClick(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <strong>Element:</strong> <code className="bg-gray-100 px-1 rounded">{formatElement(selectedClick)}</code>
              </div>
              <div>
                <strong>Time:</strong> {formatTimestamp(selectedClick.timestamp)}
              </div>
              <div>
                <strong>Position:</strong> ({selectedClick.position.x}, {selectedClick.position.y})
              </div>
              <div>
                <strong>Page:</strong> {selectedClick.page.url}
              </div>
              <div>
                <strong>Viewport:</strong> {selectedClick.viewport.width} × {selectedClick.viewport.height}
              </div>
              {selectedClick.element.href && (
                <div>
                  <strong>Link:</strong> <a href={selectedClick.element.href} className="text-blue-600 underline">{selectedClick.element.href}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Music Analytics Modal */}
      {showMusicAnalytics && (
        <MusicAnalyticsVisual onClose={() => setShowMusicAnalytics(false)} />
      )}
    </div>
  );
}