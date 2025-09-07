"use client";

import React, { useState, useEffect } from "react";
import { getClickAnalytics, getMusicAnalytics, clearClickAnalytics } from "../lib/analytics";
import MusicAnalyticsDashboard from "./MusicAnalyticsDashboard";
import ABTestingDashboard from "./ABTestingDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface AdminAnalyticsProps {
  adminKey?: string; // Pass this from your admin page
}

export default function AdminAnalytics({ adminKey }: AdminAnalyticsProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [activeTab, setActiveTab] = useState("music");
  const [isVisible, setIsVisible] = useState(false);

  // Simple admin key check (you should use a more secure method in production)
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "your-secret-admin-key-2024";

  useEffect(() => {
    if (adminKey === ADMIN_KEY) {
      setIsAuthenticated(true);
    }
  }, [adminKey]);

  const handleAuth = () => {
    if (inputKey === ADMIN_KEY) {
      setIsAuthenticated(true);
      setInputKey("");
    } else {
      alert("Invalid admin key");
      setInputKey("");
    }
  };

  // Only show analytics button in development or with admin key
  const isDev = process.env.NODE_ENV === "development";
  const shouldShowButton = isDev || isAuthenticated;

  if (!shouldShowButton) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl">
          <h3 className="text-sm font-bold mb-2">Admin Access Required</h3>
          <input
            type="password"
            placeholder="Enter admin key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            className="w-full px-2 py-1 text-black rounded text-sm mb-2"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
          >
            Access Analytics
          </button>
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-colors"
        >
          📊 Admin Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Admin Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">🔐 Admin Analytics Dashboard</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm"
            >
              ✕ Close
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab("music")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === "music" 
                  ? "bg-purple-600 text-white" 
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🎵 Music Analytics
            </button>
            <button
              onClick={() => setActiveTab("clicks")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === "clicks" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🖱️ Click Analytics
            </button>
            <button
              onClick={() => setActiveTab("abtests")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === "abtests" 
                  ? "bg-orange-600 text-white" 
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🧪 A/B Tests
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="relative h-full">
          {activeTab === "music" && (
            <MusicAnalyticsDashboard 
              embedded={true} 
              onClose={() => setIsVisible(false)} 
            />
          )}
          {activeTab === "clicks" && (
            <AnalyticsDashboard 
              embedded={true} 
              onClose={() => setIsVisible(false)} 
            />
          )}
          {activeTab === "abtests" && (
            <ABTestingDashboard 
              embedded={true} 
              onClose={() => setIsVisible(false)} 
            />
          )}
        </div>

        {/* Warning Footer */}
        <div className="p-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700 text-center">
            ⚠️ Admin Only - This dashboard contains private user analytics data
          </p>
        </div>
      </div>
    </div>
  );
}