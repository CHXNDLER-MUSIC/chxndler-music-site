"use client";

import { useState } from "react";
import HeartversePopup from "@/components/HeartversePopup";

type BadgeCategory = {
  id: string;
  name: string;
  emoji: string;
  badges: Array<{
    name: string;
    description?: string;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function BadgesModal({ open, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const badgeCategories: BadgeCategory[] = [
    {
      id: "soul-star",
      name: "⭐️ SOUL STAR",
      emoji: "⭐️",
      badges: [
        { name: "Soul Star", description: "First reflection" },
        { name: "Soul Ember", description: "3 reflections" },
        { name: "Soul Flame", description: "7 reflections" },
        { name: "Soul Bloom", description: "14 reflections" },
        { name: "Soul Rise", description: "30 reflections" },
        { name: "Soul Eclipse", description: "50 reflections" },
        { name: "Eternal Soul", description: "100 reflections" },
      ]
    },
    {
      id: "achievements",
      name: "🏆 ACHIEVEMENTS",
      emoji: "🏆",
      badges: [
        { name: "First Listen" },
        { name: "Digital Collector", description: "Collect 5 cards" },
        { name: "Cosmic Archivist", description: "Collect 15 cards" },
        { name: "Starbinder", description: "Collect 25 cards" },
        { name: "Master Collector", description: "Collect all cards" },
        { name: "Live Witness", description: "Watch 1 livestream" },
        { name: "Stream Seeker", description: "Watch 3" },
        { name: "Signal Streamer", description: "Watch 10" },
        { name: "Cosmic Broadcaster", description: "Watch 25" },
        { name: "Merch Supporter", description: "Buy your first merch item" },
        { name: "Cosmic Donor", description: "Make a donation" },
      ]
    },
    {
      id: "elemental-streak",
      name: "💠 ELEMENTAL STREAK BADGES",
      emoji: "💠",
      badges: [
        { name: "❤️ HEART" },
        { name: "Ember Glow", description: "3 days" },
        { name: "Gentle Bloom", description: "7 days" },
        { name: "Warm Pulse", description: "14 days" },
        { name: "Heart Radiance", description: "30 days" },
        { name: "Deep Devotion", description: "50 days" },
        { name: "Eternal Love", description: "100 days" },
        { name: "💧 WATER" },
        { name: "Rising Ripple", description: "3 days" },
        { name: "Steady Flow", description: "7 days" },
        { name: "Shifting Tide", description: "14 days" },
        { name: "Ocean Surge", description: "30 days" },
        { name: "Silver Depth", description: "50 days" },
        { name: "Endless Drift", description: "100 days" },
        { name: "⚡ LIGHTNING" },
        { name: "First Spark", description: "3 days" },
        { name: "Bright Flash", description: "7 days" },
        { name: "Quick Charge", description: "14 days" },
        { name: "Raging Storm", description: "30 days" },
        { name: "Sky Ascend", description: "50 days" },
        { name: "Ever Storm", description: "100 days" },
        { name: "🌑 DARKNESS" },
        { name: "Fading Shadow", description: "3 days" },
        { name: "Silent Veil", description: "7 days" },
        { name: "Solar Eclipse", description: "14 days" },
        { name: "Falling Dusk", description: "30 days" },
        { name: "Black Midnight", description: "50 days" },
        { name: "Ever Night", description: "100 days" },
      ]
    },
    {
      id: "listening",
      name: "🎵 LISTENING BADGES",
      emoji: "🎵",
      badges: [
        { name: "Deep Listener", description: "10 unique tracks" },
        { name: "Song Voyager", description: "25 unique tracks" },
        { name: "Track Devotee", description: "25 repeats" },
        { name: "Track Obsession", description: "100 repeats" },
        { name: "Complete Discography", description: "All songs" },
      ]
    },
    {
      id: "heartcoin",
      name: "HEARTCOIN BADGES",
      emoji: "💰",
      badges: [
        { name: "First HeartCoin" },
        { name: "Treasure Finder", description: "10 HC" },
        { name: "Heartflow", description: "50 HC" },
        { name: "Cosmic Prosperity", description: "100 HC" },
      ]
    },
    {
      id: "community",
      name: "🌐 COMMUNITY",
      emoji: "🌐",
      badges: [
        { name: "Portal Opener", description: "Invite 1 friend" },
        { name: "Constellation Builder", description: "Invite 5 friends" },
        { name: "Galactic Signal", description: "Invite 20 friends" },
        { name: "Starlight Supporter", description: "Follow on Spotify/Apple, TikTok, YouTube, IG" },
      ]
    }
  ];

  if (selectedCategory) {
    const category = badgeCategories.find(cat => cat.id === selectedCategory);
    if (!category) return null;
    
    return (
      <HeartversePopup 
        isOpen={open} 
        onClose={onClose} 
        title={category.name}
      >
        <div className="relative space-y-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-4 text-[#38B6FF] hover:text-[#38B6FF]/80 transition text-sm"
          >
            ← Back to Categories
          </button>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {category.badges.map((badge, index) => (
              <div 
                key={index}
                className="relative p-3 rounded-lg bg-black/30 border border-white/20 hover:border-white/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm">{badge.name}</div>
                    {badge.description && (
                      <div className="text-white/60 text-xs mt-1">{badge.description}</div>
                    )}
                  </div>
                  <div className="text-white/40 text-xs">Locked</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HeartversePopup>
    );
  }

  return (
    <HeartversePopup 
      isOpen={open} 
      onClose={onClose} 
      title="BADGES"
    >
      <p className="relative text-sm text-white/80 mb-4">Choose a category to explore your badges.</p>
      
      <div className="relative flex justify-center items-center space-x-4 overflow-x-auto px-2">
        {badgeCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="relative flex-shrink-0 w-16 h-16 rounded-full bg-black/30 border border-white/20 hover:border-[#FC54AF]/60 hover:bg-[#FC54AF]/10 transition group flex items-center justify-center"
            title={`${category.name} - ${category.badges.length} badges`}
          >
            <div className="text-2xl group-hover:scale-110 transition-transform">
              {category.emoji}
            </div>
          </button>
        ))}
      </div>
    </HeartversePopup>
  );
}