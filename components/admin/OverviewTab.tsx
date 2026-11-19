"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Song = { id: string; title: string; is_released: boolean; ready_for_collab?: boolean; workflow_stage?: string; next_action?: string; requests?: Array<{ status: string }> };
type Task = { id: string; title: string; status: string; due_at: string | null; song?: { id: string; title: string } | null };

export default function OverviewTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outreachCount, setOutreachCount] = useState(0);
  const [syncCount, setSyncCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/song-tracker", { cache: "no-store" }).then(async r => r.ok ? r.json() : Promise.reject(new Error("Songs unavailable"))),
      fetch("/api/admin/tasks", { cache: "no-store" }).then(async r => r.ok ? r.json() : Promise.reject(new Error("Tasks unavailable"))),
      fetch("/api/admin/song-outreach", { cache: "no-store" }).then(async r => r.ok ? r.json() : { records: [] }),
      fetch("/api/admin/sync-workspace", { cache: "no-store" }).then(async r => r.ok ? r.json() : { opportunities: [] }),
    ]).then(([songData, taskData, outreachData, syncData]) => {
      if (!active) return;
      setSongs(songData.songs || []);
      setTasks(taskData.tasks || []);
      setOutreachCount((outreachData.records || []).filter((row: { complete?: boolean }) => !row.complete).length);
      setSyncCount((syncData.opportunities || []).filter((row: { status?: string }) => !["Licensed", "Passed"].includes(row.status || "")).length);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load overview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openTasks = useMemo(() => tasks.filter(task => task.status !== "done"), [tasks]);
  const overdue = openTasks.filter(task => task.due_at && task.due_at < new Date().toISOString().slice(0, 10));
  const continueSongs = songs.filter(song => !song.is_released && (openTasks.some(task => task.song?.id === song.id) || song.workflow_stage && song.workflow_stage !== "Idea"));
  const metrics = [
    ["Total songs", songs.length, "Songs"],
    ["Released", songs.filter(song => song.is_released).length, "Songs"],
    ["In progress", songs.filter(song => !song.is_released && song.workflow_stage && song.workflow_stage !== "Idea").length, "Songs"],
    ["Ready for collab", songs.filter(song => song.ready_for_collab).length, "Songs"],
    ["Active outreach", outreachCount, "Outreach"],
    ["Active sync", syncCount, "Sync"],
  ] as const;

  return <section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map(([label, value, tab]) => <Link key={label} href={`/admin?view=${tab.toLowerCase()}`} className="rounded-xl border border-white/10 bg-[#111116] p-4 transition hover:border-[#FD52AF]/40"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{loading ? "—" : value}</p></Link>)}
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">{error}. Apply the workspace migration if this is a new setup.</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-white/10 bg-[#111116] p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Continue working</h2><Link href="/admin?view=songs" className="text-sm text-[#FD52AF]">Songs</Link></div>{continueSongs.slice(0, 5).map(song => <Link key={song.id} href={`/admin/songs/${song.id}`} className="mt-3 flex items-center justify-between gap-3 border-t border-white/[.07] pt-3"><span className="min-w-0 truncate font-medium">{song.title}</span><span className="shrink-0 text-xs text-white/45">{song.next_action || song.workflow_stage || "Open workspace"}</span></Link>)}{!loading && continueSongs.length === 0 && <p className="mt-4 text-sm text-white/50">No active song work right now.</p>}</section>
      <section className="rounded-xl border border-white/10 bg-[#111116] p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Needs attention</h2><Link href="/admin?view=tasks" className="text-sm text-[#FD52AF]">Tasks</Link></div>{overdue.slice(0, 5).map(task => <Link key={task.id} href={task.song ? `/admin/songs/${task.song.id}` : "/admin?view=tasks"} className="mt-3 flex items-center justify-between gap-3 border-t border-white/[.07] pt-3"><span className="min-w-0 truncate">{task.title}{task.song ? ` · ${task.song.title}` : ""}</span><span className="shrink-0 text-xs text-amber-200">Overdue</span></Link>)}{!loading && overdue.length === 0 && <p className="mt-4 text-sm text-white/50">Nothing overdue.</p>}</section>
      <section className="rounded-xl border border-white/10 bg-[#111116] p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Recent activity</h2><Link href="/admin?view=outreach" className="text-sm text-[#FD52AF]">Outreach</Link></div>{openTasks.slice(0, 5).map(task => <Link key={task.id} href={task.song ? `/admin/songs/${task.song.id}` : "/admin?view=tasks"} className="mt-3 block border-t border-white/[.07] pt-3"><span className="font-medium">{task.title}</span><span className="ml-2 text-xs text-white/40">{task.song?.title || "General"}</span></Link>)}{!loading && openTasks.length === 0 && <p className="mt-4 text-sm text-white/50">No recent task activity.</p>}</section>
    </div>
  </section>;
}
