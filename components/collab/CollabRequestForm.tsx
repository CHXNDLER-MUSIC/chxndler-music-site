"use client";
import { useEffect, useState } from "react";

const defaultVersion = "2026-11-18-v1";
const defaultTerms = {
  ownership: "You retain rights to your original creative contribution, subject to the final signed agreement. Master recording and composition ownership are addressed separately.",
  royalties: "Master royalties and songwriting/publishing royalties are separate. Applicable splits and compensation will be agreed in writing before work begins.",
  credits: "Your agreed artist, songwriter, and/or producer credits will be included in the official release metadata.",
  release_rights: "CHXNDLER coordinates official releases and distribution. No independent upload, release, remix, or commercial use without the required written authorization.",
};
const sections = [
  ["©", "Ownership", "ownership"], ["◔", "Royalties", "royalties"], ["✓", "Credits", "credits"], ["⬡", "Release Rights", "release_rights"],
];

export default function CollabRequestForm({ songId, title, artwork, invitedName, close }: { songId: string; title: string; artwork: string; invitedName: string; close: () => void }) {
  const [terms, setTerms] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [termsVersion, setTermsVersion] = useState(defaultVersion), [termsText, setTermsText] = useState(defaultTerms);
  useEffect(() => { fetch("/api/collaboration-terms", { cache: "no-store" }).then(async response => { if (!response.ok) return; const result = await response.json(); if (result.version && result.terms) { setTermsVersion(result.version); setTermsText({ ...defaultTerms, ...result.terms }); } }).catch(() => {}); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/collaboration-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionKey, termsVersion, songId, artistName: data.get("artistName"), email: data.get("email"), profileLink: data.get("profileLink"), phone: data.get("phone"), contributionType: data.get("contributionType"), message: data.get("message"), acknowledged: data.get("acknowledged") === "on", website: data.get("website") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="collab-form-title" className="max-h-[96dvh] w-full max-w-[42rem] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101014] p-5 text-white shadow-2xl sm:rounded-2xl sm:p-8">
      <button type="button" onClick={close} aria-label="Close" className="float-right rounded-full px-3 py-2 text-white/60 hover:text-white">✕</button>
      {done ? <div className="py-12 text-center"><h2 className="text-3xl font-black tracking-wide text-[#ff3ea5]">REQUEST RECEIVED!</h2><p className="mx-auto mt-4 max-w-md text-white/70">Thanks for reaching out! I'll review your idea and get back to you if it's a good fit.</p><button onClick={close} className="mt-8 rounded-full bg-[#ff3ea5] px-8 py-3 font-bold text-black">Done</button></div> : <>
        <div className="mb-6 flex items-center gap-4"><img src={artwork} alt="" className="h-16 w-16 rounded-lg object-cover"/><div><p className="text-xs font-bold tracking-[.2em] text-[#ff3ea5]">{title}</p><h2 id="collab-form-title" className="mt-1 text-2xl font-black">LET'S MAKE SOMETHING TOGETHER.</h2></div></div>
        <p className="mb-6 text-sm leading-6 text-white/65">Interested in collaborating? Tell me a little about yourself and what you'd like to bring to the track.</p>
        <form onSubmit={submit} className="space-y-4">
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-white/70">Artist / Stage Name *<input required maxLength={120} name="artistName" defaultValue={invitedName} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label><label className="text-xs font-semibold text-white/70">Email Address *<input required type="email" maxLength={320} name="email" className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label><label className="text-xs font-semibold text-white/70">Instagram or Music Profile<input maxLength={500} name="profileLink" placeholder="https://" className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label><label className="text-xs font-semibold text-white/70">Phone Number<input maxLength={40} name="phone" type="tel" className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label></div>
          <label className="block text-xs font-semibold text-white/70">Contribution Type *<select required name="contributionType" defaultValue="" className="mt-1 block w-full rounded-lg border border-white/10 bg-[#17171c] p-3 text-sm text-white"><option value="" disabled>Select one</option><option>Vocals / Feature</option><option>Production / Remix</option><option>Songwriting</option><option>Other</option></select></label>
          <label className="block text-xs font-semibold text-white/70">Your Idea<textarea name="message" maxLength={1200} rows={3} placeholder="What are you imagining?" className="mt-1 block w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>
          <div className="overflow-hidden rounded-xl border border-white/10"><button type="button" onClick={() => setTerms(!terms)} aria-expanded={terms} className="flex w-full items-center justify-between p-4 text-left"><span><b className="block text-sm">Collaboration Terms</b><small className="text-white/50">Ownership, royalties, credits &amp; release rights.</small></span><span className="text-[#ff3ea5]">{terms ? "−" : "+"}</span></button>{terms && <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2">{sections.map(([icon, title, key]) => <div key={title} className="flex gap-3"><span className="text-xl text-[#ff3ea5]">{icon}</span><p className="text-xs leading-5 text-white/70"><b className="block text-white">{title}</b>{termsText[key as keyof typeof defaultTerms]}</p></div>)}<p className="sm:col-span-2 text-[11px] leading-5 text-white/45">These are general guidelines, not a binding agreement. Final rights, percentages, credits, and permissions will be specified in a separate signed agreement.</p><small className="sm:col-span-2 text-[10px] text-white/30">Terms version {termsVersion}</small></div>}</div>
          <label className="flex items-start gap-3 text-xs leading-5 text-white/70"><input required type="checkbox" name="acknowledged" className="mt-1 accent-[#ff3ea5]"/>I understand this is a collaboration request, not a signed agreement or permission to use or release the track.</label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-[#ff3ea5] px-6 py-4 font-extrabold text-black disabled:opacity-50">{busy ? "Submitting…" : "Submit Collab Request →"}</button>
        </form>
      </>}
    </section>
  </div>;
}
