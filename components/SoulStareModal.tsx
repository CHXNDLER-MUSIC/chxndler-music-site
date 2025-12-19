"use client";

import { useState, useEffect } from "react";
import { getTodaysQuestion, markQuestionAnswered, hasAnsweredToday } from "@/lib/dailyQuestions";
import { useProfile } from "@/contexts/ProfileContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { logHeartcoinTransaction } from "@/utils/heartcoins";
import { sfx } from "@/lib/sfx";
import SoulStarJournal from "@/components/SoulStarJournal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onOpenBlueDisplay?: () => void;
};

type JournalEntry = {
  date: string;
  question: string;
  category: string;
  response: string;
  color: string;
  glowColor: string;
};

export default function SoulStareModal({ isOpen, onClose, onComplete, onOpenBlueDisplay }: Props) {
  const { isJournalOpen, setIsJournalOpen } = useProfile();
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const todaysQuestion = getTodaysQuestion();
  const alreadyAnswered = hasAnsweredToday();

  // Enhanced close handler that opens blue display
  const handleClose = () => {
    onClose();
    // Automatically open blue display after closing soul star
    try { 
      onOpenBlueDisplay?.(); 
    } catch {}
  };


  const handleSubmit = async () => {
    if (!response.trim() || isSubmitting) return;
    
    try { sfx.play('click', 0.8); } catch {}
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');
      await logHeartcoinTransaction(supabaseBrowser, {
        user_id: user.id,
        amount: 1,
        reason: 'DAILY_REFLECTION',
        description: 'Completed daily reflection',
        transaction_type: 'bonus'
      });
      markQuestionAnswered();
      setSubmitted(true);
      onComplete();
      setTimeout(() => {
        handleClose();
        setResponse("");
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit soul star:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-[2147483647] flex items-start justify-center"
      style={{ 
        top: '20px',
        left: '0',
        right: '0',
        bottom: '0',
        paddingTop: '20px'
      }}
    >
      {/* Background blur */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.7)',
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
          background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${todaysQuestion.glowColor} 0%, ${todaysQuestion.color}40 30%, ${todaysQuestion.color}10 60%, transparent 100%)`,
          filter: 'blur(100px)',
          transform: 'translateY(60px)'
        }}
      />
      
      {/* Modal Container */}
      <div
        className="relative soul-stare-container"
        style={{
          width: 'min(92vw, 600px)',
          maxHeight: '80vh',
          padding: '20px 24px 24px 24px',
          borderRadius: 18,
          background: 'transparent',
          border: `2px solid #F2EF1D`,
          boxShadow: `0 -8px 25px #F2EF1D, 0 -4px 15px rgba(242, 239, 29, 0.4), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px #F2EF1D`,
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
            background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${todaysQuestion.glowColor} 0%, ${todaysQuestion.color}30 50%, transparent 100%)`,
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Journal button */}
        <button
          onClick={() => {
            try { sfx.play('click', 0.8); } catch {}
            setIsJournalOpen(true);
            onClose(); // Close the Soul Stare modal when opening journal
          }}
          className="absolute top-3 left-4 px-3 py-1 rounded-full border flex items-center gap-1 transition-all text-xs font-semibold"
          style={{ 
            borderColor: `${todaysQuestion.color}cc`,
            color: todaysQuestion.color,
            boxShadow: `0 0 15px ${todaysQuestion.glowColor}, 0 0 25px ${todaysQuestion.color}50`,
            textShadow: `0 0 8px ${todaysQuestion.glowColor}`,
            background: `${todaysQuestion.color}10`,
            backdropFilter: 'blur(2px)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          📖 JOURNAL
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full border flex items-center justify-center transition-all"
          style={{ 
            fontSize: '16px',
            borderColor: `${todaysQuestion.color}cc`,
            color: todaysQuestion.color,
            boxShadow: `0 0 15px ${todaysQuestion.glowColor}, 0 0 25px ${todaysQuestion.color}50`,
            textShadow: `0 0 8px ${todaysQuestion.glowColor}`,
            background: `${todaysQuestion.color}10`,
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
            color: todaysQuestion.color,
            textShadow: `0 0 8px ${todaysQuestion.glowColor}`,
            fontSize: '20px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          🌟 SOUL STAR 🌟
        </div>
        
        {/* Category badge */}
        <div className="text-center mb-4">
          <span 
            className="inline-block px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{
              background: `${todaysQuestion.color}20`,
              border: `1px solid ${todaysQuestion.color}60`,
              color: todaysQuestion.color,
              textShadow: `0 0 4px ${todaysQuestion.glowColor}`
            }}
          >
            {todaysQuestion.category}
          </span>
        </div>

        {/* Question */}
        <div 
          className="text-center mb-8 px-4"
          style={{ 
            fontSize: '18px',
            lineHeight: 1.4,
            color: '#FFFFFF',
            textShadow: '0 0 4px rgba(255,255,255,0.8)'
          }}
        >
          "{todaysQuestion.question}"
        </div>

        {/* Soul Star Interface */}
            {alreadyAnswered ? (
              /* Already answered state */
              <div 
                className="text-center p-6 rounded-lg"
                style={{ 
                  background: `${todaysQuestion.color}10`,
                  border: `1px solid ${todaysQuestion.color}40`,
                  color: todaysQuestion.color,
                  textShadow: `0 0 4px ${todaysQuestion.glowColor}`
                }}
              >
                <div className="text-lg mb-2">✨ You've already reflected today ✨</div>
                <div className="text-sm opacity-80">come back tomorrow for a new soul star question</div>
              </div>
            ) : submitted ? (
              /* Just submitted state */
              <div 
                className="text-center p-6 rounded-lg"
                style={{ 
                  background: `${todaysQuestion.color}10`,
                  border: `1px solid ${todaysQuestion.color}40`,
                  color: todaysQuestion.color,
                  textShadow: `0 0 4px ${todaysQuestion.glowColor}`
                }}
              >
                <div className="text-lg mb-2">✨ Thank you for sharing your truth ✨</div>
                <div className="text-sm opacity-80">+1 HeartCoin earned • See you tomorrow</div>
              </div>
            ) : (
              /* Response form */
              <div className="space-y-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Let your soul speak... there are no wrong answers, only your truth."
                  className="w-full h-32 p-4 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${todaysQuestion.color}40`,
                    boxShadow: `0 0 10px ${todaysQuestion.color}20`,
                    ':focus': {
                      borderColor: `${todaysQuestion.color}80`,
                      boxShadow: `0 0 15px ${todaysQuestion.glowColor}`
                    }
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = `${todaysQuestion.color}80`;
                    e.target.style.boxShadow = `0 0 15px ${todaysQuestion.glowColor}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${todaysQuestion.color}40`;
                    e.target.style.boxShadow = `0 0 10px ${todaysQuestion.color}20`;
                  }}
                />
                
                <div className="flex justify-between items-center">
                  <div 
                    className="text-sm opacity-70"
                    style={{ color: todaysQuestion.color }}
                  >
                    your REFLECTION is private and stays with you
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!response.trim() || isSubmitting}
                    className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: response.trim() && !isSubmitting ? `${todaysQuestion.color}30` : `${todaysQuestion.color}10`,
                      border: `2px solid ${todaysQuestion.color}60`,
                      color: todaysQuestion.color,
                      boxShadow: response.trim() && !isSubmitting 
                        ? `0 0 20px ${todaysQuestion.glowColor}, 0 0 40px ${todaysQuestion.color}40, inset 0 0 10px ${todaysQuestion.color}20`
                        : 'none',
                      textShadow: `0 0 4px ${todaysQuestion.glowColor}`
                    }}
                  >
                    {isSubmitting ? 'REFLECTING...' : 'share your truth'}
                  </button>
                </div>
              </div>
            )}
      </div>
      
      {/* Unified Soul Star Journal */}
      <SoulStarJournal 
        isOpen={isJournalOpen} 
        onClose={() => setIsJournalOpen(false)}
      />
    </div>
  );
}
