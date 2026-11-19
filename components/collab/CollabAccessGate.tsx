"use client";

import { FormEvent, useState } from "react";

export default function CollabAccessGate() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enterWithName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/collab/name-entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
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

  return <main style={{ background: "#050505" }} className="grid min-h-screen place-items-center px-5 py-12 text-white">
    <section className="w-full max-w-md rounded-3xl border border-[#FD52AF]/20 bg-[#101014] p-7 shadow-[0_24px_100px_rgba(253,82,175,.09)] sm:p-9">
      <img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-8 h-14 w-36 object-contain" />
      <p className="text-center text-xs font-bold tracking-[.24em] text-[#FD52AF]">THE HEARTVERSE</p>
      <h1 className="mt-4 text-center text-3xl font-bold">Enter your collaboration space</h1>
      <p className="mt-3 text-center text-sm leading-6 text-white/55">Use the first and last name CHXNDLER has approved, or open your personalized invitation link.</p>
      <form onSubmit={enterWithName} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-white/70">First name<input autoComplete="given-name" required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 text-white outline-none focus:border-[#FD52AF]" /></label>
          <label className="block text-sm text-white/70">Last name<input autoComplete="family-name" required maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 text-white outline-none focus:border-[#FD52AF]" /></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-[#FD52AF] px-4 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-60">{loading ? "Checking access…" : "Continue to collaborations"}</button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-white/35">Only approved collaborators can enter by name. If you have an invitation, use its personal link.</p>
    </section>
  </main>;
}
