"use client";

import { useEffect, useMemo, useState } from "react";

type Song = { id: string; title: string; slug: string };
type Contact = { id: string; first_name: string | null; last_name: string | null; email: string | null; venue: string | null; industry_category: string; connection_status: string };
type Idea = { id: string; song_id: string | null; song_title: string; core_emotion: string; big_category: string; movies: string; tv_cartoons: string; anime: string; text_hooks: string; scenes_to_search: string; notes: string };
type SyncRecord = Record<string, any> & { id: string; song_id: string | null; song_title: string; project_name: string; status?: string; payment_status?: string };
type Workspace = { songs: Song[]; contacts: Contact[]; ideas: Idea[]; opportunities: SyncRecord[]; placements: SyncRecord[] };
type View = "ideas" | "opportunities" | "placements";

const emptyWorkspace: Workspace = { songs: [], contacts: [], ideas: [], opportunities: [], placements: [] };
const ideaFields: Array<[keyof Idea, string, boolean?]> = [["core_emotion", "Core emotion"], ["big_category", "Big category"], ["movies", "Movies"], ["tv_cartoons", "TV / cartoons"], ["anime", "Anime"], ["text_hooks", "Text hooks", true], ["scenes_to_search", "Scenes to search", true], ["notes", "Notes", true]];
const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#101014] px-3 py-2.5 text-sm text-white";

export default function SyncOutreachTab({ songId = "" }: { songId?: string }) {
  const [view, setView] = useState<View>("ideas");
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Idea | SyncRecord | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadWorkspace() {
    const response = await fetch("/api/admin/sync-workspace", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load sync workspace."); return; }
    setWorkspace({ songs: data.songs || [], contacts: data.contacts || [], ideas: data.ideas || [], opportunities: data.opportunities || [], placements: data.placements || [] });
    setError("");
  }
  useEffect(() => { void loadWorkspace(); }, []);

  const rows = useMemo(() => {
    const allRows = view === "ideas" ? workspace.ideas : view === "opportunities" ? workspace.opportunities : workspace.placements;
    const source = songId ? allRows.filter(row => row.song_id === songId) : allRows;
    const term = query.trim().toLowerCase();
    if (!term) return source;
    return source.filter(row => Object.values(row).some(value => String(value ?? "").toLowerCase().includes(term)));
  }, [query, view, workspace]);

  function openRecord(row: Idea | SyncRecord) {
    setDetail(row);
    setDraft({ ...row });
    setCreating(false);
  }
  function beginCreate(kind: "opportunity" | "placement") {
    setDetail(null); setCreating(true);
    setDraft({ kind, song_id: songId || "", contact_id: "", opportunity_url: "", project_name: "", contact_name: "", organization: "", contact_email: "", media_type: "", deadline: "", submitted_at: "", status: "Researching", potential_fee: "", follow_up_at: "", notes: "", usage_details: "", territory: "", term: "", agreement_reference: "", fee: "", payment_status: "Unpaid", placement_date: "" });
  }
  function startOpportunityFromIdea(idea: Idea) {
    setView("opportunities"); setDetail(null); setCreating(true);
    setDraft({ kind: "opportunity", song_id: idea.song_id || "", contact_id: "", opportunity_url: "", project_name: "", contact_name: "", organization: "", contact_email: "", media_type: "", deadline: "", submitted_at: "", status: "Researching", potential_fee: "", follow_up_at: "", notes: `Created from sync idea: ${idea.song_title}. Add a real production or licensing target when identified.`, usage_details: "", territory: "", term: "", agreement_reference: "", fee: "", payment_status: "Unpaid", placement_date: "" });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const idea = !creating && detail && "core_emotion" in detail;
    const response = await fetch("/api/admin/sync-workspace", { method: creating ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(idea ? { kind: "idea", id: draft.id, ...draft } : creating ? { ...draft, kind: draft.kind } : { kind: view === "opportunities" ? "opportunity" : "placement", id: draft.id, ...draft }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "Unable to save sync record."); return; }
    setDetail(null); setCreating(false); await loadWorkspace();
  }
  async function quickStatus(row: SyncRecord, status: string) {
    const kind = view === "opportunities" ? "opportunity" : "placement";
    const response = await fetch("/api/admin/sync-workspace", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id: row.id, ...(kind === "opportunity" ? { status } : { payment_status: status }) }) });
    if (!response.ok) { setError("Unable to update status."); return; }
    await loadWorkspace();
  }

  const activeOpportunities = workspace.opportunities.filter(row => !["Licensed", "Passed"].includes(row.status || "")).length;
  const activeSyncRecord = detail && !("core_emotion" in detail) ? detail as SyncRecord : null;
  const input = (key: string, label: string, multiline = false, type = "text") => <label key={key} className="block text-xs font-medium text-white/55">{label}{multiline ? <textarea rows={3} value={draft[key] ?? ""} onChange={event => setDraft({ ...draft, [key]: event.target.value })} className={inputClass} /> : <input type={type} value={draft[key] ?? ""} onChange={event => setDraft({ ...draft, [key]: event.target.value })} className={inputClass} />}</label>;
  const chooseContact = (id: string) => { const contact = workspace.contacts.find(item => item.id === id); setDraft({ ...draft, contact_id: id, contact_name: contact ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") : draft.contact_name, contact_email: contact?.email || draft.contact_email, organization: contact?.venue || draft.organization }); };
  const selectSong = <label className="block text-xs font-medium text-white/55">Song<select value={draft.song_id || ""} onChange={event => { const song = workspace.songs.find(item => item.id === event.target.value); setDraft({ ...draft, song_id: event.target.value || null, ...(song ? { song_title: song.title } : {}) }); }} className={inputClass}><option value="">Unlinked</option>{workspace.songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>;

  return <section>
    <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-2xl">
      {[["Songs with sync ideas", workspace.ideas.length], ["Active opportunities", activeOpportunities], ["Confirmed placements", workspace.placements.length]].map(([label, count]) => <div key={label} className="border-l border-white/10 pl-3 first:border-0 first:pl-0"><p className="text-[.62rem] leading-4 text-white/45">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums text-white">{count}</p></div>)}
    </div>
    <div role="tablist" aria-label="Sync sections" className="mb-3 flex gap-5 overflow-x-auto border-b border-white/10">{([["ideas", "Ideas"], ["opportunities", "Opportunities"], ["placements", "Placements"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => { setView(id); setQuery(""); }} className={`shrink-0 border-b-2 py-2 text-sm font-semibold ${view === id ? "border-[#FD52AF] text-white" : "border-transparent text-white/45"}`}>{label}</button>)}</div>
    {error && <p role="alert" className="mb-3 rounded-lg border border-amber-300/20 p-3 text-sm text-amber-100">{error}</p>}
    <div className="mb-2 flex gap-2"><input value={query} onChange={event => setQuery(event.target.value)} aria-label={`Search sync ${view}`} placeholder={view === "ideas" ? "Search songs, references, hooks…" : "Search projects, songs, status…"} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[.035] px-3 py-2 text-sm text-white placeholder:text-white/30" />{view !== "ideas" && <button type="button" onClick={() => beginCreate(view === "opportunities" ? "opportunity" : "placement")} className="shrink-0 rounded-lg bg-[#FD52AF] px-3 py-2 text-xs font-bold text-black">{view === "opportunities" ? "+ Opportunity" : "+ Placement"}</button>}</div>
    {view !== "ideas" && <div className={`hidden grid-cols-5 gap-3 border-b border-white/10 py-1.5 text-[.62rem] font-semibold uppercase tracking-wide text-white/35 sm:grid ${view === "opportunities" ? "sm:grid-cols-[1.2fr_1fr_.8fr_1fr_1rem]" : "sm:grid-cols-[1.2fr_1fr_1fr_.8fr_1rem]"}`}><span>{view === "opportunities" ? "Opportunity" : "Project"}</span><span>Song</span><span>{view === "opportunities" ? "Status" : "Usage"}</span><span>{view === "opportunities" ? "Next action" : "Status"}</span><span /></div>}
    <div className="divide-y divide-white/[.07]">
      {view === "ideas" ? (rows as Idea[]).map(row => <button key={row.id} type="button" onClick={() => openRecord(row)} className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 gap-y-0.5 py-1.5 text-left hover:bg-white/[.025] sm:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(8rem,1.2fr)_1rem] sm:gap-3 sm:py-2 sm:px-2"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{row.song_title}</span><span className="block truncate text-[.65rem] text-white/40 sm:hidden">{row.big_category || row.core_emotion || "—"} · {[row.movies, row.tv_cartoons, row.anime].filter(Boolean).join(" · ")}</span></span><span className="hidden truncate text-xs text-white/55 sm:block">{row.big_category || row.core_emotion || "—"}</span><span className="hidden truncate text-xs text-white/40 sm:block">{[row.movies, row.tv_cartoons, row.anime].filter(Boolean).join(" · ") || "No references"}</span><span className="row-chevron text-right text-white/35">›</span></button>) : (rows as SyncRecord[]).map(row => <button key={row.id} type="button" onClick={() => openRecord(row)} className={`grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-left hover:bg-white/[.025] sm:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(6rem,.8fr)_minmax(7rem,1fr)_1rem] sm:gap-3 sm:py-2 sm:px-2`}>
        <span className="min-w-0 truncate text-sm font-semibold text-white">{row.project_name || "—"}<span className="ml-2 text-[.68rem] font-normal text-white/45 sm:hidden">· {row.song_title || "Unassigned"}</span></span><span className="hidden truncate text-xs text-white/55 sm:block">{row.song_title || "Unassigned"}</span><span className="truncate text-xs text-white/55">{view === "opportunities" ? row.status : row.usage_details || row.media_type || "—"}</span><span className="hidden truncate text-xs text-white/40 sm:block">{view === "opportunities" ? row.notes || row.follow_up_at || "—" : row.payment_status || "Confirmed"}</span><span className="row-chevron text-right text-white/35">›</span>
      </button>)}
      {rows.length === 0 && <p className="py-8 text-center text-sm text-white/40">{view === "ideas" ? "No sync ideas found. Apply the sync ideas migration to load the preserved research." : `No ${view} found.`}</p>}
    </div>
    {(detail || creating) && <div className="fixed inset-0 z-[120] flex justify-end bg-black/70" onMouseDown={event => { if (event.target === event.currentTarget) { setDetail(null); setCreating(false); } }}><form onSubmit={event => void save(event)} className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0d0d12] shadow-2xl">
      <header className="flex items-start gap-3 border-b border-white/10 p-4 sm:p-5"><div className="min-w-0 flex-1"><p className="text-[.62rem] font-bold uppercase tracking-[.16em] text-[#ff78ba]">{creating ? "New sync record" : detail && "core_emotion" in detail ? "Creative sync idea" : view === "opportunities" ? "Sync opportunity" : "Confirmed placement"}</p><h2 className="mt-1 truncate text-lg font-bold">{creating ? (view === "opportunities" ? "Add opportunity" : "Add placement") : detail && "song_title" in detail ? detail.song_title : activeSyncRecord?.project_name}</h2></div><button type="button" aria-label="Close details" onClick={() => { setDetail(null); setCreating(false); }} className="rounded-md px-2 py-1 text-xl text-white/50">×</button></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {detail && "core_emotion" in detail ? <>{selectSong}<div className="grid gap-3 sm:grid-cols-2">{ideaFields.map(([key, label, multiline]) => input(key, label, multiline))}</div></> : <>{selectSong}{input("project_name", "Project / brief")}{view === "opportunities" || (creating && draft.kind === "opportunity") ? <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium text-white/55">Status<select value={draft.status || "Researching"} onChange={event => setDraft({ ...draft, status: event.target.value })} className={inputClass}>{["Researching", "Ready to Pitch", "Submitted", "In Discussion", "Licensed", "Passed"].map(status => <option key={status}>{status}</option>)}</select></label><label className="block text-xs font-medium text-white/55 sm:col-span-2">Shared contact<select value={draft.contact_id || ""} onChange={event => chooseContact(event.target.value)} className={inputClass}><option value="">Choose existing contact or use details below</option>{workspace.contacts.map(contact => <option key={contact.id} value={contact.id}>{[contact.first_name, contact.last_name].filter(Boolean).join(" ")}{contact.venue ? ` · ${contact.venue}` : ""}{contact.email ? ` · ${contact.email}` : ""}</option>)}</select></label>{input("contact_name", "Contact")}{input("organization", "Organization")}{input("contact_email", "Email", false, "email")}{input("opportunity_url", "Opportunity URL", false, "url")}{input("media_type", "Media type")}{input("deadline", "Deadline", false, "date")}{input("submitted_at", "Submitted", false, "date")}{input("follow_up_at", "Next follow-up", false, "date")}{input("potential_fee", "Potential fee", false, "number")}{input("notes", "Notes", true)}</div> : <div className="grid gap-3 sm:grid-cols-2">{input("media_type", "Media type")}{input("usage_details", "Usage details", true)}{input("territory", "Territory")}{input("term", "Term")}{input("agreement_reference", "Agreement reference")}{input("fee", "Fee", false, "number")}<label className="block text-xs font-medium text-white/55">Payment status<select value={draft.payment_status || "Unpaid"} onChange={event => setDraft({ ...draft, payment_status: event.target.value })} className={inputClass}>{["Unpaid", "Pending", "Paid"].map(status => <option key={status}>{status}</option>)}</select></label>{input("placement_date", "Placement date", false, "date")}</div>}</>}
      </div><footer className="flex justify-end gap-2 border-t border-white/10 p-4">{detail && "core_emotion" in detail && <button type="button" onClick={() => startOpportunityFromIdea(detail as Idea)} className="mr-auto rounded-lg border border-[#FD52AF]/30 px-3 py-2 text-xs font-semibold text-[#ff9dcd]">Create opportunity…</button>}<button type="button" onClick={() => { setDetail(null); setCreating(false); }} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70">Cancel</button>{activeSyncRecord && <button type="button" onClick={() => void quickStatus(activeSyncRecord, view === "opportunities" ? "Passed" : "Paid")} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/55">{view === "opportunities" ? "Mark passed" : "Mark paid"}</button>}<button disabled={busy} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></footer>
    </form></div>}
  </section>;
}
