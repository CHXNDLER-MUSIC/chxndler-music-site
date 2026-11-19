"use client";

import { useEffect, useRef, useState } from "react";

const defaultVersion = "2026-11-18-v1";
const defaultTerms = {
  ownership: "You retain rights to your original creative contribution, subject to the final signed agreement. Master recording and composition ownership are addressed separately.",
  royalties: "Master royalties and songwriting/publishing royalties are separate. Applicable splits and compensation will be agreed in writing before work begins.",
  credits: "Your agreed artist, songwriter, and/or producer credits will be included in the official release metadata.",
  release_rights: "CHXNDLER coordinates official releases and distribution. No independent upload, release, remix, or commercial use without the required written authorization.",
};

const contributionOptions = [
  { value: "Vocals / Feature", label: "Sing / Feature", note: "Bring your voice to the track." },
  { value: "Production / Remix", label: "Produce / Remix", note: "Shape a new sound together." },
  { value: "Music Video", label: "Music Video", note: "Build the visual world." },
  { value: "Other", label: "Something Else", note: "Share another idea." },
] as const;

const fieldClass = "mt-2 block h-12 w-full rounded-xl border border-white/[.12] bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#FD52AF]/65 focus:ring-2 focus:ring-[#FD52AF]/15";

export default function CollabRequestForm({ songId, title, artwork, invitedName, invitedEmail = "", initialContributionType = "", videoProjectId = "", close }: { songId: string; title: string; artwork: string; invitedName: string; invitedEmail?: string; initialContributionType?: string; videoProjectId?: string; close: () => void }) {
  const [expandedTerms, setExpandedTerms] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [contributionType, setContributionType] = useState(initialContributionType || "");
  const [termsVersion, setTermsVersion] = useState(defaultVersion);
  const [termsText, setTermsText] = useState(defaultTerms);
  const dialogRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(close);
  const submissionKey = useRef("");
  const isPublicVideoApplication = !invitedName && !invitedEmail && Boolean(videoProjectId);

  closeRef.current = close;
  if (!submissionKey.current && typeof crypto !== "undefined") submissionKey.current = crypto.randomUUID();

  useEffect(() => {
    void fetch("/api/collaboration-terms", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json();
        if (result.version && result.terms) {
          setTermsVersion(result.version);
          setTermsText({ ...defaultTerms, ...result.terms });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const selectedContribution = contributionOptions.find(option => option.value === contributionType);
  const canSubmit = validEmail && Boolean(selectedContribution) && acknowledged && !busy;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/collaboration-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionKey: submissionKey.current,
          termsVersion,
          songId,
          videoProjectId,
          email: email.trim(),
          profileLink: data.get("profileLink"),
          phone: data.get("phone"),
          contributionType,
          message: data.get("message"),
          acknowledged,
          website: data.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Your request could not be sent. Please try again.");
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your request could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="collab-form-title" aria-describedby="collab-form-intro" className="relative max-h-[100dvh] w-full max-w-[48rem] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/[.12] bg-[#101014] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-white shadow-[0_0_0_1px_rgba(253,82,175,.06),0_2rem_5rem_rgba(0,0,0,.6)] sm:max-h-[92dvh] sm:rounded-3xl sm:px-9 sm:pb-8 sm:pt-8">
      {!done && <button type="button" onClick={close} aria-label="Close collaboration request" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-lg text-white/45 transition hover:bg-white/[.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FD52AF]">×</button>}
      {done ? <div className="flex min-h-[24rem] flex-col items-center justify-center px-2 py-10 text-center">
        <span aria-hidden="true" className="mb-5 grid h-11 w-11 place-items-center rounded-full border border-[#FD52AF]/45 bg-[#FD52AF]/10 text-[#FD52AF]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6"/></svg></span>
        <h2 id="collab-form-title" className="text-2xl font-black tracking-tight sm:text-3xl">Your idea is in orbit.</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/60">Thanks for reaching out! I&apos;ll review your idea and get back to you soon.</p>
        <button type="button" onClick={close} className="mt-8 min-h-12 rounded-full bg-[#FD52AF] px-7 text-sm font-extrabold text-[#170d14] transition hover:shadow-[0_0_24px_rgba(253,82,175,.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Back to Music</button>
      </div> : <>
        <header className="mb-7 pr-10 sm:mb-8 sm:pr-12">
          {invitedName && <p className="mb-2 text-[.62rem] font-bold uppercase tracking-[.18em] text-[#FD52AF]">A personal invitation for {invitedName}</p>}
          <h2 id="collab-form-title" className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">COLLABORATE ON {title}</h2>
          <p className="mt-2 text-base font-semibold text-white/90">Let&apos;s make something together.</p>
          <p id="collab-form-intro" className="mt-1 text-sm leading-6 text-white/55"><em>Love this track? Tell me how you&apos;d like to be part of it.</em></p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[10000px] h-px w-px opacity-0" aria-hidden="true" />
          <div className="grid gap-5 sm:grid-cols-2">
            <label htmlFor="collab-email" className="block text-xs font-semibold text-white/75">Email address <span className="text-[#FD52AF]">*</span>
              <input ref={emailRef} id="collab-email" name="email" type="email" required autoComplete="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass}/>
            </label>
            <label htmlFor="collab-profile" className="block text-xs font-semibold text-white/75">Instagram / Music profile <span className="font-normal text-white/40">Optional</span>
              <input id="collab-profile" name="profileLink" type="text" autoComplete="url" maxLength={500} placeholder="@yourhandle or profile URL" className={fieldClass}/>
            </label>
            <label htmlFor="collab-phone" className="block text-xs font-semibold text-white/75">Phone number <span className="font-normal text-white/40">Optional</span>
              <input id="collab-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(555) 555-0123" className={fieldClass}/>
            </label>
          </div>

          <fieldset>
            <legend className="mb-3 text-xs font-semibold text-white/75">How would you like to collaborate? <span className="text-[#FD52AF]">*</span></legend>
            <div role="radiogroup" aria-label="How would you like to collaborate?" className="grid gap-2 sm:grid-cols-2">
              {contributionOptions.map(option => {
                const selected = contributionType === option.value;
                const disabled = isPublicVideoApplication && option.value !== "Music Video";
                return <label key={option.value} className={`relative flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#FD52AF] ${disabled ? "cursor-not-allowed opacity-35" : selected ? "border-[#FD52AF]/60 bg-[#FD52AF]/[.08]" : "border-white/[.1] bg-white/[.02] hover:border-white/20 hover:bg-white/[.04]"}`}>
                  <input className="sr-only" type="radio" name="contributionType" value={option.value} checked={selected} disabled={disabled} required onChange={() => setContributionType(option.value)}/>
                  <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${selected ? "border-[#FD52AF]" : "border-white/30"}`}>{selected && <span className="h-2 w-2 rounded-full bg-[#FD52AF]"/>}</span>
                  <span className="min-w-0"><span className={`block text-sm font-bold ${selected ? "text-white" : "text-white/80"}`}>{option.label}</span><span className="mt-0.5 block text-xs text-white/45">{option.note}</span></span>
                </label>;
              })}
            </div>
            {isPublicVideoApplication && <p className="mt-2 text-[.68rem] text-white/40">This public project is accepting music video ideas.</p>}
          </fieldset>

          <label htmlFor="collab-message" className="block text-xs font-semibold text-white/75">Your idea <span className="font-normal text-white/40">Optional</span>
            <textarea id="collab-message" name="message" maxLength={1200} rows={3} placeholder="What are you imagining?" className="mt-2 block min-h-28 w-full resize-y rounded-xl border border-white/[.12] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[#FD52AF]/65 focus:ring-2 focus:ring-[#FD52AF]/15"/>
          </label>

          <section className="rounded-2xl border border-white/[.1] bg-white/[.02] p-4 sm:p-5" aria-labelledby="collab-guidelines-heading">
            <h3 id="collab-guidelines-heading" className="text-sm font-bold text-white">Collaboration Guidelines</h3>
            <p className="mt-1.5 text-xs leading-5 text-white/55">Your request is non-binding. Credits, ownership, royalties, and permissions will be agreed upon separately.</p>
            <button type="button" aria-expanded={expandedTerms} aria-controls="collab-guidelines-details" onClick={() => setExpandedTerms(value => !value)} className="mt-3 min-h-8 rounded text-xs font-semibold text-[#FD52AF] transition hover:text-[#ff91c8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FD52AF]">{expandedTerms ? "Hide guidelines ↑" : "Read guidelines ↓"}</button>
            {expandedTerms && <div id="collab-guidelines-details" className="mt-3 space-y-4 border-t border-white/[.08] pt-4">
              <ul className="list-disc space-y-2 pl-5 text-xs leading-5 text-white/70">
                <li>Unreleased recordings and demos must remain private. Do not share, upload, sample, distribute, or use the music without written authorization.</li>
                <li>Songwriting splits, royalties, credits, ownership, and compensation must be agreed in writing before work begins.</li>
                <li>Official release and distribution require written authorization from CHXNDLER.</li>
                <li>This request is not a contract or permission to use, release, remix, or distribute the music.</li>
              </ul>
              <div className="space-y-3 border-t border-white/[.08] pt-4">
                <p className="text-[.62rem] font-bold uppercase tracking-[.14em] text-white/40">Current approved terms · {termsVersion}</p>
                <p className="text-xs leading-5 text-white/65"><strong className="text-white/85">Ownership.</strong> {termsText.ownership}</p>
                <p className="text-xs leading-5 text-white/65"><strong className="text-white/85">Royalties.</strong> {termsText.royalties}</p>
                <p className="text-xs leading-5 text-white/65"><strong className="text-white/85">Credits.</strong> {termsText.credits}</p>
                <p className="text-xs leading-5 text-white/65"><strong className="text-white/85">Release rights.</strong> {termsText.release_rights}</p>
                <p className="text-[.68rem] leading-5 text-white/45">These are collaboration guidelines, not a binding agreement. Any final rights, percentages, credits, compensation, and permissions will be recorded in a separate signed agreement.</p>
              </div>
            </div>}
          </section>

          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/70">
            <input type="checkbox" name="acknowledged" required checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FD52AF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FD52AF]"/>
            <span>I understand this is a collaboration request, not permission to use or release this track. <span className="text-[#FD52AF]">*</span></span>
          </label>

          {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm leading-5 text-rose-100">{error}</p>}
          <button type="submit" disabled={!canSubmit} className="min-h-14 w-full rounded-full bg-[#FD52AF] px-6 py-4 text-sm font-extrabold text-[#170d14] shadow-[0_8px_24px_rgba(253,82,175,.14)] transition hover:shadow-[0_0_28px_rgba(253,82,175,.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">{busy ? "Sending your request…" : "Send Collaboration Request →"}</button>
        </form>
      </>}
    </section>
  </div>;
}
