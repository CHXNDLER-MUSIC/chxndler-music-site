"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useProfile } from "@/contexts/ProfileContext";

type PublicJournalEntry = {
  id: string;
  user_id: string;
  soul_star: string;
  element: "heart" | "water" | "lightning" | "darkness" | string;
  entry_date: string;
  created_at: string;
  is_private: boolean;
  profiles: {
    username: string | null;
    profile_image: string | null;
  } | null;
};

const ELEMENT_COLORS: Record<string, { color: string; glow: string; emoji: string; label: string }> = {
  heart: { color: "#F91880", glow: "#F918B0", emoji: "💖", label: "HEART" },
  water: { color: "#38B6FF", glow: "#38D6FF", emoji: "🌊", label: "WATER" },
  lightning: { color: "#F2EF1D", glow: "#FFFF00", emoji: "⚡", label: "LIGHTNING" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0", emoji: "🌑", label: "DARKNESS" },
};

export default function PublicJournalFeed() {
  const { user } = useProfile();
  const [entries, setEntries] = useState<PublicJournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return; // RLS requires signed-in
      try {
        setLoading(true);
        setError("");
        // First try to get the entries without the profiles join to debug
        const { data, error } = await supabaseBrowser
          .from("journal_entries")
          .select(`
            id,
            user_id,
            soul_star,
            element,
            entry_date,
            created_at,
            is_private
          `)
          .eq("is_private", false)
          .not("soul_star", "is", null)
          .not("soul_star", "eq", "")
          .order("created_at", { ascending: false });
          
        // If that works, then get profile data separately
        if (data && data.length > 0) {
          for (let i = 0; i < data.length; i++) {
            const { data: profileData } = await supabaseBrowser
              .from("profiles")
              .select("username, profile_image")
              .eq("user_id", data[i].user_id)
              .single();
            (data[i] as any).profiles = profileData;
          }
        }
        if (error) {
          console.error("Failed to fetch public journal entries:", error);
          setError("Failed to load public feed.");
          return;
        }
        console.log("Public journal entries fetched:", data);
        setEntries(data || []);
      } catch (e) {
        console.error("Unexpected error loading public feed:", e);
        setError("Failed to load public feed.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

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
        entries.map((e) => {
          const theme = ELEMENT_COLORS[e.element] || ELEMENT_COLORS.heart;
          const created = new Date(e.entry_date);
          const dateStr = created.toLocaleDateString();
          return (
            <div
              key={e.id}
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
                    background: e.profiles?.profile_image ? 'none' : `linear-gradient(135deg, ${theme.color}40, ${theme.color}60)`,
                    border: `2px solid ${theme.color}40`,
                    boxShadow: `0 0 8px ${theme.color}20`
                  }}
                >
                  {e.profiles?.profile_image ? (
                    <img 
                      src={e.profiles.profile_image} 
                      alt={`${e.profiles.username || 'User'} profile`}
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
                    {e.profiles?.username ? `@${e.profiles.username}` : "@anonymous"}
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
                {e.soul_star}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

