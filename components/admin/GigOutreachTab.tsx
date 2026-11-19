"use client";

import { FormEvent, Fragment, useCallback, useEffect, useState } from "react";

type Venue = {
  id: string; venue: string; contact_id: string | null; song_id: string | null; neighborhood: string; address: string; city: string;
  first_name: string; last_name: string; website: string; contact_email: string;
  phone: string; capacity: string; subject: string; email_copy: string;
  form_url: string; date_sent: string | null; notes: string; performed: boolean;
};

const blank: Omit<Venue, "id"> = {
  venue: "", contact_id: null, song_id: null, neighborhood: "", address: "", city: "", first_name: "", last_name: "",
  website: "", contact_email: "", phone: "", capacity: "", subject: "", email_copy: "",
  form_url: "", date_sent: "", notes: "", performed: false,
};
const fields: { key: keyof Omit<Venue, "id" | "performed">; label: string; wide?: boolean; type?: string }[] = [
  { key: "venue", label: "Venue" }, { key: "neighborhood", label: "Neighborhood" },
  { key: "address", label: "Address", wide: true }, { key: "city", label: "City" },
  { key: "first_name", label: "First name" }, { key: "last_name", label: "Last name" },
  { key: "website", label: "Website", type: "url" }, { key: "contact_email", label: "Contact email", type: "email" },
  { key: "phone", label: "Phone" }, { key: "capacity", label: "Capacity" },
  { key: "subject", label: "Subject / pitch note", wide: true }, { key: "email_copy", label: "Email / venue type", wide: true },
  { key: "form_url", label: "Form URL", type: "url", wide: true }, { key: "date_sent", label: "Date sent", type: "date" },
  { key: "notes", label: "Notes", wide: true },
];
const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm text-white placeholder:text-white/30";

export default function GigOutreachTab() {
  const [records, setRecords] = useState<Venue[]>([]);
  const [contacts, setContacts] = useState<Array<{id:string;first_name:string|null;last_name:string|null;email:string|null;venue:string|null}>>([]);
  const [songs, setSongs] = useState<Array<{id:string;title:string}>>([]);
  const [draft, setDraft] = useState<Omit<Venue, "id">>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, contactResponse, songResponse] = await Promise.all([fetch("/api/admin/gig-outreach"), fetch("/api/admin/industry-connections"), fetch("/api/admin/song-tracker")]);
      const [result, contactResult, songResult] = await Promise.all([response.json(), contactResponse.json(), songResponse.json()]);
      if (!response.ok) throw new Error(result.error || "Unable to load venues.");
      setRecords(result.records || []);
      setContacts(contactResult.contacts || []);
      setSongs((songResult.songs || []).map((song: {id:string;title:string}) => ({id:song.id,title:song.title})));
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load venues."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: FormEvent<HTMLFormElement>, id?: string) => {
    event.preventDefault();
    setSaving(true); setError("");
    const payload = id ? { ...draft, id } : draft;
    try {
      const response = await fetch("/api/admin/gig-outreach", {
        method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save venue.");
      if (id) setRecords(rows => rows.map(row => row.id === id ? result.record : row));
      else { setRecords(rows => [...rows, result.record].sort((a, b) => a.venue.localeCompare(b.venue))); setDraft(blank); }
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save venue."); }
    finally { setSaving(false); }
  };

  const visible = records.filter(row => Object.values(row).some(value => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase())));
  const editor = (value: Omit<Venue, "id">, change: (next: Omit<Venue, "id">) => void, id?: string) => (
    <form onSubmit={event => void save(event, id)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold text-white/55">Shared contact<select value={value.contact_id || ""} onChange={event => { const contact=contacts.find(item=>item.id===event.target.value); change({ ...value, contact_id:event.target.value||null, first_name:contact?.first_name||value.first_name, last_name:contact?.last_name||value.last_name, contact_email:contact?.email||value.contact_email }); }} className={inputClass}><option value="">No linked contact</option>{contacts.map(contact=><option key={contact.id} value={contact.id}>{[contact.first_name,contact.last_name].filter(Boolean).join(" ")}{contact.venue?` · ${contact.venue}`:""}</option>)}</select></label>
      <label className="text-xs font-semibold text-white/55">Related song<select value={value.song_id || ""} onChange={event => change({ ...value, song_id:event.target.value||null })} className={inputClass}><option value="">Unassigned</option>{songs.map(song=><option key={song.id} value={song.id}>{song.title}</option>)}</select></label>
      {fields.map(field => <label key={field.key} className={`text-xs font-semibold text-white/55 ${field.wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
        {field.label}
        {field.key === "notes" || field.key === "subject" || field.key === "email_copy" ?
          <textarea rows={field.key === "notes" ? 3 : 2} value={value[field.key] || ""} onChange={event => change({ ...value, [field.key]: event.target.value })} className={inputClass} /> :
          <input required={field.key === "venue"} type={field.type || "text"} value={value[field.key] || ""} onChange={event => change({ ...value, [field.key]: event.target.value })} className={inputClass} />}
      </label>)}
      <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={value.performed} onChange={event => change({ ...value, performed: event.target.checked })} className="accent-[#ff3ea5]" /> Performed here</label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={saving} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">{saving ? "Saving…" : id ? "Save changes" : "Add venue"}</button>{id && <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Cancel</button>}</div>
    </form>
  );

  return <section>
    <div className="mb-3 flex items-center gap-3"><h2 className="text-sm font-semibold text-white/75">{records.length} venues · {records.filter(row => row.performed).length} performed</h2><details className="group ml-auto"><summary className="cursor-pointer list-none rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-black">+ Add venue</summary><div className="fixed inset-0 z-[110] flex justify-end bg-black/70" onClick={event => { if (event.target === event.currentTarget) (event.currentTarget.previousElementSibling as HTMLElement)?.click(); }}><div className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0d0d12] p-4 sm:p-6"><p className="mb-4 text-lg font-bold">New venue</p>{editor(draft, setDraft)}</div></div></details></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search venues, neighborhoods, contacts, notes…" className={`${inputClass} mb-4`} />
    {loading ? <p className="p-8 text-center text-sm text-white/45">Loading venues…</p> : <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead className="bg-white/[.06] text-[.65rem] uppercase tracking-[.12em] text-white/55"><tr>{["Venue", "Neighborhood", "Contact", "Date sent", "Performed", "Details"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody>{visible.map((row, index) => <Fragment key={row.id}>
          <tr className={index % 2 ? "bg-white/[.015]" : ""}>
            <td className="border-t border-white/[.07] px-4 py-3 font-bold text-white">{row.venue}</td><td className="border-t border-white/[.07] px-4 py-3 text-white/65">{row.neighborhood || "—"}</td>
            <td className="border-t border-white/[.07] px-4 py-3 text-white/65">{row.contact_email || [row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}</td><td className="border-t border-white/[.07] px-4 py-3 text-white/65">{row.date_sent || "—"}</td>
            <td className="border-t border-white/[.07] px-4 py-3"><span className={row.performed ? "text-emerald-300" : "text-white/35"}>{row.performed ? "Yes" : "No"}</span></td><td className="border-t border-white/[.07] px-4 py-3"><button onClick={() => { setDraft({ ...row }); setEditing(editing === row.id ? null : row.id); }} className="text-xs font-bold text-[#ff78ba]">{editing === row.id ? "Close" : "Edit"}</button></td>
          </tr>
          {editing === row.id && <tr key={`${row.id}-edit`}><td colSpan={6} className="border-t border-white/10 bg-white/[.025] p-4">{editor(draft, setDraft, row.id)}</td></tr>}
        </Fragment>)}</tbody>
      </table>
      {!visible.length && <p className="p-8 text-center text-sm text-white/45">{records.length ? "No matches. Try another search." : "No venues yet. Add the first one above."}</p>}
    </div>}
  </section>;
}
