"use client";

import { useCallback, useEffect, useState } from "react";

type Song = { id: string; title: string; collaboration_enabled?: boolean };
type Invite = { id: string; display_name: string; song_id: string | null; songs?: { title: string } | { title: string }[] | null; status: string; expires_at: string | null; last_accessed_at: string | null; requests_count: number };

export default function CollaborationInviteManager() {
  const [displayName, setDisplayName] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [songId, setSongId] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/collaboration-invites", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setInvites(data.invitations || []);
    else setMessage(data.error || "Could not load invitations.");
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void fetch("/api/music-video-projects/songs", { cache: "no-store" }).then(response => response.json()).then(data => setSongs(data.songs || [])).catch(() => setMessage("Could not load songs.")); }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setLink("");
    try {
      const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, songId, expiryDays }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate invitation.");
      setDisplayName(""); setLink(data.link); setMessage("Song-specific invitation link generated. Copy it now; the secure token is shown only once."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not generate invitation."); }
    finally { setBusy(false); }
  }

  async function revoke(invite: Invite) {
    if (!confirm(`Revoke ${invite.display_name}’s invitation?`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/collaboration-invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: invite.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not revoke invitation.");
      setMessage(`Invitation for ${invite.display_name} revoked.`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not revoke invitation."); }
    finally { setBusy(false); }
  }

  async function disableSong() {
    const song = songs.find(item => item.id === songId);
    if (!song || !confirm(`Disable collaboration requests and revoke active invitations for ${song.title}?`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/collaboration-invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ songId, disableSong: true }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not disable song requests.");
      setMessage(`Collaboration requests disabled for ${song.title}.`);
      setSongs(current => current.map(item => item.id === songId ? { ...item, collaboration_enabled: false } : item)); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable song requests."); }
    finally { setBusy(false); }
  }

  async function regenerate(invite: Invite) {
    setBusy(true); setMessage(""); setLink("");
    try {
      const name = invite.display_name.replace(/ \(legacy [^)]+\)$/, "");
      const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, songId: invite.song_id, expiryDays }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not regenerate invitation.");
      setLink(data.link);
      try { await navigator.clipboard.writeText(data.link); setMessage("The previous link has been replaced and the new link was copied."); }
      catch { setMessage("The previous link has been replaced. Copy the new link below."); }
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not regenerate invitation."); }
    finally { setBusy(false); }
  }

  return <section className="mb-6 rounded-2xl border border-[#ff3ea5]/20 bg-white/[.025] p-4 sm:p-6">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff3ea5]">Personal invitations</p>
    <h2 className="mt-1 text-xl font-bold">Invite a creative into The Heartverse</h2>
    <p className="mt-1 text-sm text-white/50">Create a private, expiring link for one song. Each invitation has its own revocable access token.</p>
    <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
      <input required maxLength={120} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Display name, artist name, or handle" className="min-w-56 flex-1 rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
      <select required value={songId} onChange={event => setSongId(event.target.value)} className="min-w-48 rounded-lg border border-white/10 bg-[#17171c] p-3 text-sm"><option value="">Choose song…</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select>
      <select value={expiryDays} onChange={event => setExpiryDays(event.target.value)} className="rounded-lg border border-white/10 bg-[#17171c] p-3 text-sm"><option value="7">Expires in 7 days</option><option value="30">Expires in 30 days</option><option value="90">Expires in 90 days</option><option value="never">No expiration</option></select>
      <button disabled={busy} className="rounded-lg bg-[#FD52AF] px-4 py-3 text-sm font-bold text-black disabled:opacity-50">{busy ? "Working…" : "Generate invitation link"}</button>
      {songId && songs.find(item => item.id === songId)?.collaboration_enabled && <button type="button" disabled={busy} onClick={() => void disableSong()} className="rounded-lg border border-white/15 px-4 py-3 text-xs text-white/65 disabled:opacity-50">Disable requests for song</button>}
    </form>
    {link && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3"><a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-xs text-[#ff80c4]">{link}</a><button onClick={() => void navigator.clipboard.writeText(link).then(() => setMessage("Invitation link copied."))} className="rounded-md border border-white/20 px-3 py-2 text-xs">Copy link</button></div>}
    {message && <p role="status" className="mt-3 text-xs text-white/65">{message}</p>}
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-xs"><thead><tr className="border-b border-white/10 text-white/40"><th className="p-2">Creative / Display Name</th><th className="p-2">Song</th><th className="p-2">Status</th><th className="p-2">Last Accessed</th><th className="p-2">Requests</th><th className="p-2">Link</th><th className="p-2"></th></tr></thead><tbody>{invites.map(invite => <tr key={invite.id} className="border-b border-white/5"><td className="p-2 font-semibold">{invite.display_name}</td><td className="p-2 text-white/60">{Array.isArray(invite.songs) ? invite.songs[0]?.title : invite.songs?.title || "—"}</td><td className={`p-2 ${invite.status === "Active" ? "text-emerald-300" : "text-white/35"}`}>{invite.status}</td><td className="p-2 text-white/55">{invite.last_accessed_at ? new Date(invite.last_accessed_at).toLocaleString() : "Not accessed"}</td><td className="p-2 text-white/55">{invite.requests_count}</td><td className="p-2"><button disabled={busy || !invite.song_id} onClick={() => void regenerate(invite)} className="text-[#ff80c4]">{invite.status === "Active" ? "Regenerate + copy" : "Regenerate"}</button></td><td className="p-2">{invite.status === "Active" && <button disabled={busy} onClick={() => void revoke(invite)} className="text-red-300">Revoke</button>}</td></tr>)}</tbody></table>{invites.length === 0 && <p className="p-4 text-center text-xs text-white/40">No invitations yet.</p>}</div>
  </section>;
}
