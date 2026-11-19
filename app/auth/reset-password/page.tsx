"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"request" | "sent" | "change">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStage("change");
    });
    if (params.get("recovery") === "1" || window.location.hash.includes("type=recovery")) {
      setStage("change");
    } else {
      supabaseBrowser.auth.getSession().then(({ data }) => {
        if (data.session && window.localStorage.getItem("chx_auth_intent") === "password_recovery") setStage("change");
      });
    }
    return () => listener.subscription.unsubscribe();
  }, [params]);

  async function sendReset(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    window.localStorage.setItem("chx_auth_intent", "password_recovery");
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=%2Fauth%2Freset-password` });
    if (resetError) window.localStorage.removeItem("chx_auth_intent");
    if (resetError) setError("We couldn’t send a password reset email. Check the address and try again.");
    else { setStage("sent"); setMessage("If an account exists for that address, a password reset link is on its way."); }
    setBusy(false);
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords don’t match."); return; }
    setBusy(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
    if (updateError) setError("We couldn’t save that password. Reopen the reset link and try again.");
    else { window.localStorage.removeItem("chx_auth_intent"); setStage("sent"); setMessage("Password updated. You can now sign in with your username and password."); }
    setBusy(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#050507] px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-[#ff3ea5]/35 bg-[#101014]/95 p-8 shadow-[0_0_70px_rgba(255,62,165,.12)]">
    <p className="text-center text-xs font-black uppercase tracking-[.3em] text-[#ff3ea5]">CHXNDLER</p>
    <h1 className="mt-3 text-center text-2xl font-black">{stage === "change" ? "Set your password" : "Password help"}</h1>
    {message && <p role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-950/30 p-4 text-sm text-emerald-100">{message}</p>}
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100">{error}</p>}
    {stage === "request" && <form onSubmit={sendReset} className="mt-6 space-y-4"><label className="block text-xs font-bold uppercase tracking-widest text-[#ff86c5]">Account email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black/60 p-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#ff3ea5]" /></label><button disabled={busy} className="w-full rounded-xl bg-[#ff3ea5] p-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</button></form>}
    {stage === "sent" && <a href="/signin?next=%2Fadmin" className="mt-6 block rounded-xl border border-[#ff3ea5]/50 p-4 text-center text-xs font-black uppercase tracking-widest text-white hover:bg-[#ff3ea5]/10">Return to sign in</a>}
    {stage === "change" && <form onSubmit={updatePassword} className="mt-6 space-y-4"><label className="block text-xs font-bold uppercase tracking-widest text-[#ff86c5]">New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black/60 p-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#ff3ea5]" /></label><label className="block text-xs font-bold uppercase tracking-widest text-[#ff86c5]">Confirm password<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black/60 p-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#ff3ea5]" /></label><button disabled={busy} className="w-full rounded-xl bg-[#ff3ea5] p-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Saving…" : "Save password"}</button></form>}
    <a href="/signin?next=%2Fadmin" className="mt-6 block text-center text-xs font-bold uppercase tracking-widest text-white/45 underline underline-offset-4 hover:text-white">Back to sign in</a>
  </section></main>;
}
