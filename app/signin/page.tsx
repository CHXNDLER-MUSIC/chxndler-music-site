"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/adminAccess";

function emailForUsername(username: string) {
  const value = username.trim().toLowerCase();
  if (value.includes("@")) return value;
  const usernames: Record<string, string> = {
    cgpierce: "cgpierce@me.com",
    alien: "alien@chxndler.world",
  };
  return usernames[value] || `${value}@chxndler.world`;
}

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/dashboard";
  const [username, setUsername] = useState(next === "/admin" ? "cgpierce@me.com" : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: emailForUsername(username),
      password,
    });
    if (authError || !data.user) {
      setError("Username or password is incorrect.");
      setLoading(false);
      return;
    }
    window.localStorage.removeItem("chx_auth_intent");

    let destination = next;
    if (!isAdminEmail(data.user.email) && destination === "/admin") destination = "/";
    if (!isAdminEmail(data.user.email) && destination === "/dashboard") {
      try {
        const { error: profileError } = await supabaseBrowser.rpc("ensure_profile");
        if (profileError && data.user.id) {
          await supabaseBrowser.from("profiles").upsert(
            { id: data.user.id, email: data.user.email },
            { onConflict: "id", ignoreDuplicates: true },
          );
        }
        const { data: profile } = await supabaseBrowser.from("profiles").select("profile_complete").maybeSingle();
        if (!profile?.profile_complete) destination = "/onboarding?entry=start";
      } catch {
        destination = "/onboarding?entry=start";
      }
    }

    router.replace(destination);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050507] px-5 py-10 text-white">
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,62,165,.13),transparent_48%)]" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-[#ff3ea5]/35 bg-[#101014]/95 p-7 shadow-[0_0_70px_rgba(255,62,165,.12)] sm:p-9">
        <p className="text-center text-[0.68rem] font-black uppercase tracking-[0.35em] text-[#ff3ea5]" style={{ textShadow: "0 0 12px rgba(255,62,165,.8)" }}>CHXNDLER</p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">Sign in</h1>
        <p className="mt-2 text-center text-sm text-white/55">Enter your username and password to continue.</p>

        <form onSubmit={signIn} className="mt-8 space-y-5">
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#ff86c5]" htmlFor="username">
            Username or email
            <input id="username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username or email" className="mt-2 block w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-[#ff3ea5] focus:shadow-[0_0_18px_rgba(255,62,165,.24)]" />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[#ff86c5]" htmlFor="password">
            Password
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="mt-2 block w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-[#ff3ea5] focus:shadow-[0_0_18px_rgba(255,62,165,.24)]" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-400/35 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#ff3ea5] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_22px_rgba(255,62,165,.3)] transition hover:bg-[#ff70bb] disabled:cursor-wait disabled:opacity-55">
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-center"><a href={`/auth/reset-password?email=${encodeURIComponent(username.includes("@") ? username : emailForUsername(username))}`} className="text-xs font-bold uppercase tracking-[0.12em] text-white/55 underline decoration-[#ff3ea5]/60 underline-offset-4 hover:text-[#ff86c5]">Set or reset password</a></div>
        </form>
      </section>
    </main>
  );
}
