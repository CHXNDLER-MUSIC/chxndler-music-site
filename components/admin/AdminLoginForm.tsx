"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Method = "password" | "email_code";

function accountEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  const known: Record<string, string> = { cgpierce: "cgpierce@me.com", alien: "alien@chxndler.world" };
  return known[normalized] || `${normalized}@chxndler.world`;
}

export default function AdminLoginForm({ signedInEmail = "" }: { signedInEmail?: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: accountEmail(username), password });
    if (authError) { setError("That username or password wasn’t accepted. Check it and try again."); setBusy(false); return; }
    await enterAdmin();
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const targetEmail = accountEmail(email);
    const { error: authError } = await supabaseBrowser.auth.signInWithOtp({ email: targetEmail, options: { shouldCreateUser: false } });
    if (authError) { setError("Couldn’t send a sign-in code. Confirm this email belongs to your existing admin account and try again."); setBusy(false); return; }
    setEmail(targetEmail); setCodeSent(true); setNotice(`A sign-in code was sent to ${targetEmail}.`); setBusy(false);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const { error: authError } = await supabaseBrowser.auth.verifyOtp({ email: accountEmail(email), token: code.trim(), type: "email" });
    if (authError) { setError("That code is invalid or expired. Request a new code and try again."); setBusy(false); return; }
    await enterAdmin();
  }

  async function enterAdmin() {
    window.localStorage.removeItem("chx_auth_intent");
    router.replace("/admin");
    router.refresh();
  }

  const field = "mt-2 block w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30 focus:border-[#ff3ea5] focus:ring-2 focus:ring-[#ff3ea5]/20";
  return <main className="grid min-h-screen place-items-center bg-[#09090c] px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-[#ff3ea5]/30 bg-[#101014] p-7 shadow-[0_0_60px_rgba(255,62,165,.1)] sm:p-9">
    <p className="text-center text-xs font-black uppercase tracking-[.3em] text-[#ff3ea5]">CHXNDLER · PRIVATE</p>
    <h1 className="mt-3 text-center text-3xl font-black">Admin sign-in</h1>
    <p className="mt-2 text-center text-sm leading-6 text-white/55">Only the authorized admin account can open this workspace.{signedInEmail ? ` You’re currently signed in as ${signedInEmail}.` : ""}</p>
    <div className="mt-7 grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1" role="tablist" aria-label="Sign-in method">
      {([["password", "Password"], ["email_code", "Email code"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={method === value} onClick={() => { setMethod(value); setError(""); setNotice(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${method === value ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}>{label}</button>)}
    </div>
    {method === "password" ? <form onSubmit={event => void submitPassword(event)} className="mt-5 space-y-4">
      <label className="block text-xs font-bold uppercase tracking-[.14em] text-white/60">Username or email<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className={field} placeholder="Your admin username or email" /></label>
      <label className="block text-xs font-bold uppercase tracking-[.14em] text-white/60">Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={field} placeholder="Password" /></label>
      <button disabled={busy} className="w-full rounded-xl bg-[#ff3ea5] px-5 py-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      <a href={`/auth/reset-password?email=${encodeURIComponent(accountEmail(username))}`} className="block text-center text-xs text-white/45 underline underline-offset-4 hover:text-white">Set or reset password</a>
    </form> : <div className="mt-5">
      {!codeSent ? <form onSubmit={event => void sendCode(event)} className="space-y-4"><label className="block text-xs font-bold uppercase tracking-[.14em] text-white/60">Admin email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={field} placeholder="name@example.com" /></label><button disabled={busy} className="w-full rounded-xl bg-[#ff3ea5] px-5 py-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Sending code…" : "Send sign-in code"}</button></form>
        : <form onSubmit={event => void verifyCode(event)} className="space-y-4"><label className="block text-xs font-bold uppercase tracking-[.14em] text-white/60">Email code<input required inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} className={`${field} text-center tracking-[.4em]`} placeholder="••••••" /></label><button disabled={busy} className="w-full rounded-xl bg-[#ff3ea5] px-5 py-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Verifying…" : "Verify code"}</button><button type="button" onClick={() => { setCodeSent(false); setCode(""); setNotice(""); }} className="w-full text-sm text-white/50 underline underline-offset-4">Use a different email</button></form>}
    </div>}
    {notice && <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-sm text-emerald-200" role="status">{notice}</p>}
    {error && <p className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 p-3 text-sm text-red-200" role="alert">{error}</p>}
  </section></main>;
}
