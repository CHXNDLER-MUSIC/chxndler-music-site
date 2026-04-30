"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser as supabaseClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/dashboard";

  type Step = "request" | "verify" | "success";
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [justSent, setJustSent] = useState(false);
  const [showWarpFlash, setShowWarpFlash] = useState(false);
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
      setResendSeconds(60);
      // Focus the code input to surface system OTP suggestions
      setTimeout(() => { try { codeInputRef.current?.focus(); } catch {} }, 0);
    } catch (e: any) {
      setError(e?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  const codeSanitized = useMemo(() => code.replace(/\D/g, "").slice(0, 6), [code]);
  useEffect(() => {
    if (step !== "verify") return;
    if (codeSanitized.length !== 6) return;
    const t = setTimeout(() => verifyCode(codeSanitized), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSanitized, step]);

  async function verifyCode(submitted?: string) {
    const token = (submitted ?? codeSanitized).trim();
    if (token.length !== 6 || !email) return;
    setLoading(true);
    setError(null);
    try {
      const { data: verifyData, error } = await supabaseClient.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      setStep("success");
      setInfoMessage("Signal confirmed. Welcome home.");

      // Trigger warp effect immediately on confirmed login
      setShowWarpFlash(true);
      try { new Audio('/audio/warp.mp3').play().catch(() => {}); } catch {}

      // Ensure profile row exists then check if user needs onboarding
      let dest = next;
      try {
        const { error: rpcError } = await supabaseClient.rpc('ensure_profile');
        if (rpcError) {
          const uid = verifyData?.session?.user?.id;
          const uemail = verifyData?.session?.user?.email;
          if (uid) {
            await supabaseClient
              .from('profiles')
              .upsert({ id: uid, email: uemail }, { onConflict: 'id', ignoreDuplicates: true });
          }
        }
        // Use profile_complete — ensure_profile never sets this true, only onboarding does
        const { data } = await supabaseClient.from('profiles').select('profile_complete').maybeSingle();
        if (!data?.profile_complete) {
          if (verifyData?.session) {
            try { sessionStorage.setItem('chx_at', verifyData.session.access_token); } catch {}
            try { sessionStorage.setItem('chx_rt', verifyData.session.refresh_token); } catch {}
          }
          dest = '/onboarding?entry=start';
        }
      } catch {
        // On any error, default to onboarding for safety
        if (verifyData?.session) {
          try { sessionStorage.setItem('chx_at', verifyData.session.access_token); } catch {}
          try { sessionStorage.setItem('chx_rt', verifyData.session.refresh_token); } catch {}
        }
        dest = '/onboarding?entry=start';
      }

      setTimeout(() => router.replace(dest), 1400);
    } catch (e: any) {
      setError(e?.message || "Invalid or expired code. Try again.");
    } finally {
      setLoading(false);
    }
  }

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
        // Ignore if unsupported or declined
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
      setResendSeconds(60);
    } catch (e: any) {
      setError(e?.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      {showWarpFlash && <div className="warp-flash" />}
      <div className={`relative rounded-2xl p-6 border border-gray-200 bg-white shadow transition-all duration-500 ${step === "success" ? "portalActive scale-105 opacity-0" : "opacity-100"}`}>
        <h1 className="text-2xl font-semibold mb-6">Join the Heartverse</h1>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="mb-3 rounded-md bg-green-50 border border-green-200 p-2 text-sm text-green-700">
            {infoMessage}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Sign in with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="mx-3 text-xs uppercase text-gray-400">or</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          {step === "request" && (
            <form onSubmit={requestCode} className="space-y-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || email.length === 0}
                className="w-full inline-flex items-center justify-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                SEND SIGNAL
              </button>
            </form>
          )}

          {step !== "request" && (
            <div className="space-y-3">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
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
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-center tracking-widest text-lg shadow-sm focus:border-black focus:outline-none"
                ref={codeInputRef}
              />

              <button
                type="button"
                onClick={() => verifyCode()}
                disabled={loading || codeSanitized.length !== 6 || step === "success"}
                className="w-full inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 border"
                style={step === "verify" && !justSent ? {
                  color: '#F2EF1D',
                  borderColor: 'rgba(242,239,29,0.6)',
                  background: 'rgba(242,239,29,0.08)',
                  textShadow: '0 0 8px rgba(242,239,29,0.9), 0 0 16px rgba(242,239,29,0.6)',
                  boxShadow: '0 0 15px rgba(242,239,29,0.4), 0 0 30px rgba(242,239,29,0.2)'
                } : {
                  color: '#111827',
                  borderColor: 'rgba(209,213,219,1)',
                  background: '#FFFFFF'
                }}
              >
                {step === "success" ? "SIGNAL CONFIRMED" : (step === "verify" && justSent ? "SIGNAL SENT" : "CONFIRM SIGNAL")}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <button
                  type="button"
                  onClick={() => { setStep("request"); setCode(""); setError(null); setInfoMessage(null); setResendSeconds(60); }}
                  className="underline opacity-60 hover:opacity-100 transition-opacity"
                >
                  {email}
                </button>
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
    </main>
  );
}
