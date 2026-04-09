"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser as supabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "/";

  type Step = "request" | "verify" | "success";
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [justSent, setJustSent] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Failed to start sign-in");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: request code
  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep("verify");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 1000);
      setResendSeconds(30);
      // Focus the code input to surface system OTP suggestions
      setTimeout(() => { try { codeInputRef.current?.focus(); } catch {} }, 0);
    } catch (e: any) {
      setError(e?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // Auto-verify when code reaches 6 (debounced ~150ms)
  const codeSanitized = useMemo(() => code.replace(/\D/g, "").slice(0, 6), [code]);
  useEffect(() => {
    if (step !== "verify") return;
    if (codeSanitized.length !== 6) return;
    const t = setTimeout(() => verifyCode(codeSanitized), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSanitized, step]);

  // Step 2: verify code
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
      setInfoMessage("Signal confirmed. Welcome home.");
      // Portal/warp confirmation (max 600ms)
      setTimeout(() => {
        router.replace(next);
      }, 600);
    } catch (e: any) {
      setError(e?.message || "Invalid or expired code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Resend with 30s cooldown
  useEffect(() => {
    if (step !== "verify") return;
    if (resendSeconds <= 0) return;
    const id = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step, resendSeconds]);

  // WebOTP (Email) best-effort auto-read to suggest/fill the code on supported browsers
  useEffect(() => {
    if (step !== "verify") return;
    const w = typeof window !== 'undefined' ? (window as any) : undefined;
    const n = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
    if (!w || !n || !('credentials' in n)) return;
    const hasOtp = 'OTPCredential' in w;
    if (!hasOtp) return;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 90_000);
    (async () => {
      try {
        const cred = await n.credentials.get({ otp: { transport: ['email'] }, signal: ac.signal } as any);
        const codeFromOtp = (cred as any)?.code || (cred as any)?.otp;
        if (codeFromOtp && typeof codeFromOtp === 'string') {
          const digits = codeFromOtp.replace(/\D/g, '').slice(0, 6);
          if (digits.length === 6) {
            setCode(digits);
            verifyCode(digits);
          }
        }
      } catch {
        // Ignore if unsupported or user declined
      } finally {
        clearTimeout(t);
        ac.abort();
      }
    })();
    return () => { clearTimeout(t); ac.abort(); };
  }, [step]);

  async function resendCode() {
    if (loading || resendSeconds > 0 || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({ email });
      if (error) throw error;
      setInfoMessage("New code sent.");
      setResendSeconds(30);
    } catch (e: any) {
      setError(e?.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div
        ref={containerRef}
        className={`relative rounded-2xl p-6 backdrop-blur-md border border-white/20 bg-white/5 shadow-[0_0_26px_rgba(56,182,255,0.35)] transition-all duration-500 ${
          step === "success" ? "portalActive scale-105 opacity-0" : "opacity-100"
        }`}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow:
              "0 0 40px rgba(252,84,175,0.25), 0 0 80px rgba(56,182,255,0.25), inset 0 0 24px rgba(242,239,29,0.15)",
          }}
        />

        <h1 className="relative text-3xl font-bold tracking-wider text-white drop-shadow mb-6">
          ENTER THE HEARTVERSE
        </h1>
        <p className="relative text-sm text-white/80 mb-6">You’re invited into the Heartverse.</p>

        {error && (
          <div className="relative mb-3 rounded-md bg-red-50/10 border border-red-200/40 p-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="relative mb-3 rounded-md bg-green-50/10 border border-green-200/40 p-2 text-sm text-green-200">
            {infoMessage}
          </div>
        )}

        <div className="relative space-y-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-[#FC54AF] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-50"
          >
            Sign in with Google
          </button>

          <div className="relative flex items-center text-white/50">
            <div className="flex-grow border-t border-white/20" />
            <span className="mx-3 text-xs uppercase">or</span>
            <div className="flex-grow border-t border-white/20" />
          </div>

          <div className="space-y-3">
            {step === "request" && (
              <form onSubmit={requestCode} className="space-y-3">
                <label htmlFor="email" className="block text-sm font-medium text-white/90">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || email.length === 0}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-50"
                >
                  SEND SIGNAL
                </button>
              </form>
            )}

            {step !== "request" && (
              <div className="space-y-3">
                <label htmlFor="code" className="block text-sm font-medium text-white/90">
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  name="one-time-code"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={codeSanitized}
                  onChange={(e) => setCode(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    const digits = (text || "").replace(/\D/g, "").slice(0, 6);
                    if (digits.length === 6) {
                      e.preventDefault();
                      setCode(digits);
                    }
                  }}
                  placeholder="••••••"
                  disabled={step === "success"}
                  className="block w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-center tracking-widest text-lg text-white placeholder-white/40 shadow-sm focus:border-[#38B6FF] focus:outline-none"
                  ref={codeInputRef}
                />

                <button
                  type="button"
                  onClick={() => verifyCode()}
                  disabled={loading || codeSanitized.length !== 6 || step === "success"}
                  className="w-full inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition disabled:opacity-50 border"
                  style={step === "verify" && !justSent ? {
                    color: '#F2EF1D',
                    borderColor: 'rgba(242,239,29,0.6)',
                    background: 'rgba(242,239,29,0.08)',
                    textShadow: '0 0 8px rgba(242,239,29,0.9), 0 0 16px rgba(242,239,29,0.6)',
                    boxShadow: '0 0 15px rgba(242,239,29,0.4), 0 0 30px rgba(242,239,29,0.2)'
                  } : {
                    color: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.06)'
                  }}
                >
                  {step === "success" ? "SIGNAL CONFIRMED" : (step === "verify" && justSent ? "SIGNAL SENT" : "CONFIRM SIGNAL")}
                </button>

                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={loading || resendSeconds > 0 || step !== "verify"}
                    className="underline disabled:no-underline disabled:opacity-50"
                  >
                    {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
