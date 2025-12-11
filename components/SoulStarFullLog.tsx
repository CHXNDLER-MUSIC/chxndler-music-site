"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { 
  loadSoulStarFullLog, 
  saveSoulStarEntry, 
  updateSoulStarPrivacy, 
  type SoulStarLogEntry,
  type CurrentPrompt 
} from "@/lib/soulStarJournal";
import { sfx } from "@/lib/sfx";

interface SoulStarFullLogProps {
  userId?: string;
}

const ELEMENT_COLORS = {
  heart: { color: "#F91880", glow: "#F918B0" },
  water: { color: "#38B6FF", glow: "#38D6FF" },
  lightning: { color: "#F2EF1D", glow: "#FFFF00" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0" },
};

const ELEMENT_EMOJIS = {
  heart: "💖",
  water: "🌊",
  lightning: "⚡",
  darkness: "🌑",
};

export default function SoulStarFullLog({ userId }: SoulStarFullLogProps) {
  const { user, profile } = useProfile();
  const [entries, setEntries] = useState<SoulStarLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const currentUserId = userId || user?.id;

  useEffect(() => {
    if (currentUserId) {
      loadEntries();
    }
  }, [currentUserId]);

  const loadEntries = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const data = await loadSoulStarFullLog(currentUserId);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load Soul Star log:', err);
      setError('Failed to load your Soul Star journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entryId: string) => {
    sfx.play('click', 0.6);
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
    setEditingEntry(null);
  };

  const handleEditClick = (entry: SoulStarLogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.play('click', 0.6);
    setEditingEntry(entry.entry_id);
    setEditText(entry.soulStar);
  };

  const handleSaveEdit = async (entry: SoulStarLogEntry) => {
    try {
      sfx.play('click', 0.8);
      
      // For editing, we update the soul_star directly
      const { supabaseClient } = await import('@/lib/supabaseClient');
      const { data, error } = await supabaseClient
        .from('soul_journal_entries')
        .update({ soul_star: editText.trim() })
        .eq('entry_id', entry.entry_id)
        .select()
        .single();
      
      if (error) throw error;

      setEntries(prev => prev.map(e => 
        e.entry_id === entry.entry_id 
          ? { ...e, soulStar: editText.trim() }
          : e
      ));
      
      setEditingEntry(null);
      setEditText("");
    } catch (error) {
      console.error('Failed to update entry:', error);
      setError('Failed to update entry');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    sfx.play('click', 0.6);
    setEditingEntry(null);
    setEditText("");
  };

  const handlePrivacyToggle = async (entry: SoulStarLogEntry) => {
    try {
      sfx.play('click', 0.8);
      const newPrivacy = !entry.isPrivate;
      
      await updateSoulStarPrivacy(entry.entry_id, newPrivacy);
      
      setEntries(prev => prev.map(e => 
        e.entry_id === entry.entry_id 
          ? { ...e, isPrivate: newPrivacy }
          : e
      ));
    } catch (error) {
      console.error('Failed to update privacy:', error);
      setError('Failed to update privacy setting');
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!currentUserId) {
    return (
      <div className="text-center p-8 text-white">
        <div className="text-lg mb-2">🔐 Access Required</div>
        <div className="text-sm opacity-80">Please log in to view your Soul Star journal</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-8 text-white">
        <div className="text-lg">Loading your Soul Star journal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-400">
        <div className="text-lg mb-2">⚠️ Error</div>
        <div className="text-sm">{error}</div>
        <button 
          onClick={loadEntries}
          className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center p-8">
        <div 
          className="p-6 rounded-lg"
          style={{ 
            background: '#F9188020',
            border: '1px solid #F9188040',
            color: '#F91880',
            textShadow: '0 0 4px #F918B0'
          }}
        >
          <div className="text-lg mb-2">📖 Your journal awaits</div>
          <div className="text-sm opacity-80">Start by writing your first Soul Star entry</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {entries.map((entry) => {
        const entryDate = formatDate(entry.entryDate);
        const entryColor = ELEMENT_COLORS[entry.element as keyof typeof ELEMENT_COLORS]?.color || "#F91880";
        const entryGlow = ELEMENT_COLORS[entry.element as keyof typeof ELEMENT_COLORS]?.glow || "#F918B0";
        const entryEmoji = ELEMENT_EMOJIS[entry.element as keyof typeof ELEMENT_EMOJIS] || "💖";
        const isExpanded = expandedEntry === entry.entry_id;
        const isEditing = editingEntry === entry.entry_id;
        
        return (
          <div 
            key={entry.entry_id}
            className="rounded-lg overflow-hidden"
            style={{
              background: `${entryColor}08`,
              border: `1px solid ${entryColor}30`,
              borderLeft: `4px solid ${entryColor}`
            }}
          >
            {/* Header row */}
            <div 
              className="p-3 cursor-pointer hover:bg-black/20 flex items-center justify-between"
              onClick={() => handleEntryClick(entry.entry_id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: entryColor }}>
                  {entryDate}
                </div>
                <span 
                  className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1 flex-shrink-0"
                  style={{
                    background: `${entryColor}15`,
                    color: entryColor,
                    border: `1px solid ${entryColor}40`
                  }}
                >
                  {entryEmoji} {entry.element}
                </span>
                <div 
                  className="text-xs opacity-70 truncate"
                  style={{ color: '#FFFFFF' }}
                >
                  {entry.soulStar.substring(0, 50) + (entry.soulStar.length > 50 ? '...' : '')}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Privacy toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrivacyToggle(entry);
                  }}
                  className="text-xs px-2 py-1 rounded transition-all font-semibold"
                  style={{
                    background: entry.isPrivate ? `${entryColor}20` : 'rgba(128, 128, 128, 0.1)',
                    border: `1px solid ${entry.isPrivate ? entryColor : '#808080'}60`,
                    color: entry.isPrivate ? entryColor : '#808080',
                    textShadow: entry.isPrivate ? `0 0 4px ${entryGlow}` : 'none',
                    opacity: entry.isPrivate ? 1 : 0.5
                  }}
                  title={entry.isPrivate ? "Private" : "Shared"}
                >
                  PRIVATE
                </button>
                
                {/* Expand indicator */}
                <div 
                  className="text-xs opacity-50"
                  style={{ color: entryColor }}
                >
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>
            </div>
            
            {/* Expanded content */}
            {isExpanded && (
              <div 
                className="px-4 pb-4 space-y-3"
                style={{
                  borderTop: `1px solid ${entryColor}20`
                }}
              >
                {/* Intention */}
                {entry.intention && (
                  <div>
                    <div 
                      className="text-xs font-semibold mb-1 uppercase tracking-wider"
                      style={{ color: entryColor, textShadow: `0 0 2px ${entryGlow}` }}
                    >
                      INTENTION
                    </div>
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ 
                        color: '#FFFFFF',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px',
                        borderRadius: '6px',
                        border: `1px solid ${entryColor}15`
                      }}
                    >
                      {entry.intention}
                    </div>
                  </div>
                )}
                
                {/* Prompt */}
                <div>
                  <div 
                    className="text-xs font-semibold mb-1 uppercase tracking-wider"
                    style={{ color: entryColor, textShadow: `0 0 2px ${entryGlow}` }}
                  >
                    PROMPT
                  </div>
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${entryColor}15`
                    }}
                  >
                    {entry.prompt || 'No prompt text available'}
                  </div>
                </div>
                
                {/* Soul Star Response */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div 
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: entryColor, textShadow: `0 0 2px ${entryGlow}` }}
                    >
                      YOUR SOUL STAR
                    </div>
                    {!isEditing && (
                      <button
                        onClick={(e) => handleEditClick(entry, e)}
                        className="text-xs px-2 py-1 rounded transition-all"
                        style={{
                          color: entryColor,
                          background: `${entryColor}10`,
                          border: `1px solid ${entryColor}30`
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-20 p-2 rounded text-white placeholder-white/50 resize-none focus:outline-none"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: `1px solid ${entryColor}40`,
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(entry)}
                          className="px-3 py-1 text-xs rounded transition-all"
                          style={{
                            background: `${entryColor}20`,
                            color: entryColor,
                            border: `1px solid ${entryColor}40`
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs rounded transition-all"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ 
                        color: '#FFFFFF',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${entryColor}20`
                      }}
                    >
                      {entry.soulStar}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
