"use client";

import { useState, useEffect } from "react";
import { getTodaysQuestion, markQuestionAnswered, hasAnsweredToday } from "@/lib/dailyQuestions";
import { sfx } from "@/lib/sfx";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

type JournalEntry = {
  date: string;
  question: string;
  category: string;
  response: string;
  color: string;
  glowColor: string;
};

export default function SoulStareModal({ isOpen, onClose, onComplete }: Props) {
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  const todaysQuestion = getTodaysQuestion();
  const alreadyAnswered = hasAnsweredToday();

  // Load journal entries on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEntries = localStorage.getItem('soul_stare_journal');
      if (storedEntries) {
        setJournalEntries(JSON.parse(storedEntries));
      }
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!response.trim() || isSubmitting) return;
    
    try { sfx.play('click', 0.8); } catch {}
    setIsSubmitting(true);
    
    try {
      // Award heart coin
      const heartResponse = await fetch('/api/heart-coins/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartCoinsToAdd: 1 })
      });
      
      if (heartResponse.ok) {
        // Save to journal
        const journalEntry: JournalEntry = {
          date: new Date().toDateString(),
          question: todaysQuestion.question,
          category: todaysQuestion.category,
          response: response.trim(),
          color: todaysQuestion.color,
          glowColor: todaysQuestion.glowColor
        };
        
        const updatedEntries = [journalEntry, ...journalEntries];
        setJournalEntries(updatedEntries);
        localStorage.setItem('soul_stare_journal', JSON.stringify(updatedEntries));
        
        markQuestionAnswered();
        setSubmitted(true);
        onComplete();
        setTimeout(() => {
          onClose();
          setResponse("");
          setSubmitted(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit soul stare:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center"
      style={{ paddingTop: '40px' }}
    >
      {/* Background blur */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
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
            setShowJournal(!showJournal);
          }}
          className="absolute top-3 left-4 px-3 py-1 rounded-full border flex items-center gap-1 transition-all text-xs font-semibold"
          style={{ 
            borderColor: `${todaysQuestion.color}cc`,
            color: todaysQuestion.color,
            boxShadow: `0 0 15px ${todaysQuestion.glowColor}, 0 0 25px ${todaysQuestion.color}50`,
            textShadow: `0 0 8px ${todaysQuestion.glowColor}`,
            background: showJournal ? `${todaysQuestion.color}20` : `${todaysQuestion.color}10`,
            backdropFilter: 'blur(2px)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          📖 JOURNAL
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
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
          🌟 {showJournal ? 'Soul Journal' : 'Soul Stare'} 🌟
        </div>
        
        {!showJournal && (
          <>
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
          </>
        )}

        {showJournal ? (
          /* Journal View */
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {journalEntries.length === 0 ? (
              <div 
                className="text-center p-6 rounded-lg"
                style={{ 
                  background: `${todaysQuestion.color}10`,
                  border: `1px solid ${todaysQuestion.color}40`,
                  color: todaysQuestion.color,
                  textShadow: `0 0 4px ${todaysQuestion.glowColor}`
                }}
              >
                <div className="text-lg mb-2">📖 Your journal awaits</div>
                <div className="text-sm opacity-80">Start by answering today's soul stare question</div>
              </div>
            ) : (
              journalEntries.map((entry, index) => (
                <div 
                  key={`${entry.date}-${index}`}
                  className="p-4 rounded-lg space-y-3"
                  style={{
                    background: `${entry.color}08`,
                    border: `1px solid ${entry.color}30`,
                    borderLeft: `4px solid ${entry.color}`
                  }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-sm font-semibold" style={{ color: entry.color }}>
                      {entry.date}
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded-full uppercase font-semibold"
                      style={{
                        background: `${entry.color}15`,
                        color: entry.color,
                        border: `1px solid ${entry.color}40`
                      }}
                    >
                      {entry.category}
                    </span>
                  </div>
                  
                  <div 
                    className="text-sm italic opacity-90"
                    style={{ 
                      color: '#FFFFFF',
                      fontSize: '14px',
                      lineHeight: 1.4
                    }}
                  >
                    "{entry.question}"
                  </div>
                  
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${entry.color}20`
                    }}
                  >
                    {entry.response}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Soul Stare Interface */
          <>
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
                <div className="text-sm opacity-80">Come back tomorrow for a new soul stare question</div>
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
                    Your reflection is private and stays with you
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
                    {isSubmitting ? 'REFLECTING...' : 'SHARE YOUR TRUTH'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}