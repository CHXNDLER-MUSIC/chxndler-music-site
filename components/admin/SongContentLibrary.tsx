"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Item = {
  id: string; title: string; category: string | null; sub_category: string | null; song_id: string | null;
  recorded: boolean | null; edited: boolean | null; post_ready: boolean | null; media_type: string | null;
  purpose: string | null; source_url: string | null; media_url: string | null; script: string | null;
  planned_date: string | null; planned_time: string | null; caption: string | null; text_on_screen: string | null;
  hashtags: string | null; published: boolean | null; workflow_status: string;
};
const empty = { title: "", category: "", sub_category: "", song_id: "", recorded: false, edited: false, post_ready: false, media_type: "", purpose: "", source_url: "", media_url: "", script: "", planned_date: "", planned_time: "", caption: "", text_on_screen: "", hashtags: "" };
const input = "mt-1 w-full rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm text-white outline-none focus:border-[#FD52AF]/50";
export default function SongContentLibrary({ songId, songTitle }: { songId: string; songTitle: string }) {
  const [items, setItems] = useState<Item[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [active, setActive] = useState<Item | null>(null), [draft, setDraft] = useState<any>(empty), [saving, setSaving] = useState(false);
  async function load() {
    const response = await fetch(`/api/admin/content-items?songId=${songId}&pageSize=100&sort=planned_date&direction=asc`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load song content."); setLoading(false); return; }
    setItems(data.items || []); setLoading(false);
  }
  useEffect(() => { void load(); }, [songId]);
  const counts = useMemo(() => ({ total: items.length, record: items.filter(x => x.workflow_status === "To Record").length, edit: items.filter(x => x.workflow_status === "To Edit").length, posted: items.filter(x => x.workflow_status === "Posted").length, done: items.filter(x => x.published).length }), [items]);
  function open(item?: Item) { setActive(item || null); setDraft(item ? Object.fromEntries(Object.keys(empty).map(k => [k, (item as any)[k] ?? (typeof (empty as any)[k] === "boolean" ? false : "")])) : { ...empty, song_id: songId }); }
  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/admin/content-items", { method: active ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, id: active?.id, song_id: songId, planned_date: draft.planned_date || null }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) { setError(data.error || "Unable to save content."); return; }
    setActive(null); setDraft({ ...empty }); await load();
  }
  async function toggle(item: Item, key: "recorded" | "edited" | "published") {
    const response = await fetch("/api/admin/content-items", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, [key]: !item[key] }) });
    if (!response.ok) { const d = await response.json(); setError(d.error || "Unable to update content."); return; }
    await load();
  }
  const progress = counts.total ? Math.round(counts.done / counts.total * 100) : 0;
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="font-bold">Content for {songTitle}</h2><p className="mt-1 text-xs text-white/45">Shared with the Content Library</p></div><a href={`/admin?view=content&song=${encodeURIComponent(songId)}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/65 hover:text-white">View in Content Library</a><button onClick={() => open()} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-[#170d14]">+ Add Content</button></header>
    <div className="rounded-xl border border-white/[.08] bg-[#191820] p-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Total" value={counts.total}/><Metric label="To Record" value={counts.record}/><Metric label="To Edit" value={counts.edit}/><Metric label="Posted" value={counts.posted}/></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FD52AF]" style={{ width: `${progress}%` }}/></div></div>
    {error && <p role="alert" className="rounded-lg bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="p-8 text-center text-sm text-white/45">Loading content…</p> : items.length ? <div className="overflow-x-auto rounded-xl border border-white/[.08] bg-[#191820]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs text-white/45"><tr>{["Content title","Category","Type","Status","Record","Edit","Post","Planned date"].map(v=><th key={v} className="px-3 py-3 font-semibold">{v}</th>)}</tr></thead><tbody className="divide-y divide-white/[.06]">{items.map(item=><tr key={item.id} className="hover:bg-white/[.025]"><td className="px-3 py-3"><button onClick={()=>open(item)} className="text-left font-semibold text-white hover:text-[#FD52AF]">{item.title}</button></td><td className="px-3 py-3 text-white/60">{item.category||"—"}</td><td className="px-3 py-3 text-white/60">{item.media_type||"—"}</td><td className="px-3 py-3"><span className="rounded-full bg-white/[.07] px-2 py-1 text-xs text-white/70">{item.workflow_status}</span></td>{(["recorded","edited","published"] as const).map(key=><td key={key} className="px-3 py-3"><button onClick={()=>void toggle(item,key)} aria-label={`${key} ${item[key] ? "complete" : "incomplete"}`} className={`grid h-8 w-8 place-items-center rounded-md transition ${item[key] ? "text-emerald-300 hover:bg-emerald-300/10" : "text-white/35 hover:bg-white/[.06]"}`}>{item[key] ? "✓" : "○"}</button></td>)}<td className="px-3 py-3 text-white/55">{item.planned_date||"—"}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center"><p className="font-semibold text-white/75">No content linked to this song yet</p><p className="mt-1 text-sm text-white/40">Add the first content item to the shared library.</p><button onClick={()=>open()} className="mt-4 rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-[#170d14]">+ Add Content</button></div>}
    {active !== null || draft.song_id ? <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/75 p-3 sm:place-items-center"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#191820] p-5"><header className="mb-4 flex items-center"><div className="mr-auto"><p className="text-xs uppercase tracking-wider text-[#FD52AF]">{active ? "Edit content" : "New content"}</p><h3 className="mt-1 text-lg font-bold">{songTitle}</h3></div><button type="button" onClick={()=>{setActive(null);setDraft(empty)}} className="px-3 py-2 text-sm text-white/55">Close</button></header><div className="grid gap-3 sm:grid-cols-2">{([["Title","title"],["Category","category"],["Sub-category","sub_category"],["Type","media_type"],["Purpose","purpose"],["Source URL","source_url"],["Media URL","media_url"],["Planned date","planned_date"],["Time","planned_time"],["Caption","caption"],["Text on screen","text_on_screen"],["Hashtags","hashtags"],["Script","script"]] as Array<[string,string]>).map(([label,key])=><label key={key} className={`text-xs text-white/55 ${["caption","text_on_screen","hashtags","script"].includes(key)?"sm:col-span-2":""}`}>{label}{key==="caption"||key==="text_on_screen"||key==="hashtags"||key==="script"?<textarea rows={key==="script"?5:2} value={draft[key]||""} onChange={e=>setDraft({...draft,[key]:e.target.value})} className={input}/>:<input required={key==="title"} type={key==="planned_date"?"date":key.endsWith("url")?"url":"text"} value={draft[key]||""} onChange={e=>setDraft({...draft,[key]:e.target.value})} className={input}/>}</label>)}</div><div className="mt-4 flex flex-wrap gap-5">{([["Record","recorded"],["Edit","edited"],["Post ready","post_ready"]] as Array<[string,string]>).map(([label,key])=><label key={key} className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})} className="accent-[#FD52AF]"/>{label}</label>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>{setActive(null);setDraft(empty)}} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/65">Cancel</button><button disabled={saving} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-[#170d14]">{saving?"Saving…":"Save content"}</button></div></form></div>:null}
  </section>;
}
function Metric({label,value}:{label:string;value:number}) { return <div><p className="text-xs text-white/45">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>; }
