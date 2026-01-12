"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import JoinUsButton from '@/components/JoinUsButton';
import BookButton from '@/components/BookButton';
import WelcomeHomeForm from '@/components/WelcomeHomeForm';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { RELIC_CELEBRATION_EVENT } from './RelicCelebration';

const HEARTVERSE_COLOR = "#FC54AF";

// Type for the next claimable story relic from RPC
interface NextStoryRelic {
  relic_id: string;
  story_key: string;
  required_heartcoins: number;
  relic_label: string;
  relic_image_url: string | null;
}

// Story relic display names
const STORY_RELIC_LABELS: Record<string, string> = {
  wanderer: 'WANDERER',
  dreamer: 'DREAMER',
  lover: 'LOVER',
};

type Profile = {
  id: string;
  name: string | null;
  hearts: number | null;
};

type Props = {
  onBeamColorChange?: (color: 'blue' | 'yellow' | 'pink' | 'off') => void;
};

export default function DashboardWelcomeDisplay({ onBeamColorChange }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');

  // Relic claiming state
  const [nextStoryRelic, setNextStoryRelic] = useState<NextStoryRelic | null>(null);
  const [heartcoinBalance, setHeartcoinBalance] = useState<number>(0);
  const [claimed, setClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [allRelicsClaimed, setAllRelicsClaimed] = useState(false);

  // Audio refs
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Get token from cookies client-side
    const getToken = () => {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('sb-access-token='));
      return tokenCookie ? decodeURIComponent(tokenCookie.split('=')[1]) : '';
    };

    const accessToken = getToken();
    setToken(accessToken);

    // Fetch profile if token exists
    if (accessToken) {
      fetch('/api/profile', {
        credentials: 'include'
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => setProfile(data))
        .catch(() => setProfile(null))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch the next claimable story relic
  const fetchNextStoryRelic = useCallback(async () => {
    try {
      const { data, error } = await supabaseBrowser.rpc('get_next_claimable_story_relic');

      if (error) {
        console.error('[DashboardWelcome] Error fetching next story relic:', error);
        setNextStoryRelic(null);
        return;
      }

      if (data) {
        setNextStoryRelic(data);
        setAllRelicsClaimed(false);
        setClaimed(false);
      } else {
        setNextStoryRelic(null);
        setAllRelicsClaimed(true);
      }
    } catch (err) {
      console.error('[DashboardWelcome] Error fetching next story relic:', err);
      setNextStoryRelic(null);
    }
  }, []);

  // Fetch heartcoin balance
  const fetchHeartcoinBalance = useCallback(async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) return;

      const { data: profileData, error } = await supabaseBrowser
        .from('profiles')
        .select('heartcoin_balance')
        .eq('id', session.user.id)
        .single();

      if (!error && profileData) {
        setHeartcoinBalance(profileData.heartcoin_balance ?? 0);
      }
    } catch (err) {
      console.error('[DashboardWelcome] Error fetching heartcoin balance:', err);
    }
  }, []);

  // Fetch relic data when logged in
  useEffect(() => {
    if (token) {
      fetchNextStoryRelic();
      fetchHeartcoinBalance();
    }
  }, [token, fetchNextStoryRelic, fetchHeartcoinBalance]);

  // Listen for profile updates to refresh relic state
  useEffect(() => {
    const handleProfileRefresh = () => {
      if (token) {
        fetchNextStoryRelic();
        fetchHeartcoinBalance();
      }
    };

    window.addEventListener('profile:force-refresh', handleProfileRefresh);
    window.addEventListener('relics:refresh', handleProfileRefresh);

    return () => {
      window.removeEventListener('profile:force-refresh', handleProfileRefresh);
      window.removeEventListener('relics:refresh', handleProfileRefresh);
    };
  }, [token, fetchNextStoryRelic, fetchHeartcoinBalance]);

  // Play hover sound
  const handleRelicHover = useCallback(() => {
    if (claimed || isClaiming || !nextStoryRelic) return;
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/audio/hover.mp3");
      hoverAudioRef.current.volume = 0.5;
    }
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  }, [claimed, isClaiming, nextStoryRelic]);

  // Play click sound
  const playClickSound = useCallback(() => {
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio("/audio/click.mp3");
      clickAudioRef.current.volume = 0.5;
    }
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  }, []);

  // Handle clicking on the relic image to claim
  const handleRelicClick = useCallback(async () => {
    if (claimed || isClaiming || !nextStoryRelic) return;

    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'Please log in to claim your relic.', type: 'error' }
      }));
      return;
    }

    playClickSound();
    setIsClaiming(true);

    try {
      const { data, error } = await supabaseBrowser.rpc('claim_next_story_relic');

      if (error) {
        console.error('[DashboardWelcome] RPC error:', error);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Failed to claim relic. Please try again.', type: 'error' }
        }));
        return;
      }

      if (data?.ok === true) {
        setClaimed(true);
        const relicLabel = STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key;

        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: `${relicLabel} Relic awarded!`, type: 'success' }
        }));

        window.dispatchEvent(new CustomEvent('profile:force-refresh'));
        window.dispatchEvent(new CustomEvent('relics:refresh'));

        // Dispatch relic celebration event
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(RELIC_CELEBRATION_EVENT, {
              detail: {
                element: 'heart',
                rewardKey: nextStoryRelic.story_key,
                relicLabel: `${relicLabel} Relic`,
                relicImageUrl: nextStoryRelic.relic_image_url || '/elements/relics.webp',
                relicKind: 'story',
              },
            })
          );
        }, 300);

        // After celebration, refetch to get the next relic
        setTimeout(() => {
          setClaimed(false);
          fetchNextStoryRelic();
          fetchHeartcoinBalance();
        }, 3500);

      } else if (data?.ok === false && data?.reason === 'NOT_CLAIMABLE') {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Not unlocked yet - earn more HeartCoins!', type: 'info' }
        }));
        await fetchNextStoryRelic();
      } else if (data?.ok === false && data?.reason === 'ALREADY_CLAIMED') {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'You already have this relic!', type: 'info' }
        }));
        await fetchNextStoryRelic();
      } else {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Failed to claim relic. Please try again.', type: 'error' }
        }));
      }
    } catch (err) {
      console.error('[DashboardWelcome] Error claiming relic:', err);
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: 'An unexpected error occurred.', type: 'error' }
      }));
    } finally {
      setIsClaiming(false);
    }
  }, [claimed, isClaiming, nextStoryRelic, playClickSound, fetchNextStoryRelic, fetchHeartcoinBalance]);

  // Determine if relic is claimable based on heartcoin balance
  const isRelicClaimable = nextStoryRelic && heartcoinBalance >= nextStoryRelic.required_heartcoins;

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 mx-auto max-w-2xl glow cockpit-glow">
        <div className="text-center text-white">Loading...</div>
      </div>
    );
  }

  // Logged out view: do not call /api/profile
  if (!token) {
    return (
      <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 mx-auto max-w-2xl glow cockpit-glow" style={{
        boxShadow:
          '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
      }}>
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
          mixBlendMode: 'screen'
        }} />
        <div className="relative">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.15em] text-white drop-shadow mb-2">WELCOME TO THE HEARTVERSE {'<3'}</h2>
          <p className="mb-6" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>You're invited into the Heartverse.</p>
          
          {/* Email, Phone, and Heart Signal Form */}
          <WelcomeHomeForm />
          
          <div className="mt-6">
            <JoinUsButton 
              className="inline-flex items-center justify-center rounded-xl px-24 py-4 font-semibold text-black bg-[#38B6FF] hover:brightness-110 transition shadow-[0_0_24px_rgba(56,182,255,0.45)] welcome-home-button min-w-[320px]"
              onBeamColorChange={onBeamColorChange}
            >
              ENTER THE HEARTVERSE
            </JoinUsButton>
          </div>
        </div>
      </div>
    );
  }

  // Logged in view
  const name = profile?.name ?? 'Pilot';
  const hearts = profile?.hearts ?? 0;

  // Determine the progress text for locked relics
  const getProgressText = () => {
    if (allRelicsClaimed) return "All story relics claimed!";
    if (!nextStoryRelic) return "";

    const required = nextStoryRelic.required_heartcoins;
    const relicName = STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key;

    if (heartcoinBalance >= required) {
      return `Click to claim ${relicName}!`;
    }
    return `Earn ${required} HeartCoins to unlock ${relicName}`;
  };

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 mx-auto max-w-2xl glow cockpit-glow" style={{
      boxShadow:
        '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
    }}>
      {/* Pulsing glow animation styles */}
      <style>{`
        @keyframes relicPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 15px ${HEARTVERSE_COLOR}) drop-shadow(0 0 30px ${HEARTVERSE_COLOR}80);
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 25px ${HEARTVERSE_COLOR}) drop-shadow(0 0 50px ${HEARTVERSE_COLOR}90);
          }
        }
        @keyframes relicGlow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.3);
          }
        }
      `}</style>

      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
        mixBlendMode: 'screen'
      }} />
      <div className="relative">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.12em] text-white drop-shadow mb-2 flex items-center gap-4">
          WELCOME BACK TO THE HEARTVERSE {'<3'}, {name}
          <BookButton />
        </h2>
        <p className="text-white/80 mb-6">You have {hearts} HeartCoins.</p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-black bg-[#FC54AF] hover:brightness-110 transition shadow-[0_0_24px_rgba(252,84,175,0.45)]"
            onClick={() => {
              // Emit event to potentially trigger tour
              window.dispatchEvent(new CustomEvent('heartverse:entered'));
            }}
          >
            ENTER THE HEARTVERSE
          </Link>

          {/* Relic Image - Clickable to claim story relics */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleRelicClick}
              onMouseEnter={handleRelicHover}
              disabled={claimed || isClaiming || !isRelicClaimable}
              className="relative transition-transform hover:scale-105 focus:outline-none"
              style={{
                width: 80,
                height: 80,
                background: "none",
                border: "none",
                padding: 0,
                overflow: "visible",
                cursor: (claimed || isClaiming || !isRelicClaimable) ? "default" : "pointer",
              }}
              aria-label={!nextStoryRelic ? "All story relics claimed" : `Claim ${STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key} Relic`}
            >
              {/* Pulsing glow behind the image - only when claimable */}
              {isRelicClaimable && !claimed && (
                <div
                  style={{
                    position: "absolute",
                    inset: -15,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${HEARTVERSE_COLOR}70 0%, ${HEARTVERSE_COLOR}35 40%, transparent 70%)`,
                    animation: "relicGlow 2s ease-in-out infinite",
                  }}
                />
              )}
              {/* The relics image */}
              <img
                src={nextStoryRelic?.relic_image_url || "/elements/relics.webp"}
                alt={nextStoryRelic ? `${STORY_RELIC_LABELS[nextStoryRelic.story_key] || nextStoryRelic.story_key} Relic` : "Story Relic"}
                style={{
                  position: "relative",
                  zIndex: 10,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  animation: isRelicClaimable && !claimed ? "relicPulse 2s ease-in-out infinite" : "none",
                  opacity: (claimed || allRelicsClaimed || !isRelicClaimable) ? 0.5 : 1,
                  filter: (claimed || allRelicsClaimed || !isRelicClaimable) ? "grayscale(0.4) brightness(0.7)" : "none",
                  transition: "opacity 0.3s ease, filter 0.3s ease",
                }}
              />
            </button>
            {/* Progress text below relic */}
            <p
              className="text-xs mt-2 text-center max-w-[120px]"
              style={{
                color: isRelicClaimable ? HEARTVERSE_COLOR : "rgba(255,255,255,0.6)",
                textShadow: isRelicClaimable ? `0 0 8px ${HEARTVERSE_COLOR}60` : "none",
                fontWeight: isRelicClaimable ? "bold" : "normal",
              }}
            >
              {getProgressText()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
