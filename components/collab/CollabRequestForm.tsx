"use client";

import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import RecordingArrangementSelect from "@/components/collab/RecordingArrangementSelect";

const defaultVersion = "2026-11-18-v1";
const defaultTerms = {
  ownership: "You retain rights to your original creative contribution, subject to the final signed agreement. Master recording and composition ownership are addressed separately.",
  royalties: "Master royalties and songwriting/publishing royalties are separate. Applicable splits and compensation will be agreed in writing before work begins.",
  credits: "Your agreed artist, songwriter, and/or producer credits will be included in the official release metadata.",
  release_rights: "CHXNDLER coordinates official releases and distribution. No independent upload, release, remix, or commercial use without the required written authorization.",
};

const contributionOptions = [
  { value: "Songwriting", label: "Write a Song", note: "Build a new song together from scratch." },
  { value: "Vocals / Feature", label: "Sing / Feature", note: "Sing or rap a verse, or add a vocal feature." },
  { value: "Production / Remix", label: "Produce / Remix", note: "Shape a new sound together." },
  { value: "Music Video", label: "Music Video", note: "Build the visual world." },
  { value: "Other", label: "Something Else", note: "Share another idea." },
] as const;

const fieldClass = "mt-2 block h-12 w-full rounded-xl border border-white/[.12] bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#FD52AF]/65 focus:ring-2 focus:ring-[#FD52AF]/15";

export default function CollabRequestForm({ songId, title, artwork, invitedName, invitedEmail = "", initialContributionType = "", initialMessage = "", videoProjectId = "", close }: { songId: string; title: string; artwork: string; invitedName: string; invitedEmail?: string; initialContributionType?: string; initialMessage?: string; videoProjectId?: string; close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(invitedEmail);
  const [hasStreamingProfiles, setHasStreamingProfiles] = useState<"yes" | "no">("no");
  const [streamingProfiles, setStreamingProfiles] = useState({ spotify: "", appleMusic: "", youtubeMusic: "" });
  const [contributionType, setContributionType] = useState(initialContributionType || "");
  const [recordingArrangement, setRecordingArrangement] = useState("");
  const [musicVideoParticipation, setMusicVideoParticipation] = useState("");
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
    if (!invitedEmail) return;
    void fetch("/api/collaboration-requests/profile", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(profile => {
      if (!profile) return;
      setHasStreamingProfiles(profile.has_streaming_profiles ? "yes" : "no");
      setStreamingProfiles({ spotify: profile.spotify_artist_uri || "", appleMusic: profile.apple_music_artist_url || "", youtubeMusic: profile.youtube_music_artist_channel_id ? `https://music.youtube.com/channel/${profile.youtube_music_artist_channel_id}` : "" });
    }).catch(() => {});
  }, [invitedEmail]);

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
  const visibleContributionOptions = songId
    ? contributionOptions.filter(option => option.value !== "Songwriting")
    : contributionOptions;
  const needsRecordingArrangement = contributionType !== "Music Video";
  const canSubmit = validEmail && Boolean(selectedContribution) && (!needsRecordingArrangement || Boolean(recordingArrangement)) && Boolean(musicVideoParticipation) && !busy;

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
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          artistName: data.get("artistName"),
          email: email.trim(),
          profileLink: data.get("profileLink"),
          phone: data.get("phone"),
          hasStreamingProfiles: hasStreamingProfiles === "yes",
          spotifyArtistProfile: streamingProfiles.spotify,
          appleMusicArtistProfile: streamingProfiles.appleMusic,
          youtubeMusicArtistProfile: streamingProfiles.youtubeMusic,
          contributionType,
          recordingArrangement,
          musicVideoParticipation,
          message: data.get("message"),
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
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="collab-form-title" className="relative max-h-[100dvh] w-full max-w-[48rem] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/[.12] bg-[#101014] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 text-white shadow-[0_0_0_1px_rgba(253,82,175,.06),0_2rem_5rem_rgba(0,0,0,.6)] sm:max-h-[92dvh] sm:rounded-3xl sm:px-9 sm:pb-6 sm:pt-6">
      {!done && <button type="button" onClick={close} aria-label="Close collaboration request" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-lg text-white/45 transition hover:bg-white/[.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FD52AF]">×</button>}
      {done ? <div className="flex min-h-[24rem] flex-col items-center justify-center px-2 py-10 text-center">
        <img src="/elements/alien.webp" alt="CHXNDLER alien logo" className="mb-5 h-24 w-24 object-contain" />
        <h2 id="collab-form-title" className="text-2xl font-black tracking-tight sm:text-3xl">Thanks for reaching out!</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/60">I&apos;ll take a look and get back to you soon!</p>
        <a href="https://chxndler.world" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#FD52AF] px-7 text-sm font-extrabold text-[#170d14] transition hover:shadow-[0_0_24px_rgba(253,82,175,.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Explore Heartverse</a>
      </div> : <>
        <header className="mb-4 pr-10 text-center sm:mb-5 sm:pr-12">
          <img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-3 h-20 w-52 object-contain" />
          <h2 id="collab-form-title" className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">COLLABORATE ON <span className="block text-[#ff3ea5]">{title}</span></h2>
        </header>

        <form onSubmit={submit} className="space-y-4">
          <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[10000px] h-px w-px opacity-0" aria-hidden="true" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="collab-first-name" className="block text-xs font-semibold uppercase text-white/75">FIRST NAME <span className="text-[#FD52AF]">*</span>
              <input id="collab-first-name" name="firstName" type="text" required autoComplete="given-name" maxLength={80} placeholder="FIRST NAME" className={fieldClass}/>
            </label>
            <label htmlFor="collab-last-name" className="block text-xs font-semibold uppercase text-white/75">LAST NAME <span className="text-[#FD52AF]">*</span>
              <input id="collab-last-name" name="lastName" type="text" required autoComplete="family-name" maxLength={80} placeholder="LAST NAME" className={fieldClass}/>
            </label>
            <label htmlFor="collab-artist-name" className="block text-xs font-semibold uppercase text-white/75">ARTIST NAME <span className="text-[#FD52AF]">*</span>
              <input id="collab-artist-name" name="artistName" type="text" required autoComplete="nickname" maxLength={120} placeholder="ARTIST OR PROJECT NAME" className={fieldClass}/>
            </label>
            <label htmlFor="collab-email" className="block text-xs font-semibold uppercase text-white/75">EMAIL ADDRESS <span className="text-[#FD52AF]">*</span>
              <input ref={emailRef} id="collab-email" name="email" type="email" required autoComplete="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} placeholder="YOU@EXAMPLE.COM" className={fieldClass}/>
            </label>
            <label htmlFor="collab-profile" className="block text-xs font-semibold uppercase text-white/75">INSTAGRAM / MUSIC PROFILE <span className="font-normal text-white/40">OPTIONAL</span>
              <input id="collab-profile" name="profileLink" type="text" autoComplete="url" maxLength={500} placeholder="@YOURHANDLE OR PROFILE URL" className={fieldClass}/>
            </label>
            <label htmlFor="collab-phone" className="block text-xs font-semibold uppercase text-white/75">PHONE NUMBER <span className="font-normal text-white/40">OPTIONAL</span>
              <input id="collab-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(555) 555-0123" className={fieldClass}/>
            </label>
          </div>

          <fieldset className="rounded-xl border border-white/[.1] bg-white/[.02] p-4">
            <legend className="px-1 text-xs font-semibold text-white/80">Do you already have artist profiles on streaming services?</legend>
            <div className="mt-2 flex gap-5 text-sm text-white/75"><label className="inline-flex items-center gap-2"><input type="radio" name="streamingProfiles" value="yes" checked={hasStreamingProfiles === "yes"} onChange={() => setHasStreamingProfiles("yes")} className="accent-[#FD52AF]"/>Yes</label><label className="inline-flex items-center gap-2"><input type="radio" name="streamingProfiles" value="no" checked={hasStreamingProfiles === "no"} onChange={() => setHasStreamingProfiles("no")} className="accent-[#FD52AF]"/>No / Not yet</label></div>
            {hasStreamingProfiles === "yes" && <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-white/70"><span className="inline-flex items-center gap-1"><Music2 className="h-4 w-4 text-[#1ED760]"/>Spotify <details className="group relative"><summary aria-label="How to find Spotify artist URI" className="cursor-pointer list-none text-[#FD52AF]">ⓘ</summary><span className="absolute left-0 top-5 z-20 hidden w-56 rounded-lg border border-white/10 bg-[#202025] p-3 text-[11px] font-normal leading-5 text-white/75 group-open:block">Open your Spotify artist profile, choose Share, then Copy link. Artist links and Spotify artist URIs are accepted.</span></details></span><input value={streamingProfiles.spotify} onChange={event => setStreamingProfiles(current => ({ ...current, spotify: event.target.value }))} placeholder="Artist URL or spotify:artist:…" className={fieldClass}/></label>
              <label className="text-xs font-semibold text-white/70"><span className="inline-flex items-center gap-1"><Music2 className="h-4 w-4 text-white"/>Apple Music <details className="group relative"><summary aria-label="How to find Apple Music artist URL" className="cursor-pointer list-none text-[#FD52AF]">ⓘ</summary><span className="absolute left-0 top-5 z-20 hidden w-56 rounded-lg border border-white/10 bg-[#202025] p-3 text-[11px] font-normal leading-5 text-white/75 group-open:block">Open your artist page in Apple Music and copy its link.</span></details></span><input value={streamingProfiles.appleMusic} onChange={event => setStreamingProfiles(current => ({ ...current, appleMusic: event.target.value }))} placeholder="Apple Music artist URL" className={fieldClass}/></label>
              <label className="text-xs font-semibold text-white/70"><span className="inline-flex items-center gap-1"><Music2 className="h-4 w-4 text-red-400"/>YouTube Music <details className="group relative"><summary aria-label="How to find YouTube Music artist profile" className="cursor-pointer list-none text-[#FD52AF]">ⓘ</summary><span className="absolute left-0 top-5 z-20 hidden w-56 rounded-lg border border-white/10 bg-[#202025] p-3 text-[11px] font-normal leading-5 text-white/75 group-open:block">Use the profile for your official YouTube Music artist page. Ordinary YouTube channels are not accepted.</span></details></span><input value={streamingProfiles.youtubeMusic} onChange={event => setStreamingProfiles(current => ({ ...current, youtubeMusic: event.target.value }))} placeholder="Official artist profile URL" className={fieldClass}/></label>
            </div>}
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-xs font-semibold uppercase text-white/75">HOW WOULD YOU LIKE TO COLLABORATE? <span className="text-[#FD52AF]">*</span></legend>
            <div role="radiogroup" aria-label="How would you like to collaborate?" className="grid gap-2 sm:grid-cols-2">
              {visibleContributionOptions.map(option => {
                const selected = contributionType === option.value;
                const disabled = isPublicVideoApplication && option.value !== "Music Video";
                return <label key={option.value} className={`relative flex min-h-[4.25rem] cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#FD52AF] ${disabled ? "cursor-not-allowed opacity-35" : selected ? "border-[#FD52AF]/60 bg-[#FD52AF]/[.08]" : "border-white/[.1] bg-white/[.02] hover:border-white/20 hover:bg-white/[.04]"}`}>
                  <input className="sr-only" type="radio" name="contributionType" value={option.value} checked={selected} disabled={disabled} required onChange={() => setContributionType(option.value)}/>
                  <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${selected ? "border-[#FD52AF]" : "border-white/30"}`}>{selected && <span className="h-2 w-2 rounded-full bg-[#FD52AF]"/>}</span>
                  <span className="min-w-0"><span className={`block text-sm font-bold ${selected ? "text-white" : "text-white/80"}`}>{option.label}</span><span className="mt-0.5 block text-xs text-white/45">{option.note}</span></span>
                </label>;
              })}
            </div>
            {isPublicVideoApplication && <p className="mt-2 text-[.68rem] text-white/40">This public project is accepting music video ideas.</p>}
          </fieldset>

          {needsRecordingArrangement && <label htmlFor="collab-recording-arrangement" className="block text-xs font-semibold text-white/75">Recording arrangement <span className="text-[#FD52AF]">*</span>
            <RecordingArrangementSelect id="collab-recording-arrangement" name="recordingArrangement" value={recordingArrangement} onChange={setRecordingArrangement} className={fieldClass}/>
          </label>}

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-white/75">MUSIC VIDEO PARTICIPATION <span className="text-[#FD52AF]">*</span></legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75"><label className="inline-flex items-center gap-2"><input type="radio" name="musicVideoParticipation" value="interested" required checked={musicVideoParticipation === "interested"} onChange={() => setMusicVideoParticipation("interested")} className="accent-[#FD52AF]"/>Interested</label><label className="inline-flex items-center gap-2"><input type="radio" name="musicVideoParticipation" value="not_interested" required checked={musicVideoParticipation === "not_interested"} onChange={() => setMusicVideoParticipation("not_interested")} className="accent-[#FD52AF]"/>Not interested</label></div>
          </fieldset>

          <label htmlFor="collab-message" className="block text-sm font-semibold uppercase text-white/85">YOUR IDEA <span className="text-xs font-normal text-white/40">OPTIONAL</span>
            <textarea id="collab-message" name="message" maxLength={1200} rows={3} defaultValue={initialMessage} placeholder="WHAT ARE YOU IMAGINING?" className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-white/[.12] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-[#FD52AF]/65 focus:ring-2 focus:ring-[#FD52AF]/15"/>
          </label>

          <section aria-labelledby="collab-note-heading" className="space-y-1.5 py-0.5">
            <h3 id="collab-note-heading" className="text-sm font-semibold text-[#FD52AF]">A little note before we create</h3>
            <ul className="max-w-2xl space-y-1 text-sm leading-6 text-white/65">
              <li className="flex gap-2"><span aria-hidden="true" className="text-[#FD52AF]">★</span><span>Please keep unreleased music <strong className="font-bold text-white/85">between us</strong>.</span></li>
              <li className="flex gap-2"><span aria-hidden="true" className="text-[#FD52AF]">★</span><span>{contributionType === "Music Video" ? <>If we decide to collaborate, we&apos;ll work out the <strong className="font-bold text-white/85">video concept, creative direction, and responsibilities</strong> together before getting started.</> : <>If we decide to collaborate, we&apos;ll work out <strong className="font-bold text-white/85">credits, splits, and compensation</strong> together before getting started.</>}</span></li>
            </ul>
          </section>

          {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] px-4 py-3 text-sm leading-5 text-rose-100">{error}</p>}
          <button type="submit" disabled={!canSubmit} className="min-h-12 w-full rounded-full bg-[#FD52AF] px-6 py-3 text-sm font-extrabold text-[#170d14] shadow-[0_8px_24px_rgba(253,82,175,.14)] transition hover:shadow-[0_0_28px_rgba(253,82,175,.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">{busy ? "Sending your request…" : "Send Collaboration Request →"}</button>
        </form>
      </>}
    </section>
  </div>;
}
