"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseClient } from "@/lib/supabaseClient";
import { sfx } from "@/lib/sfx";

interface DailyPrompt {
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

interface SoulStarJournalProps {
  isOpen: boolean;
  onClose: () => void;
  openWelcomeHome?: () => void;
}

interface JournalState {
  intentionResponse: string;
  reflectionResponse: string;
  soulStar: string;
  isLoading: boolean;
  saveMessage: string;
  errorMessage: string;
  isPrivate: boolean;
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

export default function SoulStarJournal({ isOpen, onClose, openWelcomeHome }: SoulStarJournalProps) {
  const { saveJournalEntry, journalEntries, profile, user, getDailyPrompts } = useProfile();
  const [showHistory, setShowHistory] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [journalState, setJournalState] = useState<JournalState>({
    intentionResponse: "",
    reflectionResponse: "",
    soulStar: "",
    isLoading: false,
    saveMessage: "",
    errorMessage: "",
    isPrivate: true,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load daily prompt when opened
  useEffect(() => {
    if (isOpen) {
      loadDailyPrompt();
    }
  }, [isOpen]);

  // Load existing entry on mount
  useEffect(() => {
    if (isOpen && profile?.element && journalEntries) {
      loadExistingEntry();
    }
  }, [isOpen, profile?.element, journalEntries]);

  const loadDailyPrompt = async () => {
    try {
      const prompt = await getDailyPrompts();
      setDailyPrompt(prompt);
    } catch (error) {
      console.error('Failed to load daily prompt:', error);
    }
  };

  const loadExistingEntry = () => {
    if (!profile?.element) return;

    // Load existing entry for today if it exists
    const todayEntry = journalEntries.find(entry => 
      entry.entry_date === today && entry.element === profile.element
    );
    if (todayEntry) {
      setJournalState(prev => ({
        ...prev,
        intentionResponse: todayEntry.intention_response || "",
        reflectionResponse: todayEntry.reflection_response || "",
        soulStar: todayEntry.soul_star || "",
      }));
    } else {
      // Reset state for new entry
      setJournalState(prev => ({
        ...prev,
        intentionResponse: "",
        reflectionResponse: "",
        soulStar: "",
        isPrivate: true,
      }));
    }
  };

  const handleSaveEntry = async () => {
    // Check if user is logged in
    if (!user?.id || !profile?.element) {
      if (openWelcomeHome) {
        setJournalState(prev => ({
          ...prev,
          errorMessage: "You need to log in to save your soul entry. Opening Welcome Home..."
        }));
        setTimeout(() => setJournalState(prev => ({ ...prev, errorMessage: "" })), 2000);
        openWelcomeHome();
        return;
      } else {
        setJournalState(prev => ({
          ...prev,
          errorMessage: "Please log in to save your soul entry."
        }));
        setTimeout(() => setJournalState(prev => ({ ...prev, errorMessage: "" })), 3000);
        return;
      }
    }

    if (!dailyPrompt) return;

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

      // Use the upsert logic as specified
      const { data, error } = await supabaseClient
        .from("soul_journal_entries")
        .upsert(
          {
            user_id: user.id,
            entry_date: today,
            element: profile.element,
            prompt_id: null, // Using new daily prompt system
            intention_response: journalState.intentionResponse,
            reflection_response: journalState.reflectionResponse,
            soul_star: journalState.soulStar.trim(),
          },
          { onConflict: "user_id,entry_date,element" }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setJournalState(prev => ({
          ...prev,
          saveMessage: "Signal cast into the stars",
        }));
        setTimeout(() => {
          setJournalState(prev => ({ ...prev, saveMessage: "" }));
          onClose(); // Close the popout on success
        }, 2000);
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
    onClose();
  };

  if (!isOpen) return null;

  if (!dailyPrompt) {
    return (
      <div 
        className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        style={{ marginTop: '280px' }}
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

  const currentElement = dailyPrompt.element as keyof typeof ELEMENT_COLORS;
  const elementTheme = ELEMENT_COLORS[currentElement] || ELEMENT_COLORS.heart;
  const elementEmoji = ELEMENT_EMOJIS[currentElement] || "💖";

  return (
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center"
      style={{ marginTop: '280px' }}
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
        className={`relative soul-journal-container ${
          hasPendingReflection && !showHistory ? 'animate-pulse' : ''
        }`}
        style={{
          width: 'min(92vw, 600px)',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '20px 24px 24px 24px',
          borderRadius: 18,
          background: 'transparent',
          border: hasPendingReflection && !showHistory
            ? `2px solid ${elementTheme.color}`
            : `2px solid ${elementTheme.color}`,
          boxShadow: hasPendingReflection && !showHistory
            ? `0 -8px 30px ${elementTheme.glow}, 0 -4px 20px ${elementTheme.color}60, 0 12px 35px rgba(0,0,0,0.4), 0 0 30px ${elementTheme.glow}, 0 0 50px ${elementTheme.color}40`
            : `0 -8px 25px ${elementTheme.glow}, 0 -4px 15px ${elementTheme.color}40, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${elementTheme.glow}`,
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


        {/* Journal Button - Top Left */}
        <button
          className="absolute top-3 left-4 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            background: `${elementTheme.color}20`,
            border: `1px solid ${elementTheme.color}60`,
            color: elementTheme.color,
            textShadow: `0 0 4px ${elementTheme.glow}`
          }}
        >
          JOURNAL
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
          className="text-center mb-4"
          style={{ 
            color: elementTheme.color,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            fontSize: '18px',
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
            <div className="text-center mb-3">
              <div 
                className="text-base font-semibold mb-1"
                style={{ color: '#FFFFFF' }}
              >
                {todayFormatted}
              </div>
              <span 
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: `${elementTheme.color}20`,
                  border: `1px solid ${elementTheme.color}60`,
                  color: elementTheme.color,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                {elementEmoji} {dailyPrompt.element} element
              </span>
            </div>

            {/* Intention & Reflection Section */}
            {dailyPrompt && (
              <div className="mb-4 space-y-3">
                {/* Intention */}
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: `${elementTheme.color}08`,
                    border: `1px solid ${elementTheme.color}30`,
                    borderLeft: `4px solid ${elementTheme.color}`
                  }}
                >
                  <div 
                    className="text-sm font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                  >
                    ✨ Today's Intention
                  </div>
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ color: '#FFFFFF' }}
                  >
                    {dailyPrompt.intention.text}
                  </div>
                </div>

                {/* Reflection Prompt */}
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: `${elementTheme.color}08`,
                    border: `1px solid ${elementTheme.color}30`,
                    borderLeft: `4px solid ${elementTheme.color}`
                  }}
                >
                  <div 
                    className="text-sm font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                  >
                    💭 Prompt
                  </div>
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ color: '#FFFFFF' }}
                  >
                    {dailyPrompt.reflection.text}
                  </div>
                </div>
              </div>
            )}


            {/* Reflection Response */}
            <div className="mb-4">
              <label 
                className="block text-sm font-semibold mb-2"
                style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
              >
                💭 Your Reflection
              </label>
              <textarea
                value={journalState.reflectionResponse}
                onChange={(e) => setJournalState(prev => ({ ...prev, reflectionResponse: e.target.value }))}
                placeholder="Reflect on today's prompt... What insights arise?"
                className="w-full h-20 p-3 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
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

            {/* Bottom Section */}
            <div className="relative flex justify-center">
              {/* Private Toggle - positioned absolute to left */}
              <button
                onClick={() => setJournalState(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                className="absolute left-0 top-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: journalState.isPrivate ? `${elementTheme.color}20` : 'rgba(128, 128, 128, 0.2)',
                  border: `1px solid ${journalState.isPrivate ? elementTheme.color : '#808080'}60`,
                  color: journalState.isPrivate ? elementTheme.color : '#808080',
                  textShadow: journalState.isPrivate ? `0 0 4px ${elementTheme.glow}` : 'none'
                }}
              >
                PRIVATE
              </button>

              {/* Cast into the Stars Button - centered */}
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