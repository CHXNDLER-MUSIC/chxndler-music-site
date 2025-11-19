"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";

type Props = {
  onBack: () => void;
  onOpenStore: () => void;
};

export default function QuestList({ onBack, onOpenStore }: Props) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");

  const handleElementTap = () => {
    try { sfx.play('click', 0.8); } catch {}
    // TODO: Award +1 HeartCoin and mark as completed for today
    console.log("Element tapped - award +1 HeartCoin");
  };

  const handleJournalOpen = () => {
    try { sfx.play('click', 0.8); } catch {}
    // TODO: Open journal popup and award +1 HeartCoin when completed
    console.log("Open journal for daily entry");
  };

  const handleInviteFriend = () => {
    try { sfx.play('click', 0.8); } catch {}
    const message = "I found a community of Aliens who accept you for who you are and lead with love. I thought of you. I think this world could feel like home for you too. https://www.chxndler-music.com/";
    
    if (navigator.share) {
      navigator.share({
        text: message,
      }).catch(console.error);
    } else {
      // Fallback for browsers without native sharing
      navigator.clipboard.writeText(message).then(() => {
        alert("Message copied to clipboard!");
      }).catch(() => {
        // Final fallback - show message in alert
        alert(message);
      });
    }
  };

  const handleCheckInSubmit = () => {
    try { sfx.play('click', 0.8); } catch {}
    // TODO: Verify secret phrase with backend
    if (secretPhrase.toLowerCase().trim()) {
      setCheckInMessage("Welcome to the show. You've checked in! You received +5 HEART COINS.");
      setSecretPhrase("");
      // TODO: Award +5 HeartCoins
    }
  };

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-4 text-cyan-400 hover:text-cyan-200 text-sm"
        style={{ textShadow: '0 0 4px rgba(0,255,255,0.6)' }}
      >
        ← Back to Heart Coins
      </button>

      {/* Daily Quests Section */}
      <div className="mb-6">
        <h3 
          className="text-lg font-bold mb-4 text-center"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)' 
          }}
        >
          ⭐ SECTION 1 — DAILY QUESTS
        </h3>

        {/* Quest 1: Tap Element of the Day */}
        <div 
          className="border border-cyan-400/40 rounded-lg p-4 mb-4"
          style={{ 
            background: 'rgba(0,255,255,0.05)',
            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">1. Tap the Element of the Day</h4>
              <p className="text-white/80 text-sm mb-2">Touch the glowing planet to receive one HeartCoin.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Today's Element Icon - using dreamer as example */}
              <button
                onClick={handleElementTap}
                className="w-12 h-12 border-2 border-pink-500/60 rounded-full overflow-hidden hover:border-pink-400 transition-all"
                style={{
                  background: 'rgba(252,84,175,0.1)',
                  boxShadow: '0 0 15px rgba(252,84,175,0.3)'
                }}
              >
                <img
                  src="/elements/dreamer.png"
                  alt="Today's Element"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
              <div 
                className="text-pink-400 font-bold text-sm"
                style={{ textShadow: '0 0 4px rgba(252,84,175,0.6)' }}
              >
                +1 HeartCoin
              </div>
            </div>
          </div>
        </div>

        {/* Quest 2: Journal Entry */}
        <div 
          className="border border-cyan-400/40 rounded-lg p-4"
          style={{ 
            background: 'rgba(0,255,255,0.05)',
            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">2. Journal Entry of the Day</h4>
              <p className="text-white/80 text-sm mb-2">Answer today's journal prompt to earn one HeartCoin.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleJournalOpen}
                className="px-4 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded text-sm transition-all duration-200"
                style={{
                  boxShadow: '0 0 10px rgba(252,84,175,0.3)',
                  textShadow: '0 0 4px rgba(252,84,175,0.6)'
                }}
              >
                OPEN JOURNAL
              </button>
              <div 
                className="text-pink-400 font-bold text-sm"
                style={{ textShadow: '0 0 4px rgba(252,84,175,0.6)' }}
              >
                +1 HeartCoin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus Quests Section */}
      <div>
        <h3 
          className="text-lg font-bold mb-4 text-center"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)' 
          }}
        >
          ⭐ SECTION 2 — BONUS QUESTS
        </h3>

        {/* Quest 1: Invite a Friend */}
        <div 
          className="border border-cyan-400/40 rounded-lg p-4 mb-4"
          style={{ 
            background: 'rgba(0,255,255,0.05)',
            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">1. Invite a Friend</h4>
              <p className="text-white/80 text-sm mb-2">Share the Heartverse with someone you love. When they join, you both earn HeartCoins.</p>
              <p className="text-white/60 text-xs">(1 MAX per day)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInviteFriend}
                className="px-4 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded text-sm transition-all duration-200"
                style={{
                  boxShadow: '0 0 10px rgba(252,84,175,0.3)',
                  textShadow: '0 0 4px rgba(252,84,175,0.6)'
                }}
              >
                INVITE A FRIEND
              </button>
              <div 
                className="text-pink-400 font-bold text-sm"
                style={{ textShadow: '0 0 4px rgba(252,84,175,0.6)' }}
              >
                +1 HeartCoin
              </div>
            </div>
          </div>
        </div>

        {/* Quest 2: Attend Live Show */}
        <div 
          className="border border-cyan-400/40 rounded-lg p-4"
          style={{ 
            background: 'rgba(0,255,255,0.05)',
            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">2. Attend a Live Show</h4>
                <p className="text-white/80 text-sm">Check in at a CHXNDLER show to receive bonus HeartCoins.</p>
              </div>
              {!showCheckIn && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCheckIn(true)}
                    className="px-4 py-2 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded text-sm transition-all duration-200"
                    style={{
                      boxShadow: '0 0 10px rgba(252,84,175,0.3)',
                      textShadow: '0 0 4px rgba(252,84,175,0.6)'
                    }}
                  >
                    CHECK IN
                  </button>
                  <div 
                    className="text-pink-400 font-bold text-sm"
                    style={{ textShadow: '0 0 4px rgba(252,84,175,0.6)' }}
                  >
                    +5 HeartCoins
                  </div>
                </div>
              )}
            </div>

            {showCheckIn && !checkInMessage && (
              <div className="space-y-3 pt-2">
                <div 
                  className="text-center text-white/90 text-sm"
                  style={{ textShadow: '0 0 4px rgba(255,255,255,0.6)' }}
                >
                  Enter the secret phrase:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secretPhrase}
                    onChange={(e) => setSecretPhrase(e.target.value)}
                    placeholder="Secret phrase..."
                    className="flex-1 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    onClick={handleCheckInSubmit}
                    className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 rounded text-sm transition-all duration-200"
                    style={{
                      boxShadow: '0 0 10px rgba(0,255,255,0.3)',
                      textShadow: '0 0 4px rgba(0,255,255,0.6)'
                    }}
                  >
                    SUBMIT
                  </button>
                </div>
              </div>
            )}

            {checkInMessage && (
              <div 
                className="text-center p-3 rounded-lg"
                style={{ 
                  background: 'rgba(0,255,0,0.1)',
                  border: '1px solid rgba(0,255,0,0.3)',
                  color: '#00FF00',
                  textShadow: '0 0 4px rgba(0,255,0,0.6)'
                }}
              >
                {checkInMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}