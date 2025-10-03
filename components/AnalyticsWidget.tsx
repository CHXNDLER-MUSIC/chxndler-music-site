"use client";

import React, { useState, useEffect } from "react";
import MusicAnalyticsVisual from "./MusicAnalyticsVisual";
import HealthStatusWidget from "./HealthStatusWidget";

export default function AnalyticsWidget() {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    // Only show in development or when a special query param is present
    const show = process.env.NODE_ENV === "development" || 
                 new URLSearchParams(window.location.search).has("analytics");
    setShouldShow(show);

    // Add keyboard shortcuts: Ctrl/Cmd + Shift + A for Website Analytics, H for health
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAnalyticsOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setHealthOpen(!healthOpen);
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      {!analyticsOpen && (
        <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2">
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-all transform hover:scale-105"
            title="Open Website Analytics (Ctrl/Cmd + Shift + A)"
          >
            🌐 Website Analytics
          </button>
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {/* Health widget when analytics is open */}
      {analyticsOpen && !healthOpen && (
        <div className="fixed bottom-4 right-4 z-[105]">
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {/* Health widget overlay when open */}
      {healthOpen && (
        <div className="fixed bottom-4 right-4 z-[115]">
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {analyticsOpen && (
        <div className="fixed inset-0 z-[110]">
          <MusicAnalyticsVisual onClose={() => setAnalyticsOpen(false)} />
        </div>
      )}
    </>
  );
}
