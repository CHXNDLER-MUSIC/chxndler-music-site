"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  onHoverSound?: () => void;
  onCloseBlueDisplay?: () => void;
  onOpenBlueDisplay?: () => void;
};

export default function HeartCoinButton({ asChild = false, children, onClick, onHoverSound, onCloseBlueDisplay, onOpenBlueDisplay, ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [heartCoins, setHeartCoins] = useState(0);
  const [dailyQuests, setDailyQuests] = useState({
    elementTapped: false,
    journalEntry: false,
    friendInvited: false,
    checkedIn: false
  });
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [showSkyModal, setShowSkyModal] = useState(false);

  // Get today's element (rotate daily)
  const getTodaysElement = () => {
    const elements = ['heart', 'lightning', 'water', 'darkness'];
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return elements[dayOfYear % elements.length];
  };

  const todaysElement = getTodaysElement();

  const getElementIcon = (element: string) => {
    return `/elements/${element}.png`;
  };

  const handleElementTap = () => {
    if (!dailyQuests.elementTapped) {
      try { sfx.play('click', 0.8); } catch {}
      setHeartCoins(prev => prev + 1);
      setDailyQuests(prev => ({ ...prev, elementTapped: true }));
    }
  };

  const handleJournalEntry = () => {
    if (!dailyQuests.journalEntry) {
      try { sfx.play('click', 0.8); } catch {}
      // Open the sky modal instead of awarding coins immediately
      setShowSkyModal(true);
    }
  };

  const handleSkyModalClose = () => {
    setShowSkyModal(false);
    // Award the coin and mark as complete when they finish the sky experience
    if (!dailyQuests.journalEntry) {
      setHeartCoins(prev => prev + 1);
      setDailyQuests(prev => ({ ...prev, journalEntry: true }));
    }
  };

  const handleInviteFriend = () => {
    if (!dailyQuests.friendInvited) {
      try { sfx.play('click', 0.8); } catch {}
      
      if (navigator.share) {
        navigator.share({
          title: 'Join the Heartverse',
          text: 'I thought of you. I think this world could feel like home for you too.',
          url: 'https://chxndler.world'
        }).then(() => {
          setHeartCoins(prev => prev + 1);
          setDailyQuests(prev => ({ ...prev, friendInvited: true }));
        }).catch(console.error);
      } else {
        // Fallback for browsers that don't support Web Share API
        const text = "I thought of you. I think this world could feel like home for you too. https://chxndler.world";
        navigator.clipboard.writeText(text).then(() => {
          setHeartCoins(prev => prev + 1);
          setDailyQuests(prev => ({ ...prev, friendInvited: true }));
          alert("Invite message copied to clipboard!");
        }).catch(() => {
          // Manual fallback
          prompt("Copy this message to share:", text);
          setHeartCoins(prev => prev + 1);
          setDailyQuests(prev => ({ ...prev, friendInvited: true }));
        });
      }
    }
  };

  const handleCheckIn = () => {
    if (secretPhrase.toLowerCase().trim() === "heartverse") {
      try { sfx.play('click', 0.8); } catch {}
      setHeartCoins(prev => prev + 5);
      setDailyQuests(prev => ({ ...prev, checkedIn: true }));
      setCheckInMessage("Welcome to the show. You've checked in!");
      setShowCheckInSuccess(true);
      setShowCheckInModal(false);
      setSecretPhrase("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setShowCheckInSuccess(false), 3000);
    } else {
      setCheckInMessage("Incorrect phrase. Try again!");
    }
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    try { onClick?.(e); } catch {}
    if (!e.defaultPrevented) {
      e.preventDefault();
      try { sfx.play('click', 0.8); } catch {}
      try { onCloseBlueDisplay?.(); } catch {}
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick} 
        onMouseEnter={onHoverSound}
        className="p-1 rounded-lg transition-all duration-200 w-14 h-12"
        style={{
          transition: 'all 0.3s ease',
          ...rest.style
        }}
        onMouseEnter={(e) => {
          if (onHoverSound) onHoverSound();
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        {...rest}
      >
        <img
          src="/elements/heart-coin.png"
          alt="Heart Coins"
          className="w-full h-full object-cover rounded"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(255, 105, 180, 0.8)) drop-shadow(0 0 16px rgba(255, 105, 180, 0.4))'
          }}
          draggable={false}
        />
      </button>
      
      {/* Hologram base glow */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          style={{
            pointerEvents: 'none',
            paddingTop: '250px'
          }}
        >
          <div
            style={{
              width: 'min(120vw, 700px)',
              height: '200px',
              background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.1) 60%, transparent 100%)',
              filter: 'blur(100px)'
            }}
          />
        </div>
      )}
      
      {/* Heart Coins Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            paddingTop: '240px'
          }}
        >
          <div
            className="heartcoin-hologram-container"
            style={{
              width: 'min(85vw, 500px)',
              height: '50vh',
              padding: '10px 14px 14px 14px',
              borderRadius: 18,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,105,180,0.55)',
              boxShadow: '0 -8px 25px rgba(255,105,180,0.4), 0 -4px 15px rgba(255,105,180,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,105,180,0.45)',
              backdropFilter: 'blur(12px) saturate(140%)',
              color: '#FF69B4',
              position: 'relative',
              overflow: 'auto'
            }}
        >
          {/* Soft bottom glow */}
          <div 
            className="absolute"
            style={{
              bottom: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '30px',
              background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,105,180,0.6) 0%, rgba(255,105,180,0.3) 40%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
          
          {/* Top bloom glow */}
          <div 
            className="absolute"
            style={{
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80%',
              height: '20px',
              background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(255,105,180,0.4) 0%, rgba(255,105,180,0.2) 50%, transparent 100%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: -1
            }}
          />

          {/* Close button */}
          <button
            onClick={() => {
              try { sfx.play('close', 0.8); } catch {}
              setOpen(false);
              try { onOpenBlueDisplay?.(); } catch {}
            }}
            className="absolute top-2 right-4 text-pink-400 hover:text-pink-200 cursor-pointer w-8 h-8 rounded-full border border-pink-400/80 flex items-center justify-center"
            style={{ 
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(255,105,180,0.8), 0 0 25px rgba(255,105,180,0.5), 0 0 35px rgba(255,105,180,0.3)',
              textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 15px rgba(255,105,180,0.6)',
              background: 'rgba(255,105,180,0.1)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Header */}
          <div className="text-center mb-3 mt-8">
            <div 
              className="text-lg font-bold mb-2"
              style={{ 
                color: '#FF69B4', 
                textShadow: '0 0 8px rgba(255,105,180,0.6)', 
                fontSize: '16px'
              }}
            >
              HEART COINS
            </div>
            
            {/* Thin pink neon line */}
            <div 
              className="w-full h-px mb-4"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,105,180,0.8) 20%, rgba(255,105,180,1) 50%, rgba(255,105,180,0.8) 80%, transparent)',
                boxShadow: '0 0 4px rgba(255,105,180,0.6)'
              }}
            />
            
            <div className="flex items-center justify-between mb-3">
              {/* Heart Coin Balance - Left Side */}
              <div className="flex items-center space-x-3">
                <img
                  src="/elements/heart-coin.png"
                  alt="Heart Coin"
                  className="w-10 h-10"
                />
                <div>
                  <div 
                    className="text-xs"
                    style={{ 
                      color: '#FFB6C1', 
                      textShadow: '0 0 4px rgba(255,182,193,0.6)' 
                    }}
                  >
                    Balance
                  </div>
                  <div 
                    className="text-xl font-bold"
                    style={{ 
                      color: '#FFFFFF', 
                      textShadow: '0 0 8px rgba(255,255,255,0.8)' 
                    }}
                  >
                    {heartCoins}
                  </div>
                </div>
              </div>
              
              {/* Description Text - Right Side */}
              <div 
                className="text-base text-right flex-1 ml-4"
                style={{ 
                  color: '#FFB6C1', 
                  textShadow: '0 0 4px rgba(255,182,193,0.8)', 
                  fontSize: '14px',
                  lineHeight: 1.3
                }}
              >
                Heart coins are the energy of the Heartverse. You earn them by exploring, connecting and showing up.
              </div>
            </div>
          </div>

          {/* Section 1 - Daily Quests */}
          <div className="mb-4">
            <div 
              className="text-sm font-bold mb-2"
              style={{ 
                color: '#FFD700', 
                textShadow: '0 0 4px rgba(255,215,0,0.8)' 
              }}
            >
              ⭐ SECTION 1 — DAILY QUESTS
            </div>
            
            {/* Element of the Day */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  1. Tap the Element of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Touch the glowing planet to receive one HeartCoin.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleElementTap}
                  disabled={dailyQuests.elementTapped}
                  className="flex items-center space-x-1"
                >
                  <img 
                    src={getElementIcon(todaysElement)} 
                    alt={`${todaysElement} element`}
                    className="w-8 h-8"
                    style={{
                      filter: dailyQuests.elementTapped ? 'grayscale(1)' : 'drop-shadow(0 0 8px rgba(255,215,0,0.8))'
                    }}
                  />
                </button>
                <span className="text-xs" style={{ color: dailyQuests.elementTapped ? '#666' : '#90EE90' }}>
                  {dailyQuests.elementTapped ? '✓ +1' : '+1 HeartCoin'}
                </span>
              </div>
            </div>

            {/* Journal Entry */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  2. Journal Entry of the Day
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Answer today's journal prompt to earn one HeartCoin.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleJournalEntry}
                  disabled={dailyQuests.journalEntry}
                  className="px-2 py-1 text-xs rounded border border-pink-400/60 hover:border-pink-400/80 transition-colors"
                  style={{
                    background: dailyQuests.journalEntry ? 'rgba(100,100,100,0.3)' : 'rgba(255,105,180,0.1)',
                    color: dailyQuests.journalEntry ? '#666' : '#FFB6C1',
                  }}
                >
                  {dailyQuests.journalEntry ? 'COMPLETED' : 'OPEN JOURNAL'}
                </button>
                <span className="text-xs" style={{ color: dailyQuests.journalEntry ? '#666' : '#90EE90' }}>
                  {dailyQuests.journalEntry ? '✓ +1' : '+1 HeartCoin'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 - Bonus Quests */}
          <div className="mb-4">
            <div 
              className="text-sm font-bold mb-2"
              style={{ 
                color: '#FFD700', 
                textShadow: '0 0 4px rgba(255,215,0,0.8)' 
              }}
            >
              ⭐ SECTION 2 — BONUS QUESTS
            </div>
            
            {/* Invite a Friend */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  1. Invite a Friend
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Share the Heartverse with someone you love. When they join, you both earn HeartCoins.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInviteFriend}
                  disabled={dailyQuests.friendInvited}
                  className="px-2 py-1 text-xs rounded border border-pink-400/60 hover:border-pink-400/80 transition-colors"
                  style={{
                    background: dailyQuests.friendInvited ? 'rgba(100,100,100,0.3)' : 'rgba(255,105,180,0.1)',
                    color: dailyQuests.friendInvited ? '#666' : '#FFB6C1',
                  }}
                >
                  {dailyQuests.friendInvited ? 'INVITED TODAY' : 'INVITE A FRIEND'}
                </button>
                <span className="text-xs" style={{ color: '#90EE90' }}>
                  (1 MAX per day)
                </span>
              </div>
            </div>

            {/* Attend Live Show */}
            <div className="flex items-center justify-between mb-2 p-2 rounded border border-pink-400/30 bg-pink-400/10 relative">
              <div>
                <div className="text-xs font-bold" style={{ color: '#FFB6C1' }}>
                  2. Attend a Live Show
                </div>
                <div className="text-[10px]" style={{ color: '#FFB6C1', opacity: 0.8 }}>
                  Check in at a CHXNDLER show to receive bonus HeartCoins.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCheckInModal(true)}
                  disabled={dailyQuests.checkedIn}
                  className="px-2 py-1 text-xs rounded border border-pink-400/60 hover:border-pink-400/80 transition-colors"
                  style={{
                    background: dailyQuests.checkedIn ? 'rgba(100,100,100,0.3)' : 'rgba(255,105,180,0.1)',
                    color: dailyQuests.checkedIn ? '#666' : '#FFB6C1',
                  }}
                >
                  {dailyQuests.checkedIn ? 'CHECKED IN' : 'CHECK IN'}
                </button>
                <span className="text-xs" style={{ color: dailyQuests.checkedIn ? '#666' : '#90EE90' }}>
                  {dailyQuests.checkedIn ? '✓ +5' : '+5 HeartCoins'}
                </span>
              </div>

              {/* Inline Check-in Modal */}
              {showCheckInModal && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 z-10"
                  style={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,105,180,0.6)',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 0 25px rgba(255,105,180,0.4)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="text-center mb-3">
                    <div 
                      className="text-sm font-bold mb-2"
                      style={{ 
                        color: '#FF69B4', 
                        textShadow: '0 0 8px rgba(255,105,180,0.6)' 
                      }}
                    >
                      Secret Phrase
                    </div>
                    <div 
                      className="text-xs mb-3"
                      style={{ color: '#FFB6C1' }}
                    >
                      Enter the secret phrase from the show:
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={secretPhrase}
                    onChange={(e) => setSecretPhrase(e.target.value)}
                    className="w-full p-2 mb-3 bg-black/60 border border-pink-400/40 rounded text-white text-sm"
                    placeholder="Enter secret phrase..."
                    style={{
                      boxShadow: '0 0 10px rgba(255,105,180,0.3)'
                    }}
                  />
                  
                  {checkInMessage && (
                    <div 
                      className="text-center text-xs mb-3"
                      style={{ 
                        color: checkInMessage.includes('Welcome') ? '#90EE90' : '#FF6B6B' 
                      }}
                    >
                      {checkInMessage}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCheckIn}
                      className="flex-1 py-1.5 px-3 bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 rounded transition-colors text-xs"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setShowCheckInModal(false);
                        setSecretPhrase("");
                        setCheckInMessage("");
                      }}
                      className="flex-1 py-1.5 px-3 bg-gray-600/30 hover:bg-gray-600/40 border border-gray-500/50 text-gray-300 rounded transition-colors text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Success message */}
          {showCheckInSuccess && (
            <div 
              className="text-center py-2 mb-2 rounded border border-green-400/60"
              style={{
                background: 'rgba(0,255,0,0.1)',
                color: '#90EE90',
                textShadow: '0 0 4px rgba(144,238,144,0.8)'
              }}
            >
              {checkInMessage}
              <br />
              <span className="text-sm font-bold">You received +5 HEART COINS</span>
            </div>
          )}
          
          </div>
        </div>
      )}


      {/* Sky Modal (Journal Entry Experience) */}
      {showSkyModal && (
        <div className="warp-overlay">
          <div className="warp-background" />
          <div className="modal-container">
            <div className="question-modal">
              <button 
                className="close-button"
                onClick={handleSkyModalClose}
                aria-label="Close"
              >
                ×
              </button>
              <div className="solsky-header">
                <div className="daily-intention">Today's intention: Find peace in the present moment</div>
                <h1>SolSky</h1>
                <h2>DAILY REFLECTION</h2>
              </div>
              <div className="cosmic-vision-section">
                <label className="cosmic-vision-label">Share your cosmic vision</label>
                <textarea
                  placeholder="Share your cosmic vision..."
                  className="response-area"
                />
              </div>
              <button 
                onClick={handleSkyModalClose}
                className="send-button"
              >
                Send
              </button>
            </div>
          </div>

          <style jsx>{`
            .warp-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .warp-background {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: #000;
              animation: warpToBlack 1s ease-out forwards;
            }
            
            .modal-container {
              position: relative;
              z-index: 10000;
              max-width: 90vw;
              width: 100%;
              max-width: 500px;
              padding: 2rem;
            }
            
            .question-modal {
              background: rgba(0, 0, 0, 0.9);
              border: 2px solid #FFD700;
              border-radius: 1rem;
              padding: 2rem;
              text-align: center;
              box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
              animation: modalFadeIn 1s ease-out 1s both;
              position: relative;
            }
            
            .close-button {
              position: absolute;
              top: 1rem;
              right: 1rem;
              background: transparent;
              border: none;
              color: #FFFF00;
              font-size: 2rem;
              cursor: pointer;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              transition: all 0.2s ease;
              text-shadow: 
                0 0 10px #FFFF00,
                0 0 20px #FFFF00,
                0 0 30px #FFFF00;
              z-index: 10;
            }
            
            .close-button:hover {
              transform: scale(1.1);
              text-shadow: 
                0 0 15px #FFFF00,
                0 0 25px #FFFF00,
                0 0 35px #FFFF00,
                0 0 45px #FFFF00;
            }
            
            .solsky-header {
              margin-bottom: 2rem;
            }
            
            .daily-intention {
              color: #FFFF00;
              font-size: clamp(0.9rem, 3vw, 1.1rem);
              margin-bottom: 1rem;
              text-align: center;
              font-style: italic;
              text-shadow: 0 0 8px #FFFF00;
              letter-spacing: 0.02em;
            }
            
            .solsky-header h1 {
              color: #FFFF00;
              font-size: clamp(1.8rem, 6vw, 2.5rem);
              margin: 0 0 1rem 0;
              text-shadow: 0 0 15px #FFFF00;
              font-weight: bold;
              letter-spacing: 0.1em;
            }
            
            .question-modal h2 {
              color: #FFFF00;
              font-size: clamp(1.3rem, 4vw, 1.6rem);
              margin-bottom: 1.5rem;
              text-shadow: 0 0 10px #FFFF00;
            }
            
            .cosmic-vision-section {
              margin-bottom: 1.5rem;
            }
            
            .cosmic-vision-label {
              display: block;
              color: #FFFF00;
              font-size: 1rem;
              margin-bottom: 0.5rem;
              text-align: left;
              font-weight: 500;
            }
            
            .response-area {
              width: 100%;
              min-height: 20px;
              height: 20px;
              max-height: 40px;
              background: rgba(0, 0, 0, 0.8);
              border: 1px solid #FFFF00;
              border-radius: 0.5rem;
              color: #FFFF00;
              padding: 0.5rem;
              font-size: 0.9rem;
              resize: vertical;
              font-family: inherit;
            }
            
            .response-area::placeholder {
              color: rgba(255, 255, 0, 0.6);
            }
            
            .response-area:focus {
              outline: none;
              box-shadow: 0 0 15px rgba(255, 255, 0, 0.5);
              border-color: #FFFF00;
            }
            
            .send-button {
              background: linear-gradient(135deg, #FFD700, #FFA500);
              border: none;
              color: #000;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            }
            
            .send-button:hover {
              transform: scale(1.05);
              box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
            }
            
            @keyframes warpToBlack {
              0% {
                background: radial-gradient(circle at center, transparent 0%, transparent 40%, #000 100%);
              }
              100% {
                background: #000;
              }
            }
            
            @keyframes modalFadeIn {
              0% {
                opacity: 0;
                transform: scale(0.8);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}

    </>
  );
}