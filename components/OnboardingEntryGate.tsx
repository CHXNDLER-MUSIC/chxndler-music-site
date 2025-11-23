"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";

interface OnboardingEntryGateProps {
  onStartTour: () => void;
  isProfileCreationComplete: boolean;
}

export default function OnboardingEntryGate({ onStartTour, isProfileCreationComplete }: OnboardingEntryGateProps) {
  const { profile, updateProfile } = useProfile();
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show modal if:
    // 1. Profile creation is complete (they just clicked "Enter the Heartverse")
    // 2. User has a profile
    // 3. has_seen_tour is false or null
    // 4. Modal isn't already showing
    if (
      isProfileCreationComplete &&
      profile &&
      !profile.has_seen_tour &&
      !showModal
    ) {
      // Small delay to let the profile creation animation settle
      const timer = setTimeout(() => {
        setShowModal(true);
        // Fade in after mount
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isProfileCreationComplete, profile, showModal]);

  const handleShowMeAround = async () => {
    setIsVisible(false);
    // Wait for fade out before starting tour
    setTimeout(() => {
      setShowModal(false);
      onStartTour();
    }, 250);
  };

  const handleSkipForNow = async () => {
    try {
      // Set has_seen_tour to true immediately
      await updateProfile({ has_seen_tour: true });
      
      setIsVisible(false);
      setTimeout(() => {
        setShowModal(false);
      }, 250);
    } catch (error) {
      console.error("Error skipping tour:", error);
      // Still close the modal even if the update failed
      setIsVisible(false);
      setTimeout(() => {
        setShowModal(false);
      }, 250);
    }
  };

  const handleClose = () => {
    handleSkipForNow(); // Treat close as skip
  };

  if (!showModal) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-[201] p-4 transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        <div
          className="relative max-w-md w-full rounded-2xl border border-cyan-400/30 shadow-2xl"
          style={{
            background: `
              linear-gradient(180deg, rgba(25,227,255,0.15), rgba(25,227,255,0.08)),
              radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.06), rgba(255,255,255,0) 42%)
            `,
            backdropFilter: 'blur(16px)',
            boxShadow: `
              0 25px 50px rgba(0,0,0,0.6),
              0 0 60px rgba(25,227,255,0.4),
              0 0 120px rgba(25,227,255,0.2),
              inset 0 2px 0 rgba(255,255,255,0.2),
              inset 0 -6px 14px rgba(0,0,0,0.4)
            `,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full 
                     bg-white/10 hover:bg-white/20 text-white/70 hover:text-white 
                     transition-all duration-200 z-10"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Title */}
            <h2 
              className="text-3xl font-bold text-white mb-6"
              style={{
                fontFamily: 'OrbitronLocal, InterLocal, system-ui, sans-serif',
                letterSpacing: '0.08em',
                textShadow: '0 0 20px rgba(25,227,255,0.8), 0 0 40px rgba(25,227,255,0.4)',
              }}
            >
              Welcome home, Alien
            </h2>

            {/* Body text */}
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Your cockpit is waking up. Do you want me to show you around?
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Primary button */}
              <button
                onClick={handleShowMeAround}
                className="px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200
                         hover:scale-105 active:scale-95"
                style={{
                  background: `
                    linear-gradient(135deg, rgba(25,227,255,0.8), rgba(25,227,255,0.6)),
                    radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.1), rgba(255,255,255,0) 42%)
                  `,
                  border: '1px solid rgba(25,227,255,0.4)',
                  boxShadow: `
                    0 8px 16px rgba(0,0,0,0.3),
                    0 0 20px rgba(25,227,255,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.2)
                  `,
                  textShadow: '0 0 10px rgba(25,227,255,0.8)',
                }}
              >
                Show me around
              </button>

              {/* Secondary button */}
              <button
                onClick={handleSkipForNow}
                className="px-8 py-3 rounded-xl font-semibold text-white/80 hover:text-white 
                         transition-all duration-200 hover:scale-105 active:scale-95
                         border border-white/20 hover:border-white/30 bg-white/5 hover:bg-white/10"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalGlow {
          0%, 100% {
            box-shadow: 
              0 25px 50px rgba(0,0,0,0.6),
              0 0 60px rgba(25,227,255,0.4),
              0 0 120px rgba(25,227,255,0.2);
          }
          50% {
            box-shadow: 
              0 25px 50px rgba(0,0,0,0.6),
              0 0 80px rgba(25,227,255,0.5),
              0 0 140px rgba(25,227,255,0.3);
          }
        }
      `}</style>
    </>
  );
}