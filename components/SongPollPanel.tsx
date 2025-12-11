"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PollResults, VoteRequest, VoteResponse, ElementType } from "@/types/poll";

interface SongPollPanelProps {
  className?: string;
}

const ELEMENT_COLORS = {
  HEART: "from-red-500 to-pink-500",
  WATER: "from-blue-500 to-cyan-500", 
  LIGHTNING: "from-yellow-500 to-orange-500",
  DARKNESS: "from-purple-500 to-indigo-500"
};

const ELEMENT_LABELS = {
  HEART: "♥ Heart",
  WATER: "🌊 Water",
  LIGHTNING: "⚡ Lightning", 
  DARKNESS: "🌙 Darkness"
};

export default function SongPollPanel({ className = "" }: SongPollPanelProps) {
  const [pollData, setPollData] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<{songId: string, element: ElementType} | null>(null);

  const fetchPollResults = async () => {
    try {
      const response = await fetch('/api/song-poll/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPollData(data);
        if (data.userVote) {
          setUserVote(data.userVote);
        }
      } else {
        setError(data.error || 'Failed to load poll');
      }
    } catch (err: any) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollResults();
  }, []);

  const handleVote = async (element: ElementType) => {
    if (!pollData || voting || userVote) return;
    
    setVoting(true);
    setError(null);
    
    const songId = pollData.options[element.toLowerCase() as keyof typeof pollData.options].songId;
    
    const voteRequest: VoteRequest = {
      pollId: pollData.pollId,
      songId,
      element
    };
    
    try {
      const response = await fetch('/api/song-poll/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(voteRequest)
      });
      
      const result: VoteResponse = await response.json();
      
      if (result.success && result.results) {
        setPollData(result.results);
        setUserVote({ songId, element });
        setError(null);
      } else {
        switch (result.error) {
          case 'ALREADY_VOTED':
            setError('You already voted in this poll.');
            break;
          case 'INSUFFICIENT_HEARTCOINS':
            setError('You need 1 HeartCoin to vote.');
            break;
          case 'INVALID_POLL':
            setError('This poll is no longer active.');
            break;
          case 'INVALID_SONG':
            setError('Invalid song selection.');
            break;
          default:
            setError('Failed to submit vote. Please try again.');
        }
      }
    } catch (err: any) {
      setError('Failed to connect to server');
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-black/20 backdrop-blur-md rounded-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !pollData) {
    return (
      <div className={`bg-black/20 backdrop-blur-md rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Poll Unavailable</h3>
          <p className="text-white/70">{error}</p>
          <button
            onClick={fetchPollResults}
            className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!pollData) return null;

  const totalVotes = pollData.totalVotes;

  return (
    <div className={`bg-black/20 backdrop-blur-md rounded-xl p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Weekly Song Poll</h3>
        <p className="text-white/70 text-sm">
          Choose your element • {totalVotes} votes • Costs 1 HeartCoin
        </p>
        {userVote && (
          <p className="text-green-400 text-sm mt-1">
            ✓ You voted for {ELEMENT_LABELS[userVote.element]}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(pollData.options).map(([elementKey, option]) => {
          const element = elementKey.toUpperCase() as ElementType;
          const votePercentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isUserChoice = userVote?.element === element;
          const disabled = voting || !!userVote;

          return (
            <motion.button
              key={element}
              onClick={() => handleVote(element)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.02 } : undefined}
              whileTap={!disabled ? { scale: 0.98 } : undefined}
              className={`
                relative overflow-hidden rounded-lg p-4 
                ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-lg'}
                ${isUserChoice ? 'ring-2 ring-white/50' : ''}
                bg-gradient-to-r ${ELEMENT_COLORS[element]}
                transition-all duration-200
              `}
            >
              {/* Vote percentage background */}
              <div
                className="absolute inset-0 bg-white/20"
                style={{ width: `${votePercentage}%` }}
              />
              
              <div className="relative z-10 flex items-center justify-between text-white">
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {ELEMENT_LABELS[element]}
                  </div>
                  {option.title && (
                    <div className="text-xs opacity-90 mt-1">
                      {option.title}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {option.votes}
                  </div>
                  <div className="text-xs opacity-90">
                    {votePercentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              {isUserChoice && (
                <div className="absolute top-2 right-2 text-white">
                  ✓
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {voting && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-white/70">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
            <span className="text-sm">Submitting vote...</span>
          </div>
        </div>
      )}
    </div>
  );
}