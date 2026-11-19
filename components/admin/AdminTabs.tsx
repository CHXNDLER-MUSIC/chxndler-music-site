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
  const [tab, setTab] = useState<"tasks" | "songs" | "practice" | "playlists" | "youtube" | "sync" | "gigs" | "connections" | "finance">("tasks");
  return <>
    <div className="mb-6 flex gap-2 border-b border-white/10">
      {([["tasks", "Task tracker"], ["songs", "Song tracker"], ["practice", "Practice"], ["playlists", "Playlists"], ["youtube", "YouTube"], ["sync", "Sync ideas"], ["gigs", "Gig outreach"], ["connections", "Industry connections"], ["finance", "Finance"]] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? "border-[#ff3ea5] text-white" : "border-transparent text-white/45"}`}>{label}</button>)}
    </div>
    {tab === "tasks" ? <TasksTab /> : tab === "songs" ? <SongTracker /> : tab === "practice" ? <PracticeTab /> : tab === "youtube" ? <YouTubeTab /> : tab === "sync" ? <SyncOutreachTab /> : tab === "gigs" ? <GigOutreachTab /> : tab === "connections" ? <IndustryConnectionsTab /> : tab === "finance" ? <FinanceTab /> : <PlaylistsTab />}
  </>;
}
