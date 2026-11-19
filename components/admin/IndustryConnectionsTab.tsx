"use client";
import { useEffect, useMemo, useState } from "react";

type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; venue: string | null; note: string | null; industry_category: string; relationship: string | null; referred_by: string | null; connection_status: string; last_contacted_at: string | null; follow_up_at: string | null };
const statuses = ["not_contacted", "connected", "follow_up", "active", "do_not_contact"];
const statusLabel: Record<string, string> = { not_contacted: "Not contacted", connected: "Connected", follow_up: "Follow up", active: "Active connection", do_not_contact: "Do not contact" };
const blank = { first_name: "", last_name: "", email: "", phone: "", venue: "", industry_category: "Other", relationship: "", referred_by: "", note: "" };
const dateValue = (value: string | null) => value ? value.slice(0, 10) : "";

export default function IndustryConnectionsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]), [query, setQuery] = useState(""), [category, setCategory] = useState("All"), [statusFilter, setStatusFilter] = useState("All statuses"), [draft, setDraft] = useState(blank), [editingId, setEditingId] = useState<string | null>(null), [editDraft, setEditDraft] = useState(blank), [adding, setAdding] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(""); const r = await fetch("/api/admin/industry-connections", { cache: "no-store" }); const j = await r.json(); if (r.ok) setContacts(j.contacts || []); else setError(j.error || "Unable to load contacts."); setLoading(false); }
  useEffect(() => { void load(); }, []);
  const categories = useMemo(() => ["All", ...new Set(contacts.map(item => item.industry_category || "Other").sort())], [contacts]);
  const visible = contacts.filter(contact => {
    const text = `${contact.first_name || ""} ${contact.last_name || ""} ${contact.email || ""} ${contact.venue || ""} ${contact.industry_category} ${contact.relationship || ""} ${contact.referred_by || ""} ${contact.note || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (category === "All" || contact.industry_category === category) && (statusFilter === "All statuses" || contact.connection_status === statusFilter);
  }).sort((a, b) => {
    const dateA = a.follow_up_at ? Date.parse(a.follow_up_at) : Number.POSITIVE_INFINITY;
    const dateB = b.follow_up_at ? Date.parse(b.follow_up_at) : Number.POSITIVE_INFINITY;
    if (dateA !== dateB) return dateA - dateB;
    return `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`);
  });
  async function update(contact: Contact, fields: Record<string, unknown>) {
    const response = await fetch("/api/admin/industry-connections", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: contact.id, ...fields }) });
    const result = await response.json();
    if (response.ok) setContacts(current => current.map(item => item.id === contact.id ? { ...item, ...fields } as Contact : item));
    else setError(result.error || "Unable to save contact.");
  }
  async function addContact(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/admin/industry-connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to add contact."); return; }
    setDraft(blank); setAdding(false); await load();
  }
  async function saveDetails(event: React.FormEvent, contact: Contact) {
    event.preventDefault();
    const response = await fetch("/api/admin/industry-connections", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: contact.id, ...editDraft }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to update connection."); return; }
    setEditingId(null); await load();
  }
  return <section>
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people, companies, roles…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm"/><select aria-label="Filter by industry" value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm">{categories.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm"><option>All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#ff3ea5] px-4 py-2.5 text-sm font-bold text-black">{adding ? "Close" : "+ Add connection"}</button></div>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {adding && <form onSubmit={addContact} className="mb-5 grid gap-3 rounded-xl border border-[#ff3ea5]/25 bg-white/[.03] p-4 sm:grid-cols-2">{(["first_name","last_name","email","phone","venue","industry_category","relationship","referred_by"] as const).map(field => <label key={field} className="text-xs capitalize text-white/60">{field.replaceAll("_", " ")}<input required={field === "first_name"} type={field === "email" ? "email" : "text"} value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label>)}<label className="text-xs text-white/60 sm:col-span-2">Notes<textarea value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} rows={3} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label><button className="justify-self-start rounded-lg border border-white/20 px-4 py-2 text-sm sm:col-span-2">Save connection</button></form>}
    {loading ? <p className="p-8 text-center text-white/45">Loading connections…</p> : <div className="divide-y divide-white/[.07]">{visible.map(contact => <article key={contact.id} className="py-1">
      <div className="flex min-h-12 items-center gap-2 sm:gap-4">
        <div className="min-w-0 flex-1"><div className="flex min-w-0 items-baseline gap-2"><h3 className="truncate text-sm font-semibold">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed contact"}</h3><span className="hidden truncate text-[.65rem] text-white/40 sm:inline">{contact.industry_category}</span></div><p className="truncate text-[.68rem] text-white/45">{[contact.relationship, contact.venue, contact.email].filter(Boolean).join(" · ") || "Industry connection"}</p></div>
        <div className="flex shrink-0 flex-wrap items-center gap-2"><select aria-label={`Connection status for ${contact.first_name || "contact"}`} value={contact.connection_status} onChange={event => void update(contact, { connection_status: event.target.value })} className="rounded-lg border border-white/10 bg-[#111116] px-2.5 py-2 text-xs">{statuses.map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}</select><button onClick={() => void update(contact, { last_contacted_at: new Date().toISOString(), connection_status: contact.connection_status === "not_contacted" ? "connected" : contact.connection_status })} className="rounded-lg border border-[#ff3ea5]/35 px-3 py-2 text-xs text-[#ff9dce] hover:bg-[#ff3ea5]/10">Log contact</button></div>
      </div>
      <details className="mt-2 border-t border-white/[.06] pt-2">
        <summary className="cursor-pointer text-[.7rem] font-semibold text-white/40 hover:text-white/70">Notes & follow-up <span className="ml-1">{contact.follow_up_at ? `· Follow up ${dateValue(contact.follow_up_at)}` : ""}</span></summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div className="space-y-1 text-xs text-white/55">{contact.referred_by && <p>Referred by {contact.referred_by}</p>}{contact.note && <p className="whitespace-pre-wrap leading-5 text-white/65">{contact.note}</p>}{contact.last_contacted_at && <p>Last contacted {dateValue(contact.last_contacted_at)}</p>}{!contact.note && !contact.referred_by && !contact.last_contacted_at && <p className="text-white/35">No notes yet.</p>}</div><div className="flex flex-wrap gap-2"><label className="text-[.65rem] text-white/40">Follow up<input aria-label={`Follow up date for ${contact.first_name || "contact"}`} type="date" value={dateValue(contact.follow_up_at)} onChange={event => void update(contact, { follow_up_at: event.target.value || null })} className="mt-1 block rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white"/></label><button onClick={() => { setEditingId(editingId === contact.id ? null : contact.id); setEditDraft({ first_name: contact.first_name || "", last_name: contact.last_name || "", email: contact.email || "", phone: contact.phone || "", venue: contact.venue || "", industry_category: contact.industry_category || "Other", relationship: contact.relationship || "", referred_by: contact.referred_by || "", note: contact.note || "" }); }} className="self-end rounded-lg border border-white/15 px-3 py-2 text-xs">{editingId === contact.id ? "Cancel edit" : "Edit details"}</button></div></div>
      </details>
      {editingId === contact.id && <form onSubmit={event => void saveDetails(event, contact)} className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2">{(["first_name","last_name","email","phone","venue","industry_category","relationship","referred_by"] as const).map(field => <label key={field} className="text-xs capitalize text-white/55">{field.replaceAll("_", " ")}<input type={field === "email" ? "email" : "text"} value={editDraft[field]} onChange={event => setEditDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label>)}<label className="text-xs text-white/55 sm:col-span-2">Notes<textarea rows={3} value={editDraft.note} onChange={event => setEditDraft(current => ({ ...current, note: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label><button className="justify-self-start rounded-lg bg-[#ff3ea5] px-3 py-2 text-xs font-bold text-black sm:col-span-2">Save details</button></form>}
    </article>)}{visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{contacts.length ? "No matching connections." : "No contacts found. Apply the industry contacts migration to load the imported list."}</p>}</div>}
    <p className="mt-4 text-xs text-white/35">Private admin data · {visible.length} of {contacts.length} connections</p>
  </section>;
}
