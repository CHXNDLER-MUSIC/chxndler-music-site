"use client";

import { useState } from "react";
import SongTracker from "@/components/admin/SongTracker";
import PracticeTab from "@/components/admin/PracticeTab";
import PlaylistsTab from "@/components/admin/PlaylistsTab";
import SyncOutreachTab from "@/components/admin/SyncOutreachTab";
import GigOutreachTab from "@/components/admin/GigOutreachTab";
import YouTubeTab from "@/components/admin/YouTubeTab";
import IndustryConnectionsTab from "@/components/admin/IndustryConnectionsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import TasksTab from "@/components/admin/TasksTab";

export default function AdminTabs() {
  const [tab, setTab] = useState<"tasks" | "songs" | "practice" | "playlists" | "youtube" | "sync" | "gigs" | "connections" | "finance">("songs");
  const [practiceSong, setPracticeSong] = useState("");
  return <>
    <div role="tablist" aria-label="Admin workspaces" className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-[#292930] bg-[#111116] p-2">
      {([["songs", "Songs"], ["tasks", "Tasks"], ["practice", "Practice"], ["playlists", "Outreach"], ["youtube", "YouTube"], ["sync", "Sync ideas"], ["gigs", "Gig outreach"], ["connections", "Industry connections"], ["finance", "Finance"]] as const).map(([id, label]) => <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition ${tab === id ? "bg-[#FC54AF] text-[#160711] shadow-[0_4px_18px_rgba(252,84,175,.2)]" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>{label}</button>)}
    </div>
    {tab === "tasks" ? <TasksTab /> : tab === "songs" ? <SongTracker /> : tab === "practice" ? <PracticeTab campaignSong={practiceSong} /> : tab === "youtube" ? <YouTubeTab /> : tab === "sync" ? <SyncOutreachTab /> : tab === "gigs" ? <GigOutreachTab /> : tab === "connections" ? <IndustryConnectionsTab /> : tab === "finance" ? <FinanceTab /> : <PlaylistsTab onPractice={song => { setPracticeSong(song); setTab("practice"); }} />}
  </>;
}
