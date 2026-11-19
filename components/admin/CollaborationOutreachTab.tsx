"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RequestRow = { id: string; song_id: string | null; artist_name: string; contribution_type: string; status: string; submitted_at: string; message: string | null; songs?: { title?: string } | null };
type Song = { id: string; title: string };

export default function CollaborationOutreachTab({ songId = "" }: { songId?: string }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", songId, type: "Feature / Vocals", message: "" });
  const [inviteLink, setInviteLink] = useState("");

  async function load() {
    setLoading(true);
    const [requestsResponse, songsResponse] = await Promise.all([
      fetch("/api/admin/collaboration-requests", { cache: "no-store" }),
      fetch("/api/admin/song-tracker", { cache: "no-store" }),
    ]);
    const requestsData = await requestsResponse.json();
    const songsData = await songsResponse.json();
    if (requestsResponse.ok) setRows(requestsData.requests || []);
    else setNotice(requestsData.error || "Unable to load collaboration requests.");
    if (songsResponse.ok) setSongs((songsData.songs || []).map((song: Song) => ({ id: song.id, title: song.title })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setInvite(current => ({ ...current, songId })); }, [songId]);

  async function createInvite(event: React.FormEvent) {
    event.preventDefault(); setNotice(""); setInviteLink("");
    const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: invite.name, inviteeEmail: invite.email, scope: "song", songId: invite.songId }) });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error || "Unable to create invitation."); return; }
    setInviteLink(result.link || ""); setNotice("Private song invitation created.");
  }

  const visible = rows.filter(row => !songId || row.song_id === songId);
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-base font-bold">Creative collaborations</h2><p className="mt-1 text-sm text-white/45">Requests and private song invitations use the existing collaboration portal.</p></div><button type="button" onClick={() => { setInviteOpen(value => !value); setInviteLink(""); }} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-bold text-black">Invite Creative</button></header>
    {inviteOpen && <form onSubmit={event => void createInvite(event)} className="grid gap-3 rounded-xl bg-white/[.035] p-4 sm:grid-cols-2">
      <label className="text-xs text-white/55">Creative name<input required value={invite.name} onChange={event => setInvite({ ...invite, name: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Email (optional)<input type="email" value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <label className="text-xs text-white/55">Song<select required value={invite.songId} onChange={event => setInvite({ ...invite, songId: event.target.value })} disabled={!!songId} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{!songId && <option value="">Choose a song</option>}{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>
      <label className="text-xs text-white/55">Interest<select value={invite.type} onChange={event => setInvite({ ...invite, type: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white">{["Feature / Vocals", "Remix", "Other"].map(type => <option key={type}>{type}</option>)}</select></label>
      <label className="text-xs text-white/55 sm:col-span-2">Personal message (for your reference)<textarea value={invite.message} onChange={event => setInvite({ ...invite, message: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-black">Create private invite</button>{notice && <span role="status" className="text-sm text-white/60">{notice}</span>}</div>
      {inviteLink && <label className="text-xs text-white/50 sm:col-span-2">Copy this private link now<input readOnly value={inviteLink} onFocus={event => event.currentTarget.select()} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white" /></label>}
    </form>}
    {notice && !inviteOpen && <p role="status" className="text-sm text-amber-100">{notice}</p>}
    <div className="divide-y divide-white/[.07]">
      {visible.map(row => <Link key={row.id} href={`/admin/collaborations?request=${encodeURIComponent(row.id)}`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-white/[.02]">
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.artist_name} <span className="font-normal text-white/50">· {row.contribution_type}</span></span><span className="mt-1 block truncate text-xs text-white/40">{row.songs?.title || "Song unavailable"} · {new Date(row.submitted_at).toLocaleDateString()}</span>{row.message && <span className="mt-1 block truncate text-xs text-white/55">{row.message}</span>}</span><span className="rounded-full bg-white/[.07] px-2.5 py-1 text-xs text-white/65">{row.status.replaceAll("_", " ")}</span><span aria-hidden="true" className="text-white/35">›</span>
      </Link>)}
      {!loading && visible.length === 0 && <p className="py-8 text-center text-sm text-white/45">No collaboration requests for this view yet.</p>}
      {loading && <p className="py-6 text-center text-sm text-white/45">Loading collaboration requests…</p>}
    </div>
    <Link href="/admin/collaborations" className="inline-block text-sm font-semibold text-[#FD52AF]">Open requests, agreements, and active projects →</Link>
  </section>;
}
