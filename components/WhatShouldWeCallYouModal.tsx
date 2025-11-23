"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUIStore } from "@/store/useUIStore";
import { useProfile } from "@/contexts/ProfileContext";

export default function WhatShouldWeCallYouModal() {
  const { showNamePrompt, closeNamePrompt, openElementSelection } = useUIStore();
  const { updateProfileName, profile } = useProfile();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check authentication and prefill name when modal opens
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUser(user);
    };

    if (showNamePrompt) {
      checkAuth();
      // Prefill with current profile name if it exists
      if (profile?.name) {
        setName(profile.name);
      }
    }
  }, [showNamePrompt, profile?.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate that name is not empty
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Please enter a name");
        return;
      }

      // Play join-alien.mp3 sound
      const audio = new Audio('/audio/join-alien.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
      
      // Use the new updateProfileName function 
      await updateProfileName(trimmedName);
      
      closeNamePrompt();
    } catch (e: any) {
      setError(e?.message || "Failed to save name");
    } finally {
      setLoading(false);
    }
  }

  if (!showNamePrompt) return null;
  if (typeof document === 'undefined') return null;

  // Guard: Only render if user is authenticated and has a profile
  if (!currentUser || !profile) {
    // Close the modal if it's open but conditions aren't met
    if (showNamePrompt) {
      closeNamePrompt();
    }
    return null;
  }

  return createPortal(
    <>
      {/* Hologram base glow */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          pointerEvents: 'none',
          paddingTop: '200px'
        }}
      >
        <div
          style={{
            width: 'min(120vw, 700px)',
            height: '200px',
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,255,255,0.7) 0%, rgba(0,255,255,0.4) 30%, rgba(0,255,255,0.1) 60%, transparent 100%)',
            filter: 'blur(100px)'
          }}
        />
      </div>
      
      {/* Onboarding Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 2147483648,
          marginTop: '-160px'
        }}
      >
        <div
          className="onboarding-hologram-container"
          style={{
            width: 'min(92vw, 500px)',
            minHeight: '30vh',
            padding: '20px 24px 24px 24px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative'
          }}
        >
        
        {/* Close button - blue X in circle */}
        <button
          onClick={closeNamePrompt}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            background: 'rgba(0,255,255,0.2)',
            border: '1px solid rgba(0,255,255,0.6)',
            color: '#00FFFF',
            boxShadow: '0 0 10px rgba(0,255,255,0.3)',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
        
        {/* Soft bottom glow pseudo element */}
        <div 
          className="absolute"
          style={{
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '30px',
            background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(0,255,255,0.6) 0%, rgba(0,255,255,0.3) 40%, transparent 80%)',
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
            background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,255,255,0.4) 0%, rgba(0,255,255,0.2) 50%, transparent 100%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Header */}
        <div 
          className="text-center mb-4"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)', 
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          WHAT SHOULD WE CALL YOU?
        </div>
        
        {/* Thin cyan neon line */}
        <div 
          className="w-full h-px mb-6"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <p className="relative text-sm mb-6 text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>
          Choose your ALIEN name
        </p>

        {error && (
          <div className="relative mb-4 rounded-md bg-red-50/10 border border-red-200/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            disabled={loading}
            className="block w-full rounded-md border px-3 py-3 text-sm shadow-sm focus:outline-none disabled:opacity-50"
            style={{
              border: '1px solid rgba(0,255,255,0.4)',
              background: 'rgba(0,0,0,0.3)',
              color: '#00FFFF',
              textShadow: '0 0 4px rgba(0,255,255,0.6)',
              backdropFilter: 'blur(4px)',
              fontSize: '16px'
            }}
            maxLength={50}
          />
          
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50"
            style={{
              background: 'rgba(0,255,255,0.15)',
              border: '1px solid rgba(0,255,255,0.5)',
              color: '#00FFFF',
              textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)',
              boxShadow: loading || !name.trim()
                ? 'none' 
                : '0 0 15px rgba(0,255,255,0.4), 0 0 25px rgba(0,255,255,0.2)'
            }}
          >
            {loading ? "SAVING..." : "CONFIRM"}
          </button>
        </form>
        </div>
      </div>
    </>,
    document.body
  );
}