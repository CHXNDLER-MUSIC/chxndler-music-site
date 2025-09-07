"use client";

import React, { useState, useEffect } from "react";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default function AnalyticsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show in development or when a special query param is present
    const show = process.env.NODE_ENV === "development" || 
                 new URLSearchParams(window.location.search).has("analytics");
    setShouldShow(show);

    // Add keyboard shortcut: Ctrl/Cmd + Shift + A to open analytics
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsOpen(true);
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
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-all transform hover:scale-105"
            title="Open Click Analytics Dashboard (Ctrl/Cmd + Shift + A)"
          >
            📊 Click Analytics
          </button>
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