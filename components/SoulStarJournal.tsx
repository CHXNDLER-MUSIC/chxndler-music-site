"use client";

import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";

interface DailyPrompt {
  id: string; // Add the daily prompt ID
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
  isSubmitted: boolean;
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
  const { hasPendingReflection, markReflectionComplete } = useDailyReflectionStatus();
  const [showHistory, setShowHistory] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const journalRef = useRef<HTMLDivElement>(null);
  const [journalState, setJournalState] = useState<JournalState>({
    intentionResponse: "",
    reflectionResponse: "",
    soulStar: "",
    isLoading: false,
    saveMessage: "",
    errorMessage: "",
    isPrivate: true,
    isSubmitted: false,
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

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (journalRef.current && !journalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadDailyPrompt = async () => {
    try {
      const prompt = await getDailyPrompts();
      setDailyPrompt(prompt);
    } catch (error) {
      console.error('Failed to load daily prompt:', error);
      // Set error state that will be displayed to user
      setJournalState(prev => ({
        ...prev,
        errorMessage: "Unable to load today's soul prompt from database. Please contact support."
      }));
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
        intentionResponse: todayEntry.intention || "",
        reflectionResponse: todayEntry.reflection || "",
        soulStar: todayEntry.soul_star || "",
        // If there's already a soul_star for today, mark as submitted to lock UI
        isSubmitted: !!(todayEntry.soul_star && todayEntry.soul_star.trim().length > 0),
      }));
    } else {
      // Reset state for new entry
      setJournalState(prev => ({
        ...prev,
        intentionResponse: "",
        reflectionResponse: "",
        soulStar: "",
        isPrivate: true,
        isSubmitted: false,
      }));
    }
  };

  const handleSaveEntry = async () => {
    // Check if user is logged in
    if (!user?.id || !profile?.element) {
      if (openWelcomeHome) {
        openWelcomeHome();
      }
      return;
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

      // Use ProfileContext to save so journalEntries updates for FULL LOG
      const saved = await saveJournalEntry({
        entry_date: today,
        element: profile.element,
        prompt_id: dailyPrompt.id,
        intention: journalState.intentionResponse,
        reflection: journalState.reflectionResponse,
        intention_response: null,
        reflection_response: null,
        soul_star: journalState.soulStar.trim(),
      } as any);

      if (saved) {
        // Mark reflection as complete to hide notifications
        markReflectionComplete();

        setJournalState(prev => ({
          ...prev,
          saveMessage: "Signal cast into the stars",
          isSubmitted: true,
        }));
        setTimeout(() => {
          setJournalState(prev => ({ ...prev, saveMessage: "" }));
          onClose(); // Close the popout on success
        }, 2000);
      }
    } catch (error) {
      try {
        // Provide clearer diagnostics
        const err = error as any;
        console.error('Failed to save journal entry:', err);
        console.error('Error details:', {
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
        });
      } catch (logErr) {
        console.error('Failed to log error details for journal save');
      }
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
    sfx.play('close', 0.8);
    onClose();
  };

  if (!isOpen) return null;

  if (!dailyPrompt) {
    return (
      <div 
        className="fixed z-[2147483647] flex items-center justify-center"
        style={{ 
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 600px)'
        }}
      >
        <div className="relative p-8 text-center text-white bg-black/90 rounded-lg border border-white/20">
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
      className="fixed z-[2147483647] flex items-center justify-center"
      style={{ 
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 600px)'
      }}
    >

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(120vw, 800px)',
          height: '250px',
          background: `radial-gradient(ellipse 90% 100% at 50% 0%, ${elementTheme.glow} 0%, ${elementTheme.color}50 25%, ${elementTheme.color}20 50%, transparent 100%)`,
          filter: 'blur(120px)',
          transform: 'translateY(40px)'
        }}
      />
      
      {/* Additional ambient glow layer */}
      <div 
        className="absolute"
        style={{
          width: 'min(100vw, 700px)',
          height: '400px',
          background: `radial-gradient(ellipse 70% 80% at 50% 20%, ${elementTheme.glow}30 0%, ${elementTheme.color}20 40%, transparent 70%)`,
          filter: 'blur(80px)',
          transform: 'translateY(-20px)',
          zIndex: -2
        }}
      />
      
      {/* Modal Container */}
      <div
        ref={journalRef}
        className="relative soul-journal-container"
        style={{
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '20px 24px 12px 24px',
          borderRadius: 18,
          background: 'rgba(0, 0, 0, 0.9)',
          border: hasPendingReflection && !showHistory
            ? `2px solid ${elementTheme.color}`
            : `2px solid ${elementTheme.color}`,
          boxShadow: hasPendingReflection && !showHistory
            ? `0 -12px 40px ${elementTheme.glow}, 0 -6px 25px ${elementTheme.color}80, 0 16px 50px rgba(0,0,0,0.6), 0 0 40px ${elementTheme.glow}, 0 0 80px ${elementTheme.color}60, 0 0 120px ${elementTheme.color}30`
            : `0 -10px 35px ${elementTheme.glow}, 0 -5px 20px ${elementTheme.color}60, 0 14px 40px rgba(0,0,0,0.5), 0 0 35px ${elementTheme.glow}, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
          backdropFilter: 'blur(16px) saturate(140%)',
          color: '#FFFFFF'
        }}
      >
        {/* Top glow */}
        <div 
          className="absolute"
          style={{
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            height: '30px',
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${elementTheme.glow} 0%, ${elementTheme.color}50 40%, ${elementTheme.color}20 70%, transparent 100%)`,
            filter: 'blur(35px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />


        {/* Full Log Button - Top Left */}
        <button
          onClick={(!user?.id || !profile?.element) ? undefined : () => {
            sfx.play('click', 0.8);
            setShowHistory(!showHistory);
          }}
          disabled={!user?.id || !profile?.element}
          className="absolute top-3 left-4 text-xs font-semibold transition-all duration-200 hover:opacity-100 px-2 py-1 rounded disabled:cursor-not-allowed"
          style={{
            color: (!user?.id || !profile?.element) ? '#808080' : elementTheme.color,
            textShadow: (!user?.id || !profile?.element) ? 'none' : `0 0 4px ${elementTheme.glow}`,
            opacity: (!user?.id || !profile?.element) ? 0.4 : (showHistory ? 1 : 0.8),
            background: 'transparent',
            border: (!user?.id || !profile?.element) ? '1px solid #808080' : '1px solid #F2EF1D',
            boxShadow: (!user?.id || !profile?.element) ? 'none' : '0 0 8px #F2EF1D, 0 0 15px #FFFF00',
            cursor: (!user?.id || !profile?.element) ? 'not-allowed' : 'pointer'
          }}
        >
          FULL LOG
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

        {/* Private Toggle - positioned under close button */}
        <button
          onClick={(!user?.id || !profile?.element) ? undefined : () => {
            sfx.play('click', 0.8);
            setJournalState(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
          }}
          disabled={!user?.id || !profile?.element}
          className="absolute top-16 right-4 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          style={{
            background: (!user?.id || !profile?.element) ? 'rgba(128, 128, 128, 0.1)' : (journalState.isPrivate ? `${elementTheme.color}20` : 'rgba(128, 128, 128, 0.2)'),
            border: (!user?.id || !profile?.element) ? '1px solid #50505060' : `1px solid ${journalState.isPrivate ? elementTheme.color : '#808080'}60`,
            color: (!user?.id || !profile?.element) ? '#505050' : (journalState.isPrivate ? elementTheme.color : '#808080'),
            textShadow: (!user?.id || !profile?.element) ? 'none' : (journalState.isPrivate ? `0 0 4px ${elementTheme.glow}` : 'none'),
            opacity: (!user?.id || !profile?.element) ? 0.4 : 1,
            cursor: (!user?.id || !profile?.element) ? 'not-allowed' : 'pointer'
          }}
        >
          PRIVATE
        </button>
        
        {/* Header */}
        <div 
          className="text-center mb-1"
          style={{ 
            color: elementTheme.color,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            fontSize: '18px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          🌟 SOUL STAR JOURNAL 🌟
          {/* Yellow underline */}
          <div 
            className="mt-2"
            style={{
              width: '100%',
              height: '1px',
              background: '#F2EF1D',
              boxShadow: '0 0 4px #F2EF1D, 0 0 8px #FFFF00'
            }}
          />
        </div>

        {showHistory ? (
          /* History View */
          <div className="space-y-4 overflow-y-auto" style={{ height: '400px' }}>
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
          <div style={{ height: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Date and Element with pending notification */}
            <div className="text-center mb-4">
              <div 
                className="text-base font-semibold mb-1"
                style={{ color: '#FFFFFF' }}
              >
                {todayFormatted}
              </div>
              
              {/* Element Badge */}
              <div className="flex justify-center items-center mb-1">
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
              
            </div>

            {/* Intention & Reflection Section */}
            {dailyPrompt && (
              <div className="mb-2 space-y-1 -mt-1">
                {/* Intention */}
                <div 
                  className="px-2 py-1 rounded-lg"
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
                    className="text-sm leading-relaxed mb-3"
                    style={{ color: '#FFFFFF' }}
                  >
                    {dailyPrompt.intention.text}
                  </div>
                </div>

                {/* Reflection Prompt */}
                <div 
                  className="p-2 rounded-lg"
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


            {/* Soul Star - Main Journal Entry */}
            <div className="mb-2">
              <textarea
                value={journalState.soulStar}
                onChange={(e) => setJournalState(prev => ({ ...prev, soulStar: e.target.value }))}
                placeholder="Write your soul's message for today... What wants to be expressed?"
                className="w-full h-16 p-2 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
                disabled={journalState.isLoading || journalState.isSubmitted}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${elementTheme.color}40`,
                  boxShadow: `0 0 10px ${elementTheme.color}20`,
                  opacity: (journalState.isLoading || journalState.isSubmitted) ? 0.7 : 1,
                  pointerEvents: (journalState.isLoading || journalState.isSubmitted) ? 'none' as any : 'auto'
                }}
                onFocus={(e) => {
                  if (journalState.isSubmitted) return;
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
            <div className="flex justify-center mt-auto mb-2">
              {/* Cast into the Stars Button - centered */}
              {(!user?.id || !profile?.element) ? (
                <button
                  onClick={handleSaveEntry}
                  className="px-6 py-1 rounded-lg font-semibold transition-all duration-200"
                  style={{
                    background: `${elementTheme.color}10`,
                    border: `2px solid ${elementTheme.color}60`,
                    color: elementTheme.color,
                    textShadow: `0 0 4px ${elementTheme.glow}`
                  }}
                >
                  Create an{' '}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      if (openWelcomeHome) {
                        openWelcomeHome();
                      }
                    }}
                    className="underline cursor-pointer hover:opacity-80"
                    style={{
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px'
                    }}
                  >
                    ALIEN profile
                  </span>
                  {' '}to submit a reflection.
                </button>
              ) : (
                <button
                  onClick={journalState.isSubmitted ? undefined : handleSaveEntry}
                  disabled={journalState.isSubmitted || !journalState.soulStar.trim() || journalState.isLoading}
                  className="px-6 py-1 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: (!journalState.isSubmitted && journalState.soulStar.trim() && !journalState.isLoading) ? `${elementTheme.color}30` : `${elementTheme.color}10`,
                    border: `2px solid ${elementTheme.color}60`,
                    color: elementTheme.color,
                    boxShadow: (!journalState.isSubmitted && journalState.soulStar.trim() && !journalState.isLoading)
                      ? `0 0 20px ${elementTheme.glow}, 0 0 40px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`
                      : 'none',
                    textShadow: `0 0 4px ${elementTheme.glow}`
                  }}
                >
                  {journalState.isSubmitted
                    ? 'Your soul star shines above'
                    : (journalState.isLoading ? 'CASTING...' : 'Cast into the Stars')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
