"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RequestRow = { id: string; song_id: string | null; artist_name: string; contribution_type: string; status: string; submitted_at: string; message: string | null; agreement_status?: string; project_status?: string; songs?: { title?: string } | null };
type Song = { id: string; title: string };
type Contact = { id:string; first_name:string|null; last_name:string|null; email:string|null; phone?:string|null; venue:string|null };
const agreementFields = ["admin_legal_name", "artist_credit", "master_royalty", "publishing_royalty", "flat_fee", "agreed_ownership_terms", "agreed_distribution_permissions", "agreed_release_restrictions", "agreed_credit_requirements"] as const;
const agreementLabels: Record<string, string> = { admin_legal_name: "Artist legal name", artist_credit: "Artist / stage credit", master_royalty: "Master royalty (%)", publishing_royalty: "Composition / publishing (%)", flat_fee: "Flat fee", agreed_ownership_terms: "Ownership / license terms", agreed_distribution_permissions: "Distribution permissions", agreed_release_restrictions: "Release restrictions", agreed_credit_requirements: "Credit requirements" };

export default function CollaborationOutreachTab({ songId = "" }: { songId?: string }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ firstName: "", lastName: "", artistName: "", email: "", phone: "", contactId: "", songId, type: "Feature / Vocals", message: "" });
  const [inviteLink, setInviteLink] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<Record<string, any> | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementDraft, setAgreementDraft] = useState<Record<string, any>>({});
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [agreementNotice, setAgreementNotice] = useState("");

  async function openRequest(id: string) {
    setSelectedRequest(null); setRequestLoading(true);
    const response = await fetch(`/api/admin/collaboration-requests?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json();
    setSelectedRequest(response.ok ? result.request : { error: result.error || "Unable to load request." });
    if (response.ok) setAgreementDraft(Object.fromEntries(agreementFields.map(field => [field, result.request[field] ?? ""])));
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

  async function uploadAgreement(file?: File) {
    if (!file || !selectedRequest?.id) return;
    setAgreementBusy(true); setAgreementNotice("Uploading reviewed agreement…");
    try {
      const form = new FormData(); form.set("file", file); form.set("type", "draft");
      const response = await fetch(`/api/admin/collaboration-requests/${selectedRequest.id}/agreement`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload agreement.");
      await openRequest(selectedRequest.id); setAgreementNotice("Reviewed agreement uploaded.");
    } catch (error) {
      setAgreementNotice(error instanceof Error ? error.message : "Unable to upload agreement.");
    } finally { setAgreementBusy(false); }
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
    const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: invite.firstName, lastName: invite.lastName, artistName: invite.artistName, displayName, inviteeEmail: invite.email, phone: invite.phone, contactId: invite.contactId, personalMessage: invite.message, contributionType: invite.type, scope: invite.songId ? "song" : "catalog", songId: invite.songId }) });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error || "Unable to create invitation."); return; }
    setInviteLink(result.link || ""); setNotice("Private song invitation created.");
  }

  const visible = rows.filter(row => !songId || row.song_id === songId);
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
        {[ ["Contribution", selectedRequest.contribution_type], ["Song", selectedRequest.songs?.title || "Original song idea"], ["Status", selectedRequest.status?.replaceAll("_", " ")], ["Submitted", selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : "—"], ["Email", selectedRequest.email], ["Phone", selectedRequest.phone], ["Project", selectedRequest.project_status?.replaceAll("_", " ") || "Requested"] ].filter(([, value]) => value).map(([label, value]) => <div key={label}><p className="text-xs text-white/40">{label}</p><p className="mt-1 text-sm text-white/85">{value}</p></div>)}
        <div><p className="text-xs text-white/40">Agreement</p><button type="button" aria-expanded={agreementOpen} onClick={() => { setAgreementDraft(Object.fromEntries(agreementFields.map(field => [field, selectedRequest[field] ?? ""]))); setAgreementOpen(value => !value); setAgreementNotice(""); }} className="mt-1 text-left text-sm font-semibold capitalize text-[#ff80c4] underline decoration-[#ff80c4]/40 underline-offset-4 hover:text-white">{(selectedRequest.agreement_status || "not_started").replaceAll("_", " ")}</button></div>
      </div>
      {selectedRequest.message && <div className="mt-5"><p className="text-xs text-white/40">Message</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/80">{selectedRequest.message}</p></div>}
      {agreementOpen && <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><h4 className="font-semibold">Finalize agreement</h4><p className="mt-1 text-xs text-white/45">Review the terms, save them, then upload the reviewed agreement PDF to send.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{agreementFields.map(field => <label key={field} className="text-xs text-white/55">{agreementLabels[field]}{field.startsWith("agreed_") ? <textarea value={agreementDraft[field] ?? ""} onChange={event => setAgreementDraft(current => ({ ...current, [field]: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] p-3 text-sm text-white"/> : <input type={field.includes("royalty") || field === "flat_fee" ? "number" : "text"} min="0" max={field.includes("royalty") ? "100" : undefined} step="0.01" value={agreementDraft[field] ?? ""} onChange={event => setAgreementDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] p-3 text-sm text-white"/>}</label>)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" disabled={agreementBusy} onClick={() => void updateAgreement(Object.fromEntries(Object.entries(agreementDraft).map(([key, value]) => [key, ["master_royalty", "publishing_royalty", "flat_fee"].includes(key) ? value === "" ? null : Number(value) : value])))} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold disabled:opacity-50">Save terms</button>{selectedRequest.agreement_url && <a href={selectedRequest.agreement_url} target="_blank" rel="noreferrer" className="px-2 py-2 text-xs font-semibold text-[#ff80c4]">View uploaded agreement ↗</a>}</div><label className="mt-4 block text-xs text-white/55">Reviewed agreement PDF<input type="file" accept="application/pdf" disabled={agreementBusy} onChange={event => void uploadAgreement(event.target.files?.[0])} className="mt-2 block w-full text-xs"/></label><div className="mt-5 border-t border-white/10 pt-4"><button type="button" disabled={agreementBusy || !selectedRequest.agreement_url || !["approved", "agreement_pending"].includes(selectedRequest.status)} onClick={() => void updateAgreement({ agreement_status: "sent" })} className="w-full rounded-lg bg-[#FD52AF] px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{agreementBusy ? "Working…" : "Send agreement"}</button>{(!["approved", "agreement_pending"].includes(selectedRequest.status)) && <p className="mt-2 text-xs text-white/40">Approve this request before sending an agreement.</p>}{!selectedRequest.agreement_url && <p className="mt-2 text-xs text-white/40">Upload the reviewed PDF to enable sending.</p>}{agreementNotice && <p role="status" className="mt-2 text-xs text-white/60">{agreementNotice}</p>}</div></div>}
      {selectedRequest.error && <p role="alert" className="mt-4 text-sm text-rose-300">{selectedRequest.error}</p>}</>}</section></div>}
  </section>;
}
