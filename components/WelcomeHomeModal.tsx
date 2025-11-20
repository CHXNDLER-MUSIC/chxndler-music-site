"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookButton from '@/components/BookButton';
import HeartversePopup from '@/components/HeartversePopup';

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

  const name = profile?.display_name ?? 'Pilot';
  const hearts = profile?.hearts ?? 0;
  const isLoggedIn = !!profile;

  return (
    <HeartversePopup 
      isOpen={open} 
      onClose={onClose} 
      title="WELCOME TO THE HEARTVERSE 💖"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-white">LOADING...</h3>
            <p className="text-cyan-400" style={{ textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
              Connecting to the Heartverse...
            </p>
          </div>
        ) : !isLoggedIn ? (
          <div className="space-y-4">
            <p className="text-cyan-400 text-center" style={{ textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
              You're invited into the Heartverse.
            </p>
            <Link 
              href="/login" 
              className="block w-full rounded-lg bg-gradient-to-r from-[#38B6FF] to-[#00FFFF] px-6 py-3 text-center font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38B6FF]/30"
              onClick={onClose}
              style={{
                boxShadow: '0 0 30px rgba(56,182,255,0.5), 0 0 60px rgba(0,255,255,0.3)'
              }}
            >
              WELCOME HOME
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-cyan-400" style={{ textShadow: '0 0 8px rgba(0, 255, 255, 0.6)' }}>
                Welcome back, {name}!
              </p>
              <p className="text-white/80 text-sm">You have {hearts} HeartCoins.</p>
              <div className="flex justify-center mt-2">
                <BookButton />
              </div>
            </div>
            <Link 
              href="/dashboard" 
              className="block w-full rounded-lg bg-gradient-to-r from-[#FC54AF] to-[#FF69B4] px-6 py-3 text-center font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FC54AF]/30"
              onClick={onClose}
              style={{
                boxShadow: '0 0 30px rgba(252,84,175,0.5), 0 0 60px rgba(255,105,180,0.3)'
              }}
            >
              ENTER THE HEARTVERSE
            </Link>
          </div>
        )}
      </div>
    </HeartversePopup>
  );
}