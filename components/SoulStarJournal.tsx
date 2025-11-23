"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { sfx } from "@/lib/sfx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

interface DailyPrompts {
  prompt_date: string;
  element: string;
  intention: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
  reflection: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
}

interface JournalState {
  intention: string;
  reflection: string;
  soulStar: string;
  isLoading: boolean;
  saveMessage: string;
  errorMessage: string;
}

// Element colors for theming
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

export default function SoulStarJournal({ isOpen, onClose }: Props) {
  const { saveJournalEntry, getDailyPrompts, journalEntries, profile } = useProfile();
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompts | null>(null);
  const [journalState, setJournalState] = useState<JournalState>({
    intention: "",
    reflection: "",
    soulStar: "",
    isLoading: false,
    saveMessage: "",
    errorMessage: "",
  });
  const [showHistory, setShowHistory] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load daily prompts and existing entry on mount
  useEffect(() => {
    if (isOpen) {
      loadTodaysData();
    }
  }, [isOpen]);

  const loadTodaysData = async () => {
    // Get daily prompts
    const prompts = await getDailyPrompts();
    if (prompts) {
      setDailyPrompts(prompts);
    }

    // Load existing entry for today if it exists
    const todayEntry = journalEntries.find(entry => entry.entry_date === today);
    if (todayEntry) {
      setJournalState(prev => ({
        ...prev,
        soulStar: todayEntry.soul_star || "",
      }));
    }
  };

  const handleSaveEntry = async () => {
    if (!profile?.id || !dailyPrompts) return;

    // Validate input
    if (!journalState.soulStar.trim()) {
      setJournalState(prev => ({
        ...prev,
        errorMessage: "Please write something in your Soul Star before casting it into the stars."
      }));
      setTimeout(() => setJournalState(prev => ({ ...prev, errorMessage: "" })), 3000);
      return;
    }

    try {
      setJournalState(prev => ({ ...prev, isLoading: true }));
      sfx.play('click', 0.8);

      const savedEntry = await saveJournalEntry({
        entry_date: today,
        element: dailyPrompts.element,
        intention: dailyPrompts.intention.text,
        reflection: dailyPrompts.reflection.text,
        soul_star: journalState.soulStar.trim(),
      });

      if (savedEntry) {
        setJournalState(prev => ({
          ...prev,
          saveMessage: "Signal cast into the stars",
        }));
        setTimeout(() => {
          setJournalState(prev => ({ ...prev, saveMessage: "" }));
        }, 3000);
      } else {
        throw new Error("Failed to save entry");
      }
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      setJournalState(prev => ({
        ...prev,
        errorMessage: "Failed to cast your signal. Please try again."
      }));
      setTimeout(() => setJournalState(prev => ({ ...prev, errorMessage: "" })), 3000);
    } finally {
      setJournalState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleClose = () => {
    setShowHistory(false);
    onClose();
  };

  if (!isOpen) return null;

  if (!dailyPrompts) {
    return (
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{ paddingTop: '40px' }}
      >
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />
        <div className="relative p-8 text-center text-white">
          <div className="text-lg">Loading your Soul Star Journal...</div>
        </div>
      </div>
    );
  }

  const elementTheme = ELEMENT_COLORS[dailyPrompts.element as keyof typeof ELEMENT_COLORS] || ELEMENT_COLORS.heart;
  const elementEmoji = ELEMENT_EMOJIS[dailyPrompts.element as keyof typeof ELEMENT_EMOJIS] || "💖";

  return (
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center"
      style={{ paddingTop: '40px' }}
    >
      {/* Background blur */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={handleClose}
      />

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(120vw, 800px)',
          height: '200px',
          background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${elementTheme.glow} 0%, ${elementTheme.color}40 30%, ${elementTheme.color}10 60%, transparent 100%)`,
          filter: 'blur(100px)',
          transform: 'translateY(60px)'
        }}
      />
      
      {/* Modal Container */}
      <div
        className="relative soul-journal-container"
        style={{
          width: 'min(92vw, 600px)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '20px 24px 24px 24px',
          borderRadius: 18,
          background: 'transparent',
          border: `2px solid ${elementTheme.color}`,
          boxShadow: `0 -8px 25px ${elementTheme.glow}, 0 -4px 15px ${elementTheme.color}40, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${elementTheme.glow}`,
          backdropFilter: 'blur(16px) saturate(140%)',
          color: '#FFFFFF'
        }}
      >
        {/* Top glow */}
        <div 
          className="absolute"
          style={{
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '20px',
            background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${elementTheme.glow} 0%, ${elementTheme.color}30 50%, transparent 100%)`,
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* History toggle button */}
        <button
          onClick={() => {
            sfx.play('click', 0.8);
            setShowHistory(!showHistory);
          }}
          className="absolute top-3 left-4 px-3 py-1 rounded-full border flex items-center gap-1 transition-all text-xs font-semibold"
          style={{ 
            borderColor: `${elementTheme.color}cc`,
            color: elementTheme.color,
            boxShadow: `0 0 15px ${elementTheme.glow}, 0 0 25px ${elementTheme.color}50`,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            background: showHistory ? `${elementTheme.color}20` : `${elementTheme.color}10`,
            backdropFilter: 'blur(2px)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          📖 {showHistory ? 'TODAY' : 'HISTORY'}
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full border flex items-center justify-center transition-all"
          style={{ 
            fontSize: '16px',
            borderColor: `${elementTheme.color}cc`,
            color: elementTheme.color,
            boxShadow: `0 0 15px ${elementTheme.glow}, 0 0 25px ${elementTheme.color}50`,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            background: `${elementTheme.color}10`,
            backdropFilter: 'blur(2px)'
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        
        {/* Header */}
        <div 
          className="text-center mb-6"
          style={{ 
            color: elementTheme.color,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            fontSize: '20px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          🌟 {showHistory ? 'SOUL JOURNAL HISTORY' : 'SOUL STAR JOURNAL'} 🌟
        </div>

        {showHistory ? (
          /* History View */
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {journalEntries.length === 0 ? (
              <div 
                className="text-center p-6 rounded-lg"
                style={{ 
                  background: `${elementTheme.color}10`,
                  border: `1px solid ${elementTheme.color}40`,
                  color: elementTheme.color,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                <div className="text-lg mb-2">📖 Your journal awaits</div>
                <div className="text-sm opacity-80">Start by writing your first Soul Star entry</div>
              </div>
            ) : (
              journalEntries.map((entry) => {
                const entryDate = new Date(entry.entry_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const entryColor = ELEMENT_COLORS[entry.element as keyof typeof ELEMENT_COLORS]?.color || elementTheme.color;
                const entryEmoji = ELEMENT_EMOJIS[entry.element as keyof typeof ELEMENT_EMOJIS] || "💖";
                
                return (
                  <div 
                    key={entry.id}
                    className="p-4 rounded-lg space-y-3"
                    style={{
                      background: `${entryColor}08`,
                      border: `1px solid ${entryColor}30`,
                      borderLeft: `4px solid ${entryColor}`
                    }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="text-sm font-semibold" style={{ color: entryColor }}>
                        {entryDate}
                      </div>
                      <span 
                        className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1"
                        style={{
                          background: `${entryColor}15`,
                          color: entryColor,
                          border: `1px solid ${entryColor}40`
                        }}
                      >
                        {entryEmoji} {entry.element}
                      </span>
                    </div>
                    
                    {entry.soul_star && (
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
                        {entry.soul_star}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Today's Journal Interface */
          <>
            {/* Date and Element */}
            <div className="text-center mb-6">
              <div 
                className="text-lg font-semibold mb-2"
                style={{ color: '#FFFFFF' }}
              >
                {todayFormatted}
              </div>
              <span 
                className="inline-block px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wider"
                style={{
                  background: `${elementTheme.color}20`,
                  border: `1px solid ${elementTheme.color}60`,
                  color: elementTheme.color,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                {elementEmoji} {dailyPrompts.element} element
              </span>
            </div>

            {/* Intention of the Day */}
            <div className="mb-6">
              <label 
                className="block text-sm font-semibold mb-2"
                style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
              >
                Intention of the Day
              </label>
              <div 
                className="p-3 rounded-lg"
                style={{
                  background: `${elementTheme.color}10`,
                  border: `1px solid ${elementTheme.color}40`,
                  color: '#FFFFFF',
                  fontStyle: 'italic'
                }}
              >
                "{dailyPrompts.intention.text}"
              </div>
            </div>

            {/* Reflection Prompt */}
            <div className="mb-6">
              <label 
                className="block text-sm font-semibold mb-2"
                style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
              >
                Reflection Prompt
              </label>
              <div 
                className="p-3 rounded-lg"
                style={{
                  background: `${elementTheme.color}10`,
                  border: `1px solid ${elementTheme.color}40`,
                  color: '#FFFFFF',
                  fontStyle: 'italic'
                }}
              >
                "{dailyPrompts.reflection.text}"
              </div>
            </div>

            {/* Soul Star Response */}
            <div className="mb-6">
              <label 
                className="block text-sm font-semibold mb-2"
                style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
              >
                Your Soul Star
              </label>
              <textarea
                value={journalState.soulStar}
                onChange={(e) => setJournalState(prev => ({ ...prev, soulStar: e.target.value }))}
                placeholder="Let your soul speak... What resonates with you today?"
                className="w-full h-32 p-4 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${elementTheme.color}40`,
                  boxShadow: `0 0 10px ${elementTheme.color}20`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = `${elementTheme.color}80`;
                  e.target.style.boxShadow = `0 0 15px ${elementTheme.glow}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${elementTheme.color}40`;
                  e.target.style.boxShadow = `0 0 10px ${elementTheme.color}20`;
                }}
              />
            </div>

            {/* Messages */}
            {journalState.errorMessage && (
              <div 
                className="mb-4 p-3 rounded-lg text-center text-red-400"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                {journalState.errorMessage}
              </div>
            )}

            {journalState.saveMessage && (
              <div 
                className="mb-4 p-3 rounded-lg text-center"
                style={{ 
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22C55E',
                  textShadow: '0 0 8px #22C55E'
                }}
              >
                ✨ {journalState.saveMessage} ✨
              </div>
            )}

            {/* Cast into the Stars Button */}
            <div className="flex justify-between items-center">
              <div 
                className="text-sm opacity-70"
                style={{ color: elementTheme.color }}
              >
                Your reflection stays private with you
              </div>
              
              <button
                onClick={handleSaveEntry}
                disabled={!journalState.soulStar.trim() || journalState.isLoading}
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: journalState.soulStar.trim() && !journalState.isLoading ? `${elementTheme.color}30` : `${elementTheme.color}10`,
                  border: `2px solid ${elementTheme.color}60`,
                  color: elementTheme.color,
                  boxShadow: journalState.soulStar.trim() && !journalState.isLoading 
                    ? `0 0 20px ${elementTheme.glow}, 0 0 40px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`
                    : 'none',
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                {journalState.isLoading ? 'CASTING...' : 'Cast into the Stars'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}