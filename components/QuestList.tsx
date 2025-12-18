"use client";

import { useState, useEffect } from "react";
import { sfx } from "@/lib/sfx";
import SoulStareModal from "./SoulStareModal";
import SoulStarJournal from "./SoulStarJournal";
import { hasAnsweredToday, getTodaysQuestion } from "@/lib/dailyQuestions";
import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useProfile } from "@/contexts/ProfileContext";
import { triggerHeartCoinCelebration } from "@/utils/heartcoinCelebration";
import { getBonusQuestsForUser } from "@/lib/bonusQuests";
import LoginModal from "@/components/LoginModal";

type Props = {
  onBack: () => void;
  onOpenStore: () => void;
  onOpenBlueDisplay?: () => void;
  onCloseHeartCoinPopup?: () => void;
};

type QuestStatus = {
  elementOfDay: boolean;
  journalEntry: boolean;
  inviteFriend: boolean;
  inviteFriendConfirm: boolean;
  liveShow: boolean;
};

// Load quest status from localStorage on mount
function useQuestStatus() {
  const [questStatus, setQuestStatus] = useState<QuestStatus>({
    elementOfDay: false,
    journalEntry: false,
    inviteFriend: false,
    inviteFriendConfirm: false,
    liveShow: false
  });
  const [todaysElement, setTodaysElement] = useState({ name: "dreamer", color: "pink" });
  const [todaysQuestion, setTodaysQuestion] = useState(getTodaysQuestion());
  
  useEffect(() => {
    const today = new Date().toDateString();
    const elementDone = localStorage.getItem(`quest_element_${today}`) === 'true';
    const journalDone = localStorage.getItem(`quest_journal_${today}`) === 'true' || hasAnsweredToday();
    const inviteDone = localStorage.getItem(`quest_invite_${today}`) === 'true';
    const inviteConfirmDone = localStorage.getItem(`quest_invite_confirm_${today}`) === 'true';
    const liveshowDone = localStorage.getItem(`quest_liveshow_${today}`) === 'true';
    
    setQuestStatus({
      elementOfDay: elementDone,
      journalEntry: journalDone,
      inviteFriend: inviteDone,
      inviteFriendConfirm: inviteConfirmDone,
      liveShow: liveshowDone
    });
    
    // Determine today's element (simple rotation based on day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const elements = [
      { name: "dreamer", color: "pink" },
      { name: "lover", color: "red" },
      { name: "wanderer", color: "blue" },
      { name: "binder", color: "green" },
      { name: "star", color: "yellow" },
      { name: "heart", color: "pink" },
      { name: "water", color: "blue" },
      { name: "lightning", color: "purple" },
      { name: "darkness", color: "gray" },
      { name: "power", color: "orange" }
    ];
    setTodaysElement(elements[dayOfYear % elements.length]);
  }, []);
  
  return { questStatus, setQuestStatus, todaysElement, todaysQuestion };
}

export default function QuestList({ onBack, onOpenStore, onOpenBlueDisplay, onCloseHeartCoinPopup }: Props) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSoulStare, setShowSoulStare] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [bonusQuests, setBonusQuests] = useState<any[]>([]);
  const [bonusQuestsLoading, setBonusQuestsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { questStatus, setQuestStatus, todaysElement, todaysQuestion } = useQuestStatus();
  const { refreshProfile } = useProfile();

  // Load bonus quests from server
  const loadBonusQuests = async (userId: string | null) => {
    try {
      setBonusQuestsLoading(true);
      const serverQuests = await getBonusQuestsForUser(userId);
      setBonusQuests(serverQuests);
      
      // Also sync the localStorage state for backwards compatibility
      const inviteFriendQuest = serverQuests.find(q => q.quest_key === 'INVITE_FRIEND');
      
      if (inviteFriendQuest) {
        const today = new Date().toDateString();
        const isCompletedToday = inviteFriendQuest.completed_today > 0;
        
        // Update localStorage to match server state
        localStorage.setItem(`quest_invite_confirm_${today}`, isCompletedToday.toString());
        
        // Update state
        setQuestStatus(prev => ({ 
          ...prev, 
          inviteFriendConfirm: isCompletedToday,
          // If confirmed today, also set inviteFriend to true
          inviteFriend: isCompletedToday ? true : prev.inviteFriend
        }));
      }
    } catch (error) {
      console.error('Failed to load bonus quests:', error);
    } finally {
      setBonusQuestsLoading(false);
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const isAuth = !!session?.user;
        setIsAuthenticated(isAuth);
        
        // Load bonus quests if authenticated
        if (isAuth && session?.user?.id) {
          await loadBonusQuests(session.user.id);
        } else {
          // Still load quests for display, but user won't be able to complete them
          await loadBonusQuests(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        const isAuth = !!session?.user;
        setIsAuthenticated(isAuth);
        
        // Close login modal if user successfully logs in
        if (isAuth && showLoginModal) {
          setShowLoginModal(false);
        }
        
        // Load bonus quests when user logs in
        if (isAuth && session?.user?.id) {
          await loadBonusQuests(session.user.id);
        } else {
          // Load public quests when user logs out
          await loadBonusQuests(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [showLoginModal]);

  // Helper functions to get quest data from server
  const getElementalSongQuest = () => bonusQuests.find(q => q.quest_key === 'LISTEN_ELEMENT_SONG');
  const getInviteFriendQuest = () => bonusQuests.find(q => q.quest_key === 'INVITE_FRIEND');
  const getLiveShowQuest = () => bonusQuests.find(q => q.quest_key === 'ATTEND_LIVESTREAM');

  const showCelebration = (message: string) => {
    setCelebrationMessage(message);
    setTimeout(() => setCelebrationMessage(""), 3000);
  };

  const handleLoginPrompt = () => {
    try { sfx.play('click', 0.8); } catch {}
    setShowLoginModal(true);
  };

  const handleElementTap = async () => {
    if (questStatus.elementOfDay || loading) {
      return;
    }
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }
    
    try { sfx.play('click', 0.8); } catch {}
    setLoading(true);
    
    try {
      const response = await fetch('/api/heart-coins/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ heartCoinsToAdd: 1 })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Heart coin update successful:', data);
        setQuestStatus(prev => ({ ...prev, elementOfDay: true }));
        // Save to localStorage to persist across sessions for today
        const today = new Date().toDateString();
        localStorage.setItem(`quest_element_${today}`, 'true');
        showCelebration(`✨ Element touched! Your ${todaysElement.name} energy is awakened! +1 HeartCoin earned.`);
        // Trigger HeartCoin celebration animation
        triggerHeartCoinCelebration(1);
      } else {
        const errorData = await response.json();
        console.error('Heart coin update failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to award heart coin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJournalOpen = () => {
    if (questStatus.journalEntry || loading) return;
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }
    onCloseHeartCoinPopup?.();
    setShowJournal(true);
  };

  const handleSoulStareComplete = () => {
    setQuestStatus(prev => ({ ...prev, journalEntry: true }));
    // Save to localStorage to persist across sessions for today
    const today = new Date().toDateString();
    localStorage.setItem(`quest_journal_${today}`, 'true');
    showCelebration("🌟 Soul reflection complete! Your inner wisdom has been honored. +1 HeartCoin earned.");
    // Trigger HeartCoin celebration animation
    triggerHeartCoinCelebration(1);
  };

  const handleJournalComplete = () => {
    setQuestStatus(prev => ({ ...prev, journalEntry: true }));
    // Save to localStorage to persist across sessions for today
    const today = new Date().toDateString();
    localStorage.setItem(`quest_journal_${today}`, 'true');
    showCelebration("🌟 Soul reflection complete! Your inner wisdom has been honored. +1 HeartCoin earned.");
    setShowJournal(false);
    // Trigger HeartCoin celebration animation
    triggerHeartCoinCelebration(1);
  };

  const handleInviteFriend = async () => {
    if (questStatus.inviteFriend || loading) return;
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }
    
    try { sfx.play('click', 0.8); } catch {}
    const message = "I thought of you. I think this world could feel like home for you too. https://chxndler.world/";
    
    const markMessageSent = () => {
      try { sfx.play('change', 0.8); } catch {}
      setQuestStatus(prev => ({ ...prev, inviteFriend: true }));
      // Save to localStorage to persist across sessions for today
      const today = new Date().toDateString();
      localStorage.setItem(`quest_invite_${today}`, 'true');
      showCelebration("📱 Message sent! Now confirm to complete the quest and earn your HeartCoin.");
    };
    
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        markMessageSent();
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback for browsers without native sharing
      try {
        await navigator.clipboard.writeText(message);
        alert("Message copied to clipboard!");
        markMessageSent();
      } catch {
        // Final fallback - show message in alert
        alert(message);
        markMessageSent();
      }
    }
  };

  const handleConfirmInvite = async () => {
    if (questStatus.inviteFriendConfirm || loading) return;
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }
    
    try { sfx.play('click', 0.8); } catch {}
    setLoading(true);
    
    try {
      const response = await fetch('/api/bonus-quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questKey: 'INVITE_FRIEND' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Bonus quest completion result:', data);
        
        // Handle both successful completion and already completed cases
        if (data.status === 'completed_today' || data.status === 'already_completed_today') {
          setQuestStatus(prev => ({ ...prev, inviteFriendConfirm: true }));
          // Save to localStorage to persist across sessions for today
          const today = new Date().toDateString();
          localStorage.setItem(`quest_invite_confirm_${today}`, 'true');
          
          if (data.status === 'completed_today') {
            showCelebration("💕 Love shared! You've planted a seed of connection. +1 HeartCoin earned.");
            // Trigger HeartCoin celebration animation
            triggerHeartCoinCelebration(1);
          } else {
            // Already completed today - soft success
            showCelebration("✨ Quest already completed today! Check back tomorrow for new opportunities.");
          }
          
          // Refresh profile to update heartcoin balance if needed
          if (data.shouldRefreshProfile || data.status === 'completed_today') {
            console.debug('🔄 Refreshing profile to update heartcoin balance after bonus quest completion');
            await refreshProfile();
          }
          
          // Reload bonus quests to update button states
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.user?.id) {
            await loadBonusQuests(session.user.id);
          }
        } else {
          // Unexpected response format
          console.error('Unexpected response format:', data);
          showCelebration("❌ Unexpected response. Please try again.");
        }
      } else {
        const errorData = await response.json();
        console.error('Bonus quest completion failed:', errorData);
        showCelebration("❌ Failed to complete quest. Please try again.");
      }
    } catch (error) {
      console.error('Failed to complete bonus quest:', error);
      showCelebration("❌ Failed to complete quest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async () => {
    // This function should ONLY be called when confirming a secret phrase
    if (questStatus.liveShow || loading || !isAuthenticated || !secretPhrase.trim()) return;
    
    console.log('handleCheckInSubmit called with phrase:', secretPhrase.trim());
    console.log('this should only happen on CONFIRM button click');
    
    try { sfx.play('click', 0.8); } catch {}
    setLoading(true);
    setCheckInError("");
    
    try {
      // Get the current session
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session?.user) {
        setCheckInError("Authentication required");
        setLoading(false);
        return;
      }
      
      // Normalize input before sending (trim but keep case as user typed)
      const normalizedPhrase = secretPhrase.trim();
      
      // Call the API route for secret phrase redemption
      const response = await fetch('/api/redeem-secret-phrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: 'global',
          phrase: normalizedPhrase
        })
      });

      if (!response.ok) {
        console.error('API error:', response.status, response.statusText);
        setCheckInError("Connection error. Please try again.");
        setTimeout(() => {
          setCheckInError("");
          setSecretPhrase("");
        }, 3000);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Check for API-level errors
      if (data.status === 'error') {
        console.error('API response error:', data);
        if (data.code === 'ALREADY_REDEEMED') {
          setCheckInError("Already checked in");
        } else if (data.code === 'NO_ACTIVE_PHRASE') {
          setCheckInError("Incorrect");
        } else {
          setCheckInError("Connection error. Please try again.");
        }
        setTimeout(() => {
          setCheckInError("");
          setSecretPhrase("");
        }, 3000);
        setLoading(false);
        return;
      }
      
      // Use API response to set UI state
      if (data.status === 'success') {
        // Success case
        console.log('Secret phrase redemption successful:', data);
        setQuestStatus(prev => ({ ...prev, liveShow: true }));
        // Save to localStorage to persist across sessions for today
        const today = new Date().toDateString();
        localStorage.setItem(`quest_liveshow_${today}`, 'true');
        
        const successMessage = `Check-in successful +${data.rewardHeartCoins || 'reward'}`;
        showCelebration(successMessage);
        setSecretPhrase(""); // Clear input
        setShowCheckIn(false);
        
        // Update displayed heartcoin balance (optimistically add data.rewardHeartCoins OR refetch profile)
        if (data.rewardHeartCoins && data.rewardHeartCoins > 0) {
          triggerHeartCoinCelebration(data.rewardHeartCoins);
          // Refresh profile to update balance
          await refreshProfile();
        }
      } else {
        // This case should not be reached due to earlier error handling, but keep as fallback
        console.error('Unexpected data format:', data);
        setCheckInError("Connection error. Please try again.");
        setTimeout(() => {
          setCheckInError("");
          setSecretPhrase("");
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to redeem secret phrase:', error);
      setCheckInError("Connection error. Please try again.");
      setTimeout(() => {
        setCheckInError("");
        setSecretPhrase("");
      }, 3000);
    }
    
    setLoading(false);
  };

  const handleShowCheckInForm = () => {
    // Check authentication
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }
    
    try { sfx.play('click', 0.8); } catch {}
    setShowCheckIn(true);
    setCheckInError("");
    setSecretPhrase("");
  };

  const handleCompleteElementalSong = async () => {
    if (loading) return;
    if (!isAuthenticated) {
      handleLoginPrompt();
      return;
    }

    const elementalSongQuest = getElementalSongQuest();
    if (!elementalSongQuest || elementalSongQuest.completed_today > 0) return;

    try { sfx.play('click', 0.8); } catch {}
    setLoading(true);

    try {
      const response = await fetch('/api/bonus-quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questKey: 'LISTEN_ELEMENT_SONG' })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Elemental song quest completion result:', data);

        if (data.status === 'completed_today' || data.status === 'already_completed_today') {
          if (data.status === 'completed_today') {
            showCelebration("🎵 Elemental Song Complete! Your musical essence has been awakened. +2 HeartCoins + Element Card earned.");
            triggerHeartCoinCelebration(elementalSongQuest.reward_heartcoins || 2);
          } else {
            showCelebration("✨ Quest already completed today! Check back tomorrow for new opportunities.");
          }

          // Refresh profile to update heartcoin balance
          if (data.shouldRefreshProfile || data.status === 'completed_today') {
            await refreshProfile();
          }

          // Reload bonus quests to update button states
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.user?.id) {
            await loadBonusQuests(session.user.id);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Elemental song quest completion failed:', errorData);
        showCelebration("❌ Failed to complete quest. Please try again.");
      }
    } catch (error) {
      console.error('Failed to complete elemental song quest:', error);
      showCelebration("❌ Failed to complete quest. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate quest progress
  const completedQuests = Object.values(questStatus).filter(Boolean).length;
  const totalQuests = Object.keys(questStatus).length;
  const progressPercent = Math.round((completedQuests / totalQuests) * 100);

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

      {/* Welcome/Progress Message */}
      {showWelcomeMessage && (
        <div 
          className="text-center mb-6 p-3 border border-pink-500/30 rounded-lg"
          style={{ 
            background: 'rgba(255,105,180,0.1)',
            boxShadow: '0 0 15px rgba(255,105,180,0.3)'
          }}
          onClick={() => setShowWelcomeMessage(false)}
        >
          <div 
            className="text-sm font-bold mb-2"
            style={{ 
              color: '#FF69B4',
              textShadow: '0 0 8px rgba(255,105,180,0.8)'
            }}
          >
            💫 Heart Quest Progress: {completedQuests}/{totalQuests} ({progressPercent}%)
          </div>
          <div 
            className="text-xs"
            style={{ 
              color: '#FFFFFF',
              textShadow: '0 0 4px rgba(255,255,255,0.6)'
            }}
          >
            {completedQuests === 0 
              ? "Start your journey! Each quest brings you closer to expanding your heart energy."
              : completedQuests === totalQuests
                ? "🌟 Amazing! You've completed all quests today. Your heart shines bright!"
                : `You're doing great! ${totalQuests - completedQuests} quests remaining to unlock your full heart potential.`
            }
          </div>
          <div 
            className="mt-2 text-xs opacity-75"
            style={{ color: '#00FFFF' }}
          >
            (Click to dismiss)
          </div>
        </div>
      )}

      {/* Celebration Message */}
      {celebrationMessage && (
        <div 
          className="text-center mb-6 p-4 border border-cyan-500/50 rounded-lg animate-pulse"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.2) 0%, rgba(0,255,255,0.1) 70%, transparent 100%)',
            boxShadow: '0 0 25px rgba(0,255,255,0.4)',
            animation: 'pulse 1s ease-in-out infinite alternate'
          }}
        >
          <div 
            className="text-sm font-bold"
            style={{ 
              color: '#00FFFF',
              textShadow: '0 0 12px rgba(0,255,255,0.8)'
            }}
          >
            {celebrationMessage}
          </div>
        </div>
      )}

      {/* Today's Daily Question Display */}
      <div 
        className="mb-6 p-4 border rounded-lg"
        style={{ 
          background: `rgba(${todaysQuestion.color === '#8B5CF6' ? '139, 92, 246' : 
                         todaysQuestion.color === '#EC4899' ? '236, 72, 153' :
                         todaysQuestion.color === '#06B6D4' ? '6, 182, 212' :
                         '16, 185, 129'}, 0.1)`,
          border: `1px solid rgba(${todaysQuestion.color === '#8B5CF6' ? '139, 92, 246' : 
                         todaysQuestion.color === '#EC4899' ? '236, 72, 153' :
                         todaysQuestion.color === '#06B6D4' ? '6, 182, 212' :
                         '16, 185, 129'}, 0.4)`,
          boxShadow: `0 0 15px rgba(${todaysQuestion.color === '#8B5CF6' ? '139, 92, 246' : 
                         todaysQuestion.color === '#EC4899' ? '236, 72, 153' :
                         todaysQuestion.color === '#06B6D4' ? '6, 182, 212' :
                         '16, 185, 129'}, 0.3)`
        }}
      >
        <h3 
          className="text-sm font-bold mb-2 text-center uppercase tracking-wider"
          style={{ 
            color: todaysQuestion.color,
            textShadow: `0 0 8px ${todaysQuestion.glowColor}`
          }}
        >
          🌟 Today's {todaysQuestion.category.toUpperCase()} Question
        </h3>
        <div 
          className="text-center text-base font-medium px-2"
          style={{ 
            color: '#FFFFFF',
            textShadow: '0 0 4px rgba(255,255,255,0.6)',
            lineHeight: '1.4'
          }}
        >
          "{todaysQuestion.question}"
        </div>
      </div>

      {/* Daily Quests Section */}
      <div className="mb-6">
        <h3 
          className="text-lg font-bold mb-4 text-center"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)' 
          }}
        >
          ⭐ DAILY QUESTS
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
              {/* Today's Element Icon */}
              <button
                onClick={handleElementTap}
                disabled={questStatus.elementOfDay || loading}
                className={`w-12 h-12 border-2 rounded-full overflow-hidden transition-all relative ${
                  questStatus.elementOfDay 
                    ? 'cursor-default' 
                    : `border-pink-500/60 hover:border-pink-400 cursor-pointer`
                }`}
                style={{
                  ...(questStatus.elementOfDay ? {
                    background: 'rgba(0, 255, 0, 0.2)',
                    borderColor: '#00FF00',
                    boxShadow: '0 0 30px rgba(0,255,0,0.8), inset 0 0 15px rgba(0,255,0,0.3), 0 0 60px rgba(0,255,0,0.6)',
                    filter: 'brightness(1.3) saturate(1.2)',
                  } : {
                    background: 'rgba(252,84,175,0.1)',
                    boxShadow: '0 0 15px rgba(252,84,175,0.3)'
                  })
                }}
              >
                <img
                  src={`/elements/${todaysElement.name}.webp`}
                  alt="Today's Element"
                  className="w-full h-full object-cover"
                  draggable={false}
                  style={{
                    filter: questStatus.elementOfDay 
                      ? 'brightness(1.4) saturate(1.3) drop-shadow(0 0 8px rgba(0,255,0,0.8))'
                      : 'none'
                  }}
                />
                {questStatus.elementOfDay && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-400/20 to-green-500/30">
                    <span 
                      className="text-green-400 text-lg font-bold"
                      style={{
                        textShadow: '0 0 8px rgba(0,255,0,1), 0 0 15px rgba(0,255,0,0.8)',
                        filter: 'drop-shadow(0 0 6px rgba(0,255,0,0.9))'
                      }}
                    >
                      ✓
                    </span>
                  </div>
                )}
              </button>
              <button
                onClick={!questStatus.elementOfDay ? handleElementTap : undefined}
                disabled={questStatus.elementOfDay || loading}
                className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 ${
                  questStatus.elementOfDay
                    ? 'border-2 text-green-400 cursor-default'
                    : !isAuthenticated
                      ? 'bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300 cursor-pointer'
                      : 'bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 cursor-pointer'
                }`}
                style={{
                  ...(questStatus.elementOfDay ? {
                    background: 'rgba(0, 255, 0, 0.2)',
                    borderColor: '#00FF00',
                    color: '#00FF00',
                    boxShadow: '0 0 30px rgba(0,255,0,0.8), inset 0 0 15px rgba(0,255,0,0.3), 0 0 60px rgba(0,255,0,0.6)',
                    textShadow: '0 0 15px rgba(0,255,0,1), 0 0 25px rgba(0,255,0,0.8)',
                    opacity: 1
                  } : !isAuthenticated ? {
                    boxShadow: '0 0 10px rgba(255,255,0,0.3)',
                    textShadow: '0 0 4px rgba(255,255,0,0.6)'
                  } : {
                    boxShadow: '0 0 10px rgba(252,84,175,0.3)',
                    textShadow: '0 0 4px rgba(252,84,175,0.6)'
                  })
                }}
              >
                {questStatus.elementOfDay 
                  ? 'COMPLETED' 
                  : !isAuthenticated 
                    ? 'LOG IN TO COMPLETE' 
                    : '+1 HeartCoin'
                }
              </button>
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
              <h4 className="text-white font-semibold mb-1">2. Soul Stare - Daily Reflection</h4>
              <p className="text-white/80 text-sm mb-2">Answer today's introspective question to earn one HeartCoin.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleJournalOpen}
                disabled={questStatus.journalEntry || loading}
                className={`w-20 h-20 rounded-full text-xs transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  questStatus.journalEntry
                    ? 'bg-green-600/30 border border-green-500/50 text-green-300 cursor-not-allowed'
                    : !isAuthenticated
                      ? 'bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300'
                      : 'bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300'
                }`}
                style={{
                  boxShadow: questStatus.journalEntry
                    ? '0 0 10px rgba(0,255,0,0.3)'
                    : !isAuthenticated
                      ? '0 0 10px rgba(255,255,0,0.3)'
                      : '0 0 10px rgba(252,84,175,0.3)',
                  textShadow: questStatus.journalEntry
                    ? '0 0 4px rgba(0,255,0,0.6)'
                    : !isAuthenticated
                      ? '0 0 4px rgba(255,255,0,0.6)'
                      : '0 0 4px rgba(252,84,175,0.6)'
                }}
              >
                {questStatus.journalEntry ? '✓ COMPLETE' : !isAuthenticated ? 'LOG IN TO COMPLETE' : 'OPEN JOURNAL'}
              </button>
              <div 
                className={`font-bold text-sm cursor-pointer ${
                  questStatus.journalEntry 
                    ? 'text-green-400' 
                    : !isAuthenticated 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-pink-400'
                }`}
                style={{ 
                  textShadow: questStatus.journalEntry 
                    ? '0 0 4px rgba(0,255,0,0.6)' 
                    : !isAuthenticated
                      ? '0 0 4px rgba(255,255,0,0.6)'
                      : '0 0 4px rgba(252,84,175,0.6)' 
                }}
                onClick={!questStatus.journalEntry ? handleJournalOpen : undefined}
              >
                {questStatus.journalEntry 
                  ? '✓ Complete' 
                  : !isAuthenticated 
                    ? 'Log in to complete' 
                    : '+1 HeartCoin'
                }
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
          ⭐ BONUS QUESTS
        </h3>

        {/* Quest 1: Listen to Your Elemental Song (if available) */}
        {getElementalSongQuest() && (
          <div 
            className="border border-cyan-400/40 rounded-lg p-4 mb-4"
            style={{ 
              background: 'rgba(0,255,255,0.05)',
              boxShadow: '0 0 10px rgba(0,255,255,0.2)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">1. Listen to Your Elemental Song</h4>
                <p className="text-white/80 text-sm mb-2">Play the track aligned with your element.</p>
                <p className="text-white/60 text-xs">+2 + Element Card</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={getElementalSongQuest()?.completed_today > 0 ? undefined : handleCompleteElementalSong}
                  disabled={getElementalSongQuest()?.completed_today > 0 || loading || bonusQuestsLoading}
                  className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 cursor-pointer ${
                    getElementalSongQuest()?.completed_today > 0
                      ? 'bg-green-500/40 border-2 border-green-400 text-green-300 cursor-not-allowed'
                      : !isAuthenticated
                        ? 'bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300'
                        : 'bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300'
                  }`}
                  style={{
                    boxShadow: getElementalSongQuest()?.completed_today > 0
                      ? '0 0 20px rgba(0,255,0,0.8), inset 0 0 15px rgba(0,255,0,0.3)'
                      : !isAuthenticated
                        ? '0 0 10px rgba(255,255,0,0.3)'
                        : '0 0 10px rgba(252,84,175,0.3)',
                    textShadow: getElementalSongQuest()?.completed_today > 0
                      ? '0 0 12px rgba(0,255,0,1)'
                      : !isAuthenticated
                        ? '0 0 4px rgba(255,255,0,0.6)'
                        : '0 0 4px rgba(252,84,175,0.6)'
                  }}
                >
                  {getElementalSongQuest()?.completed_today > 0
                    ? 'COMPLETED' 
                    : !isAuthenticated
                      ? 'LOG IN TO COMPLETE'
                      : 'COMPLETE'
                  }
                </button>
                <div 
                  className={`font-bold text-sm cursor-pointer ${
                    getElementalSongQuest()?.completed_today > 0
                      ? 'text-green-400' 
                      : !isAuthenticated
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-pink-400'
                  }`}
                  style={{ 
                    textShadow: getElementalSongQuest()?.completed_today > 0
                      ? '0 0 4px rgba(0,255,0,0.6)' 
                      : !isAuthenticated
                        ? '0 0 4px rgba(255,255,0,0.6)'
                        : '0 0 4px rgba(252,84,175,0.6)' 
                  }}
                  onClick={getElementalSongQuest()?.completed_today > 0 ? undefined : handleCompleteElementalSong}
                >
                  {getElementalSongQuest()?.completed_today > 0
                    ? '✓ Complete' 
                    : !isAuthenticated
                      ? 'Log in to complete'
                      : '+1'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quest 2: Invite a Friend */}
        <div 
          className="border border-cyan-400/40 rounded-lg p-4 mb-4"
          style={{ 
            background: 'rgba(0,255,255,0.05)',
            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">2. Invite a Friend</h4>
              <p className="text-white/80 text-sm mb-2">Share the Heartverse with someone you love. When they join, you both earn HeartCoins.</p>
              <p className="text-white/60 text-xs">+1 /day</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={
                  questStatus.inviteFriendConfirm 
                    ? undefined 
                    : questStatus.inviteFriend 
                      ? handleConfirmInvite 
                      : handleInviteFriend
                }
                disabled={questStatus.inviteFriendConfirm || loading || bonusQuestsLoading}
                className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 cursor-pointer ${
                  questStatus.inviteFriendConfirm
                    ? 'bg-green-500 border-2 border-green-400 text-white cursor-default !opacity-100'
                    : !isAuthenticated
                      ? 'bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300'
                      : questStatus.inviteFriend
                        ? 'bg-black/30 border-2 border-[#F2EF1D] text-[#F2EF1D] hover:bg-[#F2EF1D]/10'
                        : 'bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300'
                }`}
                style={{
                  boxShadow: questStatus.inviteFriendConfirm
                    ? '0 0 30px rgba(34,197,94,1), inset 0 0 25px rgba(74,222,128,0.6), 0 0 60px rgba(34,197,94,0.8)'
                    : !isAuthenticated
                      ? '0 0 10px rgba(255,255,0,0.3)'
                      : questStatus.inviteFriend
                        ? '0 0 20px rgba(242,239,29,0.8), inset 0 0 10px rgba(242,239,29,0.2)'
                        : '0 0 10px rgba(252,84,175,0.3)',
                  textShadow: questStatus.inviteFriendConfirm
                    ? '0 0 20px rgba(255,255,255,1), 0 0 8px rgba(34,197,94,1)'
                    : !isAuthenticated
                      ? '0 0 4px rgba(255,255,0,0.6)'
                      : questStatus.inviteFriend
                        ? '0 0 10px rgba(242,239,29,1)'
                        : '0 0 4px rgba(252,84,175,0.6)',
                  opacity: questStatus.inviteFriendConfirm ? 1 : undefined
                }}
              >
                {questStatus.inviteFriendConfirm 
                  ? 'COMPLETED' 
                  : !isAuthenticated
                    ? 'LOG IN TO COMPLETE'
                    : questStatus.inviteFriend 
                        ? 'CONFIRM' 
                        : 'INVITE FRIEND'
                }
              </button>
              <div 
                className={`font-bold text-sm cursor-pointer ${
                  questStatus.inviteFriendConfirm 
                    ? 'text-green-400' 
                    : !isAuthenticated
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : questStatus.inviteFriend
                        ? 'text-yellow-200'
                        : 'text-pink-400'
                }`}
                style={{ 
                  textShadow: questStatus.inviteFriendConfirm 
                    ? '0 0 4px rgba(0,255,0,0.6)' 
                    : !isAuthenticated
                      ? '0 0 4px rgba(255,255,0,0.6)'
                      : questStatus.inviteFriend
                        ? '0 0 4px rgba(255,193,7,0.8)'
                        : '0 0 4px rgba(252,84,175,0.6)' 
                }}
                onClick={
                  questStatus.inviteFriendConfirm 
                    ? undefined 
                    : questStatus.inviteFriend 
                      ? handleConfirmInvite 
                      : handleInviteFriend
                }
              >
                {questStatus.inviteFriendConfirm 
                  ? '✓ Complete' 
                  : !isAuthenticated
                    ? 'Log in to complete'
                    : questStatus.inviteFriend
                      ? 'Click to Confirm'
                      : '+1 HeartCoin'
                }
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
                {!showCheckIn ? (
                  <>
                    <h4 className="text-white font-semibold mb-1">3. Attend a Livestream or Live Show</h4>
                    <p className="text-white/80 text-sm">Check in at a CHXNDLER show or stream to receive bonus HEART coins.</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (secretPhrase.trim() && !loading) {
                        handleCheckInSubmit();
                      }
                    }}>
                      <input
                        type="text"
                        value={secretPhrase}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log('Input changed:', newValue);
                          console.log('Input length:', newValue.length);
                          console.log('Trimmed value:', newValue.trim());
                          setSecretPhrase(newValue);
                          setCheckInError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && secretPhrase.trim() && !loading) {
                            e.preventDefault();
                            handleCheckInSubmit();
                          }
                        }}
                        placeholder="ENTER PASSWORD"
                        className={`w-full rounded-md border px-3 py-2 text-sm text-white placeholder-white/60 shadow-sm focus:outline-none transition-all ${
                          secretPhrase.trim() 
                            ? 'border-yellow-400/60 bg-yellow-600/10 focus:border-yellow-400' 
                            : 'border-white/20 bg-black/30 focus:border-cyan-400'
                        }`}
                        style={{
                          boxShadow: secretPhrase.trim() 
                            ? '0 0 12px rgba(255,255,0,0.4)' 
                            : '0 0 8px rgba(0,255,255,0.2)'
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        autoFocus
                      />
                    </form>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={
                    questStatus.liveShow 
                      ? undefined 
                      : showCheckIn 
                        ? handleCheckInSubmit 
                        : handleShowCheckInForm
                  }
                  disabled={questStatus.liveShow || bonusQuestsLoading || (showCheckIn && (loading || !secretPhrase.trim()))}
                  className={`px-4 py-2 rounded text-sm font-bold transition-all duration-200 ${
                    questStatus.liveShow
                      ? 'bg-green-600/40 border border-green-500/50 text-green-300 cursor-not-allowed'
                      : !isAuthenticated
                        ? 'bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/50 text-yellow-300 cursor-pointer'
                        : showCheckIn && secretPhrase.trim()
                          ? 'bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300 hover:bg-yellow-500/30 cursor-pointer'
                          : showCheckIn
                            ? 'bg-gray-600/30 border border-gray-500/50 text-gray-400 cursor-not-allowed'
                            : 'bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 cursor-pointer'
                  }`}
                  style={{
                    boxShadow: questStatus.liveShow
                      ? '0 0 10px rgba(0,255,0,0.3)'
                      : !isAuthenticated
                        ? '0 0 10px rgba(255,255,0,0.3)'
                        : showCheckIn && secretPhrase.trim()
                          ? '0 0 20px rgba(255,255,0,0.8), inset 0 0 10px rgba(255,255,0,0.2)'
                          : showCheckIn
                            ? '0 0 5px rgba(128,128,128,0.2)'
                            : '0 0 10px rgba(252,84,175,0.3)',
                    textShadow: questStatus.liveShow
                      ? '0 0 4px rgba(0,255,0,0.6)'
                      : !isAuthenticated
                        ? '0 0 4px rgba(255,255,0,0.6)'
                        : showCheckIn && secretPhrase.trim()
                          ? '0 0 10px rgba(255,255,0,1)'
                          : showCheckIn
                            ? '0 0 2px rgba(128,128,128,0.4)'
                            : '0 0 4px rgba(252,84,175,0.6)'
                  }}
                >
                  {questStatus.liveShow 
                    ? 'COMPLETED' 
                    : !isAuthenticated 
                      ? 'LOG IN TO COMPLETE' 
                      : showCheckIn
                        ? (loading ? 'CONFIRMING...' : secretPhrase.trim() ? 'CONFIRM' : 'ENTER PHRASE ABOVE')
                        : 'CHECK IN'
                  }
                </button>
                <div 
                  className={`font-bold text-sm cursor-pointer ${
                    questStatus.liveShow 
                      ? 'text-green-400' 
                      : !isAuthenticated 
                        ? 'text-yellow-400 hover:text-yellow-300' 
                        : 'text-pink-400'
                  }`}
                  style={{ 
                    textShadow: questStatus.liveShow 
                      ? '0 0 4px rgba(0,255,0,0.6)' 
                      : !isAuthenticated
                        ? '0 0 4px rgba(255,255,0,0.6)'
                        : '0 0 4px rgba(252,84,175,0.6)' 
                  }}
                  onClick={
                    questStatus.liveShow 
                      ? undefined 
                      : showCheckIn 
                        ? handleCheckInSubmit 
                        : handleShowCheckInForm
                  }
                >
                  {questStatus.liveShow 
                    ? '✓ Complete' 
                    : !isAuthenticated 
                      ? 'Log in to complete' 
                      : '+5'
                  }
                </div>
              </div>
            </div>

            {checkInError && (
              <div 
                className="text-center p-3 rounded-lg"
                style={{ 
                  background: 'rgba(255,0,150,0.1)',
                  border: '1px solid rgba(255,0,150,0.4)',
                  color: '#FF0096',
                  textShadow: '0 0 4px rgba(255,0,150,0.6)'
                }}
              >
                {checkInError}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Soul Stare Modal */}
      <SoulStareModal
        isOpen={showSoulStare}
        onClose={() => setShowSoulStare(false)}
        onComplete={handleSoulStareComplete}
        onOpenBlueDisplay={onOpenBlueDisplay}
      />
      
      {/* Soul Star Journal */}
      <SoulStarJournal
        isOpen={showJournal}
        onClose={() => setShowJournal(false)}
        onJournalCompleted={handleJournalComplete}
      />
      
      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
