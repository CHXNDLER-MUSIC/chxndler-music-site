"use client";

import { usePublicSoulJournalEntries } from "@/hooks/useSoulJournalEntries";
import { useProfile } from "@/contexts/ProfileContext";

const ELEMENT_COLORS: Record<string, { color: string; glow: string; emoji: string; label: string }> = {
  heart: { color: "#F91880", glow: "#F918B0", emoji: "💖", label: "HEART" },
  water: { color: "#38B6FF", glow: "#38D6FF", emoji: "🌊", label: "WATER" },
  lightning: { color: "#F2EF1D", glow: "#FFFF00", emoji: "⚡", label: "LIGHTNING" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0", emoji: "🌑", label: "DARKNESS" },
};

export default function PublicJournalFeed() {
  const { user } = useProfile();
  const { entries, loading, error } = usePublicSoulJournalEntries();

  if (!user?.id) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "#FFFFFFCC" }}>
        Sign in to view the public journal feed.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "#FFFFFFCC" }}>
        Loading public reflections…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "#FFFFFFCC" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-center mb-2">
        <div
          className="text-lg font-bold tracking-wider mb-2"
          style={{
            color: "#F2EF1D",
            textShadow: "0 0 15px #FFFF00, 0 0 30px #FFFF00",
            filter: "drop-shadow(0 0 8px #FFFF00)",
          }}
        >
          PUBLIC SOUL FEED
        </div>
        <div
          className="mx-auto"
          style={{
            width: "260px",
            height: "2px",
            background: "#F2EF1D",
            boxShadow: "0 0 8px #F2EF1D, 0 0 15px #FFFF00",
          }}
        />
      </div>

      {entries.length === 0 ? (
        <div
          className="text-center mb-4 p-3 rounded-lg"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          No public reflections yet.
        </div>
      ) : (
        entries.map((entry) => {
          const theme = ELEMENT_COLORS[entry.element] || ELEMENT_COLORS.heart;
          const created = new Date(entry.entry_date);
          const dateStr = created.toLocaleDateString();
          return (
            <div
              key={entry.entry_id}
              className="rounded-lg p-3"
              style={{
                background: `${theme.color}08`,
                border: `1px solid ${theme.color}30`,
                borderLeft: `4px solid ${theme.color}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* User Profile Image */}
                <div 
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: entry.profiles?.avatar_url ? 'none' : `linear-gradient(135deg, ${theme.color}40, ${theme.color}60)`,
                    border: `2px solid ${theme.color}40`,
                    boxShadow: `0 0 8px ${theme.color}20`
                  }}
                >
                  {entry.profiles?.avatar_url ? (
                    <img 
                      src={entry.profiles.avatar_url} 
                      alt={`${entry.profiles.name || 'User'} profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg" style={{ color: theme.color }}>
                      {theme.emoji}
                    </span>
                  )}
                </div>
                
                <div className="flex-1">
                  {/* Username */}
                  <div className="text-sm font-semibold mb-1" style={{ color: theme.color }}>
                    {entry.profiles?.name ? entry.profiles.name : "Anonymous"}
                  </div>
                  
                  {/* Date and Element */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs opacity-80" style={{ color: "#FFFFFF" }}>
                      {dateStr}
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full uppercase font-semibold flex items-center gap-1"
                      style={{
                        background: `${theme.color}15`,
                        color: theme.color,
                        border: `1px solid ${theme.color}40`,
                      }}
                    >
                      {theme.emoji} {theme.label}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Soul Star Content */}
              <div
                className="text-sm leading-relaxed"
                style={{
                  color: "#FFFFFF",
                  background: "rgba(0,0,0,0.25)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.color}15`,
                }}
              >
                {entry.soul_star}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
