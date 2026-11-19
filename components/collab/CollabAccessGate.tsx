"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CollabAccessGate() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", artistName: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/collab/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to verify your details.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to verify your details."); }
    finally { setBusy(false); }
  }

  const inputClass = "mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30";
  return <main style={{ background: "#000" }} className="flex min-h-screen items-center justify-center px-4 py-12 text-white">
    <section className="w-full max-w-lg rounded-2xl border border-[#ff3ea5]/20 bg-[#111116] p-6 shadow-2xl sm:p-8">
      <img src="/elements/logo.webp" alt="CHXNDLER" className="mb-4 h-12 w-auto object-contain object-left" />
      <h1 className="mt-3 text-3xl font-black">Sign in to your collab space</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">Enter details that match the collaboration request you submitted. Any one matching name, artist name, email, or phone number will let you in.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/65">First name<input autoComplete="given-name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-white/65">Last name<input autoComplete="family-name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputClass} /></label>
        </div>
        <label className="block text-xs text-white/65">Artist name<input autoComplete="nickname" value={form.artistName} onChange={e => setForm({ ...form, artistName: e.target.value })} className={inputClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/65">Email<input type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-white/65">Phone number<input type="tel" autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} /></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#ff3ea5] px-5 py-3 text-sm font-extrabold text-black disabled:opacity-50">{busy ? "Checking…" : "Continue to collaborations"}</button>
      </form>
    </section>
  </main>;
}
