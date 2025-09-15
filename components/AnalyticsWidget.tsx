"use client";

import React, { useState, useEffect } from "react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import HealthStatusWidget from "./HealthStatusWidget";

export default function AnalyticsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    // Only show in development or when a special query param is present
    const show = process.env.NODE_ENV === "development" || 
                 new URLSearchParams(window.location.search).has("analytics");
    setShouldShow(show);

    // Add keyboard shortcuts: Ctrl/Cmd + Shift + A for analytics, H for health
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsOpen(true);
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
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-all transform hover:scale-105"
            title="Open Click Analytics Dashboard (Ctrl/Cmd + Shift + A)"
          >
            📊 Click Analytics
          </button>
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {/* Health widget when analytics is open */}
      {isOpen && !healthOpen && (
        <div className="fixed bottom-4 right-4 z-40">
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {/* Health widget overlay when open */}
      {healthOpen && (
        <div className="fixed bottom-4 right-4 z-60">
          <HealthStatusWidget 
            isOpen={healthOpen} 
            onToggle={() => setHealthOpen(!healthOpen)} 
          />
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <AnalyticsDashboard onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}