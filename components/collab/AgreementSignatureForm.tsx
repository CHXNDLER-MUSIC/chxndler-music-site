"use client";

import { useState } from "react";

export default function AgreementSignatureForm({ token, email, initialName = "" }: { token: string; email: string; initialName?: string }) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

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
      setComplete(true); setMessage(result.executed ? "The agreement is fully signed. You can download the final PDF above." : "Your signature has been recorded. The agreement becomes complete after CHXNDLER signs.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your signature could not be recorded."); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto mt-5 max-w-4xl rounded-2xl bg-white p-6 text-[#18171b] shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:p-10">
    <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c3317e]">Review & sign</p><h2 className="mt-1 text-2xl font-bold">Your signature</h2>
    {complete ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900" role="status">{message}</div> : <>
      {!verified && <div className="mt-5 rounded-xl bg-[#f7f5f6] p-4 sm:p-5"><p className="text-sm leading-6 text-black/65">Verify that you are the intended recipient by entering a one-time code sent to {email.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2")}.</p>{!codeSent ? <button type="button" onClick={() => void requestCode()} disabled={busy} className="mt-4 rounded-full bg-[#FD52AF] px-5 py-3 text-sm font-bold text-[#160d13] disabled:opacity-50">{busy ? "Sending code…" : "Email me a verification code"}</button> : <form onSubmit={event => void verifyCode(event)} className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="Six-digit verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-lg tracking-[.3em] outline-none focus:border-[#c3317e] sm:max-w-56" placeholder="000000"/><button disabled={busy || code.length !== 6} className="rounded-full bg-[#FD52AF] px-5 py-3 text-sm font-bold text-[#160d13] disabled:opacity-50">{busy ? "Verifying…" : "Verify email"}</button></form>}</div>}
      {verified && <form onSubmit={event => void sign(event)} className="mt-5 space-y-4"><label className="block text-xs font-bold text-black/55">Legal name<input required maxLength={160} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-base font-normal text-black outline-none focus:border-[#c3317e]"/></label><label className="block text-xs font-bold text-black/55">Electronic signature <span className="font-normal">(type your full legal name)</span><input required maxLength={160} value={signature} onChange={event => setSignature(event.target.value)} className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-3 font-[cursive] text-2xl italic text-[#c3317e] outline-none focus:border-[#c3317e]" placeholder="Type your name"/></label><label className="flex items-start gap-3 text-sm leading-6 text-black/70"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 accent-[#FD52AF]"/><span>I consent to electronic records and signatures, can access and retain this agreement electronically, and intend my typed signature to sign this agreement.</span></label><button disabled={busy || !consent || !name.trim() || signature.trim() !== name.trim()} className="w-full rounded-full bg-[#FD52AF] px-6 py-4 text-sm font-extrabold text-[#160d13] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{busy ? "Signing agreement…" : "Sign Agreement"}</button></form>}
      {message && <p role="status" className="mt-4 text-sm text-black/65">{message}</p>}
    </>}
    <a href="mailto:info@chxndler-music.com?subject=Question%20about%20my%20collaboration%20agreement" className="mt-5 inline-block text-xs font-semibold text-[#b12670] underline underline-offset-4">Questions about these terms?</a>
  </section>;
}
