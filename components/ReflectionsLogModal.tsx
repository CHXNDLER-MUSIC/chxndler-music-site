"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";

type Reflection = {
  id: string;
  question: string;
  category: 'soul' | 'heart' | 'mind' | 'spirit';
  user_response: string;
  date: string;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const categoryColors = {
  soul: { color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.6)' },
  heart: { color: '#EC4899', glowColor: 'rgba(236, 72, 153, 0.6)' },
  mind: { color: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.6)' },
  spirit: { color: '#10B981', glowColor: 'rgba(16, 185, 129, 0.6)' }
};

export default function ReflectionsLogModal({ isOpen, onClose }: Props) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchReflections();
    }
  }, [isOpen]);

  const fetchReflections = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch('/api/reflections');
      if (!response.ok) {
        throw new Error('Failed to fetch reflections');
      }
      
      const data = await response.json();
      setReflections(data.reflections || []);
    } catch (err) {
      console.error('Failed to fetch reflections:', err);
      setError('Failed to load your reflections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReflectionClick = (reflection: Reflection) => {
    try { sfx.play('click', 0.6); } catch {}
    setSelectedReflection(reflection);
  };

  const handleBackToList = () => {
    try { sfx.play('click', 0.6); } catch {}
    setSelectedReflection(null);
  };

  const handleClose = () => {
    try { sfx.play('click', 0.8); } catch {}
    setSelectedReflection(null);
    onClose();
  };

  if (!isOpen) return null;

  const primaryColor = selectedReflection 
    ? categoryColors[selectedReflection.category].color 
    : '#F2EF1D';
  const glowColor = selectedReflection 
    ? categoryColors[selectedReflection.category].glowColor 
    : 'rgba(242, 239, 29, 0.6)';

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
          backdropFilter: 'blur(12px)'
        }}
        onClick={handleClose}
      />

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(120vw, 900px)',
          height: '300px',
          background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${glowColor} 0%, ${primaryColor}40 30%, ${primaryColor}10 60%, transparent 100%)`,
          filter: 'blur(100px)',
          transform: 'translateY(60px)'
        }}
      />
      
      {/* Modal Container */}
      <div
        className="relative reflections-log-container"
        style={{
          width: 'min(95vw, 800px)',
          maxHeight: '85vh',
          padding: '24px',
          borderRadius: 18,
          background: 'transparent',
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 -8px 25px ${primaryColor}, 0 -4px 15px ${glowColor}, 0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${primaryColor}`,
          backdropFilter: 'blur(16px) saturate(140%)',
          color: '#FFFFFF',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
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
            background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${glowColor} 0%, ${primaryColor}30 50%, transparent 100%)`,
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {selectedReflection && (
              <button
                onClick={handleBackToList}
                className="w-8 h-8 rounded-full border flex items-center justify-center transition-all"
                style={{ 
                  borderColor: `${primaryColor}cc`,
                  color: primaryColor,
                  boxShadow: `0 0 15px ${glowColor}`,
                  textShadow: `0 0 8px ${glowColor}`,
                  background: `${primaryColor}10`
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <h2 
              className="text-xl font-bold uppercase tracking-wider"
              style={{ 
                color: primaryColor,
                textShadow: `0 0 8px ${glowColor}`
              }}
            >
              📖 {selectedReflection ? 'Reflection Details' : 'Soul Journal'}
            </h2>
          </div>
          
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-all"
            style={{ 
              borderColor: `${primaryColor}cc`,
              color: primaryColor,
              boxShadow: `0 0 15px ${glowColor}`,
              textShadow: `0 0 8px ${glowColor}`,
              background: `${primaryColor}10`
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div 
                className="text-lg"
                style={{ 
                  color: primaryColor,
                  textShadow: `0 0 8px ${glowColor}`
                }}
              >
                Loading your reflections...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40">
              <div 
                className="text-red-400 text-center"
                style={{ textShadow: '0 0 8px rgba(248, 113, 113, 0.6)' }}
              >
                {error}
              </div>
            </div>
          ) : selectedReflection ? (
            /* Single reflection view */
            <div className="space-y-6 overflow-y-auto h-full pr-2" style={{ scrollbarWidth: 'thin' }}>
              {/* Date */}
              <div 
                className="text-sm opacity-80"
                style={{ color: primaryColor }}
              >
                {formatDate(selectedReflection.date)}
              </div>

              {/* Category badge */}
              <div>
                <span 
                  className="inline-block px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                  style={{
                    background: `${primaryColor}20`,
                    border: `1px solid ${primaryColor}60`,
                    color: primaryColor,
                    textShadow: `0 0 4px ${glowColor}`
                  }}
                >
                  {selectedReflection.category}
                </span>
              </div>

              {/* Question */}
              <div 
                className="text-lg font-medium mb-4"
                style={{ 
                  color: '#FFFFFF',
                  textShadow: '0 0 4px rgba(255,255,255,0.8)'
                }}
              >
                "{selectedReflection.question}"
              </div>

              {/* Response */}
              <div 
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: `1px solid ${primaryColor}30`,
                  boxShadow: `0 0 10px ${primaryColor}20`
                }}
              >
                <h4 
                  className="text-sm font-semibold mb-3 opacity-80"
                  style={{ color: primaryColor }}
                >
                  Your Reflection:
                </h4>
                <div 
                  className="text-white/90 leading-relaxed"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {selectedReflection.user_response}
                </div>
              </div>
            </div>
          ) : reflections.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div 
                className="text-6xl mb-4"
                style={{ 
                  filter: `drop-shadow(0 0 8px ${glowColor})`
                }}
              >
                🌟
              </div>
              <div 
                className="text-lg mb-2"
                style={{ 
                  color: primaryColor,
                  textShadow: `0 0 8px ${glowColor}`
                }}
              >
                Your soul journal awaits
              </div>
              <div className="text-white/60 text-sm">
                Complete daily reflections to see them here
              </div>
            </div>
          ) : (
            /* Reflections list */
            <div className="space-y-3 overflow-y-auto h-full pr-2" style={{ scrollbarWidth: 'thin' }}>
              {reflections.map((reflection) => {
                const catColors = categoryColors[reflection.category];
                return (
                  <div
                    key={reflection.id}
                    onClick={() => handleReflectionClick(reflection)}
                    className="p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: `${catColors.color}10`,
                      border: `1px solid ${catColors.color}30`,
                      boxShadow: `0 0 10px ${catColors.color}20`,
                      ':hover': {
                        border: `1px solid ${catColors.color}50`,
                        boxShadow: `0 0 15px ${catColors.glowColor}`
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = `1px solid ${catColors.color}50`;
                      e.currentTarget.style.boxShadow = `0 0 15px ${catColors.glowColor}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = `1px solid ${catColors.color}30`;
                      e.currentTarget.style.boxShadow = `0 0 10px ${catColors.color}20`;
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="px-2 py-1 text-xs rounded-full font-semibold uppercase"
                            style={{
                              background: `${catColors.color}20`,
                              color: catColors.color,
                              textShadow: `0 0 4px ${catColors.glowColor}`
                            }}
                          >
                            {reflection.category}
                          </span>
                          <span 
                            className="text-xs opacity-70"
                            style={{ color: catColors.color }}
                          >
                            {formatDate(reflection.date)}
                          </span>
                        </div>
                        <div 
                          className="text-white/90 text-sm mb-2 line-clamp-2"
                          style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          "{reflection.question}"
                        </div>
                        <div 
                          className="text-white/70 text-xs line-clamp-2"
                          style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {reflection.user_response}
                        </div>
                      </div>
                      <div 
                        className="text-xs opacity-50"
                        style={{ color: catColors.color }}
                      >
                        →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}