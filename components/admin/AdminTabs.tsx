"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SongTracker from "@/components/admin/SongTracker";
import FinanceTab from "@/components/admin/FinanceTab";
import TasksTab from "@/components/admin/TasksTab";
import OverviewTab from "@/components/admin/OverviewTab";
import OutreachWorkspace from "@/components/admin/OutreachWorkspace";
import ContentTab from "@/components/admin/ContentTab";
import { sfx } from "@/lib/sfx";

type Tab = "overview" | "songs" | "content" | "outreach" | "tasks" | "finance";
type IconName = "overview" | "songs" | "content" | "outreach" | "tasks" | "finance" | "more";
const primary: Array<[Tab, string, IconName]> = [["overview", "Overview", "overview"], ["songs", "Songs", "songs"], ["content", "Content", "content"], ["tasks", "Tasks", "tasks"], ["outreach", "Outreach", "outreach"]];
const more: Array<[Tab, string, IconName]> = [["finance", "Finance", "finance"]];

function TabIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    songs: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    content: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    outreach: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    tasks: <><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    finance: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h2m6 0h2"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="admin-tab-icon h-5 w-5 shrink-0">{paths[name]}</svg>;
}

export default function AdminTabs() {
  const [tab, setTab] = useState<Tab>("overview");
  const [outreachSection, setOutreachSection] = useState<"pitches" | "templates" | "sync" | "collabs" | "gigs" | "contacts">("pitches");
  const [outreachSongId, setOutreachSongId] = useState("");
  const [outreachRequestId, setOutreachRequestId] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const readLocation = () => {
      const params = new URLSearchParams(window.location.search), requested = params.get("view")?.toLowerCase();
      const match = [...primary, ...more].find(([id]) => id === requested);
      const legacySubtab = requested === "sync" ? "sync" : requested === "gigs" ? "gigs" : requested === "connections" ? "contacts" : null;
      if (match) setTab(match[0]); else if (legacySubtab) setTab("outreach");
      const requestedSubtab = params.get("section")?.toLowerCase();
      const section = legacySubtab || requestedSubtab;
      if (["pitches", "templates", "gigs", "sync", "collabs", "contacts"].includes(section || "")) setOutreachSection(section as "pitches" | "templates" | "sync" | "collabs" | "gigs" | "contacts");
      setOutreachSongId(params.get("song") || "");
      setOutreachRequestId(params.get("request") || "");
      if (legacySubtab) { params.set("view", "outreach"); params.set("section", legacySubtab); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); }
    };
    readLocation(); window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!moreRoot.current?.contains(event.target as Node)) setMoreOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMoreOpen(false); };
    document.addEventListener("pointerdown", closeOutside); document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [moreOpen]);
  const choose = (value: Tab) => {
    if (value !== tab) { try { sfx.play("change-channel", 0.3); } catch {} }
    setTab(value); setMoreOpen(false);
    const params = new URLSearchParams(window.location.search); params.set("view", value);
    if (value === "outreach") params.set("section", outreachSection); else params.delete("section");
    window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
  };
  return <>
    <nav aria-label="Music admin" className="admin-tabs mb-6 flex items-center gap-1 rounded-xl border border-white/10 bg-[#111116] p-1.5">
      {primary.map(([id, label, icon]) => <button key={id} type="button" data-tab={id} aria-current={tab === id ? "page" : undefined} onClick={() => choose(id)} className="admin-tab min-w-0 flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:px-4"><TabIcon name={icon}/><span>{label}</span></button>)}
      <div className="relative shrink-0" ref={moreRoot}>
        <button type="button" data-tab={more.some(([id]) => id === tab) ? tab : "more"} aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen(value => !value)} className="admin-tab admin-more rounded-lg px-3 py-2.5 text-sm font-semibold transition"><TabIcon name="more"/><span className="admin-more-label">More <span aria-hidden="true">⌄</span></span></button>
        {moreOpen && <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-52 rounded-xl border border-white/10 bg-[#15151b] p-1.5 shadow-2xl">{more.map(([id, label, icon]) => <button key={id} type="button" role="menuitem" data-tab={id} onClick={() => choose(id)} className={`admin-menu-item ${tab === id ? "is-active" : ""}`}><TabIcon name={icon}/><span>{label}</span></button>)}</div>}
      </div>
    </nav>
    {tab === "overview" ? <OverviewTab /> : tab === "songs" ? <SongTracker /> : tab === "content" ? <ContentTab /> : tab === "tasks" ? <TasksTab /> : tab === "outreach" ? <OutreachWorkspace initialSection={outreachSection} onSectionChange={section => { setOutreachSection(section); const params = new URLSearchParams(window.location.search); params.set("view", "outreach"); params.set("section", section); window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`); }} initialSongId={outreachSongId} requestId={outreachRequestId} /> : <FinanceTab />}
    <style jsx>{`
      .admin-tab-icon{width:1.25rem;height:1.25rem;flex:none}
      .admin-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.25rem;color:rgba(255,255,255,.56);white-space:nowrap}
      .admin-more-label{display:flex;align-items:center;gap:.2rem}
      .admin-tab[data-tab="overview"]{--tab-accent:#59c9ff}
      .admin-tab[data-tab="songs"]{--tab-accent:#fd52af}
      .admin-tab[data-tab="content"]{--tab-accent:#a78bfa}
      .admin-tab[data-tab="outreach"]{--tab-accent:#ffc857}
      .admin-tab[data-tab="tasks"]{--tab-accent:#68d7b0}
      .admin-tab[data-tab="finance"]{--tab-accent:#82aaff}
      .admin-tab[data-tab="more"]{--tab-accent:#fd52af}
      .admin-tab[aria-current="page"],.admin-more[aria-expanded="true"]{color:var(--tab-accent);background:color-mix(in srgb,var(--tab-accent) 12%,#111116);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tab-accent) 30%,transparent)}
      .admin-tab:hover{color:var(--tab-accent,#fff);background:color-mix(in srgb,var(--tab-accent,#fff) 8%,#111116)}
      .admin-menu-item{display:flex;align-items:center;gap:.65rem;width:100%;border:0;border-radius:.6rem;background:transparent;padding:.7rem .75rem;text-align:left;color:rgba(255,255,255,.68);font-size:.875rem}
      .admin-menu-item[data-tab="tasks"]{--tab-accent:#68d7b0}.admin-menu-item[data-tab="finance"]{--tab-accent:#82aaff}
      .admin-menu-item:hover,.admin-menu-item.is-active{color:var(--tab-accent);background:color-mix(in srgb,var(--tab-accent) 10%,#15151b)}
      @media(max-width:420px){.admin-tab{gap:.3rem;font-size:.72rem}.admin-more{padding-inline:.55rem}.admin-tab-icon{width:1.1rem;height:1.1rem}}
    `}</style>
  </>;
}
