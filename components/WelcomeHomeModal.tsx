"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLogOnChange } from "@/lib/useLogOnChange";
import { createPortal } from "react-dom";
import { supabaseBrowser as supabaseClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sfx";
import { useProfile } from "@/contexts/ProfileContext";
import { useRouter } from "next/navigation";
import { audioHeartverse } from "@/lib/audio-heartverse";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Sanitizes email input by removing hidden characters, trimming whitespace,
 * and normalizing the string to prevent Supabase 400 errors.
 */
const sanitizeEmail = (raw: string): string =>
  (raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width characters
    .replace(/\u00A0/g, " ") // Replace NBSP with normal space
    .trim()
    .replace(/^["']+|["']+$/g, "") // Remove surrounding quotes
    .trim()
    .toLowerCase();

/**
 * Validates email format using a simple regex pattern.
 */
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const WelcomeHomeModal = React.memo(function WelcomeHomeModal({ open, onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  type Step = "request" | "verify" | "success";
  const [step, setStep] = useState<Step>("request");
  const [code, setCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const [canUseClipboard, setCanUseClipboard] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { profile, updateProfile } = useProfile();
  
  // Memoize profile status to prevent unnecessary re-renders
  const isLoggedIn = useMemo(() => !!profile?.id, [profile?.id]);
  
  // Memoize render status logging to prevent unnecessary logs
  const renderStatus = useMemo(() => {
    if (typeof document === 'undefined') {
      return { shouldRender: false, reason: 'not mounted' };
    }
    return { shouldRender: true, reason: 'ready', open, hasProfile: isLoggedIn };
  }, [open, isLoggedIn]);

  // Log only when relevant values actually change
  useLogOnChange("✅ WelcomeHomeModal state:", { open, hasProfile: isLoggedIn });

  // Check if we should reopen the journal after login
  useEffect(() => {
    if (isLoggedIn) {
      const shouldReopenJournal = sessionStorage.getItem('reopenJournalAfterLogin');
      if (shouldReopenJournal === 'true') {
        sessionStorage.removeItem('reopenJournalAfterLogin');
        // Dispatch event to reopen journal after a brief delay
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openJournalModal'));
        }, 300);
      }
    }
  }, [isLoggedIn]);

  // Listen for closeWelcomeHomeModal event (e.g., when hamburger menu is clicked)
  useEffect(() => {
    const handleCloseWelcomeHomeModal = () => {
      if (open) {
        onClose();
      }
    };

    window.addEventListener('closeWelcomeHomeModal', handleCloseWelcomeHomeModal);
    return () => window.removeEventListener('closeWelcomeHomeModal', handleCloseWelcomeHomeModal);
  }, [open, onClose]);

  // NOTE: Do not early-return before all hooks are declared.
  // Returning early conditionally before later hooks causes
  // "Rendered fewer hooks than expected" during auth state changes.
  
  // Audio is now handled by audioHeartverse controller when modal opens
  // No local audio management needed - the controller handles playback

  function getRedirectUrl() {
    // Always use window.location.origin to ensure we get the correct domain
    // NEXT_PUBLIC_SITE_URL can be stale or incorrect in some environments
    return `${window.location.origin}/auth/callback`;
  }

  async function signInWithGoogle() {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    // Sanitize and validate email before sending to Supabase
    const cleanEmail = sanitizeEmail(email);

    // Client-side validation
    if (!isValidEmail(cleanEmail)) {
      console.error("OTP validation error", {
        message: "Invalid email format",
        rawEmail: email,
        rawEmailJson: JSON.stringify(email),
        cleanEmail,
        cleanEmailJson: JSON.stringify(cleanEmail),
        lengths: { raw: email?.length, clean: cleanEmail?.length },
      });
      setError(`Email address "${cleanEmail}" is invalid. Please check and try again.`);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Log detailed debug info for troubleshooting
        console.error("OTP error", {
          message: error?.message,
          rawEmail: email,
          rawEmailJson: JSON.stringify(email),
          cleanEmail,
          cleanEmailJson: JSON.stringify(cleanEmail),
          lengths: { raw: email?.length, clean: cleanEmail?.length },
        });
        throw error;
      }

      // Track the heart signal in our database
      try {
        await fetch('/api/track-heart-signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            source: 'welcome_home_modal'
          })
        });
      } catch (trackingError) {
        if (process.env.NODE_ENV !== "production") console.log('Heart signal tracking failed:', trackingError);
        // Don't fail the flow if tracking fails
      }

      // Play join aliens audio
      try {
        await sfx.play('join-alien', 0.7);
      } catch (audioError) {
        if (process.env.NODE_ENV !== "production") console.log('Audio playback failed:', audioError);
      }

      // Move to verify step with temporary "SIGNAL SENT" button state
      setStep("verify");
      setCode("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1000);
      setResendSeconds(60);
      // Focus the code input to surface system OTP suggestions
      setTimeout(() => {
        try { codeInputRef.current?.focus(); } catch {}
      }, 0);
    } catch (e: any) {
      // Show sanitized email in error message so users don't see invisible characters
      const errorMsg = e?.message || "Failed to send heart signal";
      const lower = errorMsg.toLowerCase();
      if ((e?.status === 429) || (lower.includes("rate") && lower.includes("limit"))) {
        // Supabase rate limited: allow user to enter their most recent code
        setError(null);
        setInfoMessage("You requested a code recently. Use the latest code in your inbox or wait ~60s to request another.");
        setStep("verify");
        setJustSent(false);
        setResendSeconds(60);
      } else if (lower.includes("invalid")) {
        setError(`Email address "${cleanEmail}" is invalid. Please check and try again.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  // Sanitize code; verification now only occurs on explicit button click
  const codeSanitized = useMemo(() => code.replace(/\D/g, "").slice(0, 6), [code]);

  async function verifyCode(submitted?: string) {
    const token = (submitted ?? codeSanitized).trim();
    if (token.length !== 6 || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      setStep("success");
      setInfoMessage(null);
      // Go straight to the homepage experience: play welcome + space music and navigate home
      try { audioHeartverse.playWelcomeHomeAndSpaceMusic(); } catch {}
      try { router.replace('/'); } catch {}
      // After success, ProfileContext should update and modal will close automatically
    } catch (e: any) {
      setError(e?.message || "Invalid or expired code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Resend with cooldown
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  // When entering verify step, attempt to enable clipboard helper and focus input
  useEffect(() => {
    if (step === 'verify') {
      try { codeInputRef.current?.focus(); } catch {}
      // Clipboard API availability (actual read requires a user gesture)
      setCanUseClipboard(typeof navigator !== 'undefined' && !!navigator.clipboard);
    }
  }, [step]);

  // WebOTP (Email) best-effort auto-read to suggest/fill the code on supported browsers
  useEffect(() => {
    if (step !== 'verify') return;
    // Only attempt in secure contexts with credentials API present
    const w = typeof window !== 'undefined' ? (window as any) : undefined;
    const n = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
    if (!w || !n || !('credentials' in n)) return;
    // Some browsers gate OTPCredential; use feature detection defensively
    const hasOtp = 'OTPCredential' in w;
    if (!hasOtp) return;
    const ac = new AbortController();
    // Abort after 90s to avoid lingering listeners
    const t = setTimeout(() => ac.abort(), 90_000);
    (async () => {
      try {
        const cred = await n.credentials.get({
          otp: { transport: ['email'] },
          signal: ac.signal,
        } as any);
        const codeFromOtp = (cred as any)?.code || (cred as any)?.otp;
        if (codeFromOtp && typeof codeFromOtp === 'string') {
          const digits = codeFromOtp.replace(/\D/g, '').slice(0, 6);
          if (digits.length === 6) {
            setCode(digits);
            // Attempt verification immediately when code is captured
            verifyCode(digits);
          }
        }
      } catch {
        // Silently ignore; user can paste or type manually
      } finally {
        clearTimeout(t);
        ac.abort();
      }
    })();
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [step]);

  async function resendCode() {
    if (loading || resendSeconds > 0 || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setInfoMessage("New code sent.");
      setResendSeconds(60);
    } catch (e: any) {
      const msg = e?.message || "Failed to resend code";
      if ((msg || "").toLowerCase().includes("rate") && (msg || "").toLowerCase().includes("limit")) {
        setError("Please wait ~60s before requesting another code.");
        setResendSeconds(60);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // Safety check: Never show welcome modal for logged-in users
  // Placed AFTER all hooks so hook order remains stable across renders
  if (isLoggedIn) {
    return null;
  }

  if (!renderStatus.shouldRender) {
    return null;
  }

  return createPortal(
    <>
      {/* Audio is now managed by audioHeartverse controller */}
      
      {/* Only show modal UI when open */}
      {open && (
        <>
      {/* Hologram base glow - align within profile bar/light beam bounds */}
      <div 
        className="fixed flex justify-center"
        style={{
          zIndex: 2147483648,
          pointerEvents: 'none',
          left: 0,
          right: 0,
          top: 'var(--profile-bar-boundary, 64px)',
          bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
          alignItems: 'flex-start',
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
      
      {/* Welcome Modal - holographic popup (bottom aligned to light beam boundary) */}
      <div
        className="fixed flex justify-center pointer-events-none"
        style={{
          zIndex: 2147483648,
          left: 0,
          right: 0,
          top: 'var(--profile-bar-boundary, 64px)',
          bottom: 'calc(var(--light-beam-boundary, 120px) + var(--beam-height, 0px))',
          alignItems: 'flex-start'
        }}
      >
        <div
          className={`welcome-hologram-container pointer-events-auto transition-all duration-500 ${step === 'success' ? 'portalActive scale-105 opacity-0' : 'opacity-100'}`}
          style={{
            width: 'min(92vw, 700px)',
            height: '100%',
            padding: '18px 14px 18px 14px',
            borderRadius: 18,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,255,255,0.55)',
            boxShadow: '0 -8px 25px rgba(0,255,255,0.4), 0 -4px 15px rgba(0,255,255,0.25), 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(0,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(140%)',
            color: '#00FFFF',
            position: 'relative'
          }}
        >
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
        
        {/* Top bloom glow - simulates hologram light rising through panel */}
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

        {/* Close button */}
        <button
          onClick={() => {
            try { sfx.play('click', 0.5); } catch {}
            onClose();
          }}
          onMouseEnter={() => {
            try { sfx.play('hover', 0.35); } catch {}
          }}
          className="absolute top-2 right-4 text-cyan-400 hover:text-cyan-200 hover:scale-110 cursor-pointer w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center transition-transform duration-150"
          style={{
            fontSize: '16px',
            boxShadow: '0 0 15px rgba(0,255,255,0.8), 0 0 25px rgba(0,255,255,0.5), 0 0 35px rgba(0,255,255,0.3)',
            textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 15px rgba(0,255,255,0.6)',
            background: 'rgba(0,255,255,0.1)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        
        {/* Header */}
        <div 
          className="text-center mb-1"
          style={{ 
            color: '#00FFFF', 
            textShadow: '0 0 8px rgba(0,255,255,0.6)', 
            fontSize: '26px',
            fontWeight: 'bold'
          }}
        >
          WELCOME HOME
        </div>
        
        {/* Thin yellow neon line */}
        <div 
          className="w-full h-px mb-2"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8) 20%, rgba(0,255,255,1) 50%, rgba(0,255,255,0.8) 80%, transparent)',
            boxShadow: '0 0 4px rgba(0,255,255,0.6)'
          }}
        />

        <p className="relative text-lg mb-2 text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)' }}>WELCOME TO THE <span style={{ color: '#FF69B4', textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 16px rgba(255,105,180,0.6), 0 0 24px rgba(255,105,180,0.4)' }}>HEARTVERSE</span> <span style={{ color: '#FF69B4', textShadow: '0 0 8px rgba(255,105,180,0.8), 0 0 16px rgba(255,105,180,0.6), 0 0 24px rgba(255,105,180,0.4)' }}>{"<3"}</span></p>
        
        <p className="relative text-lg mb-1 text-center" style={{ color: '#00FFFF', textShadow: '0 0 8px rgba(0,255,255,0.6)' }}>Connect with other Aliens, receive early releases and access exclusive events.</p>

        {error && (
          <div className="relative mb-1 rounded-md bg-red-50/10 border border-red-200/40 p-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="relative mb-1 rounded-md bg-green-50/10 border border-green-200/40 p-2 text-sm text-green-200">
            {infoMessage}
          </div>
        )}

        <div className="relative space-y-1" style={{ marginLeft: '20px' }}>

          {/* Email or Code Section (keeps layout stable) */}
          {step === "request" ? (
            <form onSubmit={signInWithEmail} className="space-y-1.5">
              <input
                id="welcome-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="block w-full rounded-md border px-3 py-3 text-lg shadow-sm focus:outline-none disabled:opacity-50"
                style={{
                  border: '1px solid rgba(0,255,255,0.4)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#00FFFF',
                  textShadow: '0 0 4px rgba(0,255,255,0.6)',
                  backdropFilter: 'blur(4px)'
                }}
              />
              {resendSeconds > 0 && (
                <div className="text-xs" style={{ color: '#00FFFF' }}>
                  Please wait {resendSeconds}s before trying again.
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ color: '#00FFFF' }}>
                <span>{email}</span>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading || resendSeconds > 0 || step !== 'verify'}
                  className="underline disabled:no-underline disabled:opacity-50"
                  style={{ color: '#FF69B4' }}
                >
                  {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
                </button>
              </div>
              <input
                id="welcome-code"
                type="text"
                inputMode="numeric"
                name="one-time-code"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={codeSanitized}
                onChange={(e) => setCode(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  const digits = (text || '').replace(/\D/g, '').slice(0, 6);
                  if (digits.length === 6) {
                    e.preventDefault();
                    setCode(digits);
                  }
                }}
                ref={codeInputRef}
                enterKeyHint="done"
                placeholder="••••••"
                disabled={step === 'success'}
                className="block w-full rounded-md border px-3 py-3 text-lg shadow-sm focus:outline-none disabled:opacity-50 text-center tracking-widest"
                style={{
                  border: '1px solid rgba(0,255,255,0.4)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#00FFFF',
                  textShadow: '0 0 4px rgba(0,255,255,0.6)',
                  backdropFilter: 'blur(4px)'
                }}
              />
              {canUseClipboard && (
                <div className="flex justify-center mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const digits = (text || '').replace(/\D/g, '').slice(0, 6);
                        if (digits.length === 6) {
                          setCode(digits);
                          // Attempt verification immediately when we have a full token
                          verifyCode(digits);
                        }
                      } catch (err) {
                        // Silently ignore clipboard errors; user can paste manually
                      }
                    }}
                    className="underline text-xs"
                    style={{ color: '#FF69B4' }}
                  >
                    Paste code from clipboard
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Primary Button: changes by step; stays in place */}
          <div className="flex justify-center" style={{ marginTop: '8px' }}>
            <button
              onClick={() => {
                if (step === 'request') {
                  if (email.length > 0) signInWithEmail({ preventDefault: () => {} } as any);
                } else if (step === 'verify') {
                  verifyCode();
                }
              }}
              disabled={loading || (step === 'request' ? (email.length === 0 || resendSeconds > 0) : (codeSanitized.length !== 6 && !justSent))}
              className="w-full flex items-center justify-center rounded-lg px-3 py-2 text-lg font-medium transition disabled:opacity-50 border"
              style={step === 'verify' && !justSent && codeSanitized.length === 6 ? {
                // Yellow glow for CONFIRM SIGNAL
                background: 'rgba(242,239,29,0.08)',
                border: '1px solid rgba(242,239,29,0.6)',
                color: '#F2EF1D',
                textShadow: '0 0 8px rgba(242,239,29,0.9), 0 0 16px rgba(242,239,29,0.6)',
                boxShadow: '0 0 15px rgba(242,239,29,0.4), 0 0 30px rgba(242,239,29,0.2)'
              } : step === 'verify' && justSent ? {
                // Brief success state after sending signal
                background: 'rgba(0,255,0,0.2)',
                border: '1px solid rgba(0,255,0,0.6)',
                color: '#00FF00',
                textShadow: '0 0 8px rgba(0,255,0,0.8), 0 0 16px rgba(0,255,0,0.6), 0 0 24px rgba(0,255,0,0.4)',
                boxShadow: '0 0 15px rgba(0,255,0,0.6), 0 0 25px rgba(0,255,0,0.4), 0 0 35px rgba(0,255,0,0.2)'
              } : step === 'success' ? {
                background: 'rgba(0,255,0,0.2)',
                border: '1px solid rgba(0,255,0,0.6)',
                color: '#00FF00',
                textShadow: '0 0 8px rgba(0,255,0,0.8), 0 0 16px rgba(0,255,0,0.6), 0 0 24px rgba(0,255,0,0.4)'
              } : {
                // Default cyan style
                background: 'rgba(0,255,255,0.15)',
                border: '1px solid rgba(0,255,255,0.5)',
                color: '#00FFFF',
                textShadow: '0 0 8px rgba(0,255,255,0.8), 0 0 16px rgba(0,255,255,0.6), 0 0 24px rgba(0,255,255,0.4)',
                boxShadow: loading || (step === 'request' && email.length === 0)
                  ? 'none'
                  : '0 0 15px rgba(0,255,255,0.4), 0 0 25px rgba(0,255,255,0.2)'
              }}
            >
              {step === 'success' ? 'SIGNAL CONFIRMED' : step === 'verify' ? (justSent ? 'SIGNAL SENT' : 'CONFIRM SIGNAL') : 'SEND SIGNAL'}
          </button>
          </div>
        </div>
        </div>
      </div>
        </>
      )}
    </>,
    document.body
  );
});

export default WelcomeHomeModal;
