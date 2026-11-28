"use client";

import { useEffect, useMemo, useState } from "react";
import {
  agreementFields,
  agreementTemplates,
  agreementTypeForContribution,
  agreementTypes,
  agreementReviewFlags,
  createAgreementDraft,
  validateAgreement,
  type AgreementType,
} from "@/lib/collaborationAgreements";
import AgreementDocument from "@/components/collab/AgreementDocument";
import AgreementTooltip from "@/components/collab/AgreementTooltip";
import RecordingArrangementSelect from "@/components/collab/RecordingArrangementSelect";
import { BadgeDollarSign, Disc3, Music2, Radio, UserRound } from "lucide-react";

type RequestRecord = Record<string, any>;

const inputClass = "mt-1 block w-full rounded-lg border border-white/10 bg-[#0a0a0d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#FD52AF]/60 focus:ring-2 focus:ring-[#FD52AF]/15 disabled:opacity-50";
function InfoTip({ text, label = "Term" }: { text: string; label?: string }) { return <AgreementTooltip label={label} text={text}/>; }

export default function AgreementBuilder({ request, close, onUpdated }: { request: RequestRecord; close: () => void; onUpdated: () => void }) {
  const initialType = (agreementTemplates[request.agreement_type as AgreementType] ? request.agreement_type : request.collaboration_invites?.agreement_type || agreementTypeForContribution(request.contribution_type)) as AgreementType;
  const [agreementType, setAgreementType] = useState<AgreementType>(initialType);
  const [terms, setTerms] = useState<Record<string, any>>(() => createAgreementDraft({ type: initialType, request, invite: request.collaboration_invites, existing: request.agreement_terms }));
  const [savedVersion, setSavedVersion] = useState(Number(request.agreement_version || 0));
  const [approvedVersion, setApprovedVersion] = useState(Number(request.agreement_approved_version || 0));
  const [approvedAt, setApprovedAt] = useState<string | null>(request.agreement_approved_at || null);
  const [agreementStatus, setAgreementStatus] = useState(String(request.agreement_status || "draft"));
  const [agreementPath, setAgreementPath] = useState<string | null>(request.agreement_path || null);
  const [reviewedUrl, setReviewedUrl] = useState<string | null>(request.agreement_url || null);
  const [signedPath, setSignedPath] = useState<string | null>(request.signed_agreement_path || null);
  const [signedVersion, setSignedVersion] = useState(Number(request.signed_agreement_version || 0));
  const [privateAgreementUrl, setPrivateAgreementUrl] = useState("");
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(1);
  const [dirty, setDirty] = useState(false);
  const [previewedVersion, setPreviewedVersion] = useState(0);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (request.agreement_approved_version || ["awaiting_signature", "offer_sent", "signed"].includes(String(request.agreement_status || "")) || ["agreement_pending", "signed"].includes(String(request.status || ""))) return;
    let active = true;
    fetch("/api/admin/collaboration-terms", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      const version = (data?.versions || []).find((item: any) => item.active);
      if (active && version) {
        setTerms(current => current.admin_template_version === version.version ? current : { ...current, admin_template_version: version.version, admin_template_terms: version.terms });
        setDirty(true);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const missing = useMemo(() => validateAgreement(agreementType, terms), [agreementType, terms]);
  const ready = missing.length === 0;
  const executionIssues = useMemo(() => validateAgreement(agreementType, terms, true), [agreementType, terms]);
  const reviewFlags = useMemo(() => agreementReviewFlags(agreementType, terms), [agreementType, terms]);
  const previewReady = true;
  const currentApproval = approvedVersion > 0 && approvedVersion === savedVersion;
  const requestApprovalOkay = request.status === "approved" || request.status === "agreement_pending";
  const sent = ["awaiting_signature", "offer_sent"].includes(agreementStatus) || (request.status === "agreement_pending" && agreementStatus !== "draft");
  const signed = agreementStatus === "signed" || request.status === "signed";
  const previewIsCurrent = previewedVersion > 0 && previewedVersion === savedVersion && !dirty;
  const sendEnabled = !busy && !dirty && executionIssues.length === 0 && previewIsCurrent && reviewConfirmed && currentApproval && (request.status === "approved" || request.status === "agreement_pending") && !sent && !signed;
  const sendReason = executionIssues[0] ? `Resolve ${executionIssues[0]} before sending.` : dirty ? "Save the current changes before sending." : !previewIsCurrent ? "Preview the current saved version before sending." : !reviewConfirmed || !currentApproval ? "Approve the current preview before sending." : !requestApprovalOkay ? "Approve the collaboration request before sending." : "";
  const template = agreementTemplates[agreementType];

  function change(key: string, value: any) {
    setTerms(current => {
      const next = { ...current, [key]: value };
      if (key === "flat_fee") {
        next.fee_option = value === "" ? "" : Number(value) > 0 ? "Custom fee" : "No fee";
      }
      if (key === "payment_direction" && value === "none") { next.flat_fee = 0; next.fee_option = "No fee"; }
      if (key === "payment_direction" && value !== "none" && next.flat_fee === 0) { next.flat_fee = ""; next.fee_option = ""; }
      if (key === "songwriting_status" && value === "co_writer" && !Array.isArray(next.writer_splits)) next.writer_splits = [
        { name: "CHXNDLER", stage_name: "CHXNDLER", share: "", chxndler: true },
        { name: next.collaborator_legal_name || "Collaborator", stage_name: next.collaborator_artist_name || "", share: "", collaborator: true },
      ];
      return next;
    });
    setDirty(true);
    setReviewConfirmed(false);
    setError("");
  }

  async function readResponse(response: Response) {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The agreement could not be saved.");
    return result;
  }

  async function saveDraft(options: { quiet?: boolean } = {}) {
    if (busy) return null;
    setBusy(true); setError(""); setNotice(options.quiet ? "Saving the current version…" : "Saving draft…");
    try {
      const result = await readResponse(await fetch("/api/admin/collaboration-requests", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: request.id, agreement_type: agreementType, agreement: terms, agreement_status: "draft" }),
      }));
      const saved = result.request || {};
      const nextTerms = saved.agreement_terms || terms;
      const nextVersion = Number(saved.agreement_version || saved.agreement_approved_version || 1);
      if (nextVersion !== savedVersion || dirty) setPreviewedVersion(0);
      setTerms(nextTerms); setSavedVersion(nextVersion); setApprovedVersion(Number(saved.agreement_approved_version || 0));
      setApprovedAt(saved.agreement_approved_at || null); setAgreementStatus(saved.agreement_status || "draft"); setAgreementPath(saved.agreement_path || null);
      setDirty(false); setReviewConfirmed(false);
      setNotice(`Draft v${nextVersion} saved.`);
      return { terms: nextTerms, version: nextVersion };
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The agreement could not be saved.");
      setNotice(""); return null;
    } finally { setBusy(false); }
  }

  async function previewAgreement() {
    const saved = sent ? { terms, version: savedVersion } : await saveDraft({ quiet: true });
    if (saved) {
      setPreviewedVersion(saved.version);
      setReviewConfirmed(false);
      setFlowStep(3);
      setNotice(`Previewing saved agreement v${saved.version}.`);
    } else {
      setPreviewedVersion(0);
      setReviewConfirmed(false);
      // Preview the current form locally even if persistence fails. The approval
      // and send controls remain locked until this exact version is saved.
      setFlowStep(3);
      setNotice("Showing a local preview. Save the draft before approving or sending it.");
    }
  }

  async function approveCurrentVersion() {
    const result = await readResponse(await fetch("/api/admin/collaboration-requests", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: request.id, agreement_type: agreementType, agreement: terms, approve_agreement: true }),
    }));
    const saved = result.request || {};
    setTerms(saved.agreement_terms || terms); setApprovedVersion(Number(saved.agreement_approved_version || saved.agreement_version || savedVersion));
    setApprovedAt(saved.agreement_approved_at || new Date().toISOString()); setSavedVersion(Number(saved.agreement_version || savedVersion));
    setAgreementStatus(saved.agreement_status || "draft");
  }

  async function confirmReview(checked: boolean) {
    setReviewConfirmed(checked);
    if (!checked) return;
    setBusy(true); setError(""); setNotice("Recording approval for this exact version…");
    try {
      await approveCurrentVersion();
      setReviewConfirmed(true); setNotice(`Version v${savedVersion} approved for sending.`);
    } catch (approvalError) {
      setReviewConfirmed(false);
      setError(approvalError instanceof Error ? approvalError.message : "This version could not be approved.");
      setNotice("");
    } finally { setBusy(false); }
  }

  async function generateContractLink() {
    if (!sendEnabled) return;
    setBusy(true); setError(""); setNotice("Generating a private contract link…");
    try {
      const result = await readResponse(await fetch(`/api/admin/collaboration-requests/${request.id}/generate-link`, { method: "POST" }));
      setAgreementStatus(result.agreement_status || "awaiting_signature"); setApprovedVersion(Number(result.version || savedVersion)); setPrivateAgreementUrl(String(result.reviewUrl || ""));
      setNotice("Private link is ready. Copy it or send it by email."); setReviewConfirmed(false); onUpdated();
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : "The contract link could not be generated."); setNotice(""); }
    finally { setBusy(false); }
  }

  async function sendAgreementEmail() {
    const token = privateAgreementUrl.split("/").filter(Boolean).at(-1);
    if (!token || signed) return;
    setBusy(true); setError(""); setNotice("Sending the private agreement link by email…");
    try {
      const result = await readResponse(await fetch(`/api/admin/collaboration-requests/${request.id}/send-agreement`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }));
      setAgreementStatus(result.agreement_status || "awaiting_signature"); setNotice("Agreement email sent. The email and copied link open the same private agreement."); onUpdated();
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : "Agreement email could not be sent."); setNotice(""); }
    finally { setBusy(false); }
  }

  async function revokeAgreementLink() {
    if (!privateAgreementUrl || signed) return;
    await readResponse(await fetch("/api/admin/collaboration-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: request.id, approve_agreement: false }) }));
    setPrivateAgreementUrl(""); setAgreementStatus("draft"); setReviewConfirmed(false); setNotice("Private link revoked. The saved agreement draft remains available to edit or send again."); onUpdated();
  }

  async function signForChxndler() {
    if (!window.confirm("Sign this exact approved agreement version for CHXNDLER? This records your signature and date.")) return;
    setBusy(true); setError(""); setNotice("Recording CHXNDLER signature…");
    try {
      const result = await readResponse(await fetch(`/api/admin/collaboration-requests/${request.id}/sign`, { method: "POST" }));
      if (result.executed) setAgreementStatus("signed");
      setNotice(result.executed ? "Agreement fully signed. Final signed PDF is ready." : "CHXNDLER signature recorded. The agreement is complete when the collaborator signs."); onUpdated();
    } catch (signError) { setError(signError instanceof Error ? signError.message : "CHXNDLER signature could not be recorded."); setNotice(""); }
    finally { setBusy(false); }
  }

  async function uploadAgreement(file: File | undefined, type: "draft" | "signed") {
    if (!file) return;
    setBusy(true); setError(""); setNotice(type === "signed" ? "Uploading executed PDF…" : "Adding reviewed PDF as a new version…");
    try {
      const form = new FormData(); form.set("file", file); form.set("type", type);
      const result = await readResponse(await fetch(`/api/admin/collaboration-requests/${request.id}/agreement`, { method: "POST", body: form }));
      if (type === "draft") {
        const version = Number(result.version || savedVersion + 1);
        setSavedVersion(version); setAgreementPath(result.path); setReviewedUrl(result.url || null); setApprovedVersion(0); setApprovedAt(null); setAgreementStatus("draft");
        setPreviewedVersion(0); setReviewConfirmed(false); setNotice(`Reviewed PDF attached to v${version}. Preview and approve the new version before sending.`);
      } else {
        setSignedPath(result.path); setSignedVersion(Number(result.version || approvedVersion)); setNotice("Executed PDF uploaded. Verify the signatures to mark the agreement signed.");
      }
      onUpdated();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "The PDF could not be uploaded."); setNotice(""); }
    finally { setBusy(false); }
  }

  async function verifySignatures() {
    if (!signedPath || signedVersion !== approvedVersion || signedVersion !== savedVersion) return;
    if (!window.confirm("Confirm that you reviewed this executed PDF and verified all required signatures.")) return;
    setBusy(true); setError(""); setNotice("Verifying signed agreement…");
    try {
      const result = await readResponse(await fetch("/api/admin/collaboration-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: request.id, status: "signed", signedVerified: true }) }));
      setAgreementStatus(result.request?.agreement_status || "signed"); setNotice("Executed signatures verified. This agreement version is locked."); onUpdated();
    } catch (verifyError) { setError(verifyError instanceof Error ? verifyError.message : "Signatures could not be verified."); setNotice(""); }
    finally { setBusy(false); }
  }

  function chooseType(value: string) {
    const nextType = value as AgreementType;
    const nextTerms = createAgreementDraft({ type: nextType, request, invite: request.collaboration_invites, existing: terms });
    nextTerms.template_id = agreementTemplates[nextType].id;
    nextTerms.template_version = agreementTemplates[nextType].version;
    nextTerms.legal_terms = "No additional terms.";
    setTerms(nextTerms);
    setAgreementType(nextType); setDirty(true); setPreviewedVersion(0); setReviewConfirmed(false); setError("");
  }

  function fieldControl(field: (typeof agreementFields)[AgreementType][number]) {
    const value = terms[field.key] ?? "";
    const common = { id: `agreement-${field.key}`, className: inputClass, value: String(value), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => change(field.key, field.kind === "number" || field.kind === "percent" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value), disabled: signed || sent };
    return <label key={field.key} htmlFor={common.id} className="block min-w-0 text-xs font-medium text-white/65">{field.label}{field.required && <span className="ml-1 text-[#FD52AF]">*</span>}
      {field.kind === "textarea" ? <textarea {...common} rows={2} className={`${inputClass} resize-y`} /> : field.kind === "select" ? <select {...common}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <div className="relative"><input {...common} type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"} min={field.kind === "number" || field.kind === "percent" ? "0" : undefined} max={field.kind === "percent" ? "100" : undefined} step={field.kind === "percent" ? "0.01" : field.kind === "number" ? "0.01" : undefined} className={`${inputClass} ${field.kind === "number" ? "pl-7" : ""} ${field.kind === "percent" ? "pr-8" : ""}`} />{field.kind === "number" && <span className="pointer-events-none absolute left-3 top-3 text-sm text-white/40">$</span>}{field.kind === "percent" && <span className="pointer-events-none absolute right-3 top-3 text-sm text-white/40">%</span>}</div>}
    </label>;
  }

  const writerShareTotal = (terms.writer_splits || []).reduce((sum: number, row: any) => sum + Number(row.share || 0), 0);
  const royaltyTermsApply = Number(terms.master_royalty) > 0 || (terms.master_participants || []).some((row: any) => Number(row.share) > 0);
  const songwritingFieldError = terms.songwriting_status === "unresolved" ? "Choose Performance Only or enter the agreed writer shares." : terms.songwriting_status === "co_writer" && (Math.abs(writerShareTotal - 100) > 0.001 || (terms.writer_splits || []).some((row: any) => !row.name || row.share === "")) ? "Writer shares and names must be complete and total 100%." : "";
  const activeStep = signed ? 4 : sent ? 3 : currentApproval ? 2 : savedVersion > 0 && ready ? 1 : 0;
  const steps = ["Draft", "Ready for Review", "Approved", "Sent", "Signed"];

  return <div className="fixed inset-0 z-[140] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="agreement-builder-title" className="flex h-[min(94dvh,960px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#101014] text-white shadow-2xl">
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Collaboration workspace · {request.artist_name}</p><h2 id="agreement-builder-title" className="mt-1 truncate text-lg font-bold">Finalize Agreement <span className="font-normal text-white/45">{savedVersion ? `· v${savedVersion}` : "· New draft"}</span></h2></div>
        <button type="button" disabled={busy} onClick={close} aria-label="Close agreement builder" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40">×</button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7">
        <nav aria-label="Agreement setup steps" className="grid grid-cols-3 gap-2">{(["Collaboration", "Payment & Rights", "Review & Send"] as const).map((label, index) => { const step = (index + 1) as 1 | 2 | 3; return <button key={label} type="button" onClick={() => setFlowStep(step)} aria-current={flowStep === step ? "step" : undefined} className={`rounded-lg border px-2 py-2.5 text-xs font-bold sm:text-sm ${flowStep === step ? "border-[#FD52AF]/50 bg-[#FD52AF]/10 text-[#ff9bcd]" : "border-white/10 text-white/45 hover:text-white/75"}`}><span className="mr-1.5 text-[#FD52AF]">0{step}</span>{label}</button>; })}</nav>
        {flowStep === 1 && <>
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">01 · Collaboration</p><p className="mt-1 text-xs text-white/40">Prepared from the collaboration request and reusable template.</p></div><label className="text-xs font-medium text-white/55">Agreement type<select value={agreementType} disabled={signed || sent || busy} onChange={event => chooseType(event.target.value)} className={`${inputClass} mt-1 w-44`}>{agreementTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
          <label className="mb-3 block max-w-xs text-xs font-medium text-white/65">Agreement issue date <InfoTip text="The date this offer is prepared. Each signer’s actual signing date is recorded separately."/><input type="date" value={terms.agreement_issue_date || ""} disabled={signed || sent} onChange={event => change("agreement_issue_date", event.target.value)} className={inputClass}/></label>
          <div className="grid gap-3 sm:grid-cols-2">{agreementFields[agreementType].map(fieldControl)}</div>
          <div className="mt-4 grid gap-3 border-t border-white/[.08] pt-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-white/65">Recording arrangement<RecordingArrangementSelect id="agreement-recording-arrangement" value={terms.recording_arrangement || ""} disabled={signed || sent} onChange={value => change("recording_arrangement", value)} className={inputClass}/></label>
            <label className="block text-xs font-medium text-white/65">Delivery date, if agreed<input type="date" value={terms.delivery_deadline || ""} disabled={signed || sent} onChange={event => change("delivery_deadline", event.target.value)} className={inputClass}/></label>
            <label className="block text-xs font-medium text-white/65">Proposed target release date<InfoTip text="CHXNDLER proposes this date for the collaborator’s acceptance. It may change."/><input type="date" value={terms.target_release_date || ""} disabled={signed || sent} onChange={event => change("target_release_date", event.target.value)} className={inputClass}/></label>
            <fieldset className="sm:col-span-2"><legend className="text-xs font-medium text-white/65">Music video participation <InfoTip text="This records interest in physically appearing only. It is not a commitment; the agreed recording may still be used under the recording rights."/></legend><div className="mt-2 flex flex-wrap gap-4 text-sm text-white/75"><label className="flex items-center gap-2"><input type="radio" name="music-video-participation" checked={terms.music_video_participation === "interested"} disabled={signed || sent} onChange={() => change("music_video_participation", "interested")} className="accent-[#FD52AF]"/>Interested</label><label className="flex items-center gap-2"><input type="radio" name="music-video-participation" checked={terms.music_video_participation === "not_interested"} disabled={signed || sent} onChange={() => change("music_video_participation", "not_interested")} className="accent-[#FD52AF]"/>Not interested</label></div></fieldset>
          </div>
        </section>
        </>}

        {flowStep === 2 && <>
        <section className="rounded-xl bg-white/[.025] p-4 sm:p-5"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-white"><BadgeDollarSign className="h-4 w-4 text-[#FD52AF]"/>Payment & Royalties <InfoTip label="Payment and royalties" text="These are the negotiated fee and the collaborator’s shares of recording and master sync income. Statutory performer royalties are separate."/></h3>
          <label className="mt-3 block max-w-sm text-xs text-white/60">One-time payment<select value={terms.payment_direction || ""} disabled={signed || sent} onChange={event => change("payment_direction", event.target.value)} className={inputClass}><option value="">Select agreed arrangement</option><option value="none">No upfront payment ($0)</option><option value="chxndler_pays">CHXNDLER pays collaborator</option><option value="collaborator_pays">Collaborator pays CHXNDLER</option></select></label>
          {terms.payment_direction && terms.payment_direction !== "none" && <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2"><label className="block text-xs text-white/60">Amount<input type="number" min="0.01" step="0.01" disabled={signed || sent} value={terms.flat_fee ?? ""} onChange={event => change("flat_fee", event.target.value === "" ? "" : Number(event.target.value))} className={inputClass}/></label><label className="block text-xs text-white/60">Currency<input value={terms.fee_currency || "USD"} disabled={signed || sent} onChange={event => change("fee_currency", event.target.value.toUpperCase())} className={inputClass}/></label><label className="block text-xs text-white/60 sm:col-span-2">Payment timing<input value={terms.payment_terms || ""} disabled={signed || sent} placeholder="Agreed payment timing" onChange={event => change("payment_terms", event.target.value)} className={inputClass}/></label></div>}
          <label className="mt-4 block max-w-xs text-xs text-white/60">Collaborator recording royalty participation % <InfoTip text="The collaborator's share of defined master recording revenue. This is separate from master ownership, songwriting ownership, and statutory performer royalties."/><input type="number" min="0" max="100" step="0.01" value={terms.master_royalty ?? ""} disabled={signed || sent} onChange={event => change("master_royalty", event.target.value === "" ? "" : Number(event.target.value))} className={inputClass}/></label>
          {terms.master_royalty !== "" && terms.master_royalty !== undefined && <p className="mt-2 text-xs text-white/45">CHXNDLER / unallocated: {Math.max(0, 100 - Number(terms.master_royalty) - (terms.master_participants || []).reduce((sum: number, row: any) => sum + Number(row.share || 0), 0))}%</p>}
          <div className="mt-3 space-y-2">{(terms.master_participants || []).map((row: any, index: number) => <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2"><input aria-label={`Participant ${index + 1} name`} value={row.name || ""} disabled={signed || sent} placeholder="Participant" onChange={event => change("master_participants", terms.master_participants.map((item: any, i: number) => i === index ? { ...item, name: event.target.value } : item))} className={inputClass}/><input aria-label={`Participant ${index + 1} recording royalty`} type="number" min="0" max="100" step="0.01" value={row.share ?? ""} disabled={signed || sent} onChange={event => change("master_participants", terms.master_participants.map((item: any, i: number) => i === index ? { ...item, share: event.target.value === "" ? "" : Number(event.target.value) } : item))} className={inputClass}/><button type="button" disabled={signed || sent} onClick={() => change("master_participants", terms.master_participants.filter((_: any, i: number) => i !== index))} className="px-2 text-xs text-white/50">Remove</button></div>)}<button type="button" disabled={signed || sent} onClick={() => change("master_participants", [...(terms.master_participants || []), { name: "", share: "" }])} className="text-xs text-[#ff9bcd]">+ Add royalty participant</button></div>
        </section>
        <section className="rounded-xl bg-white/[.025] p-4 sm:p-5"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-white"><Music2 className="h-4 w-4 text-[#FD52AF]"/>Songwriting <InfoTip label="Songwriting" text="Select Performance Only when no original lyrics or music were contributed. Co-writer shares must reflect actual authorship and total 100%."/></h3><label className="mt-3 block max-w-sm text-xs text-white/60">Did the collaborator write original lyrics or music?<InfoTip label="Songwriting status" text="Composition ownership is based on actual authorship. It is separate from recording royalties."/><select value={terms.songwriting_status || "unresolved"} disabled={signed || sent} onChange={event => change("songwriting_status", event.target.value)} className={inputClass}><option value="performance_only">No — Performance only</option><option value="co_writer">Yes — Songwriting contribution</option><option value="unresolved">Not yet determined</option></select></label>
          {songwritingFieldError && <p role="alert" className="mt-2 text-xs leading-5 text-amber-100/80">{songwritingFieldError}</p>}
          {terms.songwriting_status === "co_writer" && <><div className="mt-3 space-y-2">{(terms.writer_splits || []).map((row: any, index: number) => <div key={index} className="grid grid-cols-[minmax(8rem,1fr)_7rem_auto] items-center gap-2"><div className="min-w-0"><span className="text-xs text-white/65">{row.chxndler ? "CHXNDLER" : row.collaborator ? "Collaborator" : "Writer"}</span><InfoTip label="Writer ownership share" text="Enter this writer’s agreed composition ownership. All writer shares must reflect actual authorship and total 100%."/>{!row.chxndler && !row.collaborator && <input value={row.name || ""} placeholder="Legal writer name" disabled={signed || sent} onChange={event => change("writer_splits", terms.writer_splits.map((item: any, i: number) => i === index ? { ...item, name: event.target.value } : item))} className={inputClass}/>}</div><input aria-label={`${row.name || "Writer"} ownership percentage`} type="number" min="0" max="100" step="0.01" value={row.share ?? ""} disabled={signed || sent} onChange={event => change("writer_splits", terms.writer_splits.map((item: any, i: number) => i === index ? { ...item, share: event.target.value === "" ? "" : Number(event.target.value) } : item))} className={inputClass}/>{!row.chxndler && !row.collaborator && <button type="button" onClick={() => change("writer_splits", terms.writer_splits.filter((_: any, i: number) => i !== index))} className="px-2 text-xs text-white/50">Remove</button>}</div>)}</div><p className="mt-2 text-xs text-white/45">Remaining ownership: {100 - (terms.writer_splits || []).reduce((sum: number, row: any) => sum + Number(row.share || 0), 0)}%</p><button type="button" disabled={signed || sent} onClick={() => change("writer_splits", [...terms.writer_splits, { name: "", stage_name: "", share: "", pro: "", ipi: "", publisher: "" }])} className="mt-2 text-xs text-[#ff9bcd]">+ Add writer</button><details className="mt-3 text-xs text-white/55"><summary className="cursor-pointer">Optional writer registration details</summary><p className="mt-2 text-[11px] leading-5 text-white/40">PRO membership and IPI/CAE are registration details, not proof of ownership. Publishing administrator is separate from PRO affiliation.</p>{(terms.writer_splits || []).map((row: any, index: number) => <div key={index} className="mt-2 grid gap-2 sm:grid-cols-2"><input aria-label="Writer stage name" placeholder="Artist / stage name" value={row.stage_name || ""} onChange={event => change("writer_splits", terms.writer_splits.map((x: any, i: number) => i === index ? { ...x, stage_name: event.target.value } : x))} className={inputClass}/><input aria-label="Writer PRO affiliation" placeholder="PRO (ASCAP, BMI, SESAC, international, none)" value={row.pro || ""} onChange={event => change("writer_splits", terms.writer_splits.map((x: any, i: number) => i === index ? { ...x, pro: event.target.value } : x))} className={inputClass}/><input aria-label="Writer IPI / CAE number" placeholder="IPI / CAE number (optional)" value={row.ipi || ""} onChange={event => change("writer_splits", terms.writer_splits.map((x: any, i: number) => i === index ? { ...x, ipi: event.target.value } : x))} className={inputClass}/><input aria-label="Writer publishing administrator" placeholder="Publisher / administrator" value={row.publisher || ""} onChange={event => change("writer_splits", terms.writer_splits.map((x: any, i: number) => i === index ? { ...x, publisher: event.target.value } : x))} className={inputClass}/></div>)}</details></>}
        </section>
        <section className="rounded-xl border border-white/10 bg-[#121216] p-4 sm:p-5"><h3 className="flex items-center text-xs font-bold uppercase tracking-[.15em] text-white">Production &amp; Release <InfoTip text="CHXNDLER is the primary artist, producer, master owner, and distributor under the standard arrangement. Composition ownership follows the agreed songwriter shares."/></h3><div className="mt-2 grid gap-x-4 sm:grid-cols-2">{([ ["Primary Artist",UserRound,"Primary artist credit for this release."], ["Producer",Music2,"Producer credit for this release."], ["Master Owner",Disc3,"CHXNDLER retains ownership and control of the master under the standard arrangement."], ["Distribution",Radio,"CHXNDLER controls official distribution and release authority."] ] as const).map(([label,Icon,help])=><div key={label} className="flex min-w-0 items-center gap-2 border-b border-white/[.06] py-2 text-[11px] text-white/55"><Icon className="h-4 w-4 shrink-0 text-[#FD52AF]"/>{label}<InfoTip text={help}/><span className="ml-auto w-36 min-w-0 px-2 py-1.5 text-right text-xs font-semibold text-white">CHXNDLER</span></div>)}</div></section>
        <details className="rounded-xl bg-white/[.025] p-4"><summary className="cursor-pointer text-xs font-bold text-white/75">Additional Terms (Optional)</summary><label className="mt-3 block text-xs font-medium text-white/60"><textarea aria-label="Additional terms (optional)" rows={3} disabled={signed || sent} value={terms.additional_terms ?? ""} onChange={event => change("additional_terms", event.target.value)} placeholder="Any additional terms agreed upon for this collaboration..." className={`${inputClass} resize-y`}/></label></details>
        {royaltyTermsApply && <section className="rounded-xl bg-white/[.025] p-4 sm:p-5"><h3 className="text-xs font-bold uppercase tracking-[.15em] text-white">Royalty Basis &amp; Reporting</h3><p className="mt-2 text-[11px] leading-5 text-white/50">These standard terms apply only because a recording or separate sync share is included. Confirm them before approval.</p><label className="mt-3 block text-xs text-white/60">Applicable revenue<textarea rows={2} value={terms.revenue_definition || ""} disabled={signed || sent} onChange={event => change("revenue_definition", event.target.value)} className={`${inputClass} resize-y`}/></label><label className="mt-3 block text-xs text-white/60">Agreed deductions<textarea rows={2} value={terms.deductions || ""} disabled={signed || sent} onChange={event => change("deductions", event.target.value)} className={`${inputClass} resize-y`}/></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-xs text-white/60">Reporting and payment frequency<input value={terms.accounting_frequency || ""} disabled={signed || sent} onChange={event => change("accounting_frequency", event.target.value)} className={inputClass}/></label><label className="block text-xs text-white/60">Payment threshold, if agreed ($)<input type="number" min="0" step="0.01" value={terms.payment_threshold ?? ""} disabled={signed || sent} onChange={event => change("payment_threshold", event.target.value === "" ? "" : Number(event.target.value))} className={inputClass}/></label></div></section>}
        </>}

        {flowStep === 3 && <>
        {signed ? <section className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.04] p-5"><h3 className="font-bold text-emerald-100">This signed agreement is immutable</h3><p className="mt-2 text-sm text-white/60">Its original executed terms are preserved in the signed PDF.</p>{request.signed_agreement_url && <a href={request.signed_agreement_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#FD52AF] px-4 py-2 text-xs font-bold text-[#170d14]">Download signed PDF</a>}</section> : <AgreementDocument type={agreementType} terms={{ ...terms, agreement_version: savedVersion || "Draft", agreement_status: agreementStatus }} songTitle={terms.song_title || "Collaboration project"} version={savedVersion} agreementId={request.id} signedAt={request.collaborator_signed_at} collaboratorSignature={request.collaborator_signature} adminSignedAt={request.admin_signed_at} preview />}
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">04 · Review & Sign</p>
          <div aria-label={`Agreement stage: ${steps[activeStep]}`} className="mt-3 flex flex-wrap items-center gap-1.5">{steps.map((step, index) => <div key={step} aria-current={index === activeStep ? "step" : undefined} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${index === activeStep ? "bg-[#FD52AF]/15 text-[#ff9bcd]" : index < activeStep ? "text-emerald-200/75" : "text-white/35"}`}><span className="mr-1">{index < activeStep ? "✓" : index + 1}</span>{step}</div>)}</div>
          {missing.length > 0 && <div className="mt-3 rounded-lg border border-amber-200/15 bg-amber-100/[.03] px-3 py-2 text-xs leading-5 text-amber-100/80"><span className="font-semibold">Resolve before sending:</span> {missing.slice(0, 4).join(" · ")}{missing.length > 4 ? ` · +${missing.length - 4} more` : ""}<button type="button" onClick={() => setFlowStep(missing.some(item => /payment|fee|royalt|songwriting|ownership|share/i.test(item)) ? 2 : 1)} className="ml-2 font-bold text-[#ff9bcd] underline underline-offset-2">Edit fields</button></div>}
          {reviewFlags.map(flag => <p key={flag} className="mt-2 text-xs leading-5 text-amber-100/70">Admin review: {flag}</p>)}
          {!requestApprovalOkay && <p className="mt-3 text-xs text-amber-100/75">Approve this collaboration request in its request review before sending an agreement.</p>}
          {savedVersion > 0 && <label className={`mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-5 ${reviewConfirmed ? "border-[#FD52AF]/40 bg-[#FD52AF]/[.06]" : "border-white/10 bg-black/15"}`}><input type="checkbox" checked={reviewConfirmed} disabled={!previewIsCurrent || executionIssues.length > 0 || busy || signed || sent} onChange={event => void confirmReview(event.target.checked)} className="mt-0.5 accent-[#FD52AF]"/><span>I reviewed the exact preview for v{savedVersion} and approve this version for sending.</span></label>}
          <p className="mt-3 text-[11px] leading-5 text-white/40">Generate a private link to open this contract in Collab. The collaborator can review and sign there.</p>
          {request.collaborator_signed_at && <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[.05] px-3 py-2 text-xs text-emerald-100/80">Signed online by <strong>{request.collaborator_printed_name || [request.collaborator_first_name, request.collaborator_last_name].filter(Boolean).join(" ")}</strong> on {new Date(request.collaborator_signed_at).toLocaleString()}.{request.collaborator_signature_email_sent_at ? " Signed copy emailed." : " Signed copy email has not been confirmed."}</p>}
          {privateAgreementUrl && <div className="mt-3 flex flex-wrap items-center gap-2"><a href={privateAgreementUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-[#FD52AF]/30 px-3 py-2 text-xs font-semibold text-[#ff9bcd] hover:bg-[#FD52AF]/[.06]">Preview Agreement ↗</a><button type="button" onClick={() => void navigator.clipboard.writeText(privateAgreementUrl).then(() => setNotice("Private agreement link copied."))} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[.05]">Copy Private Link</button><button type="button" onClick={() => void sendAgreementEmail()} disabled={busy || signed} className="rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-40">{sent ? "Resend Email" : "Send Email"}</button><button type="button" onClick={() => void revokeAgreementLink()} disabled={busy || signed} className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40">Revoke Link</button><button type="button" onClick={() => void signForChxndler()} disabled={busy || signed || !!request.admin_signed_at} className="rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">{request.admin_signed_at ? `CHXNDLER signed ${new Date(request.admin_signed_at).toLocaleDateString()}` : "Sign as CHXNDLER"}</button></div>}
          {request.signed_agreement_url && <a href={request.signed_agreement_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-emerald-200">Download signed PDF</a>}
          {approvedAt && <p className="mt-2 text-[11px] text-white/40">Version v{approvedVersion} approved {new Date(approvedAt).toLocaleString()}.</p>}
          {(request.agreementVersions || []).length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-white/45">Version history</summary><div className="mt-2 space-y-1">{request.agreementVersions.map((version: any) => <p key={version.id} className="text-[11px] text-white/40">v{version.version} · {agreementTypes.find(item => item.value === version.agreement_type)?.label || version.agreement_type} · {version.agreement_status} · {new Date(version.created_at).toLocaleString()} {version.document_url && <a href={version.document_url} target="_blank" rel="noreferrer" className="ml-1 text-[#ff80c4]">PDF</a>}</p>)}</div></details>}
        </section>
        </>}
        {flowStep < 3 && <div className="flex justify-between"><button type="button" onClick={() => setFlowStep(flowStep === 2 ? 1 : 2)} disabled={flowStep === 1} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white/65 disabled:opacity-35">Back</button><button type="button" onClick={() => setFlowStep(flowStep === 1 ? 2 : 3)} className="rounded-lg bg-[#FD52AF] px-5 py-2 text-xs font-bold text-[#170d14]">Continue</button></div>}
        {flowStep === 3 && <button type="button" onClick={() => setFlowStep(2)} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white/65">Back to Edit</button>}
      </div>

      <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 bg-[#101014]/95 px-4 py-3 backdrop-blur sm:justify-end sm:px-7">
        <div className="mr-auto min-w-0 flex-1 text-xs" role="status">{error ? <span className="text-rose-300">{error}</span> : <span className="text-white/45">{notice || (dirty ? "Unsaved changes" : savedVersion ? `Version ${savedVersion}${currentApproval ? " · approved" : " · draft"}` : "Save a draft to begin version history")}</span>}</div>
        <button type="button" onClick={() => void saveDraft()} disabled={busy || signed || sent || !dirty && savedVersion > 0} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-bold text-white/75 hover:bg-white/[.05] disabled:opacity-35">Save Draft</button>
        <button type="button" onClick={() => void previewAgreement()} disabled={busy || signed || !previewReady} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-bold text-white/75 hover:bg-white/[.05] disabled:opacity-35">Preview Agreement</button>
        {!privateAgreementUrl && <button type="button" onClick={() => void generateContractLink()} disabled={!sendEnabled} aria-describedby={!sendEnabled && sendReason ? "agreement-send-reason" : undefined} title={!sendEnabled ? sendReason : undefined} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-xs font-extrabold text-[#170d14] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">{busy ? "Working…" : "Send Agreement"}</button>}
        {!privateAgreementUrl && !sendEnabled && sendReason && <span id="agreement-send-reason" className="sr-only">{sendReason}</span>}
      </footer>
    </section>
  </div>;
}
