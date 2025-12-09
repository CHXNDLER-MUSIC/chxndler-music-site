"use client";

import { useState, useEffect } from 'react';
import { useSongVoting } from '@/hooks/useSongVoting';
import { useProfile } from '@/contexts/ProfileContext';
import { SongPollOption } from '@/lib/songVoting';

interface ElementDisplayInfo {
  color: string;
  icon: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
}

const ELEMENT_DISPLAY: Record<string, ElementDisplayInfo> = {
  HEART: {
    color: 'text-pink-400',
    icon: '💖',
    bgGradient: 'from-pink-500/20 to-red-500/20',
    borderColor: 'border-pink-400/50',
    glowColor: 'shadow-pink-400/30'
  },
  WATER: {
    color: 'text-cyan-400', 
    icon: '🌊',
    bgGradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-400/50',
    glowColor: 'shadow-cyan-400/30'
  },
  LIGHTNING: {
    color: 'text-yellow-400',
    icon: '⚡',
    bgGradient: 'from-yellow-500/20 to-orange-500/20', 
    borderColor: 'border-yellow-400/50',
    glowColor: 'shadow-yellow-400/30'
  },
  DARKNESS: {
    color: 'text-purple-400',
    icon: '🌑',
    bgGradient: 'from-purple-500/20 to-indigo-500/20',
    borderColor: 'border-purple-400/50', 
    glowColor: 'shadow-purple-400/30'
  }
};

function VotingCard({ 
  option, 
  isWinning, 
  onVote, 
  userBalance,
  isVoting 
}: {
  option: SongPollOption;
  isWinning: boolean;
  onVote: (optionId: string, amount: number) => void;
  userBalance: number;
  isVoting: boolean;
}) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  const elementInfo = ELEMENT_DISPLAY[option.element] || ELEMENT_DISPLAY.HEART;

  return (
    <div 
      className={`
        rounded-lg border p-4 transition-all duration-300 backdrop-blur-sm
        ${elementInfo.borderColor}
        ${isWinning ? `bg-gradient-to-br ${elementInfo.bgGradient} shadow-2xl ${elementInfo.glowColor} scale-105 animate-pulse` : `bg-gradient-to-br from-black/20 to-black/30`}
      `}
      style={{
        boxShadow: isWinning 
          ? `0 0 30px ${elementInfo.glowColor.replace('shadow-', '').replace('/30', '')}, 0 0 60px ${elementInfo.glowColor.replace('shadow-', '').replace('/30', '')}40`
          : '0 0 10px rgba(0,0,0,0.5)'
      }}
    >
      {/* Song title */}
      <div className="text-center mb-3">
        <h4 
          className="text-sm font-bold mb-1 truncate"
          style={{
            color: isWinning ? '#F2EF1D' : '#FFFFFF',
            textShadow: isWinning ? '0 0 10px #F2EF1D' : '0 0 5px rgba(255,255,255,0.5)'
          }}
        >
          {option.song_title}
        </h4>
        
        {/* Element chip */}
        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border ${elementInfo.borderColor} bg-black/30`}>
          <span className="text-sm">{elementInfo.icon}</span>
          <span className={`text-xs font-semibold ${elementInfo.color}`}>
            {option.element}
          </span>
        </div>
      </div>

      {/* Current total HeartCoins */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-1">
          <img 
            src="/elements/heart-coin.webp" 
            alt="HeartCoins" 
            className="w-5 h-5"
          />
          <span className={`text-lg font-bold ${isWinning ? 'text-yellow-300' : 'text-pink-400'}`}>
            {option.total_heartcoins}
          </span>
        </div>
        <p className="text-xs text-white/60 mt-1">HeartCoins</p>
      </div>

      {/* Voting controls */}
      <div className="space-y-2">
        {/* Amount selector */}
        <div className="flex items-center justify-center space-x-2">
          <label htmlFor={`amount-${option.id}`} className="text-xs text-white/80">
            Vote:
          </label>
          <select 
            id={`amount-${option.id}`}
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            disabled={isVoting}
            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:border-white/40 focus:outline-none disabled:opacity-50"
          >
            {[1, 5, 10, 25, 50].map(amount => (
              <option key={amount} value={amount} disabled={amount > userBalance}>
                {amount} HC{amount > userBalance ? ' (not enough)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Vote button */}
        <button
          onClick={() => onVote(option.id, selectedAmount)}
          disabled={isVoting || selectedAmount > userBalance || selectedAmount <= 0}
          className={`
            w-full py-2 px-3 rounded text-sm font-bold transition-all duration-200 
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isVoting ? 'cursor-wait' : 'hover:scale-105'}
            bg-gradient-to-r ${elementInfo.bgGradient} 
            border ${elementInfo.borderColor}
            ${elementInfo.color}
          `}
          style={{
            textShadow: '0 0 8px rgba(255,255,255,0.6)',
            boxShadow: isVoting ? 'none' : `0 0 15px ${elementInfo.glowColor.replace('shadow-', '').replace('/30', '')}60`
          }}
        >
          {isVoting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Voting...</span>
            </div>
          ) : (
            `VOTE ${selectedAmount} HC`
          )}
        </button>
      </div>
    </div>
  );
}

export default function VotingPanel() {
  const { activePoll, isLoading, error, castVote, isVoting } = useSongVoting();
  const { profile } = useProfile();
  
  const userBalance = profile?.heartcoin_balance || 0;

  // Find the winning option (highest total_heartcoins)
  const winningOption = activePoll?.options?.reduce((prev, current) => 
    (current.total_heartcoins > prev.total_heartcoins) ? current : prev
  ) || null;

  // Handle vote casting with error handling
  const handleVote = async (optionId: string, amount: number) => {
    try {
      await castVote(optionId, amount);
      // Success handled by the hook (toast, etc.)
    } catch (error) {
      // Error handled by the hook (toast, etc.)
      console.error('Vote failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div 
          className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mb-4"
          style={{
            boxShadow: '0 0 15px rgba(242, 239, 29, 0.3)'
          }}
        />
        <p 
          className="text-sm font-medium"
          style={{
            color: '#F2EF1D',
            textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
          }}
        >
          Loading voting...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-red-400 text-sm font-medium mb-2">
          {error}
        </p>
        <p className="text-white/60 text-xs">
          Please try again later
        </p>
      </div>
    );
  }

  if (!activePoll) {
    return (
      <div className="p-6 text-center">
        <div className="mb-4">
          <span className="text-4xl">🗳️</span>
        </div>
        <p 
          className="text-lg font-bold mb-2"
          style={{
            color: '#F2EF1D',
            textShadow: '0 0 8px rgba(242, 239, 29, 0.6)'
          }}
        >
          No Active Vote
        </p>
        <p className="text-white/60 text-sm">
          Check back soon for the next song voting session!
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 
          className="text-lg font-bold mb-2"
          style={{
            color: '#F2EF1D',
            textShadow: '0 0 10px #F2EF1D, 0 0 20px #F2EF1D'
          }}
        >
          🗳️ VOTE FOR NEXT SONG
        </h3>
        <p className="text-xs text-white/70">
          Spend HeartCoins to vote which song I'll play next!
        </p>
        
        {/* User balance display */}
        <div className="flex items-center justify-center space-x-2 mt-3 px-3 py-2 bg-black/30 rounded-lg border border-pink-400/30">
          <span className="text-sm text-white/80">Your balance:</span>
          <img src="/elements/heart-coin.webp" alt="HeartCoins" className="w-5 h-5" />
          <span className="text-lg font-bold text-pink-400">{userBalance}</span>
          <span className="text-sm text-white/60">HC</span>
        </div>
      </div>

      {/* Voting cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {activePoll.options.map((option) => (
          <VotingCard
            key={option.id}
            option={option}
            isWinning={winningOption?.id === option.id && winningOption.total_heartcoins > 0}
            onVote={handleVote}
            userBalance={userBalance}
            isVoting={isVoting}
          />
        ))}
      </div>

      {/* Poll info */}
      <div className="text-center pt-4 border-t border-white/10">
        <p className="text-xs text-white/50">
          Poll: {activePoll.title}
        </p>
        {activePoll.closes_at && (
          <p className="text-xs text-white/50 mt-1">
            Ends: {new Date(activePoll.closes_at).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}