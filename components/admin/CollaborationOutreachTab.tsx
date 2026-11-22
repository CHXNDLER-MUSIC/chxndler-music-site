"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agreementFields, agreementText, agreementTypeForContribution, agreementTypes, createAgreementDraft, type AgreementType } from "@/lib/collaborationAgreements";

type RequestRow = { id: string; song_id: string | null; artist_name: string; first_name?: string | null; last_name?: string | null; contribution_type: string; status: string; submitted_at: string; message: string | null; profile_link?: string | null; agreement_status?: string; project_status?: string; songs?: { title?: string } | null };
type Song = { id: string; title: string };
type Contact = { id:string; first_name:string|null; last_name:string|null; email:string|null; phone?:string|null; venue:string|null };
export default function CollaborationOutreachTab({ songId = "" }: { songId?: string }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ firstName: "", lastName: "", artistName: "", email: "", phone: "", contactId: "", songId, type: "Feature / Vocals", message: "" });
  const [inviteAgreementType, setInviteAgreementType] = useState<AgreementType>("singer_feature");
  const [inviteLink, setInviteLink] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<Record<string, any> | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementDraft, setAgreementDraft] = useState<Record<string, any>>({});
  const [agreementType, setAgreementType] = useState<AgreementType>("singer_feature");
  const [agreementDirty, setAgreementDirty] = useState(false);
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [agreementNotice, setAgreementNotice] = useState("");

  async function openRequest(id: string) {
    setSelectedRequest(null); setRequestLoading(true);
    const response = await fetch(`/api/admin/collaboration-requests?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      const request = { ...result.request, agreementVersions: result.agreementVersions || [] };
      const inferredType = request.agreement_type || request.collaboration_invites?.agreement_type || agreementTypeForContribution(request.collaboration_invites?.contribution_type || request.contribution_type);
      setSelectedRequest(request);
      setAgreementType(inferredType);
      setAgreementDraft(request.agreement_terms && Object.keys(request.agreement_terms).length ? request.agreement_terms : createAgreementDraft({ type: inferredType, request, invite: request.collaboration_invites }));
      setAgreementDirty(false);
    } else setSelectedRequest({ error: result.error || "Unable to load request." });
    setRequestLoading(false);
  }

  async function updateAgreement(values: Record<string, unknown>) {
    if (!selectedRequest?.id) return false;
    setAgreementBusy(true); setAgreementNotice("Saving agreement…");
    try {
      const response = await fetch("/api/admin/collaboration-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selectedRequest.id, ...values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update agreement.");
      await openRequest(selectedRequest.id);
      setAgreementNotice("Saved.");
      return true;
    } catch (error) {
      setAgreementNotice(error instanceof Error ? error.message : "Unable to update agreement.");
      return false;
    } finally { setAgreementBusy(false); }
  }

  async function uploadAgreement(file?: File, type: "draft" | "signed" = "draft") {
    if (!file || !selectedRequest?.id) return;
    setAgreementBusy(true); setAgreementNotice(type === "signed" ? "Uploading executed agreement…" : "Uploading reviewed agreement…");
    try {
      const form = new FormData(); form.set("file", file); form.set("type", type);
      const response = await fetch(`/api/admin/collaboration-requests/${selectedRequest.id}/agreement`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload agreement.");
      await openRequest(selectedRequest.id); setAgreementNotice(type === "signed" ? "Executed PDF uploaded. Review all signatures before marking signed." : "Reviewed agreement uploaded.");
    } catch (error) {
      setAgreementNotice(error instanceof Error ? error.message : "Unable to upload agreement.");
    } finally { setAgreementBusy(false); }
  }

  function previewAgreement() {
    const preview = window.open("", "_blank");
    if (!preview) { setAgreementNotice("Allow pop-ups to preview and print the agreement."); return; }
    const text = agreementText(agreementType, agreementDraft);
    const safeText = text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
    preview.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>CHXNDLER Agreement Preview</title><style>body{font:16px/1.6 Arial,sans-serif;color:#17171c;max-width:850px;margin:48px auto;padding:0 24px}h1{color:#d92989}pre{white-space:pre-wrap;font:inherit}.notice{padding:12px;border:1px solid #d92989;border-radius:8px}@media print{body{margin:16mm auto}.notice{border-color:#aaa}}</style></head><body><h1>CHXNDLER Collaboration Agreement</h1><p class="notice"><b>Draft for legal review.</b> This generated template is not signed or binding until executed by all parties.</p><pre>${safeText}</pre><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
    preview.document.close();
  }

  async function sendAgreement() {
    if (!selectedRequest?.id) return;
    setAgreementBusy(true); setAgreementNotice("Sending agreement…");
    try {
      const response = await fetch(`/api/admin/collaboration-requests/${selectedRequest.id}/send-agreement`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send agreement.");
      await openRequest(selectedRequest.id); setAgreementNotice("Agreement email sent. Awaiting a manually signed PDF.");
    } catch (error) { setAgreementNotice(error instanceof Error ? error.message : "Unable to send agreement."); }
    finally { setAgreementBusy(false); }
  }

  async function updateRequestStatus(status: string) {
    if (!selectedRequest?.id) return;
    setAgreementBusy(true); setAgreementNotice("Updating request…");
    try {
      const response = await fetch("/api/admin/collaboration-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selectedRequest.id, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update request.");
      await openRequest(selectedRequest.id); setAgreementNotice("Request status updated.");
      void load();
    } catch (error) { setAgreementNotice(error instanceof Error ? error.message : "Unable to update request."); }
    finally { setAgreementBusy(false); }
  }

  async function verifySignedAgreement() {
    if (!selectedRequest?.id || !selectedRequest.signed_agreement_path) return;
    if (!window.confirm("Confirm you reviewed the executed PDF and verified every required signature is present.")) return;
    setAgreementBusy(true); setAgreementNotice("Recording verified signatures…");
    try {
      const response = await fetch("/api/admin/collaboration-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selectedRequest.id, status: "signed", signedVerified: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to verify agreement.");
      await openRequest(selectedRequest.id); setAgreementNotice("Executed agreement verified and locked.");
    } catch (error) { setAgreementNotice(error instanceof Error ? error.message : "Unable to verify agreement."); }
    finally { setAgreementBusy(false); }
  }

  async function load() {
    setLoading(true);
    const [requestsResponse, songsResponse, contactsResponse] = await Promise.all([
      fetch("/api/admin/collaboration-requests", { cache: "no-store" }),
      fetch("/api/admin/song-tracker", { cache: "no-store" }),
      fetch("/api/admin/industry-connections", { cache: "no-store" }),
    ]);
    const [requestsData, songsData, contactsData] = await Promise.all([requestsResponse.json(), songsResponse.json(), contactsResponse.json()]);
    if (requestsResponse.ok) setRows(requestsData.requests || []);
    else setNotice(requestsData.error || "Unable to load collaboration requests.");
    if (songsResponse.ok) setSongs((songsData.songs || []).map((song: Song) => ({ id: song.id, title: song.title })));
    if (contactsResponse.ok) setContacts(contactsData.contacts || []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setInvite(current => ({ ...current, songId })); }, [songId]);

  async function createInvite(event: React.FormEvent) {
    event.preventDefault(); setNotice(""); setInviteLink("");
    const selectedContact = contacts.find(item => item.id === invite.contactId);
    const displayName = [invite.firstName, invite.lastName].filter(Boolean).join(" ").trim() || invite.artistName.trim() || [selectedContact?.first_name, selectedContact?.last_name].filter(Boolean).join(" ").trim() || invite.email.trim() || "Creative collaborator";
    const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: invite.firstName, lastName: invite.lastName, artistName: invite.artistName, displayName, inviteeEmail: invite.email, phone: invite.phone, contactId: invite.contactId, personalMessage: invite.message, contributionType: invite.type, agreementType: inviteAgreementType, scope: invite.songId ? "song" : "catalog", songId: invite.songId }) });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error || "Unable to create invitation."); return; }
    setInviteLink(result.link || ""); setNotice("Private song invitation created.");
  }

  const visible = rows.filter(row => !songId || row.song_id === songId);
  const requiredAgreementKeys: Record<AgreementType, string[]> = {
    singer_feature: ["collaborator_legal_name", "song_title", "vocal_deliverables", "artist_credit"],
    remix: ["collaborator_legal_name", "song_title", "remix_title", "remixer_credit", "remix_deliverables"],
    producer: ["collaborator_legal_name", "song_title", "production_scope", "deliverables"],
    videographer: ["collaborator_legal_name", "song_title", "production_scope", "delivery_deadline", "video_deliverables"],
  };
  const missingAgreementFields = [...requiredAgreementKeys[agreementType], ...(agreementDraft.fee_option === "Custom fee" && !agreementDraft.flat_fee ? ["flat_fee"] : [])].filter(key => !String(agreementDraft[key] || "").trim()).map(key => agreementFields[agreementType].find(field => field.key === key)?.label || key);
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-base font-bold">Creative collaborations</h2></div><button type="button" onClick={() => { setInviteOpen(value => !value); setInviteLink(""); }} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">Invite Creative</button></header>
    {inviteOpen && <form onSubmit={event => void createInvite(event)} className="grid gap-3 rounded-xl bg-white/[.035] p-4 sm:grid-cols-2">
      <label className="text-xs text-white/55 sm:col-span-2">Existing contact (optional)<select value={invite.contactId} onChange={event => { const contact=contacts.find(item=>item.id===event.target.value); setInvite({ ...invite, contactId:event.target.value, firstName:contact?.first_name||"", lastName:contact?.last_name||"", email:contact?.email||"", phone:contact?.phone||"" }); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white"><option value="">New invitee</option>{contacts.map(contact=><option key={contact.id} value={contact.id}>{[contact.first_name,contact.last_name].filter(Boolean).join(" ")}{contact.venue?` · ${contact.venue}`:""}</option>)}</select></label>
      <label className="text-xs text-white/55">First name (optional)<input autoComplete="given-name" value={invite.firstName} onChange={event => setInvite({ ...invite, firstName: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Last name (optional)<input autoComplete="family-name" value={invite.lastName} onChange={event => setInvite({ ...invite, lastName: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Artist name (optional)<input autoComplete="nickname" value={invite.artistName} onChange={event => setInvite({ ...invite, artistName: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Email (optional)<input type="email" autoComplete="email" value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Phone (optional)<input type="tel" autoComplete="tel" value={invite.phone} onChange={event => setInvite({ ...invite, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Song (optional)<select value={invite.songId} onChange={event => setInvite({ ...invite, songId: event.target.value })} disabled={!!songId} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{!songId && <option value="">No song · generic invite</option>}{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>
      <label className="text-xs text-white/55">Interest<select value={invite.type} onChange={event => setInvite({ ...invite, type: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{["Feature / Vocals", "Remix", "Other"].map(type => <option key={type}>{type}</option>)}</select></label>
      <label className="text-xs text-white/55">Agreement role (internal)<select value={inviteAgreementType} onChange={event => setInviteAgreementType(event.target.value as AgreementType)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{agreementTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-xs text-white/55 sm:col-span-2">Personal message<textarea value={invite.message} onChange={event => setInvite({ ...invite, message: event.target.value })} rows={2} placeholder="Add a note to include with the invitation" className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-black">Create private invite</button>{notice && <span role="status" className="text-sm text-white/60">{notice}</span>}</div>
      {inviteLink && <label className="text-xs text-white/50 sm:col-span-2">Copy this private link now<input readOnly value={inviteLink} onFocus={event => event.currentTarget.select()} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
    </form>}
    {notice && !inviteOpen && <p role="status" className="text-sm text-amber-100">{notice}</p>}
    <div className="divide-y divide-white/[.07]">
      {visible.map(row => <button type="button" key={row.id} onClick={() => void openRequest(row.id)} className="flex w-full flex-wrap items-center gap-2 py-3 text-left hover:bg-white/[.02]">
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.artist_name} <span className="font-normal text-white/50">· {row.contribution_type}</span></span><span className="mt-1 block truncate text-xs text-white/40">{row.songs?.title || "Original song idea"} · {new Date(row.submitted_at).toLocaleDateString()}</span>{row.message && <span className="mt-1 block truncate text-xs text-white/55">{row.message}</span>}</span><span className={`rounded-full px-2.5 py-1 text-xs ${row.status === "new" ? "bg-[#FD52AF]/15 font-semibold text-[#ff7fc1]" : "bg-white/[.07] text-white/65"}`}>{row.status.replaceAll("_", " ")}</span><span aria-hidden="true" className="text-white/35">›</span>
      </button>)}
      {!loading && visible.length === 0 && <p className="py-8 text-center text-sm text-white/45">No collaboration requests for this view yet.</p>}
      {loading && <p className="py-6 text-center text-sm text-white/45">Loading collaboration requests…</p>}
    </div>
    {(selectedRequest || requestLoading) && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedRequest(null); }} className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-labelledby="collab-request-title" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111116] p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#FD52AF]">Collaboration Request</p><h3 id="collab-request-title" className="mt-1 text-xl font-bold">{requestLoading ? "Loading…" : selectedRequest?.artist_name || "Request details"}</h3></div><button type="button" onClick={() => { setSelectedRequest(null); setAgreementOpen(false); }} aria-label="Close request details" className="rounded-lg px-3 py-1 text-xl text-white/60 hover:bg-white/10">×</button></div>{!requestLoading && selectedRequest && <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[ ["First name", selectedRequest.first_name], ["Last name", selectedRequest.last_name], ["Artist name", selectedRequest.artist_name], ["Contribution", selectedRequest.contribution_type], ["Song", selectedRequest.songs?.title || "Original song idea"], ["Status", selectedRequest.status?.replaceAll("_", " ")], ["Submitted", selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : "—"], ["Email", selectedRequest.email], ["Instagram / Music profile", selectedRequest.profile_link || "Not provided"], ["Phone", selectedRequest.phone], ["Project", selectedRequest.project_status?.replaceAll("_", " ") || "Requested"] ].filter(([, value]) => value).map(([label, value]) => <div key={label}><p className="text-xs text-white/40">{label}</p><p className="mt-1 break-words text-sm text-white/85">{value}</p></div>)}
        <div><p className="text-xs text-white/40">Agreement</p><button type="button" aria-expanded={agreementOpen} onClick={() => { setAgreementOpen(value => !value); setAgreementNotice(""); }} className="mt-1 text-left text-sm font-semibold capitalize text-[#ff80c4] underline decoration-[#ff80c4]/40 underline-offset-4 hover:text-white">{(selectedRequest.agreement_status || "draft").replaceAll("_", " ")}</button></div>
      </div>
      <div className="mt-5"><p className="text-xs text-white/40">Your idea</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/80">{selectedRequest.message || "No idea provided."}</p></div>
      <label className="mt-4 block text-xs text-white/55">Request review status<select value={selectedRequest.status} disabled={agreementBusy || selectedRequest.status === "signed" || selectedRequest.status === "completed"} onChange={event => void updateRequestStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm capitalize text-white">{["new", "reviewing", "approved", "declined", "canceled", "agreement_pending", "signed", "in_progress", "completed"].map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      {agreementOpen && <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <h4 className="font-semibold">Finalize Agreement</h4>
        <p className="mt-1 text-xs text-white/45">Song: {selectedRequest.songs?.title || "Original song idea"} · Collaborator: {selectedRequest.collaboration_invites?.first_name ? `${selectedRequest.collaboration_invites.first_name} ${selectedRequest.collaboration_invites.last_name || ""}`.trim() : selectedRequest.artist_name} · CHXNDLER: Chandler Pierce</p>
        {selectedRequest.agreement_status !== "signed" ? <label className="mt-4 block text-xs text-white/55">Agreement status<select value={selectedRequest.agreement_status || "draft"} disabled={agreementBusy} onChange={event => void updateAgreement({ agreement_status: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm capitalize text-white">{["draft", "offer_sent", "negotiating", "awaiting_signature", "declined", "cancelled", "completed"].map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label> : <p className="mt-4 text-sm font-bold text-emerald-300">Signed · agreement version locked</p>}
        <label className="mt-4 block text-xs text-white/55">Agreement type<select value={agreementType} disabled={selectedRequest.agreement_status === "signed"} onChange={event => { const nextType = event.target.value as AgreementType; setAgreementType(nextType); setAgreementDraft(createAgreementDraft({ type: nextType, request: selectedRequest, invite: selectedRequest.collaboration_invites })); setAgreementDirty(true); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{agreementTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{agreementFields[agreementType].filter(field => !field.advanced).map(field => <label key={field.key} className="text-xs text-white/65">{field.label}{field.kind === "textarea" ? <textarea value={agreementDraft[field.key] ?? ""} onChange={event => { setAgreementDraft(current => ({ ...current, [field.key]: event.target.value })); setAgreementDirty(true); }} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] p-3 text-sm text-white"/> : field.kind === "select" ? <select value={agreementDraft[field.key] || field.options?.[0]} onChange={event => { setAgreementDraft(current => ({ ...current, [field.key]: event.target.value })); setAgreementDirty(true); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.kind === "number" || field.kind === "percent" ? "number" : field.kind === "date" ? "date" : "text"} min={field.kind === "number" || field.kind === "percent" ? "0" : undefined} max={field.kind === "percent" ? "100" : undefined} step={field.kind === "percent" ? "0.01" : "1"} value={agreementDraft[field.key] ?? ""} disabled={selectedRequest.agreement_status === "signed" || (field.key === "flat_fee" && agreementDraft.fee_option !== "Custom fee")} onChange={event => { setAgreementDraft(current => ({ ...current, [field.key]: event.target.value })); setAgreementDirty(true); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white disabled:opacity-40"/>}</label>)}</div>
        {agreementFields[agreementType].some(field => field.advanced) && <details className="mt-4 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-sm font-semibold text-white/75">Advanced legal terms</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{agreementFields[agreementType].filter(field => field.advanced).map(field => <label key={field.key} className="text-xs text-white/65">{field.label}{field.kind === "textarea" ? <textarea value={agreementDraft[field.key] ?? ""} onChange={event => { setAgreementDraft(current => ({ ...current, [field.key]: event.target.value })); setAgreementDirty(true); }} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] p-3 text-sm text-white"/> : <input type={field.kind === "number" || field.kind === "percent" ? "number" : "text"} min="0" max={field.kind === "percent" ? "100" : undefined} step="0.01" value={agreementDraft[field.key] ?? ""} onChange={event => { setAgreementDraft(current => ({ ...current, [field.key]: event.target.value })); setAgreementDirty(true); }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white"/>}</label>)}</div></details>}
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={agreementBusy || selectedRequest.agreement_status === "signed"} onClick={() => void updateAgreement({ agreement_type: agreementType, agreement: agreementDraft, agreement_status: "draft" })} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save Draft</button><button type="button" onClick={previewAgreement} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold">Preview Agreement</button><button type="button" disabled={agreementBusy || agreementDirty || selectedRequest.agreement_status === "signed" || !selectedRequest.agreement_approved_at} onClick={() => void sendAgreement()} className="rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Send for Signature</button></div>
        {!selectedRequest.agreement_approved_at && <button type="button" disabled={agreementBusy || selectedRequest.agreement_status === "signed" || missingAgreementFields.length > 0} onClick={() => void updateAgreement({ agreement_type: agreementType, agreement: agreementDraft, approve_agreement: true })} className="mt-3 rounded-lg border border-[#FD52AF]/40 px-3 py-2 text-xs font-semibold text-[#ff80c4] disabled:opacity-40">Approve these saved terms for sending</button>}
        <label className="mt-4 block text-xs text-white/55">Upload reviewed agreement PDF<input type="file" accept="application/pdf" disabled={agreementBusy || agreementDirty || !selectedRequest.agreement_approved_at || selectedRequest.agreement_status === "signed"} onChange={event => void uploadAgreement(event.target.files?.[0], "draft")} className="mt-2 block w-full text-xs disabled:opacity-40"/></label>
        {selectedRequest.agreement_url && <a href={selectedRequest.agreement_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#ff80c4]">Preview / download reviewed PDF</a>}
        {selectedRequest.agreement_status === "awaiting_signature" && <label className="mt-4 block text-xs text-white/55">Upload fully executed agreement PDF<input type="file" accept="application/pdf" disabled={agreementBusy || selectedRequest.agreement_status === "signed"} onChange={event => void uploadAgreement(event.target.files?.[0], "signed")} className="mt-2 block w-full text-xs disabled:opacity-40"/></label>}
        {selectedRequest.signed_agreement_url && <><a href={selectedRequest.signed_agreement_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#ff80c4]">Review executed PDF</a>{selectedRequest.agreement_status !== "signed" && <button type="button" disabled={agreementBusy} onClick={() => void verifySignedAgreement()} className="ml-3 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">Verify signatures & mark Signed</button>}</>}
        <div className="mt-4 border-t border-white/10 pt-3"><p className="text-xs font-semibold text-white/65">Agreement versions</p>{(selectedRequest.agreementVersions || []).length ? selectedRequest.agreementVersions.map((version: any) => <p key={version.id} className="mt-2 text-xs text-white/45">v{version.version} · {agreementTypes.find(type => type.value === version.agreement_type)?.label || version.agreement_type} · {String(version.agreement_status).replaceAll("_", " ")} · {new Date(version.created_at).toLocaleString()} {version.document_url && <a href={version.document_url} target="_blank" rel="noreferrer" className="ml-2 text-[#ff80c4]">PDF</a>} {version.signed_document_url && <a href={version.signed_document_url} target="_blank" rel="noreferrer" className="ml-2 text-emerald-200">Signed PDF</a>}</p>) : <p className="mt-1 text-xs text-white/35">No saved versions yet.</p>}</div>
        {agreementNotice && <p role="status" className="mt-3 text-xs text-white/65">{agreementNotice}</p>}
      </div>}
      {selectedRequest.error && <p role="alert" className="mt-4 text-sm text-rose-300">{selectedRequest.error}</p>}</>}</section></div>}
  </section>;
}
