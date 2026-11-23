"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Scope = "chxndler_studio" | "chxndler" | "unreleased_song";
type Song = { id: string; title: string; slug: string; is_released?: boolean; release_date?: string | null };
type Task = { id: string; business_area: Scope; song_id: string | null; title: string; description: string; status: string; priority: string; due_at: string | null; task_category?: "music" | "editing" | "admin"; parent_task_id?: string | null; song: Song | null; content?: { id: string; song_id: string; title: string } | null };
type PostedContent = { id: string; title: string; song_id: string | null; song_name: string | null; published_at: string | null; planned_date: string | null; workflow_status: string; published: boolean };
type TimelineScale = "all" | "year" | "quarter" | "month" | "week" | "day";
const scopes: Array<{ id: Scope; label: string; description: string }> = [
  { id: "chxndler_studio", label: "CHXNDLER STUDIO", description: "Studio, client, and business development work." },
  { id: "chxndler", label: "CHXNDLER", description: "Artist, release, creative, and career tasks." },
  { id: "unreleased_song", label: "UNRELEASED SONGS", description: "Each unreleased catalog song has a linked profile task." },
];
const statusOptions = ["todo", "in_progress", "blocked", "done"];
const statusNames: Record<string, string> = { todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done" };
const categoryColors = { music: "#38B6FF", editing: "#B99AFF", admin: "#F2B84B" };
const blank = { business_area: "chxndler" as Scope, song_id: "", title: "", description: "", priority: "normal", due_at: "", task_category: "admin" as "music" | "editing" | "admin" };

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]), [songs, setSongs] = useState<Song[]>([]), [releases, setReleases] = useState<Song[]>([]), [postedContent, setPostedContent] = useState<PostedContent[]>([]), [releaseDatesAvailable, setReleaseDatesAvailable] = useState(true), [scope, setScope] = useState<Scope | "all">("all"), [search, setSearch] = useState(""), [focusTaskId, setFocusTaskId] = useState(""), [draft, setDraft] = useState(blank), [adding, setAdding] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true), [view, setView] = useState<"calendar" | "agenda" | "board" | "timeline">("timeline"), [month, setMonth] = useState(() => new Date()), [timelineScale, setTimelineScale] = useState<TimelineScale>("week"), [timelineAnchor, setTimelineAnchor] = useState(() => new Date()), [activeColumn, setActiveColumn] = useState<"song" | "task" | "date" | "category" | "status" | null>(null), [quickFilter, setQuickFilter] = useState<{ key: "song" | "task" | "date" | "category" | "status"; value: string } | null>(null);
  const [calendarScale, setCalendarScale] = useState<"week" | "month" | "quarter" | "year">("month");
  async function load() {
    setLoading(true); setError("");
    const [taskResponse, songResponse] = await Promise.all([fetch("/api/admin/tasks", { cache: "no-store" }), fetch("/api/admin/song-tracker", { cache: "no-store" })]);
    const taskData = await taskResponse.json(), songData = await songResponse.json();
    if (taskResponse.ok) setTasks(taskData.tasks || []); else setError(taskData.error || "Unable to load tasks.");
    if (songResponse.ok) {
      const allSongs: Song[] = songData.songs || [];
      setSongs(allSongs.filter(song => !song.is_released));
      setReleases(allSongs.filter(song => song.is_released));
      setReleaseDatesAvailable(songData.releaseDateAvailable !== false);
    }
    const contentResponse = await fetch("/api/admin/content-items?workflow=Posted&page=1&pageSize=100&sort=planned_date&direction=asc", { cache: "no-store" });
    if (contentResponse.ok) {
      const firstPage = await contentResponse.json();
      let content: PostedContent[] = firstPage.items || [];
      const pages = Math.ceil((firstPage.total || 0) / (firstPage.pageSize || 100));
      for (let page = 2; page <= pages; page++) {
        const response = await fetch(`/api/admin/content-items?workflow=Posted&page=${page}&pageSize=100&sort=planned_date&direction=asc`, { cache: "no-store" });
        if (!response.ok) break;
        const data = await response.json(); content = content.concat(data.items || []);
      }
      setPostedContent(content);
    }
    setLoading(false);
  }
  useEffect(() => { setFocusTaskId(new URLSearchParams(window.location.search).get("task") || ""); }, []);
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => tasks.filter(task => {
    if ((focusTaskId && task.id !== focusTaskId) || (scope !== "all" && task.business_area !== scope) || !`${task.title} ${task.description} ${task.song?.title || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (!quickFilter) return true;
    if (quickFilter.key === "song") return (task.song_id || "") === quickFilter.value;
    if (quickFilter.key === "task") return task.title === quickFilter.value;
    if (quickFilter.key === "date") return quickFilter.value === "unscheduled" ? !task.due_at : task.due_at === quickFilter.value;
    if (quickFilter.key === "category") return (task.task_category || "admin") === quickFilter.value;
    return task.status === quickFilter.value;
  }), [tasks, scope, search, focusTaskId, quickFilter]);
  const pendingCount = tasks.filter(task => task.status !== "done").length;
  const categoryBreakdown = useMemo(() => {
    const openTasks = tasks.filter(task => task.status !== "done");
    const counts = (["music", "editing", "admin"] as const).map(category => ({
      category,
      count: openTasks.filter(task => (task.task_category || "admin") === category).length,
      color: categoryColors[category],
    }));
    return counts;
  }, [tasks]);
  const timelineEvents = useMemo(() => [
    ...visible.filter(task => task.due_at).map(task => ({ id: `task-${task.id}`, date: task.due_at!, title: task.title, detail: task.song?.title || "Task", songId: task.song_id, songName: task.song?.title || null, kind: "task" as const, done: task.status === "done", color: categoryColors[task.task_category || "admin"] })),
    ...releases.filter(song => song.release_date && (scope === "all" || scope !== "chxndler_studio") && `${song.title}`.toLowerCase().includes(search.toLowerCase())).map(song => ({ id: `release-${song.id}`, date: song.release_date!.slice(0, 10), title: `★ ${song.title}`, detail: "Song release", songId: song.id, songName: song.title, kind: "release" as const, done: true, color: "#FD52AF" })),
    ...postedContent.filter(item => (item.published_at?.slice(0, 10) || item.planned_date) && (scope === "all" || scope !== "chxndler_studio") && `${item.title} ${item.song_name || ""}`.toLowerCase().includes(search.toLowerCase())).map(item => ({ id: `posted-${item.id}`, date: (item.published_at?.slice(0, 10) || item.planned_date)!, title: item.title, detail: `Posted${item.song_name ? ` · ${item.song_name}` : ""}`, songId: item.song_id, songName: item.song_name, kind: "posted" as const, done: true, color: "#68D7B0" })),
  ].sort((a, b) => a.date.localeCompare(b.date)), [visible, releases, postedContent, scope, search]);
  const timelineRange = useMemo(() => {
    if (timelineScale === "all") return null;
    const year = timelineAnchor.getFullYear(), monthIndex = timelineAnchor.getMonth();
    let start: Date, end: Date;
    if (timelineScale === "year") { start = new Date(year, 0, 1); end = new Date(year + 1, 0, 1); }
    else if (timelineScale === "quarter") { const quarterMonth = Math.floor(monthIndex / 3) * 3; start = new Date(year, quarterMonth, 1); end = new Date(year, quarterMonth + 3, 1); }
    else if (timelineScale === "month") { start = new Date(year, monthIndex, 1); end = new Date(year, monthIndex + 1, 1); }
    else if (timelineScale === "week") { start = new Date(year, monthIndex, timelineAnchor.getDate() - timelineAnchor.getDay()); end = new Date(year, monthIndex, timelineAnchor.getDate() - timelineAnchor.getDay() + 7); }
    else { start = new Date(year, monthIndex, timelineAnchor.getDate()); end = new Date(year, monthIndex, timelineAnchor.getDate() + 1); }
    const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const periodEnd = new Date(end.getTime() - 86400000);
    const label = timelineScale === "year" ? String(year)
      : timelineScale === "quarter" ? `Q${Math.floor(monthIndex / 3) + 1} ${year}`
      : timelineScale === "month" ? start.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : timelineScale === "day" ? start.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
      : `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    return { start: toKey(start), end: toKey(end), label: label.toUpperCase() };
  }, [timelineScale, timelineAnchor]);
  const timelineVisibleEvents = useMemo(() => timelineRange ? timelineEvents.filter(event => event.date >= timelineRange.start && event.date < timelineRange.end) : timelineEvents, [timelineEvents, timelineRange]);
  const timelineDomain = useMemo(() => {
    if (timelineRange) return { start: new Date(`${timelineRange.start}T00:00:00`).getTime(), end: new Date(`${timelineRange.end}T00:00:00`).getTime() };
    if (!timelineVisibleEvents.length) return { start: Date.now(), end: Date.now() + 86400000 };
    const dates = timelineVisibleEvents.map(event => new Date(`${event.date}T00:00:00`).getTime());
    const start = Math.min(...dates), last = Math.max(...dates);
    return { start, end: last === start ? start + 86400000 : last + 86400000 };
  }, [timelineRange, timelineVisibleEvents]);
  const timelineRows = useMemo(() => {
    const catalog = [...new Map([...songs, ...releases].map(song => [song.id, song])).values()];
    const claimed = new Set<string>();
    const rows = catalog.map(song => {
      const events = timelineVisibleEvents.filter(event => event.songId === song.id || (!event.songId && event.songName?.trim().toLowerCase() === song.title.trim().toLowerCase()));
      events.forEach(event => claimed.add(event.id));
      return { id: song.id, title: song.title, events };
    }).filter(row => row.events.length).sort((a, b) => a.title.localeCompare(b.title));
    const unlinked = timelineVisibleEvents.filter(event => !claimed.has(event.id));
    if (unlinked.length) rows.push({ id: "__other__", title: "Other Tasks", events: unlinked });
    return rows;
  }, [songs, releases, timelineVisibleEvents]);
  const timelineEventColors = useMemo(() => {
    const colors = new Map<string, string>();
    timelineRows.forEach(row => {
      const hue = [...row.id].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 360, 0);
      row.events.forEach(event => colors.set(event.id, `hsl(${hue} 76% 62%)`));
    });
    return colors;
  }, [timelineRows]);
  const timelinePlot = useMemo(() => {
    const height = Math.max(400, timelineRows.length * 72 + 24);
    const rowGap = timelineRows.length ? (height - 24) / timelineRows.length : 0;
    const points = new Map<string, { x: number; y: number }>();
    timelineRows.forEach((row, rowIndex) => {
      const eventsByDate = new Map<string, typeof row.events>();
      row.events.forEach(event => eventsByDate.set(event.date, [...(eventsByDate.get(event.date) || []), event]));
      eventsByDate.forEach(events => events.forEach((event, index) => {
        const timestamp = new Date(`${event.date}T00:00:00`).getTime();
        const x = Math.max(0, Math.min(100, (timestamp - timelineDomain.start) / (timelineDomain.end - timelineDomain.start) * 100));
        const laneY = 12 + rowIndex * rowGap + rowGap / 2;
        const sameDateOffset = (index - (events.length - 1) / 2) * 12;
        points.set(event.id, { x: x * 10, y: laneY + sameDateOffset });
      }));
    });
    const connections = timelineRows.map(row => ({
      id: row.id,
      color: timelineEventColors.get(row.events[0]?.id) || "#ffffff",
      points: [...row.events].sort((a, b) => a.date.localeCompare(b.date)).map(event => points.get(event.id)).filter((point): point is { x: number; y: number } => Boolean(point)),
    })).filter(row => row.points.length > 1);
    return { height, points, connections };
  }, [timelineRows, timelineDomain, timelineEventColors]);
  function shiftTimeline(direction: -1 | 1) {
    setTimelineAnchor(current => {
      const next = new Date(current);
      if (timelineScale === "year") { next.setDate(1); next.setMonth(0); next.setFullYear(next.getFullYear() + direction); }
      else if (timelineScale === "quarter") { next.setDate(1); next.setMonth(Math.floor(next.getMonth() / 3) * 3 + direction * 3); }
      else if (timelineScale === "month") { next.setDate(1); next.setMonth(next.getMonth() + direction); }
      else if (timelineScale === "week") next.setDate(next.getDate() + direction * 7);
      else if (timelineScale === "day") next.setDate(next.getDate() + direction);
      return next;
    });
  }
  const filterOptions = activeColumn === "song" ? [...new Map(tasks.filter(task => task.song_id && task.song).map(task => [task.song_id!, task.song!.title])).entries()].map(([value, label]) => ({ value, label }))
    : activeColumn === "task" ? [...new Set(tasks.map(task => task.title))].sort().map(value => ({ value, label: value }))
    : activeColumn === "date" ? [...new Set(tasks.map(task => task.due_at).filter(Boolean) as string[])].sort().map(value => ({ value, label: value })).concat(tasks.some(task => !task.due_at) ? [{ value: "unscheduled", label: "Unscheduled" }] : [])
    : activeColumn === "category" ? ["music", "editing", "admin"].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))
    : activeColumn === "status" ? statusOptions.map(value => ({ value, label: statusNames[value] })) : [];
  async function saveStatus(task: Task, status: string) {
    const response = await fetch("/api/admin/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, status }) });
    const result = await response.json();
    if (response.ok) setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row)); else setError(result.error || "Unable to save task.");
  }
  async function updateTask(task: Task, values: Record<string, unknown>) {
    const response = await fetch("/api/admin/tasks", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id, ...values }) });
    const result = await response.json();
    if (response.ok) setTasks(current => current.map(row => row.id === task.id ? { ...row, ...values } : row)); else setError(result.error || "Unable to update task.");
  }
  async function updateReleaseDate(song: Song, release_date: string) {
    const response = await fetch("/api/admin/song-tracker", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ songId: song.id, release_date: release_date || null }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to save the release date. Apply the release-date migration first."); return; }
    setReleases(current => current.map(row => row.id === song.id ? { ...row, release_date: release_date || null } : row));
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/admin/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, song_id: draft.business_area === "unreleased_song" ? draft.song_id : null }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to create task."); return; }
    setDraft(blank); setAdding(false); await load();
  }
  const calendarMonths = useMemo(() => {
    if (calendarScale === "week") return [new Date(month)];
    const count = calendarScale === "year" ? 12 : calendarScale === "quarter" ? 3 : 1;
    const startMonth = calendarScale === "year" ? 0 : calendarScale === "quarter" ? Math.floor(month.getMonth() / 3) * 3 : month.getMonth();
    return Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), startMonth + index, 1));
  }, [month, calendarScale]);
  function shiftCalendar(direction: -1 | 1) {
    if (calendarScale === "week") {
      setMonth(current => { const next = new Date(current); next.setDate(next.getDate() + direction * 7); return next; });
      return;
    }
    const monthsToShift = calendarScale === "year" ? 12 : calendarScale === "quarter" ? 3 : 1;
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + direction * monthsToShift, 1));
  }
  function renderCalendarMonth(calendarMonth: Date) {
    const weekStart = new Date(calendarMonth);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const daysInMonth = calendarScale === "week" ? 7 : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const firstWeekday = calendarScale === "week" ? 0 : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
    const compact = calendarScale === "quarter" || calendarScale === "year";
    return <div key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`} className="min-w-0">
      {compact && <h4 className="mb-2 text-sm font-bold text-white/75">{calendarMonth.toLocaleDateString(undefined, { month: "long" })}</h4>}
      <div className="grid grid-cols-7">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <div key={day} className="border-b border-white/[.06] p-1.5 text-center text-[.6rem] text-white/40">{day}</div>)}
        {Array.from({ length: firstWeekday }, (_, index) => <div key={`blank-${index}`} className={`border-b border-r border-white/[.05] bg-black/10 ${compact ? "min-h-10" : "min-h-24 sm:min-h-28"}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = calendarScale === "week" ? new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index) : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const items = visible.filter(task => task.due_at === key);
          const dayReleases = releases.filter(song => song.release_date?.slice(0, 10) === key);
          const dayContent = postedContent.filter(item => (item.published_at?.slice(0, 10) || item.planned_date) === key && (scope === "all" || scope !== "chxndler_studio") && `${item.title} ${item.song_name || ""}`.toLowerCase().includes(search.toLowerCase()));
          const total = items.length + dayReleases.length + dayContent.length;
          const limit = compact ? 1 : 3;
          return <div key={key} className={`${compact ? "min-h-10 p-0.5" : "min-h-24 p-1.5 sm:min-h-28"} border-b border-r border-white/[.05]`}><span className="text-[.6rem] text-white/45">{calendarScale === "week" ? day.getDate() : index + 1}</span><div className="mt-0.5 space-y-0.5">
            {dayReleases.slice(0, limit).map(song => <Link key={`release-${song.id}`} href={`/admin/songs/${song.id}`} title={`Song released: ${song.title}`} aria-label={`Song released: ${song.title}`} className="block truncate rounded bg-[#F2EF1D]/10 px-1 py-0.5 text-[.58rem] leading-4 text-[#F2EF1D]">★ {song.title}</Link>)}
            {items.slice(0, Math.max(0, limit - dayReleases.length)).map(task => <button key={task.id} type="button" title={`Open task: ${task.title}${task.song ? ` · ${task.song.title}` : ""}`} aria-label={`Open task: ${task.title}${task.song ? ` · ${task.song.title}` : ""}`} onClick={() => { setFocusTaskId(task.id); setView("agenda"); }} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[.55rem] hover:brightness-125 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white ${task.status === "done" ? "opacity-55 line-through" : ""}`} style={{ background: `${categoryColors[task.task_category || "admin"]}20`, color: categoryColors[task.task_category || "admin"] }}>{task.status === "done" ? "✓ " : ""}{task.title}</button>)}
            {dayContent.slice(0, Math.max(0, limit - dayReleases.length - items.length)).map(item => <div key={`posted-${item.id}`} title={`Content posted${item.song_name ? ` · ${item.song_name}` : ""}`} className="truncate rounded bg-[#68D7B0]/15 px-1 py-0.5 text-[.55rem] text-[#68D7B0]">Posted · {item.title}</div>)}
            {total > limit && <small className="text-[.55rem] text-white/40">+{total - limit} more</small>}
          </div></div>;
        })}
      </div>
    </div>;
  }
  const calendarTitle = calendarScale === "week" ? (() => {
    const start = new Date(month);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  })() : calendarScale === "year" ? String(month.getFullYear()) : calendarScale === "quarter" ? `Q${Math.floor(month.getMonth() / 3) + 1} ${month.getFullYear()}` : month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return <section>
    <div className="mb-6"><article className="flex min-h-40 flex-col justify-between gap-6 rounded-2xl border border-[#F2EF1D]/35 bg-[#F2EF1D]/[.05] p-5 sm:flex-row sm:items-center"><div><span className="text-xs font-black tracking-[.14em] text-[#F2EF1D]">OPEN TASKS</span><strong className="mt-3 block text-5xl font-black leading-none tabular-nums text-[#F2EF1D]">{pendingCount}</strong><span className="mt-2 block text-sm text-white/55">Tasks that still need attention.</span></div><div role="group" aria-label={`Open tasks by category: ${categoryBreakdown.map(({ category, count }) => `${category}, ${count}`).join("; ")}`} className="grid min-h-32 flex-1 grid-cols-3 items-end gap-6 border-t border-white/10 pt-4 sm:max-w-md sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><div className="col-span-3 self-start text-[.65rem] font-bold tracking-[.14em] text-white/45">OPEN TASKS BY CATEGORY</div>{categoryBreakdown.map(({ category, count, color }) => { const maxCount = Math.max(1, ...categoryBreakdown.map(item => item.count)); const height = Math.max(3, count / maxCount * 72); const selected = quickFilter?.key === "category" && quickFilter.value === category; return <button key={category} type="button" aria-pressed={selected} aria-label={`Filter tasks by ${category}: ${count} open`} onClick={() => setQuickFilter(selected ? null : { key: "category", value: category })} className={`flex h-24 flex-col items-center justify-end gap-1 rounded-md transition hover:bg-white/[.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected ? "bg-white/[.06]" : ""}`}><span className="text-xs font-bold tabular-nums text-white/70">{count}</span><span className="w-full max-w-14 rounded-t-md" style={{ height, backgroundColor: color }}/><span className="text-[.6rem] font-bold uppercase tracking-wider text-white/55">{category}</span></button>; })}</div></article></div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Tasks and Songs" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"/><select value={scope} onChange={event => setScope(event.target.value as Scope | "all")} className="rounded-lg border border-white/10 bg-[#111116] p-3 text-sm"><option value="all">All Work</option>{scopes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button onClick={() => setAdding(value => !value)} className="rounded-lg bg-[#ff3ea5] px-4 py-2 text-sm font-bold text-black">{adding ? "Close" : "+ Add Task"}</button><button onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Refresh</button></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111116] p-3"><div className="flex gap-1 rounded-lg bg-black/30 p-1">{(["calendar", "agenda", "board", "timeline"] as const).map(item => <button key={item} type="button" onClick={() => setView(item)} className={`rounded-md px-3 py-2 text-sm font-semibold uppercase ${view === item ? "bg-white/10 text-white" : "text-white/45"}`}>{item === "agenda" ? "List" : item === "calendar" ? "Calendar" : item === "board" ? "Board" : "Timeline"}</button>)}</div>{view !== "timeline" && <div className="flex flex-wrap gap-3 text-sm">{Object.entries(categoryColors).map(([key, color]) => <span key={key} className="flex items-center gap-1.5 capitalize text-white/60"><i className="h-2 w-2 rounded-full" style={{ background: color }}/>{key}</span>)}{view === "calendar" && <><span className="flex items-center gap-1.5 text-white/60"><i className="h-2 w-2 rounded-full bg-[#F2EF1D]"/>Release</span><span className="flex items-center gap-1.5 text-white/60"><i className="h-2 w-2 rounded-full bg-[#68D7B0]"/>Posted</span></>}</div>}</div>
    {focusTaskId && <div className="mb-3 flex items-center gap-2 text-xs text-white/50"><span>Linked task</span><button type="button" onClick={() => { setFocusTaskId(""); const params = new URLSearchParams(window.location.search); params.delete("task"); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }} className="font-semibold text-[#FD52AF]">Show all tasks</button></div>}
    {adding && <form onSubmit={create} className="mb-5 grid gap-3 rounded-xl border border-[#ff3ea5]/25 bg-white/[.03] p-4 sm:grid-cols-2"><label className="text-xs text-white/55">Business<select value={draft.business_area} onChange={event => setDraft(current => ({ ...current, business_area: event.target.value as Scope }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white">{scopes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{draft.business_area === "unreleased_song" && <label className="text-xs text-white/55">Song<select required value={draft.song_id} onChange={event => setDraft(current => ({ ...current, song_id: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"><option value="">Choose a song</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>}<label className="text-xs text-white/55">Color category<select value={draft.task_category} onChange={event => setDraft(current => ({ ...current, task_category: event.target.value as typeof current.task_category }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"><option value="music">Music</option><option value="editing">Editing</option><option value="admin">Admin</option></select></label><label className="text-xs text-white/55">Priority<select value={draft.priority} onChange={event => setDraft(current => ({ ...current, priority: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></label><label className="text-xs text-white/55 sm:col-span-2">Task<input required maxLength={180} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white" placeholder="What needs to happen?"/></label><label className="text-xs text-white/55 sm:col-span-2">Notes<textarea rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white"/></label><label className="text-xs text-white/55">Schedule date<input type="date" value={draft.due_at} onChange={event => setDraft(current => ({ ...current, due_at: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-black p-2.5 text-sm text-white"/></label><button className="justify-self-start self-end rounded-lg border border-white/20 px-4 py-2 text-sm">Create task</button></form>}
    {error && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="rounded-xl border border-white/10 p-8 text-center text-white/45">Loading tasks…</p> : <>
      {view === "calendar" && <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-[#111116]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><button type="button" onClick={() => shiftCalendar(-1)} aria-label="Previous calendar period" className="rounded-lg border border-white/10 px-3 py-1.5">←</button><h3 className="font-bold">{calendarTitle}</h3><div className="flex items-center gap-3"><label className="sr-only" htmlFor="calendar-zoom">Calendar time period</label><select id="calendar-zoom" aria-label="Calendar time period" value={calendarScale} onChange={event => setCalendarScale(event.target.value as typeof calendarScale)} className="rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm"><option value="week">Week</option><option value="month">Month</option><option value="quarter">Quarter</option><option value="year">Year</option></select><button type="button" onClick={() => shiftCalendar(1)} aria-label="Next calendar period" className="rounded-lg border border-white/10 px-3 py-1.5">→</button></div></div><div className={`grid gap-4 p-4 ${calendarScale === "year" ? "grid-cols-2 xl:grid-cols-4" : calendarScale === "quarter" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>{calendarMonths.map(renderCalendarMonth)}</div></div>}
      {view === "calendar" && releases.some(song => !song.release_date) && <section className="mb-4 rounded-xl border border-[#FD52AF]/20 bg-[#111116] p-4"><h3 className="font-semibold text-[#ff9dcd]">Released songs without a release date</h3>{!releaseDatesAvailable && <p className="mt-1 text-xs text-amber-200/80">Release dates are unavailable until the database migration is applied: supabase/migrations/20261130_add_song_release_date.sql</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{releases.filter(song => !song.release_date).map(song => <label key={song.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"><Link href={`/admin/songs/${song.id}`} className="min-w-0 truncate text-sm text-white/80 hover:text-[#ff9dcd]">{song.title}</Link><input aria-label={`Release date for ${song.title}`} type="date" disabled={!releaseDatesAvailable} value="" onChange={event => void updateReleaseDate(song, event.target.value)} className="w-36 shrink-0 rounded-md border border-white/10 bg-[#09090c] px-2 py-1.5 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-40" /></label>)}</div></section>}
      {view !== "calendar" && view !== "timeline" && <div className="mb-2 grid grid-cols-2 gap-2 px-2 sm:grid-cols-[minmax(9rem,1fr)_minmax(15rem,2fr)_9rem_8rem_9rem] sm:gap-3 sm:px-4">{([ ["song", "Song"], ["task", "Task"], ["date", "Date"], ["category", "Category"], ["status", "Status"] ] as const).map(([key, label])=><div key={key} className="relative"><button type="button" onClick={()=>setActiveColumn(activeColumn===key?null:key)} aria-expanded={activeColumn===key} className={`text-left text-lg font-bold uppercase tracking-wider transition hover:text-white ${activeColumn===key?"text-white":"text-white/65"}`}>{label}<span className="ml-1 text-[.65rem] text-[#FD52AF]">{activeColumn===key?"⌃":"⌄"}</span></button>{activeColumn===key&&<div className="absolute left-0 top-full z-30 mt-2 min-w-56 rounded-lg border border-white/10 bg-[#15151b] p-3 shadow-xl"><label className="mb-2 block text-xs font-semibold text-white/70" htmlFor={`task-filter-${key}`}>Filter {label.toLowerCase()}</label><select id={`task-filter-${key}`} autoFocus value={quickFilter?.key===key?quickFilter.value:""} onChange={event=>{setQuickFilter(event.target.value?{key,value:event.target.value}:null);setActiveColumn(null);}} className="w-full rounded-md border border-white/10 bg-[#09090c] px-3 py-2 text-sm text-white"><option value="">All {key === "task" ? "tasks" : `${key}s`}</option>{filterOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>{quickFilter&&<button type="button" onClick={()=>{setQuickFilter(null);setActiveColumn(null);}} className="mt-2 rounded-md px-2 py-1 text-xs font-semibold text-[#ff9dcd] hover:bg-white/[.05]">Clear filter</button>}</div>}</div>)}</div>}
      {view !== "calendar" && (view === "timeline" ? <section className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-[#111116]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3"><div className="order-2 flex flex-wrap gap-1 rounded-lg bg-black/30 p-1">{(["all", "year", "quarter", "month", "week", "day"] as const).map(scale => <button key={scale} type="button" onClick={() => { setTimelineScale(scale); if (scale !== "all") setTimelineAnchor(new Date()); }} aria-pressed={timelineScale === scale} className={"rounded-md px-3 py-2 text-xs font-semibold " + (timelineScale === scale ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}>{scale === "all" ? "All" : scale === "year" ? "Year" : scale === "quarter" ? "Quarter" : scale === "month" ? "Month" : scale === "week" ? "Week" : "Day"}</button>)}</div><div className="order-1 flex items-center gap-2"><button type="button" disabled={timelineScale === "all"} onClick={() => shiftTimeline(-1)} aria-label="Previous timeline period" className="rounded-md border border-white/10 px-3 py-1.5 text-sm disabled:opacity-35">←</button><span className="min-w-40 text-center text-base font-extrabold tracking-wide text-white/90 sm:text-lg">{timelineRange?.label || "ALL DATES"}</span><button type="button" disabled={timelineScale === "all"} onClick={() => shiftTimeline(1)} aria-label="Next timeline period" className="rounded-md border border-white/10 px-3 py-1.5 text-sm disabled:opacity-35">→</button></div></div><div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_15rem]"><div className="min-w-0"><div className="relative h-9 border-b border-white/10">{Array.from({ length: 5 }, (_, index) => { const tickTime = timelineDomain.start + (timelineDomain.end - timelineDomain.start) * index / 4; const tickDate = new Date(index === 4 ? tickTime - 86400000 : tickTime); const tickLabel = timelineScale === "year" || timelineScale === "all" ? tickDate.toLocaleDateString(undefined, { month: "short", year: timelineScale === "all" ? "2-digit" : undefined }) : timelineScale === "quarter" ? tickDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : tickDate.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }); const positionStyle = index === 0 ? { left: "0%" } : index === 4 ? { right: "0%" } : { left: (index * 25) + "%" }; return <div key={index} className="absolute inset-y-0 flex flex-col justify-end text-[.58rem] text-white/40" style={positionStyle}><span className="mb-1 -translate-x-1/2 whitespace-nowrap">{tickLabel}</span><i className="absolute bottom-0 h-2 border-l border-white/15"/></div>; })}</div><div className="relative mt-3" style={{ height: timelinePlot.height }}><span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-white/20"/>{Array.from({ length: 5 }, (_, index) => <i key={index} aria-hidden="true" className="absolute inset-y-0 border-l border-white/[.05]" style={index === 0 ? { left: "0%" } : index === 4 ? { right: "0%" } : { left: (index * 25) + "%" }}/>)}<svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 1000 ${timelinePlot.height}`} preserveAspectRatio="none">{timelinePlot.connections.map(connection => <polyline key={connection.id} points={connection.points.map(point => `${point.x},${point.y}`).join(" " )} fill="none" stroke={connection.color} strokeOpacity=".55" strokeWidth="2" />)}</svg>{timelineVisibleEvents.map(event => { const point = timelinePlot.points.get(event.id)!; const color = timelineEventColors.get(event.id) || "#ffffff"; const nearRightEdge = point.x / 10 > 78; return <div key={event.id} className="group absolute z-10 h-0 w-0" style={{ left: point.x / 10 + "%", top: point.y }}><button type="button" aria-label={event.date + ": " + event.title + ", " + event.detail + ", " + (event.done ? "Completed" : "Open")} className="absolute left-0 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#111116] shadow-[0_0_0_1px_rgba(255,255,255,.25)] transition hover:z-20 hover:scale-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ backgroundColor: color }} /><span role="tooltip" className={"pointer-events-none invisible absolute bottom-2 z-30 w-56 rounded-lg border bg-[#17171c] p-3 text-left opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 " + (nearRightEdge ? "right-3" : "left-3")} style={{ borderColor: color + "80" }}><strong className="block text-xs font-bold text-white">{event.title}</strong><span className="mt-1 block text-[.68rem] text-white/65">{event.date} · {event.detail}</span><span className="mt-1 block text-[.62rem] font-semibold uppercase tracking-wide" style={{ color }}>{event.kind === "task" ? event.done ? "Completed task" : "Open task" : event.kind === "release" ? "Song release" : "Posted content"}</span></span></div>; })}{!timelineVisibleEvents.length && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/45">No dated events in this period.</p>}</div></div><aside className="min-w-0 rounded-lg border border-white/[.08] bg-black/15 p-3"><h3 className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-white/55">Song Key</h3><div className="max-h-52 space-y-1 overflow-y-auto lg:max-h-80">{timelineRows.map(row => <div key={row.id} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/70" title={row.title}><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: timelineEventColors.get(row.events[0]?.id) || "#ffffff" }}/><span className="min-w-0 flex-1 truncate">{row.title}</span><span className="tabular-nums text-white/35">{row.events.length}</span></div>)}{!timelineRows.length && <p className="px-2 py-1.5 text-xs text-white/40">No songs in this period.</p>}</div></aside></div></section> : <div className="space-y-2">{(view === "board" ? statusOptions.flatMap(status => [{ status, rows: visible.filter(task => task.status === status) }]) : [{ status: "", rows: visible }]).map(group=><section key={group.status || "all"}>{group.status&&<h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-white/45">{statusNames[group.status]} · {group.rows.length}</h3>}{group.rows.filter(task=>!task.parent_task_id).map(task=>{const children=visible.filter(child=>child.parent_task_id===task.id);const category=task.task_category||"admin";return <article key={task.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3 sm:p-4" style={{borderLeftColor:categoryColors[category],borderLeftWidth:3}}><div className="grid gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(15rem,2fr)_9rem_8rem_9rem] sm:items-start"><div className="min-w-0"><span className="mb-1 block text-[.58rem] font-bold uppercase tracking-wider text-white/40 sm:hidden">Song</span>{task.song?<Link href={`/admin/songs/${task.song.id}`} className="block truncate text-base font-semibold hover:text-white" style={{ color: categoryColors[category] }}>{task.song.title}</Link>:<span className="text-base text-white/70">—</span>}</div><div className="min-w-0"><span className="mb-1 block text-[.58rem] font-bold uppercase tracking-wider text-white/50 sm:hidden">Task</span><h3 className="text-base font-bold text-white">{task.title}</h3>{task.description&&task.description!=="Part of this song’s master schedule."&&<p className="mt-1 text-sm text-white/65">{task.description}</p>}{task.content&&<Link href={`/admin/songs/${task.content.song_id}?tab=content&content=${task.content.id}`} className="mt-2 inline-block text-sm text-[#ff76bd]">{task.content.title} · Open content ↗</Link>}</div><label className="min-w-0"><span className="mb-1 block text-[.58rem] font-bold uppercase tracking-wider text-white/50 sm:hidden">Date</span><input aria-label={`Schedule ${task.title}`} type="date" value={task.due_at||""} onChange={event=>void updateTask(task,{due_at:event.target.value||null})} className="w-full rounded-md border border-white/10 bg-[#111116] px-2 py-2 text-xs text-white/75"/></label><label className="min-w-0"><span className="mb-1 block text-[.58rem] font-bold uppercase tracking-wider text-white/50 sm:hidden">Category · click to change</span><select aria-label={`Change category for ${task.title}`} value={category} onChange={event=>void updateTask(task,{task_category:event.target.value})} className="w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-[#111116] px-2 py-2 text-xs font-semibold capitalize outline-none focus:border-white/30" style={{color:categoryColors[category]}}><option value="music">Music</option><option value="editing">Editing</option><option value="admin">Admin</option></select></label><label className="min-w-0"><span className="mb-1 block text-[.58rem] font-bold uppercase tracking-wider text-white/50 sm:hidden">Status</span><select value={task.status} onChange={event=>void saveStatus(task,event.target.value)} aria-label={`Status for ${task.title}`} className="w-full rounded-lg border border-white/10 bg-[#111116] p-2 text-xs">{statusOptions.map(status=><option key={status} value={status}>{statusNames[status]}</option>)}</select></label></div>{children.length>0&&<div className="mt-3 space-y-2 border-l border-white/10 pl-3 sm:ml-[calc(20%+0.6rem)] sm:pl-4">{children.map(child=>{const childCategory=child.task_category||"admin";return <div key={child.id} className="grid gap-2 rounded-lg bg-black/20 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem_8rem_9rem] sm:items-center"><span className="min-w-0 text-sm text-white/75">↳ {child.title}</span><input aria-label={`Schedule ${child.title}`} type="date" value={child.due_at||""} onChange={event=>void updateTask(child,{due_at:event.target.value||null})} className="w-full rounded-md border border-white/10 bg-[#111116] px-2 py-1.5 text-xs"/><select aria-label={`Change category for ${child.title}`} value={childCategory} onChange={event=>void updateTask(child,{task_category:event.target.value})} className="w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-[#111116] px-2 py-1.5 text-xs font-semibold capitalize" style={{color:categoryColors[childCategory]}}><option value="music">Music</option><option value="editing">Editing</option><option value="admin">Admin</option></select><select value={child.status} onChange={event=>void saveStatus(child,event.target.value)} className="w-full rounded-md border border-white/10 bg-[#111116] p-1.5 text-xs" aria-label={`Status for ${child.title}`}>{statusOptions.map(status=><option key={status} value={status}>{statusNames[status]}</option>)}</select></div>})}</div>}</article>})}</section>)}{view !== "calendar"&&visible.filter(t=>!t.due_at&&!t.parent_task_id).length>0&&<p className="pt-3 text-xs text-white/40">Unscheduled tasks appear here until you give them a date.</p>}{visible.length===0&&<p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">{tasks.length===0?"No tasks yet. Apply the task templates migration to seed every song.":"No tasks match this view."}</p>}</div>)}
    </>}
  </section>;
}
