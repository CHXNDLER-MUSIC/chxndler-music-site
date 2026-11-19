"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Scope = "chxndler_studio" | "chxndler" | "unreleased_song";
type Song = { id: string; title: string; slug: string };
type Task = { id: string; business_area: Scope; song_id: string | null; title: string; description: string; status: string; priority: string; due_at: string | null; song: Song | null; content?: { id: string; song_id: string; title: string } | null };
const scopes: Array<{ id: Scope; label: string; description: string }> = [
  { id: "chxndler_studio", label: "CHXNDLER STUDIO", description: "Studio, client, and business development work." },
  { id: "chxndler", label: "CHXNDLER", description: "Artist, release, creative, and career tasks." },
  { id: "unreleased_song", label: "UNRELEASED SONGS", description: "Each unreleased catalog song has a linked profile task." },
];
const scopeColors: Record<Scope, { accent: string; border: string; tint: string }> = {
  chxndler_studio: { accent: "#FC54AF", border: "rgba(252,84,175,.55)", tint: "rgba(252,84,175,.10)" },
  chxndler: { accent: "#38B6FF", border: "rgba(56,182,255,.55)", tint: "rgba(56,182,255,.10)" },
  unreleased_song: { accent: "#F2EF1D", border: "rgba(242,239,29,.52)", tint: "rgba(242,239,29,.08)" },
};
const statusOptions = ["todo", "in_progress", "blocked", "done"];
const statusNames: Record<string, string> = { todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done" };
const blank = { business_area: "chxndler" as Scope, song_id: "", title: "", description: "", priority: "normal", due_at: "" };

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]), [songs, setSongs] = useState<Song[]>([]), [scope, setScope] = useState<Scope | "all">("all"), [search, setSearch] = useState(""), [focusTaskId, setFocusTaskId] = useState(""), [draft, setDraft] = useState(blank), [adding, setAdding] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError("");
    const [taskResponse, songResponse] = await Promise.all([fetch("/api/admin/tasks", { cache: "no-store" }), fetch("/api/admin/song-tracker", { cache: "no-store" })]);
    const taskData = await taskResponse.json(), songData = await songResponse.json();
    if (taskResponse.ok) setTasks(taskData.tasks || []); else setError(taskData.error || "Unable to load tasks.");
    if (songResponse.ok) setSongs((songData.songs || []).filter((song: Song & { is_released: boolean }) => !song.is_released));
    setLoading(false);
  }
  useEffect(() => { setFocusTaskId(new URLSearchParams(window.location.search).get("task") || ""); }, []);
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => tasks.filter(task => (!focusTaskId || task.id === focusTaskId) && (scope === "all" || task.business_area === scope) && `${task.title} ${task.description} ${task.song?.title || ""}`.toLowerCase().includes(search.toLowerCase())), [tasks, scope, search, focusTaskId]);
  const pendingCount = tasks.filter(task => task.status !== "done").length;
  async function saveStatus(task: Task, status: string) {
    const response = await fetch("/api/admin/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, status }) });
    const result = await response.json();
    if (response.ok) setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row)); else setError(result.error || "Unable to save task.");
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/admin/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, song_id: draft.business_area === "unreleased_song" ? draft.song_id : null }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to create task."); return; }
    setDraft(blank); setAdding(false); await load();
  }
  return <section>
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{scopes.map(item => {
      const color = scopeColors[item.id];
      const count = tasks.filter(task => task.business_area === item.id && task.status !== "done").length;
      const active = scope === item.id;
      return <button key={item.id} onClick={() => setScope(active ? "all" : item.id)} aria-pressed={active} style={{ borderColor: active ? color.border : "#292930", background: active ? color.tint : "#121217" }} className="min-h-36 rounded-2xl border p-5 text-left shadow-[0_8px_24px_rgba(0,0,0,.2)] transition hover:border-white/30">
        <span style={{ color: color.accent }} className="text-xs font-black tracking-[.14em]">{item.label}</span>
        <span className="mt-3 flex items-baseline gap-2"><strong style={{ color: color.accent }} className="text-5xl font-black leading-none tabular-nums">{count}</strong><small className="text-sm font-semibold text-white/55">open</small></span>
        <span className="mt-3 block text-sm leading-5 text-white/65">{item.description}</span>
      </button>;
    })}</div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tasks and songs" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"/><select value={scope} onChange={event => setScope(event.target.value as Scope | "all")} className="rounded-lg border border-white/10 bg-[#111116] p-3 text-sm"><option value="all">All work</option>{scopes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-sm font-bold text-black">{adding ? "Close" : "+ Add task"}</button><button onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Refresh</button></div>
    {focusTaskId && <div className="mb-3 flex items-center gap-2 text-xs text-white/50"><span>Linked task</span><button type="button" onClick={() => { setFocusTaskId(""); const params = new URLSearchParams(window.location.search); params.delete("task"); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }} className="font-semibold text-[#FD52AF]">Show all tasks</button></div>}
    {adding && <form onSubmit={create} className="mb-5 grid gap-3 rounded-xl border border-[#ff3ea5]/25 bg-white/[.03] p-4 sm:grid-cols-2"><label className="text-xs text-white/55">Business<select value={draft.business_area} onChange={event => setDraft(current => ({ ...current, business_area: event.target.value as Scope }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white">{scopes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{draft.business_area === "unreleased_song" && <label className="text-xs text-white/55">Song<select required value={draft.song_id} onChange={event => setDraft(current => ({ ...current, song_id: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"><option value="">Choose a song</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>}<label className="text-xs text-white/55 sm:col-span-2">Task<input required maxLength={180} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white" placeholder="What needs to happen?"/></label><label className="text-xs text-white/55 sm:col-span-2">Notes<textarea rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label><label className="text-xs text-white/55">Priority<select value={draft.priority} onChange={event => setDraft(current => ({ ...current, priority: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></label><label className="text-xs text-white/55">Due date<input type="date" value={draft.due_at} onChange={event => setDraft(current => ({ ...current, due_at: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"/></label><button className="justify-self-start rounded-lg border border-white/20 px-4 py-2 text-sm sm:col-span-2">Create task</button></form>}
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    <div className="mb-3 flex items-center justify-between text-xs text-white/45"><span>{visible.length} tasks</span><span>{pendingCount} open</span></div>
    {loading ? <p className="rounded-xl border border-white/10 p-8 text-center text-white/45">Loading tasks…</p> : <div className="space-y-2">{visible.map(task => <article key={task.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="text-[.6rem] font-bold uppercase tracking-wider text-[#ff76bd]">{scopes.find(item => item.id === task.business_area)?.label}</span>{task.priority === "high" && <span className="text-[.6rem] font-bold uppercase tracking-wider text-amber-200">High priority</span>}</div><h3 className="mt-1 font-bold">{task.title}</h3>{task.description && <p className="mt-1 text-sm text-white/50">{task.description}</p>}{task.content ? <Link href={`/admin/songs/${task.content.song_id}?tab=content&content=${task.content.id}`} className="mt-2 inline-block text-sm text-[#ff76bd]">{task.content.title} · Open content ↗</Link> : task.song && <Link href={`/admin/songs/${task.song.id}`} className="mt-2 inline-block text-sm text-[#ff76bd]">{task.song.title} · Open song profile ↗</Link>}{task.due_at && <p className="mt-2 text-xs text-white/40">Due {task.due_at}</p>}</div><select value={task.status} onChange={event => void saveStatus(task, event.target.value)} aria-label={`Status for ${task.title}`} className="rounded-lg border border-white/10 bg-[#111116] p-2.5 text-sm">{statusOptions.map(status => <option key={status} value={status}>{statusNames[status]}</option>)}</select></article>)}{visible.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{tasks.length === 0 ? "No tasks yet. Unreleased songs will appear here after the task migration is applied." : "No tasks match this view."}</p>}</div>}
  </section>;
}
