"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookButton from '@/components/BookButton';

type Profile = {
  id: string;
  display_name: string | null;
  hearts: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WelcomeHomeModal({ open, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Fetch profile when modal opens
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/profile');
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
          }
        } catch (error) {
          console.log('Profile fetch failed:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [open]);

  if (!open) return null;

  const name = profile?.display_name ?? 'Pilot';
  const hearts = profile?.hearts ?? 0;
  const isLoggedIn = !!profile;

  return (
    <div
      className="fixed z-[9999] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Welcome Home"
      style={{ 
        top: '0',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div 
        className="mx-4 max-w-2xl w-full relative"
        style={{
          zIndex: 10000
        }}
      >
        <div className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-md border border-white/15 bg-white/5 glow cockpit-glow" style={{
          boxShadow:
            '0 0 40px rgba(252,84,175,0.25), 0 0 90px rgba(56,182,255,0.25), inset 0 0 28px rgba(242,239,29,0.12)'
        }}>
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
            background: 'linear-gradient(135deg, rgba(252,84,175,.18), rgba(56,182,255,.18))',
            mixBlendMode: 'screen'
          }} />

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 z-10"
          >
            ×
          </button>

          <div className="relative">
            {loading ? (
              <div className="text-center">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.15em] text-white drop-shadow mb-2">LOADING...</h2>
                <p style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
                  Connecting to the Heartverse...
                </p>
              </div>
            ) : !isLoggedIn ? (
              <>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.15em] text-white drop-shadow mb-2">WELCOME BACK TO THE HEARTVERSE {'<3'}</h2>
                <p className="mb-6" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>You're invited into the Heartverse.</p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center rounded-xl px-24 py-4 font-semibold text-black bg-[#38B6FF] hover:brightness-110 transition shadow-[0_0_24px_rgba(56,182,255,0.45)] welcome-home-button min-w-[320px]"
                  onClick={onClose}
                >
                  WELCOME HOME
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[0.12em] text-white drop-shadow mb-2 flex items-center gap-4 flex-wrap">
                  WELCOME BACK TO THE HEARTVERSE {'<3'}, {name}
                  <BookButton />
                </h2>
                <p className="text-white/80 mb-6">You have {hearts} HeartCoins.</p>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-black bg-[#FC54AF] hover:brightness-110 transition shadow-[0_0_24px_rgba(252,84,175,0.45)]"
                  onClick={onClose}
                >
                  ENTER THE HEARTVERSE
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}