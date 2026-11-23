"use client";

import { useState } from "react";
import { BadgeCheck, FileSignature, MailCheck, MessageSquareText, ShieldCheck } from "lucide-react";

export default function AgreementSignatureForm({ token, email, initialName = "", artistName = "", agreementDate = "" }: { token: string; email: string; initialName?: string; artistName?: string; agreementDate?: string }) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changesDone, setChangesDone] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  async function access(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch(`/api/collab/agreement/${encodeURIComponent(token)}/access`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Email verification failed.");
    return result;
  }
  async function requestCode() {
    setBusy(true); setMessage("");
    try { await access("send-code"); setCodeSent(true); setMessage(`A six-digit code was sent to ${email.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2")}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not send verification code."); }
    finally { setBusy(false); }
  }
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await access("verify-code", { code }); setVerified(true); setMessage("Email verified. Review the agreement and sign below."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Code verification failed."); }
    finally { setBusy(false); }
  }
  async function sign(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collab/agreement/${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: name.trim().split(/\s+/)[0], lastName: name.trim().split(/\s+/).slice(1).join(" ") || "—", printedName: name.trim(), signature: signature.trim(), consent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your signature could not be recorded.");
      setComplete(true); setExecuted(!!result.executed); setMessage(result.executed ? "The agreement is fully signed. Your executed copy is ready to download." : "Your signature has been recorded. The agreement becomes complete after CHXNDLER signs.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your signature could not be recorded."); }
    finally { setBusy(false); }
  }

  async function requestChanges(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/collab/agreement/${encodeURIComponent(token)}/changes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: changeNote }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your request could not be sent.");
      setChangesDone(true); setMessage("Your change request was sent to CHXNDLER. This signing link is now closed while the agreement is updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your request could not be sent."); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto mt-5 max-w-4xl rounded-2xl border border-white/10 bg-[#101014] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,.4)] sm:p-8">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#FD52AF]"><FileSignature className="h-4 w-4"/>Review & sign</p><h2 className="mt-2 text-xl font-bold">Complete this agreement</h2>
    {complete || changesDone ? <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] p-4 text-sm leading-6 text-emerald-100" role="status"><BadgeCheck className="mb-2 h-5 w-5 text-[#FD52AF]"/>{message}{complete && executed && <a href={`/api/collab/agreement/${encodeURIComponent(token)}/pdf`} className="mt-3 inline-flex rounded-full bg-[#FD52AF] px-5 py-3 text-xs font-extrabold uppercase text-[#160d13]">Download signed PDF</a>}</div> : <>
      {!verified && <div className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><p className="flex items-start gap-2 text-sm leading-6 text-white/65"><MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#FD52AF]"/>Verify your email to sign. A one-time code will be sent to {email.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2")}.</p>{!codeSent ? <button type="button" onClick={() => void requestCode()} disabled={busy} className="mt-4 rounded-full bg-[#FD52AF] px-5 py-3 text-sm font-bold text-[#160d13] disabled:opacity-50">{busy ? "Sending code…" : "Email me a verification code"}</button> : <form onSubmit={event => void verifyCode(event)} className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="Six-digit verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-white/15 bg-black/25 px-4 py-3 text-lg tracking-[.3em] outline-none focus:border-[#FD52AF] sm:max-w-56" placeholder="000000"/><button disabled={busy || code.length !== 6} className="rounded-full bg-[#FD52AF] px-5 py-3 text-sm font-bold text-[#160d13] disabled:opacity-50">{busy ? "Verifying…" : "Verify email"}</button></form>}</div>}
      {verified && <><div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Legal name</p><input required maxLength={160} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1 block w-full border-b border-white/20 bg-transparent py-2 text-sm outline-none focus:border-[#FD52AF]"/></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Artist name</p><p className="mt-3 text-sm font-semibold">{artistName || name || "—"}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Agreement issue date</p><p className="mt-3 text-sm font-semibold">{agreementDate || "—"}</p></div></div><form onSubmit={event => void sign(event)} className="mt-4 space-y-4"><label className="block text-xs font-bold text-white/60">Electronic signature <span className="font-normal text-white/40">(type your full legal name)</span><input required maxLength={160} value={signature} onChange={event => setSignature(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 font-[cursive] text-2xl italic text-[#FD52AF] outline-none focus:border-[#FD52AF]" placeholder="Type your name"/></label><label className="flex items-start gap-3 text-sm leading-6 text-white/60"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 accent-[#FD52AF]"/><span><ShieldCheck className="mr-1 inline h-4 w-4 text-[#FD52AF]"/>I reviewed the full agreement above, consent to electronic records and signatures, and intend my typed signature to sign these terms.</span></label><div className="flex flex-col gap-2 sm:flex-row"><button disabled={busy || !consent || !name.trim() || signature.trim() !== name.trim()} className="rounded-full bg-[#FD52AF] px-6 py-4 text-sm font-extrabold uppercase tracking-wide text-[#160d13] disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Signing agreement…" : "Sign Agreement"}</button><button type="button" onClick={() => setRequestingChanges(true)} disabled={busy} className="rounded-full border border-white/15 px-6 py-4 text-sm font-bold text-white/75 hover:border-[#FD52AF]/50 hover:text-white">Request Changes</button></div></form></>}
      {requestingChanges && <form onSubmit={event => void requestChanges(event)} className="mt-4 rounded-xl border border-[#FD52AF]/25 bg-[#FD52AF]/[.04] p-4"><label className="flex items-center gap-2 text-sm font-bold"><MessageSquareText className="h-4 w-4 text-[#FD52AF]"/>What would you like changed?<textarea autoFocus rows={3} maxLength={2000} value={changeNote} onChange={event=>setChangeNote(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/15 bg-black/25 p-3 text-sm font-normal text-white outline-none focus:border-[#FD52AF]" placeholder="Share the term or detail you want to discuss."/></label><div className="mt-3 flex gap-2"><button disabled={busy} className="rounded-full bg-[#FD52AF] px-4 py-2.5 text-xs font-bold text-[#160d13]">{busy ? "Sending…" : "Send request"}</button><button type="button" onClick={()=>setRequestingChanges(false)} className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/60">Cancel</button></div></form>}
      {message && <p role="status" className="mt-4 text-sm text-white/60">{message}</p>}
    </>}
    <a href="mailto:info@chxndler-music.com?subject=Question%20about%20my%20collaboration%20agreement" className="mt-5 inline-block text-xs font-semibold text-[#ff9dcd] underline underline-offset-4">Questions about these terms?</a>
  </section>;
}
