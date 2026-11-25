"use client";

import { useCallback, useEffect, useState } from "react";
import { agreementTypeForContribution, agreementTypes, type AgreementType } from "@/lib/collaborationAgreements";
import AgreementBuilder from "@/components/admin/AgreementBuilder";
import CollaborationInviteManager from "@/components/admin/CollaborationInviteManager";
import CollaborationTermsEditor from "@/components/admin/CollaborationTermsEditor";

type RequestRow = { id: string; song_id: string | null; artist_name: string; first_name?: string | null; last_name?: string | null; contribution_type: string; status: string; submitted_at: string; message: string | null; profile_link?: string | null; agreement_status?: string; project_status?: string; songs?: { title?: string } | null };
type Song = { id: string; title: string };
type Contact = { id:string; first_name:string|null; last_name:string|null; email:string|null; phone?:string|null; venue:string|null };
const reviewStatuses = ["new", "approved", "declined", "returned", "signed"] as const;
function requestReviewStatus(request: { status?: string; agreement_status?: string }) {
  if (request.status === "signed" || request.agreement_status === "signed" || ["in_progress", "completed"].includes(request.status || "")) return "signed";
  if (request.status === "returned" || request.agreement_status === "negotiating") return "returned";
  if (["declined", "canceled", "archived"].includes(request.status || "") || request.agreement_status === "declined") return "declined";
  if (["approved", "agreement_pending"].includes(request.status || "")) return "approved";
  return "new";
}
export default function CollaborationOutreachTab({ songId = "", requestId = "" }: { songId?: string; requestId?: string }) {
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
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [agreementNotice, setAgreementNotice] = useState("");

  const openRequest = useCallback(async (id: string, preserve = false) => {
    if (!preserve) { setSelectedRequest(null); setRequestLoading(true); }
    const response = await fetch(`/api/admin/collaboration-requests?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      const request = { ...result.request, events: result.events || [], agreementVersions: result.agreementVersions || [] };
      setSelectedRequest(request);
    } else setSelectedRequest({ error: result.error || "Unable to load request." });
    setRequestLoading(false);
  }, []);

  function closeRequest() {
    setSelectedRequest(null);
    setRequestLoading(false);
    setAgreementOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has("request")) {
      params.delete("request");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
    }
  }

  useEffect(() => {
    if (requestId) void openRequest(requestId);
  }, [openRequest, requestId]);

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
  return <section className="space-y-4">
    <CollaborationInviteManager />
    <CollaborationTermsEditor />
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
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.artist_name} <span className="font-normal text-white/50">· {row.contribution_type}</span></span><span className="mt-1 block truncate text-xs text-white/40">{row.songs?.title || "Original song idea"} · {new Date(row.submitted_at).toLocaleDateString()}</span>{row.message && <span className="mt-1 block truncate text-xs text-white/55">{row.message}</span>}</span><span className={`rounded-full px-2.5 py-1 text-xs ${requestReviewStatus(row) === "new" ? "bg-[#FD52AF]/15 font-semibold text-[#ff7fc1]" : "bg-white/[.07] text-white/65"}`}>{requestReviewStatus(row)[0].toUpperCase() + requestReviewStatus(row).slice(1)}</span><span aria-hidden="true" className="text-white/35">›</span>
      </button>)}
      {!loading && visible.length === 0 && <p className="py-8 text-center text-sm text-white/45">No collaboration requests for this view yet.</p>}
      {loading && <p className="py-6 text-center text-sm text-white/45">Loading collaboration requests…</p>}
    </div>
    {(selectedRequest || requestLoading) && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeRequest(); }} className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-3 sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="collab-request-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111116] shadow-2xl"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#111116] px-5 py-4 sm:px-7"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#FD52AF]">Collaboration Request</p><h3 id="collab-request-title" className="mt-1 text-lg font-bold">{requestLoading ? "Loading…" : selectedRequest?.artist_name || "Request details"}</h3></div><button type="button" onClick={closeRequest} aria-label="Close request details" className="rounded-lg px-3 py-1 text-xl text-white/60 hover:bg-white/10">×</button></header><div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">{!requestLoading && selectedRequest && <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[ ["First name", selectedRequest.first_name], ["Last name", selectedRequest.last_name], ["Artist name", selectedRequest.artist_name], ["Contribution", selectedRequest.contribution_type], ["Song", selectedRequest.songs?.title || "Original song idea"], ["Status", selectedRequest.status?.replaceAll("_", " ")], ["Submitted", selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : "—"], ["Email", selectedRequest.email], ["Instagram / Music profile", selectedRequest.profile_link || "Not provided"], ["Phone", selectedRequest.phone], ["Project", selectedRequest.project_status?.replaceAll("_", " ") || "Requested"] ].filter(([, value]) => value).map(([label, value]) => <div key={label}><p className="text-xs text-white/40">{label}</p><p className="mt-1 break-words text-sm text-white/85">{value}</p></div>)}
        <div><p className="text-xs text-white/40">Agreement</p><button type="button" aria-expanded={agreementOpen} onClick={() => { setAgreementOpen(value => !value); setAgreementNotice(""); }} className="mt-1 text-left text-sm font-semibold capitalize text-[#ff80c4] underline decoration-[#ff80c4]/40 underline-offset-4 hover:text-white">{(selectedRequest.agreement_status || "draft").replaceAll("_", " ")}</button></div>
      </div>
      <div className="mt-5"><p className="text-xs text-white/40">Your idea</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/80">{selectedRequest.message || "No idea provided."}</p></div>
      {selectedRequest.events?.filter((event: any) => event.event === "agreement_changes_requested").slice(-1).map((event: any) => <div key={event.id} className="mt-4 rounded-xl border border-[#FD52AF]/25 bg-[#FD52AF]/[.05] p-3"><p className="text-xs font-bold text-[#ff9dcd]">Collaborator requested agreement changes · {new Date(event.created_at).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-white/75">{event.details?.note || "No note included."}</p></div>)}
      <label className="mt-4 block text-xs text-white/55">Request review status<select value={requestReviewStatus(selectedRequest)} disabled={agreementBusy || requestReviewStatus(selectedRequest) === "signed"} onChange={event => void updateRequestStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{reviewStatuses.map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
      <div className="mt-4 border-t border-white/10 pt-3"><p className="text-xs font-semibold text-white/65">Agreement versions</p>{(selectedRequest.agreementVersions || []).length ? selectedRequest.agreementVersions.map((version: any) => <p key={version.id} className="mt-2 text-xs text-white/45">v{version.version} · {agreementTypes.find(type => type.value === version.agreement_type)?.label || version.agreement_type} · {String(version.agreement_status).replaceAll("_", " ")} · {new Date(version.created_at).toLocaleString()} {version.document_url && <a href={version.document_url} target="_blank" rel="noreferrer" className="ml-2 text-[#ff80c4]">Document</a>} {version.signed_document_url && <a href={version.signed_document_url} target="_blank" rel="noreferrer" className="ml-2 text-emerald-200">Executed PDF</a>}</p>) : <p className="mt-1 text-xs text-white/35">No saved versions yet.</p>}</div>
      {agreementNotice && <p role="status" className="mt-3 text-xs text-white/65">{agreementNotice}</p>}
      {selectedRequest.error && <p role="alert" className="mt-4 text-sm text-rose-300">{selectedRequest.error}</p>}
      </>}</div></section></div>}
    {selectedRequest && agreementOpen && !requestLoading && !selectedRequest.error && <AgreementBuilder request={selectedRequest} close={() => { setAgreementOpen(false); void openRequest(selectedRequest.id, true); }} onUpdated={() => void openRequest(selectedRequest.id, true)} />}
  </section>;
}
