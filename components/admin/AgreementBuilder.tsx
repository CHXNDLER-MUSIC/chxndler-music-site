"use client";

import { useMemo, useState } from "react";
import {
  agreementFields,
  agreementTemplates,
  agreementTypeForContribution,
  agreementTypes,
  createAgreementDraft,
  validateAgreement,
  type AgreementType,
} from "@/lib/collaborationAgreements";
import AgreementDocument from "@/components/collab/AgreementDocument";

type RequestRecord = Record<string, any>;

const inputClass = "mt-1 block w-full rounded-lg border border-white/10 bg-[#0a0a0d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#FD52AF]/60 focus:ring-2 focus:ring-[#FD52AF]/15 disabled:opacity-50";
const ownershipSummaries: Record<AgreementType, string> = {
  singer_feature: "CHXNDLER retains ownership of the existing master recording and underlying composition, including all rights owned before this collaboration. The collaborator receives a default 0% master royalty unless otherwise expressly agreed in writing. Any songwriting or publishing shares are determined by actual authorship and a separate written split agreement. A flat fee alone does not transfer copyright ownership or waive songwriting rights. CHXNDLER controls official release and distribution, subject to the rights and permissions granted in the signed agreement.",
  producer: "Each party keeps pre-existing materials. The producer retains rights in new production, performances, and compositions except for the project license expressly granted here. Master royalties and songwriting shares are separate negotiated terms; a fee alone does not transfer copyright. Release and distribution are subject to the signed project license.",
  remix: "CHXNDLER retains rights to the original master and composition. The remixer retains rights in new material except for the limited source-material permission and project license stated in the signed agreement. A remix does not itself set songwriting shares or authorize an independent release.",
  videographer: "CHXNDLER owns the song, master recording, and materials CHXNDLER provides. The videographer owns the footage and video they create, while giving CHXNDLER permission to use the final video to release and promote this song. That permission does not transfer ownership. Any ownership transfer must be signed by both parties.",
};

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
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const missing = useMemo(() => validateAgreement(agreementType, terms), [agreementType, terms]);
  const ready = missing.length === 0;
  const previewReady = useMemo(() => validateAgreement(agreementType, agreementType !== "videographer" && terms.songwriting_status === "unresolved" ? { ...terms, songwriting_status: "separate_agreement" } : terms).length === 0, [agreementType, terms]);
  const currentApproval = approvedVersion > 0 && approvedVersion === savedVersion;
  const sent = ["awaiting_signature", "offer_sent"].includes(agreementStatus) || (request.status === "agreement_pending" && agreementStatus !== "draft");
  const signed = agreementStatus === "signed" || request.status === "signed";
  const previewIsCurrent = previewedVersion > 0 && previewedVersion === savedVersion && !dirty;
  const sendEnabled = !busy && !dirty && ready && previewIsCurrent && reviewConfirmed && currentApproval && (request.status === "approved" || request.status === "agreement_pending") && !sent && !signed;
  const template = agreementTemplates[agreementType];

  function change(key: string, value: string | number) {
    setTerms(current => {
      const next = { ...current, [key]: value };
      if (key === "flat_fee") {
        next.fee_option = Number(value) > 0 ? "Custom fee" : "No fee";
        if (Number(value) > 0 && (!next.payment_terms || next.payment_terms === "No flat fee is proposed. This does not waive songwriting or publishing rights.")) next.payment_terms = "Payment is due within 30 days after receipt of an invoice and acceptance of the listed deliverables.";
      }
      if (key === "songwriting_status" && value === "separate_agreement") next.publishing_split = "";
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
      if (result.reviewUrl) await navigator.clipboard.writeText(String(result.reviewUrl)).catch(() => {});
      setNotice("Private agreement link copied. You can also send this same link by email."); setReviewConfirmed(false); onUpdated();
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
    nextTerms.legal_terms = agreementTemplates[nextType].legalTerms;
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

  const requestApprovalOkay = request.status === "approved" || request.status === "agreement_pending";
  const activeStep = signed ? 4 : sent ? 3 : currentApproval ? 2 : savedVersion > 0 && ready ? 1 : 0;
  const steps = ["Draft", "Ready for Review", "Approved", "Sent", "Signed"];

  return <div className="fixed inset-0 z-[140] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="agreement-builder-title" className="flex h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101014] text-white shadow-2xl">
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FD52AF]">Collaboration workspace · {request.artist_name}</p><h2 id="agreement-builder-title" className="mt-1 truncate text-lg font-bold">Finalize Agreement <span className="font-normal text-white/45">{savedVersion ? `· v${savedVersion}` : "· New draft"}</span></h2></div>
        <button type="button" disabled={busy} onClick={close} aria-label="Close agreement builder" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40">×</button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7">
        <nav aria-label="Agreement setup steps" className="grid grid-cols-3 gap-2">{(["Collaboration", "Payment & Rights", "Review & Send"] as const).map((label, index) => { const step = (index + 1) as 1 | 2 | 3; return <button key={label} type="button" onClick={() => setFlowStep(step)} aria-current={flowStep === step ? "step" : undefined} className={`rounded-lg border px-2 py-2.5 text-xs font-bold sm:text-sm ${flowStep === step ? "border-[#FD52AF]/50 bg-[#FD52AF]/10 text-[#ff9bcd]" : "border-white/10 text-white/45 hover:text-white/75"}`}><span className="mr-1.5 text-[#FD52AF]">0{step}</span>{label}</button>; })}</nav>
        {flowStep === 1 && <>
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">01 · Collaboration</p><p className="mt-1 text-xs text-white/40">Prepared from the collaboration request and reusable template.</p></div><label className="text-xs font-medium text-white/55">Agreement type<select value={agreementType} disabled={signed || sent || busy} onChange={event => chooseType(event.target.value)} className={`${inputClass} mt-1 w-44`}>{agreementTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
          <div className="grid gap-3 sm:grid-cols-2">{agreementFields[agreementType].map(fieldControl)}</div>
        </section>
        </>}

        {flowStep === 2 && <>
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">02 · Payment & Royalties</p>
          <div className={`mt-4 grid gap-3 ${agreementType === "videographer" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <label htmlFor="agreement-flat-fee" className="block text-xs font-medium text-white/65">{agreementType === "videographer" ? "Flat project fee" : "Flat fee"}<div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-sm text-white/40">$</span><input id="agreement-flat-fee" type="number" min="0" step="0.01" disabled={signed || sent} value={terms.flat_fee ?? 0} onChange={event => change("flat_fee", event.target.value === "" ? "" : Number(event.target.value))} className={`${inputClass} pl-7`} /></div></label>
            {agreementType !== "videographer" && <>
              <label htmlFor="agreement-master-royalty" className="block text-xs font-medium text-white/65">Master royalty<div className="relative"><input id="agreement-master-royalty" type="number" min="0" max="100" step="0.01" disabled={signed || sent} value={terms.master_royalty ?? 0} onChange={event => change("master_royalty", event.target.value === "" ? "" : Number(event.target.value))} className={`${inputClass} pr-8`} /><span className="pointer-events-none absolute right-3 top-3 text-sm text-white/40">%</span></div></label>
              <label htmlFor="agreement-songwriting-status" className="block text-xs font-medium text-white/65">Songwriting / publishing<select id="agreement-songwriting-status" disabled={signed || sent} value={terms.songwriting_status === "unresolved" ? "" : terms.songwriting_status || ""} onChange={event => change("songwriting_status", event.target.value)} className={inputClass}><option value="" disabled>Select songwriting status</option><option value="performance_only">Performance only — no songwriting contribution confirmed</option><option value="separate_agreement">Reserved for separate signed split before release</option><option value="negotiated">Agreed composition split</option></select></label>
              <label htmlFor="agreement-master-owner" className="block text-xs font-medium text-white/65">Master owner<input id="agreement-master-owner" value={terms.master_owner || "CHXNDLER"} disabled={signed || sent} onChange={event => change("master_owner", event.target.value)} className={inputClass}/><span className="mt-1 block text-[10px] text-white/40">Subject to a signed contribution rights transfer.</span></label>
              {terms.songwriting_status === "negotiated" && <div className="sm:col-span-2"><label htmlFor="agreement-songwriting-splits" className="block text-xs font-medium text-white/65">Composition writers & shares <span className="font-normal text-white/40">(one per line: Name | share %; total must equal 100%)</span><textarea id="agreement-songwriting-splits" rows={3} disabled={signed || sent} value={terms.songwriting_splits || ""} onChange={event => change("songwriting_splits", event.target.value)} className={`${inputClass} resize-y`} placeholder={"CHXNDLER | 85\nCollaborator | 15"}/></label><p className="mt-1 text-[10px] text-white/40">If the collaborator wrote their own verse, 15% can be used as a proposed, editable negotiation starting point. It is not assigned automatically.</p></div>}
              {Number(terms.master_royalty) > 0 && <>
                <label className="block text-xs font-medium text-white/65 sm:col-span-2">Revenue definition<textarea rows={2} disabled={signed || sent} value={terms.revenue_definition || ""} onChange={event => change("revenue_definition", event.target.value)} className={`${inputClass} resize-y`} placeholder="Define receipts included in the royalty base"/></label>
                <label className="block text-xs font-medium text-white/65 sm:col-span-2">Permitted deductions<textarea rows={2} disabled={signed || sent} value={terms.deductions || ""} onChange={event => change("deductions", event.target.value)} className={`${inputClass} resize-y`} placeholder="List agreed deductions"/></label>
                <label className="block text-xs font-medium text-white/65">Accounting frequency<select disabled={signed || sent} value={terms.accounting_frequency || ""} onChange={event => change("accounting_frequency", event.target.value)} className={inputClass}><option value="">Choose frequency</option>{["Quarterly", "Semiannual", "Annual"].map(value => <option key={value}>{value}</option>)}</select></label>
              </>}
            </>}
          </div>
          {(agreementType === "videographer" || Number(terms.flat_fee) > 0 || Number(terms.master_royalty) > 0) && <label htmlFor="agreement-payment-terms" className="mt-3 block text-xs font-medium text-white/65">{agreementType === "videographer" ? "Payment schedule & terms" : "Payment & royalty provisions"}<textarea id="agreement-payment-terms" rows={2} disabled={signed || sent} value={terms.payment_terms ?? ""} onChange={event => change("payment_terms", event.target.value)} className={`${inputClass} resize-y`} placeholder="Payment timing, statements, dispute window, and late amounts"/></label>}
          {agreementType !== "videographer" && terms.songwriting_status === "separate_agreement" && <p className="mt-3 rounded-lg border border-amber-200/15 bg-amber-100/[.04] px-3 py-2 text-xs leading-5 text-amber-100/75">No songwriting share is being set to zero. Any applicable publishing split will be documented in a separate signed agreement before release.</p>}
          <p className="mt-2 text-[11px] text-white/35">Zero flat fee or master royalty does not waive composition or publishing rights.</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">03 · Standard Agreement Terms</p><p className="mt-1 text-xs text-white/40">Reusable {template.label} language · template v{template.version}</p></div><button type="button" disabled={signed || sent} onClick={() => setTermsExpanded(value => !value)} aria-expanded={termsExpanded} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:border-[#FD52AF]/50">{termsExpanded ? "Close Terms Editor" : "Edit Terms"}</button></div>
          <div className="mt-4 rounded-lg border border-white/[.07] bg-black/20 p-3 sm:p-4"><p className="text-xs font-bold text-white/80">Ownership & Rights</p><p className="mt-2 text-xs leading-5 text-white/55">{ownershipSummaries[agreementType]}</p></div>
          {termsExpanded && <div className="mt-3 grid gap-3">
            <label htmlFor="agreement-legal-terms" className="block text-xs font-medium text-white/65">Complete legal terms<textarea id="agreement-legal-terms" rows={8} disabled={signed || sent} value={terms.legal_terms ?? ""} onChange={event => change("legal_terms", event.target.value)} className={`${inputClass} resize-y leading-5`} /></label>
            <details className="rounded-lg border border-white/10 bg-black/15 p-3"><summary className="cursor-pointer text-xs font-semibold text-white/70">Additional Terms</summary><label htmlFor="agreement-additional-terms" className="mt-3 block text-xs font-medium text-white/60">Optional provisions<textarea id="agreement-additional-terms" rows={3} disabled={signed || sent} value={terms.additional_terms ?? ""} onChange={event => change("additional_terms", event.target.value)} className={`${inputClass} resize-y`} placeholder="Exclusivity, special permissions, or other negotiated terms" /></label></details>
          </div>}
        </section>
        </>}

        {flowStep === 3 && <>
        <AgreementDocument type={agreementType} terms={{ ...terms, agreement_version: savedVersion || "Draft" }} songTitle={terms.song_title || "Collaboration project"} version={savedVersion || 1} agreementId={request.id} preview />
        <section className="rounded-xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">04 · Review & Sign</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{steps.map((step, index) => <div key={step} className={`rounded-lg border px-2.5 py-2 text-center text-[11px] font-semibold ${index <= activeStep ? "border-[#FD52AF]/40 bg-[#FD52AF]/[.08] text-[#ff9acb]" : "border-white/[.07] text-white/35"}`}><span className="mr-1.5">{index < activeStep ? "✓" : index + 1}</span>{step}</div>)}</div>
          {missing.length > 0 && <div className="mt-3 rounded-lg border border-amber-200/20 bg-amber-100/[.04] px-3 py-2 text-xs leading-5 text-amber-100/80"><span className="font-semibold">Complete before approval:</span> {missing.join(" · ")}</div>}
          {!requestApprovalOkay && <p className="mt-3 text-xs text-amber-100/75">Approve this collaboration request in its request review before sending an agreement.</p>}
          {savedVersion > 0 && <label className={`mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-5 ${reviewConfirmed ? "border-[#FD52AF]/40 bg-[#FD52AF]/[.06]" : "border-white/10 bg-black/15"}`}><input type="checkbox" checked={reviewConfirmed} disabled={!previewIsCurrent || !ready || busy || signed || sent} onChange={event => void confirmReview(event.target.checked)} className="mt-0.5 accent-[#FD52AF]"/><span>I reviewed the exact preview for v{savedVersion} and approve this version for sending.</span></label>}
          <p className="mt-3 text-[11px] leading-5 text-white/40">Generate a private link to open this contract in Collab. The collaborator can review and sign there.</p>
          {request.collaborator_signed_at && <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[.05] px-3 py-2 text-xs text-emerald-100/80">Signed online by <strong>{request.collaborator_printed_name || [request.collaborator_first_name, request.collaborator_last_name].filter(Boolean).join(" ")}</strong> on {new Date(request.collaborator_signed_at).toLocaleString()}.{request.collaborator_signature_email_sent_at ? " Signed copy emailed." : " Signed copy email has not been confirmed."}</p>}
          {privateAgreementUrl && <div className="mt-3 flex flex-wrap items-center gap-2"><a href={privateAgreementUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-[#FD52AF]/30 px-3 py-2 text-xs font-semibold text-[#ff9bcd] hover:bg-[#FD52AF]/[.06]">Preview agreement ↗</a><button type="button" onClick={() => void navigator.clipboard.writeText(privateAgreementUrl).then(() => setNotice("Private agreement link copied."))} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[.05]">Copy Private Agreement Link</button><button type="button" onClick={() => void sendAgreementEmail()} disabled={busy || signed} className="rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-[#170d14] disabled:opacity-40">{sent ? "Resend Agreement by Email" : "Send Agreement by Email"}</button><button type="button" onClick={() => void revokeAgreementLink()} disabled={busy || signed} className="rounded-lg border border-rose-300/25 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40">Revoke Link</button><button type="button" onClick={() => void signForChxndler()} disabled={busy || signed || !!request.admin_signed_at} className="rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">{request.admin_signed_at ? `CHXNDLER signed ${new Date(request.admin_signed_at).toLocaleDateString()}` : "Sign as CHXNDLER"}</button></div>}
          {request.signed_agreement_url && <a href={request.signed_agreement_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-emerald-200">Download signed PDF</a>}
          {approvedAt && <p className="mt-2 text-[11px] text-white/40">Version v{approvedVersion} approved {new Date(approvedAt).toLocaleString()}.</p>}
          {(request.agreementVersions || []).length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-white/45">Version history</summary><div className="mt-2 space-y-1">{request.agreementVersions.map((version: any) => <p key={version.id} className="text-[11px] text-white/40">v{version.version} · {agreementTypes.find(item => item.value === version.agreement_type)?.label || version.agreement_type} · {version.agreement_status} · {new Date(version.created_at).toLocaleString()} {version.document_url && <a href={version.document_url} target="_blank" rel="noreferrer" className="ml-1 text-[#ff80c4]">PDF</a>}</p>)}</div></details>}
        </section>
        </>}
        {flowStep < 3 && <div className="flex justify-between"><button type="button" onClick={() => setFlowStep(flowStep === 2 ? 1 : 2)} disabled={flowStep === 1} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white/65 disabled:opacity-35">Back</button><button type="button" onClick={() => setFlowStep(flowStep === 1 ? 2 : 3)} className="rounded-lg bg-[#FD52AF] px-5 py-2 text-xs font-bold text-[#170d14]">Continue</button></div>}
      </div>

      <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 bg-[#101014]/95 px-4 py-3 backdrop-blur sm:justify-end sm:px-7">
        <div className="mr-auto min-w-0 flex-1 text-xs" role="status">{error ? <span className="text-rose-300">{error}</span> : <span className="text-white/45">{notice || (dirty ? "Unsaved changes" : savedVersion ? `Version ${savedVersion}${currentApproval ? " · approved" : " · draft"}` : "Save a draft to begin version history")}</span>}</div>
        <button type="button" onClick={() => void saveDraft()} disabled={busy || signed || sent || !dirty && savedVersion > 0} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-bold text-white/75 hover:bg-white/[.05] disabled:opacity-35">Save Draft</button>
        <button type="button" onClick={() => void previewAgreement()} disabled={busy || signed || !previewReady} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-bold text-white/75 hover:bg-white/[.05] disabled:opacity-35">Preview Agreement</button>
        <button type="button" onClick={() => void generateContractLink()} disabled={!sendEnabled} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-xs font-extrabold text-[#170d14] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">{busy ? "Working…" : "Copy Private Agreement Link"}</button>
      </footer>
    </section>
  </div>;
}
