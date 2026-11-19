"use client";
import { useEffect, useMemo, useState } from "react";

type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; venue: string | null; note: string | null; industry_category: string; relationship: string | null; referred_by: string | null; connection_status: string; last_contacted_at: string | null; follow_up_at: string | null };
const statuses = ["not_contacted", "connected", "follow_up", "active", "do_not_contact"];
const statusLabel: Record<string, string> = { not_contacted: "Not contacted", connected: "Connected", follow_up: "Follow up", active: "Active connection", do_not_contact: "Do not contact" };
const blank = { first_name: "", last_name: "", email: "", phone: "", venue: "", industry_category: "Other", relationship: "", referred_by: "", note: "" };
const dateValue = (value: string | null) => value ? value.slice(0, 10) : "";

export default function IndustryConnectionsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]), [query, setQuery] = useState(""), [category, setCategory] = useState("All"), [draft, setDraft] = useState(blank), [editingId, setEditingId] = useState<string | null>(null), [editDraft, setEditDraft] = useState(blank), [adding, setAdding] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(""); const r = await fetch("/api/admin/industry-connections", { cache: "no-store" }); const j = await r.json(); if (r.ok) setContacts(j.contacts || []); else setError(j.error || "Unable to load contacts."); setLoading(false); }
  useEffect(() => { void load(); }, []);
  const categories = useMemo(() => ["All", ...new Set(contacts.map(item => item.industry_category || "Other").sort())], [contacts]);
  const visible = contacts.filter(contact => {
    const text = `${contact.first_name || ""} ${contact.last_name || ""} ${contact.email || ""} ${contact.venue || ""} ${contact.industry_category} ${contact.relationship || ""} ${contact.referred_by || ""} ${contact.note || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (category === "All" || contact.industry_category === category);
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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search names, venues, roles, referrals, notes" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"/><select value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] p-3 text-sm">{categories.map(value => <option key={value}>{value}</option>)}</select><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-sm font-bold text-black">{adding ? "Close" : "+ Add connection"}</button></div>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {adding && <form onSubmit={addContact} className="mb-5 grid gap-3 rounded-xl border border-[#ff3ea5]/25 bg-white/[.03] p-4 sm:grid-cols-2">{(["first_name","last_name","email","phone","venue","industry_category","relationship","referred_by"] as const).map(field => <label key={field} className="text-xs capitalize text-white/60">{field.replaceAll("_", " ")}<input required={field === "first_name"} type={field === "email" ? "email" : "text"} value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label>)}<label className="text-xs text-white/60 sm:col-span-2">Notes<textarea value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} rows={3} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label><button className="justify-self-start rounded-lg border border-white/20 px-4 py-2 text-sm sm:col-span-2">Save connection</button></form>}
    {loading ? <p className="p-8 text-center text-white/45">Loading connections…</p> : <div className="space-y-3">{visible.map(contact => <article key={contact.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed contact"}</h3><span className="rounded-full bg-[#ff3ea5]/10 px-2 py-1 text-[.63rem] font-bold uppercase tracking-wider text-[#ff80c4]">{contact.industry_category}</span></div><p className="mt-1 text-sm text-white/50">{contact.relationship || "Industry connection"}{contact.venue ? ` · ${contact.venue}` : ""}</p></div><select aria-label={`Connection status for ${contact.first_name || "contact"}`} value={contact.connection_status} onChange={event => void update(contact, { connection_status: event.target.value })} className="self-start rounded-lg border border-white/10 bg-[#111116] p-2 text-xs">{statuses.map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">{contact.email && <a className="text-[#ff80c4]" href={`mailto:${contact.email}`}>{contact.email}</a>}{contact.phone && <a className="text-white/70" href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>{contact.phone}</a>}{contact.referred_by && <span className="text-white/45">Referred by {contact.referred_by}</span>}</div>
      {contact.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{contact.note}</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { setEditingId(editingId === contact.id ? null : contact.id); setEditDraft({ first_name: contact.first_name || "", last_name: contact.last_name || "", email: contact.email || "", phone: contact.phone || "", venue: contact.venue || "", industry_category: contact.industry_category || "Other", relationship: contact.relationship || "", referred_by: contact.referred_by || "", note: contact.note || "" }); }} className="rounded-lg border border-white/15 px-3 py-2 text-xs">{editingId === contact.id ? "Cancel edit" : "Edit connection details"}</button><button onClick={() => void update(contact, { last_contacted_at: new Date().toISOString(), connection_status: contact.connection_status === "not_contacted" ? "connected" : contact.connection_status })} className="rounded-lg border border-[#ff3ea5]/35 px-3 py-2 text-xs text-[#ff9dce]">Log contact today</button></div>
      {editingId === contact.id && <form onSubmit={event => void saveDetails(event, contact)} className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2">{(["first_name","last_name","email","phone","venue","industry_category","relationship","referred_by"] as const).map(field => <label key={field} className="text-xs capitalize text-white/55">{field.replaceAll("_", " ")}<input type={field === "email" ? "email" : "text"} value={editDraft[field]} onChange={event => setEditDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label>)}<label className="text-xs text-white/55 sm:col-span-2">Notes<textarea rows={3} value={editDraft.note} onChange={event => setEditDraft(current => ({ ...current, note: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white"/></label><button className="justify-self-start rounded-lg bg-[#ff3ea5] px-3 py-2 text-xs font-bold text-black sm:col-span-2">Save details</button></form>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-white/45">Last contacted<input type="date" value={dateValue(contact.last_contacted_at)} onChange={event => void update(contact, { last_contacted_at: event.target.value || null })} className="mt-1 block rounded-lg border border-white/10 bg-black/40 p-2 text-white"/></label><label className="text-xs text-white/45">Follow up<input type="date" value={dateValue(contact.follow_up_at)} onChange={event => void update(contact, { follow_up_at: event.target.value || null })} className="mt-1 block rounded-lg border border-white/10 bg-black/40 p-2 text-white"/></label></div>
    </article>)}{visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{contacts.length ? "No matching connections." : "No contacts found. Apply the industry contacts migration to load the imported list."}</p>}</div>}
    <p className="mt-4 text-xs text-white/35">Private admin data · {visible.length} of {contacts.length} connections</p>
  </section>;
}
