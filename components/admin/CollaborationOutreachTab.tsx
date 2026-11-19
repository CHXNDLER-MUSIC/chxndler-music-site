"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RequestRow = { id: string; song_id: string | null; artist_name: string; contribution_type: string; status: string; submitted_at: string; message: string | null; agreement_status?: string; project_status?: string; songs?: { title?: string } | null };
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
  const [inviteLink, setInviteLink] = useState("");

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
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-base font-bold">Creative collaborations</h2><p className="mt-1 text-sm text-white/45">Requests and private song invitations use the existing collaboration portal.</p></div><button type="button" onClick={() => { setInviteOpen(value => !value); setInviteLink(""); }} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">Invite Creative</button></header>
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
      {visible.map(row => <Link key={row.id} href={`/admin/collaborations?request=${encodeURIComponent(row.id)}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-white/[.02]">
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.artist_name} <span className="font-normal text-white/50">· {row.contribution_type}</span></span><span className="mt-1 block truncate text-xs text-white/40">{row.songs?.title || "Original song idea"} · {new Date(row.submitted_at).toLocaleDateString()}</span>{row.message && <span className="mt-1 block truncate text-xs text-white/55">{row.message}</span>}</span><span className="rounded-full bg-white/[.07] px-2.5 py-1 text-xs text-white/65">{row.status.replaceAll("_", " ")}</span><span aria-hidden="true" className="text-white/35">›</span>
      </Link>)}
      {!loading && visible.length === 0 && <p className="py-8 text-center text-sm text-white/45">No collaboration requests for this view yet.</p>}
      {loading && <p className="py-6 text-center text-sm text-white/45">Loading collaboration requests…</p>}
    </div>
    <details className="rounded-xl border border-white/10 bg-white/[.025]"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#FD52AF]">Requests, agreements, and active projects <span className="ml-2 text-xs font-normal text-white/45">{visible.length}</span></summary><div className="divide-y divide-white/[.07] border-t border-white/10 px-4">{visible.map(row => <Link key={row.id} href={`/admin/collaborations?request=${encodeURIComponent(row.id)}`} className="block py-3 hover:bg-white/[.02]"><span className="block text-sm font-semibold text-white">{row.artist_name} <span className="font-normal text-white/50">· {row.contribution_type}</span></span><span className="mt-1 block text-xs text-white/50">{row.songs?.title || "Original song idea"} · Request: {row.status.replaceAll("_", " ")} · Agreement: {(row.agreement_status || "not_started").replaceAll("_", " ")} · Project: {(row.project_status || "requested").replaceAll("_", " ")}</span>{row.message && <span className="mt-1 block text-xs leading-5 text-white/55">{row.message}</span>}</Link>)}{!visible.length && <p className="py-4 text-sm text-white/45">No requests, agreements, or projects for this view yet.</p>}</div></details>
  </section>;
}
