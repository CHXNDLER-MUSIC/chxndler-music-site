"use client";

import { FormEvent, useState } from "react";

export default function CollabAccessGate() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/collab/name-entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, artistName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't verify your collaboration access.");
      window.location.assign("/collab");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't verify your collaboration access.");
    } finally {
      setLoading(false);
    }
  }

  return <main style={{ background: "#050505" }} className="grid min-h-[100svh] place-items-center px-5 py-12 text-center text-white">
    <section className="w-full max-w-md">
      <img src="/elements/about.webp" alt="" className="mx-auto mb-6 h-20 w-20 object-contain [filter:drop-shadow(0_0_14px_rgba(253,82,175,.4))]" />
      <p className="text-xs font-bold tracking-[.24em] text-[#FD52AF]">CHXNDLER</p>
      <h1 className="mt-4 text-3xl font-bold">You're invited<br />behind the scenes.</h1>
      <p className="mt-3 text-sm leading-6 text-white/55">Wanted to share some unreleased songs and demos with you. If something speaks to you, I'd love for you to bring your own magic to it.</p>
      <form onSubmit={enter} className="mt-7 space-y-4 text-left">
        <label className="block text-sm font-bold tracking-[.12em] text-white [text-shadow:0_0_7px_rgba(253,82,175,.85)]">ARTIST NAME<input autoComplete="nickname" autoCapitalize="characters" maxLength={120} value={artistName} onChange={(event) => setArtistName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 uppercase tracking-[.08em] text-white outline-none transition focus:border-[#FD52AF] focus:shadow-[0_0_14px_rgba(253,82,175,.45)]" /></label>
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[.2em] text-white/35"><span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold tracking-[.12em] text-white [text-shadow:0_0_7px_rgba(253,82,175,.85)]">FIRST NAME<input autoComplete="given-name" autoCapitalize="characters" maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 uppercase tracking-[.08em] text-white outline-none transition focus:border-[#FD52AF] focus:shadow-[0_0_14px_rgba(253,82,175,.45)]" /></label>
          <label className="text-sm font-bold tracking-[.12em] text-white [text-shadow:0_0_7px_rgba(253,82,175,.85)]">LAST NAME<input autoComplete="family-name" autoCapitalize="characters" maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 uppercase tracking-[.08em] text-white outline-none transition focus:border-[#FD52AF] focus:shadow-[0_0_14px_rgba(253,82,175,.45)]" /></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[#FD52AF] px-4 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-60">{loading ? "Checking access…" : "EXPLORE THE MUSIC →"}</button>
      </form>
    </section>
  </main>;
}
