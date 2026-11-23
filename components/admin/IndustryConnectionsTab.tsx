"use client";
import { useEffect, useMemo, useState } from "react";

type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; venue: string | null; note: string | null; industry_category: string; relationship: string | null; referred_by: string | null; connection_status: string; last_contacted_at: string | null; follow_up_at: string | null; site_profile_status: "unknown" | "has_profile" | "no_profile" };
const statuses = ["not_contacted", "connected", "follow_up", "active", "do_not_contact"];
const statusLabel: Record<string, string> = { not_contacted: "Not contacted", connected: "Connected", follow_up: "Follow up", active: "Active connection", do_not_contact: "Do not contact" };
const profileStatusLabel: Record<string, string> = { unknown: "Not checked", has_profile: "Has profile", no_profile: "No profile" };
const statusColor: Record<string, string> = { not_contacted: "border-white/15 bg-white/[.04] text-white/65", connected: "border-sky-400/30 bg-sky-400/10 text-sky-200", follow_up: "border-amber-400/30 bg-amber-400/10 text-amber-200", active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", do_not_contact: "border-rose-400/30 bg-rose-400/10 text-rose-200" };
const categoryTone = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("venue") || value.includes("booking")) return { color: "#86efac", background: "rgba(34,197,94,.14)", borderColor: "rgba(34,197,94,.38)" };
  if (value.includes("influencer")) return { color: "#fcd34d", background: "rgba(245,158,11,.14)", borderColor: "rgba(245,158,11,.38)" };
  if (value.includes("recording") || value.includes("mastering") || value.includes("production")) return { color: "#67e8f9", background: "rgba(6,182,212,.14)", borderColor: "rgba(6,182,212,.38)" };
  if (value.includes("film") || value.includes("video")) return { color: "#7dd3fc", background: "rgba(56,189,248,.14)", borderColor: "rgba(56,189,248,.38)" };
  if (value.includes("connection")) return { color: "#d8b4fe", background: "rgba(168,85,247,.14)", borderColor: "rgba(168,85,247,.38)" };
  if (value.includes("sync")) return { color: "#a5b4fc", background: "rgba(99,102,241,.14)", borderColor: "rgba(99,102,241,.38)" };
  if (value.includes("playlist")) return { color: "#fdba74", background: "rgba(249,115,22,.14)", borderColor: "rgba(249,115,22,.38)" };
  if (["producer", "artist", "musician", "influencer"].some(term => value.includes(term))) return { color: "#f9a8d4", background: "rgba(236,72,153,.14)", borderColor: "rgba(236,72,153,.38)" };
  if (value.includes("management") || value.includes("label")) return { color: "#c4b5fd", background: "rgba(139,92,246,.14)", borderColor: "rgba(139,92,246,.38)" };
  if (value.includes("press") || value.includes("media") || value.includes("playlist")) return { color: "#7dd3fc", background: "rgba(56,189,248,.14)", borderColor: "rgba(56,189,248,.38)" };
  if (value.includes("radio")) return { color: "#fcd34d", background: "rgba(245,158,11,.14)", borderColor: "rgba(245,158,11,.38)" };
  if (value.includes("brand") || value.includes("business")) return { color: "#86efac", background: "rgba(34,197,94,.14)", borderColor: "rgba(34,197,94,.38)" };
  return { color: "#d4d4d8", background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)" };
};
const blank = { first_name: "", last_name: "", email: "", phone: "", venue: "", industry_category: "Other", relationship: "", referred_by: "", note: "" };
const dateValue = (value: string | null) => value ? value.slice(0, 10) : "";

export default function IndustryConnectionsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]), [query, setQuery] = useState(""), [category, setCategory] = useState("All"), [statusFilter, setStatusFilter] = useState("All statuses"), [profileFilter, setProfileFilter] = useState("All profile statuses"), [columnFilters, setColumnFilters] = useState({ category: "", organization: "", status: "", profile: "", followUp: "" }), [activeColumn, setActiveColumn] = useState<keyof typeof columnFilters | null>(null), [draft, setDraft] = useState(blank), [editingId, setEditingId] = useState<string | null>(null), [editDraft, setEditDraft] = useState(blank), [adding, setAdding] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true), [profile, setProfile] = useState<Contact | null>(null);
  async function load() { setLoading(true); setError(""); const response = await fetch("/api/admin/industry-connections", { cache: "no-store" }); const result = await response.json(); if (!response.ok) { setError(result.error || "Unable to load contacts."); setLoading(false); return; } setContacts(result.contacts || []); setLoading(false); }
  useEffect(() => { void load(); }, []);
  const categories = useMemo(() => ["All", ...new Set(contacts.map(item => item.industry_category || "Other").sort())], [contacts]);
  const visible = contacts.filter(contact => {
    const text = `${contact.first_name || ""} ${contact.last_name || ""} ${contact.email || ""} ${contact.phone || ""} ${contact.venue || ""} ${contact.industry_category} ${contact.relationship || ""} ${contact.referred_by || ""} ${contact.note || ""}`.toLowerCase();
    const columns = { category: contact.industry_category || "Other", organization: [contact.venue, contact.relationship].filter(Boolean).join(" · ") || "—", status: statusLabel[contact.connection_status] || contact.connection_status, profile: profileStatusLabel[contact.site_profile_status || "unknown"], followUp: contact.follow_up_at ? dateValue(contact.follow_up_at) : "No follow-up set" };
    return text.includes(query.trim().toLowerCase()) && (category === "All" || contact.industry_category === category) && (statusFilter === "All statuses" || contact.connection_status === statusFilter) && (profileFilter === "All profile statuses" || profileStatusLabel[contact.site_profile_status || "unknown"] === profileFilter) && Object.entries(columnFilters).every(([key, value]) => !value || columns[key as keyof typeof columns] === value);
  }).sort((a, b) => {
    const dateA = a.follow_up_at ? Date.parse(a.follow_up_at) : Number.POSITIVE_INFINITY;
    const dateB = b.follow_up_at ? Date.parse(b.follow_up_at) : Number.POSITIVE_INFINITY;
    if (dateA !== dateB) return dateA - dateB;
    return `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`);
  });
  const filterOptions = (column: keyof typeof columnFilters) => [...new Set(contacts.map(contact => column === "category" ? contact.industry_category || "Other" : column === "organization" ? [contact.venue, contact.relationship].filter(Boolean).join(" · ") || "—" : column === "status" ? statusLabel[contact.connection_status] || contact.connection_status : column === "profile" ? profileStatusLabel[contact.site_profile_status || "unknown"] : contact.follow_up_at ? dateValue(contact.follow_up_at) : "No follow-up set"))].sort();
  const filterHeader = (label: string, column: keyof typeof columnFilters) => <div className="relative"><button type="button" onClick={() => setActiveColumn(current => current === column ? null : column)} aria-expanded={activeColumn === column} className={`text-left hover:text-white ${columnFilters[column] ? "text-[#ff9dce]" : ""}`}>{label}{columnFilters[column] ? " •" : ""}</button>{activeColumn === column && <div className={`absolute left-0 top-full z-30 mt-2 rounded-lg border border-white/15 bg-[#15151b] p-2 shadow-xl ${column === "category" ? "min-w-72" : "min-w-48"}`}>{column === "category" ? <div role="listbox" aria-label="Filter by category" className="max-h-72 overflow-y-auto">{[{ value: "", label: "All category" }, ...filterOptions(column).map(value => ({ value, label: value }))].map(option => { const tone = option.value ? categoryTone(option.value) : null; return <button key={option.value || "all"} type="button" role="option" aria-selected={columnFilters[column] === option.value} onClick={() => { setColumnFilters(current => ({ ...current, [column]: option.value })); setActiveColumn(null); }} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white/[.07] ${columnFilters[column] === option.value ? "bg-white/[.07] text-white" : "text-white/80"}`}><span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={tone ? { background: tone.color, boxShadow: `0 0 9px ${tone.color}66` } : { background: "#a1a1aa" }}/><span className="flex-1">{option.label}</span>{columnFilters[column] === option.value && <span aria-hidden="true" className="text-[#FD52AF]">✓</span>}</button>; })}</div> : <select autoFocus aria-label={`Filter by ${label.toLowerCase()}`} value={columnFilters[column]} onChange={event => { setColumnFilters(current => ({ ...current, [column]: event.target.value })); setActiveColumn(null); }} className="w-full rounded-md border border-white/10 bg-[#101014] px-3 py-2 text-sm text-white"><option value="">All {label.toLowerCase()}</option>{filterOptions(column).map(value => <option key={value} value={value}>{value}</option>)}</select>}{columnFilters[column] && <button type="button" onClick={() => { setColumnFilters(current => ({ ...current, [column]: "" })); setActiveColumn(null); }} className="mt-2 px-2 py-1 text-xs text-[#ff9dcd]">Clear filter</button>}</div>}</div>;
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
    setEditingId(null); setProfile(null); await load();
  }
  return <section>
    <div className="mb-4 max-w-xs rounded-xl border border-[#FD52AF]/30 bg-[#FD52AF]/[.06] px-4 py-3">
      <p className="text-2xl font-black leading-none text-[#FD52AF]">{loading ? "—" : contacts.length.toLocaleString()}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[.14em] text-white/65">Contacts</p>
      <p className="mt-2 text-xs text-white/45">{contacts.filter(contact => contact.site_profile_status === "has_profile").length} marked as having a chxndler.world profile</p>
    </div>
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people, companies, roles…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm"/><select aria-label="Filter by industry" value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm">{categories.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm"><option>All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabel[value]}</option>)}</select><select aria-label="Filter by profile status" value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm"><option>All profile statuses</option>{Object.entries(profileStatusLabel).map(([value, label]) => <option key={value} value={label}>{label}</option>)}</select><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#ff3ea5] px-4 py-2.5 text-sm font-bold text-black">{adding ? "Close" : "+ Add connection"}</button></div>
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {adding && <form onSubmit={addContact} className="mb-5 grid gap-3 rounded-xl border border-[#ff3ea5]/25 bg-white/[.03] p-4 sm:grid-cols-2">{(["first_name","last_name","email","phone","venue","industry_category","relationship","referred_by"] as const).map(field => <label key={field} className="text-xs capitalize text-white/60">{field.replaceAll("_", " ")}<input required={field === "first_name"} type={field === "email" ? "email" : "text"} value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label>)}<label className="text-xs text-white/60 sm:col-span-2">Notes<textarea value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} rows={3} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label><button className="justify-self-start rounded-lg border border-white/20 px-4 py-2 text-sm sm:col-span-2">Save connection</button></form>}
    {loading ? <p className="p-8 text-center text-white/45">Loading connections…</p> : <div className="divide-y divide-white/[.07]">
      <div className="hidden grid-cols-[minmax(0,1.05fr)_minmax(7rem,.8fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_minmax(8rem,.8fr)_auto] gap-4 border-b border-white/10 py-2 text-[.65rem] font-semibold uppercase tracking-wider text-white/35 lg:grid"><span>Contact</span>{filterHeader("Category", "category")}{filterHeader("Organization / role", "organization")}{filterHeader("chxndler.world profile", "profile")}{filterHeader("Status", "status")}{filterHeader("Follow-up", "followUp")}<span>Actions</span></div>
      {visible.map(contact => <article key={contact.id} className="py-3">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(7rem,.8fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(8rem,1fr)_minmax(8rem,.8fr)_auto] lg:items-center">
        <div className="min-w-0"><button type="button" onClick={() => setProfile(contact)} className="block max-w-full truncate text-left text-sm font-semibold text-white hover:text-[#ff9dce] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3ea5]">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed contact"}</button><p className="truncate text-[.68rem] text-white/40">{contact.email || contact.phone || "No contact details"}</p></div>
        <span><span className="inline-flex rounded-full border px-2.5 py-1 text-[.68rem] font-semibold" style={categoryTone(contact.industry_category || "Other")}>{contact.industry_category || "Other"}</span></span>
        <span className="min-w-0 truncate text-xs text-white/55">{[contact.venue, contact.relationship].filter(Boolean).join(" · ") || "—"}</span>
        <div><select aria-label={`chxndler.world profile status for ${contact.first_name || "contact"}`} value={contact.site_profile_status || "unknown"} onChange={event => void update(contact, { site_profile_status: event.target.value })} className="max-w-full rounded-full border border-white/15 bg-[#111116] px-3 py-2 text-xs font-semibold text-white/75">{Object.entries(profileStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><select aria-label={`Connection status for ${contact.first_name || "contact"}`} value={contact.connection_status} onChange={event => void update(contact, { connection_status: event.target.value })} className={`max-w-full rounded-full border px-3 py-2 text-xs font-semibold ${statusColor[contact.connection_status] || statusColor.not_contacted} bg-[#111116]`}>{statuses.map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></div>
        <span className={`text-xs ${contact.follow_up_at && dateValue(contact.follow_up_at) < dateValue(new Date().toISOString()) ? "text-amber-200" : "text-white/45"}`}>{contact.follow_up_at ? dateValue(contact.follow_up_at) : "No follow-up set"}</span>
        <button onClick={() => void update(contact, { last_contacted_at: new Date().toISOString(), connection_status: contact.connection_status === "not_contacted" ? "connected" : contact.connection_status })} className="justify-self-start rounded-lg border border-[#ff3ea5]/35 px-3 py-2 text-xs text-[#ff9dce] hover:bg-[#ff3ea5]/10">Log contact</button>
      </div>
    </article>)}{visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{contacts.length ? "No matching connections." : "No contacts found. Apply the industry contacts migration to load the imported list."}</p>}</div>}
    {profile && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        role="presentation"
        onMouseDown={event => {
          if (event.target === event.currentTarget) {
            setProfile(null);
            setEditingId(null);
          }
        }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="contact-profile-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111116] p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[.65rem] font-bold uppercase tracking-[.16em] text-[#ff62b2]">Contact profile</p>
              <h2 id="contact-profile-title" className="mt-1 break-words text-2xl font-bold">{editingId === profile.id ? "Edit contact" : [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed contact"}</h2>
              <p className="mt-1 text-sm text-white/50">{profile.relationship || profile.industry_category}</p>
            </div>
            <button type="button" aria-label="Close contact profile" onClick={() => { setProfile(null); setEditingId(null); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/65 hover:text-white">Close</button>
          </div>
          {editingId === profile.id ? (
            <form onSubmit={event => void saveDetails(event, profile)} className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["first_name", "last_name", "email", "phone", "venue", "industry_category", "relationship", "referred_by"] as const).map(field => (
                <label key={field} className="text-xs capitalize text-white/55">
                  {field.replaceAll("_", " ")}
                  <input type={field === "email" ? "email" : "text"} value={editDraft[field]} onChange={event => setEditDraft(current => ({ ...current, [field]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white" />
                </label>
              ))}
              <label className="text-xs text-white/55 sm:col-span-2">Notes<textarea rows={3} value={editDraft.note} onChange={event => setEditDraft(current => ({ ...current, note: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-white" /></label>
              <button className="justify-self-start rounded-lg bg-[#ff3ea5] px-4 py-2 text-sm font-bold text-black sm:col-span-2">Save details</button>
            </form>
          ) : (
            <div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Email", value: profile.email },
                  { label: "Phone", value: profile.phone },
                  { label: "Organization", value: profile.venue },
                  { label: "Category", value: profile.industry_category },
                  { label: "chxndler.world profile", value: profileStatusLabel[profile.site_profile_status || "unknown"] },
                  { label: "Referred by", value: profile.referred_by },
                  { label: "Last contacted", value: profile.last_contacted_at ? dateValue(profile.last_contacted_at) : null },
                ].filter(field => field.value).map(field => (
                  <div key={field.label} className="rounded-lg border border-white/[.07] bg-white/[.025] p-3">
                    <p className="text-[.62rem] font-bold uppercase tracking-wider text-white/35">{field.label}</p>
                    <p className="mt-1 break-words text-sm text-white/80">{field.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-[.62rem] font-bold uppercase tracking-wider text-white/35">Notes &amp; follow-up</p>
                {profile.note ? <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/[.07] bg-white/[.025] p-3 text-sm leading-6 text-white/75">{profile.note}</p> : <p className="mt-2 text-sm text-white/40">No notes yet.</p>}
                <label className="mt-4 block text-xs text-white/45">Follow-up date
                  <input aria-label={`Follow up date for ${profile.first_name || "contact"}`} type="date" value={dateValue(profile.follow_up_at)} onChange={event => {
                    const value = event.target.value || null;
                    setProfile(current => current ? { ...current, follow_up_at: value } : null);
                    void update(profile, { follow_up_at: value });
                  }} className="mt-1.5 block rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" />
                </label>
              </div>
              <div className="mt-5 flex justify-end"><button type="button" onClick={() => {
                setEditingId(profile.id);
                setEditDraft({ first_name: profile.first_name || "", last_name: profile.last_name || "", email: profile.email || "", phone: profile.phone || "", venue: profile.venue || "", industry_category: profile.industry_category || "Other", relationship: profile.relationship || "", referred_by: profile.referred_by || "", note: profile.note || "" });
              }} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white">Edit profile</button></div>
            </div>
          )}
        </section>
      </div>
    )}
    <p className="mt-4 text-xs text-white/35">Private admin data · {visible.length} of {contacts.length} connections</p>
  </section>;
}
