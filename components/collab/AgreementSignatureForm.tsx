"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgreementSignatureForm({ token, email, initialFirstName = "", initialLastName = "", initialPrintedName = "", isSigned = false, copySent = false }: {
  token: string;
  email: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialPrintedName?: string;
  isSigned?: boolean;
  copySent?: boolean;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [printedName, setPrintedName] = useState(initialPrintedName || [initialFirstName, initialLastName].filter(Boolean).join(" "));
  const [signatureReady, setSignatureReady] = useState(isSigned);
  const [consent, setConsent] = useState(isSigned);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(isSigned);
  const [emailSent, setEmailSent] = useState(copySent);
  const [message, setMessage] = useState("");

  function updateName(which: "first" | "last", value: string) {
    if (which === "first") setFirstName(value);
    else setLastName(value);
    setPrintedName([which === "first" ? value : firstName, which === "last" ? value : lastName].filter(Boolean).join(" "));
    setSignatureReady(false);
  }

  async function signAgreement(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collab/agreement/${encodeURIComponent(token)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, printedName, signature: signatureReady ? printedName : "", consent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your signature could not be recorded.");
      setSigned(true); setEmailSent(result.emailSent === true); setMessage(result.emailSent ? `Signed. A copy was emailed to ${result.email || email}.` : "Signed. We could not email your copy, so please use “Something wrong?” below for help.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your signature could not be recorded.");
    } finally { setBusy(false); }
  }

  const mailSubject = encodeURIComponent("Question about my collaboration agreement");
  return <section className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-white/10 bg-[#111116] p-5 text-white sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Review & sign</p><h2 className="mt-1 text-xl font-bold">Your signature</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Your name will appear in the agreement as your electronic signature. The pink CHXNDLER signature is already shown on the other signature line.</p></div>
      <a href={`mailto:info@chxndler-music.com?subject=${mailSubject}`} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/75 hover:border-[#FD52AF]/50 hover:text-white">Something wrong?</a>
    </div>
    {signed ? <div role="status" className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/[.06] p-4"><p className="font-semibold text-emerald-200">Agreement signed by {initialPrintedName || printedName || "you"}.</p><p className="mt-1 text-sm text-white/60">{emailSent ? `A signed copy was emailed to ${email}.` : "Your signature is saved. Email delivery needs attention; use Something wrong? above."}</p></div> : <form onSubmit={event => void signAgreement(event)} className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-white/65">First name<input required maxLength={80} autoComplete="given-name" value={firstName} onChange={event => updateName("first", event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-base text-white outline-none focus:border-[#FD52AF]/60" /></label><label className="text-xs font-semibold text-white/65">Last name<input required maxLength={80} autoComplete="family-name" value={lastName} onChange={event => updateName("last", event.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-base text-white outline-none focus:border-[#FD52AF]/60" /></label></div>
      <label className="block text-xs font-semibold text-white/65">Print name<input required maxLength={160} autoComplete="name" value={printedName} onChange={event => { setPrintedName(event.target.value); setSignatureReady(false); }} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-base text-white outline-none focus:border-[#FD52AF]/60" /></label>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-semibold text-white/55">Electronic signature</p><div className="mt-2 flex min-h-16 items-end justify-between gap-3 border-b border-white/30 pb-2"><span className={signatureReady ? "font-[cursive] text-3xl italic text-[#ff3ea5]" : "text-sm text-white/30"}>{signatureReady ? printedName : "Generate your signature to preview it"}</span><button type="button" disabled={!printedName.trim()} onClick={() => setSignatureReady(true)} className="shrink-0 rounded-lg border border-[#FD52AF]/35 px-3 py-2 text-xs font-bold text-[#ff9bcd] hover:bg-[#FD52AF]/10 disabled:opacity-35">Generate signature</button></div></div>
      <label className="flex items-start gap-2.5 text-sm leading-6 text-white/70"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 accent-[#FD52AF]"/><span>By typing my name and signing, I intend this to be my electronic signature and agree to the terms shown above.</span></label>
      <button type="submit" disabled={busy || !signatureReady || !consent} className="rounded-full bg-[#FD52AF] px-6 py-3 text-sm font-extrabold text-[#170d14] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Recording signature…" : "Sign agreement"}</button>
      {message && <p role="status" className="text-sm text-rose-200">{message}</p>}
    </form>}
  </section>;
}
