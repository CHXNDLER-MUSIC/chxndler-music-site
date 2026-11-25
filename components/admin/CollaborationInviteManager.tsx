"use client";

import { useCallback, useEffect, useState } from "react";

type Invite = { id: string; display_name: string; song_id: string | null; invite_scope?: "catalog" | "video" | "song"; invitee_email?: string | null; songs?: { title: string } | { title: string }[] | null; status: string; expires_at: string | null; last_accessed_at: string | null; requests_count: number };

export default function CollaborationInviteManager() {
  const [artistName, setArtistName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
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

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setLink("");
    try {
      const displayName = artistName.trim() || [firstName, lastName].filter(Boolean).join(" ") || inviteeEmail.trim() || "Creative invitation";
      const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, artistName, firstName, lastName, inviteeEmail, scope: "catalog", expiryDays: "30" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate invitation.");
      setArtistName(""); setFirstName(""); setLastName(""); setInviteeEmail(""); setLink(data.link); setMessage("Personal invitation link generated. Copy it now; the secure token is shown only once."); await load();
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

  async function regenerate(invite: Invite) {
    setBusy(true); setMessage(""); setLink("");
    try {
      const name = invite.display_name.replace(/ \(legacy [^)]+\)$/, "");
      const response = await fetch("/api/admin/collaboration-invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, songId: invite.song_id, scope: invite.invite_scope || (invite.song_id ? "song" : "catalog"), inviteeEmail: invite.invitee_email || "", expiryDays: "30" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not regenerate invitation.");
      setLink(data.link);
      try { await navigator.clipboard.writeText(data.link); setMessage("The previous link has been replaced and the new link was copied."); }
      catch { setMessage("The previous link has been replaced. Copy the new link below."); }
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not regenerate invitation."); }
    finally { setBusy(false); }
  }

  return <details open className="group mb-6 rounded-2xl border border-[#ff3ea5]/20 bg-white/[.025] p-4 sm:p-6">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
      <span><span className="block text-xs font-bold uppercase tracking-[.2em] text-[#ff3ea5]">Personal invitations</span><span className="mt-1 block text-xl font-bold">Invite a creative into The Heartverse</span></span>
      <span aria-hidden="true" className="shrink-0 text-lg text-[#ff80c4] transition-transform group-open:rotate-180">⌄</span>
    </summary>
    <p className="mt-1 text-sm text-white/50">Create a private invitation link.</p>
    <form onSubmit={create} className="mt-4 grid gap-2 sm:grid-cols-2">
      <input maxLength={120} value={artistName} onChange={event => setArtistName(event.target.value)} placeholder="Artist name" aria-label="Artist name" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm sm:col-span-2" />
      <input maxLength={80} value={firstName} onChange={event => setFirstName(event.target.value)} placeholder="First name" aria-label="First name" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
      <input maxLength={80} value={lastName} onChange={event => setLastName(event.target.value)} placeholder="Last name" aria-label="Last name" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
      <input type="email" maxLength={320} value={inviteeEmail} onChange={event => setInviteeEmail(event.target.value)} placeholder="Email" aria-label="Email" className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
      <button disabled={busy} className="rounded-lg bg-[#FD52AF] px-4 py-3 text-sm font-bold text-black disabled:opacity-50">{busy ? "Working…" : "Generate invitation link"}</button>
    </form>
    {link && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3"><a href={link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-xs text-[#ff80c4]">{link}</a><button onClick={() => void navigator.clipboard.writeText(link).then(() => setMessage("Invitation link copied."))} className="rounded-md border border-white/20 px-3 py-2 text-xs">Copy link</button></div>}
    {message && <p role="status" className="mt-3 text-xs text-white/65">{message}</p>}
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-xs"><thead><tr className="border-b border-white/10 text-white/40"><th className="p-2">Creative / Display Name</th><th className="p-2">Song</th><th className="p-2">Status</th><th className="p-2">Last Accessed</th><th className="p-2">Requests</th><th className="p-2">Link</th><th className="p-2"></th></tr></thead><tbody>{invites.map(invite => <tr key={invite.id} className="border-b border-white/5"><td className="p-2 font-semibold">{invite.display_name}</td><td className="p-2 text-white/60">{Array.isArray(invite.songs) ? invite.songs[0]?.title : invite.songs?.title || "—"}</td><td className={`p-2 ${invite.status === "Active" ? "text-emerald-300" : "text-white/35"}`}>{invite.status}</td><td className="p-2 text-white/55">{invite.last_accessed_at ? new Date(invite.last_accessed_at).toLocaleString() : "Not accessed"}</td><td className="p-2 text-white/55">{invite.requests_count}</td><td className="p-2"><button disabled={busy || !invite.song_id} onClick={() => void regenerate(invite)} className="text-[#ff80c4]">{invite.status === "Active" ? "Regenerate + copy" : "Regenerate"}</button></td><td className="p-2">{invite.status === "Active" && <button disabled={busy} onClick={() => void revoke(invite)} className="text-red-300">Revoke</button>}</td></tr>)}</tbody></table>{invites.length === 0 && <p className="p-4 text-center text-xs text-white/40">No invitations yet.</p>}</div>
  </details>;
}
