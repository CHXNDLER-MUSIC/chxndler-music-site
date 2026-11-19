"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type ContentItem = {
  id: string; source_row: number | null; legacy_x5: boolean | null; title: string; category: string | null;
  sub_category: string | null; song_name: string | null; recorded: boolean | null; edited: boolean | null;
  post_ready: boolean | null; media_type: string | null; purpose: string | null; source_url: string | null;
  media_url: string | null; script: string | null; planned_date: string | null; planned_time: string | null;
  caption: string | null; text_on_screen: string | null; hidden: boolean | null; hashtags: string | null;
  legacy_date_time: string | null; editor: string | null; legacy_minutes: string | null; published: boolean | null;
  is_placeholder_date: boolean; is_sample: boolean;
};

function value(text: string | null | undefined) { return text?.trim() || "—"; }
function Flag({ value: flag }: { value: boolean | null }) {
  if (flag === null) return <span className="text-white/35" aria-label="Unset">—</span>;
  return flag
    ? <span className="inline-flex items-center justify-center text-emerald-300" role="img" aria-label="Yes"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 4 4 8-8"/></svg></span>
    : <span className="inline-flex items-center justify-center text-red-400" role="img" aria-label="No"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15"/></svg></span>;
}

export default function ContentTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/content-items", { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load content.");
      if (active) setItems(body.items || []);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load content."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => [...new Set(items.map(item => item.category).filter((item): item is string => !!item))].sort(), [items]);
  const subCategories = useMemo(() => [...new Set(items.map(item => item.sub_category).filter((item): item is string => !!item))].sort(), [items]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const contains = (actual: string | null, filter: string) => !filter || (actual || "").toLowerCase().includes(filter.toLowerCase());
    const matchesFlag = (actual: boolean | null, filter: string) => !filter || (filter === "yes" ? actual === true : filter === "no" ? actual === false : actual === null);
    return items.filter(item => {
      const details = [item.caption, item.text_on_screen, item.script, item.hashtags, item.source_url, item.media_url, item.purpose, item.editor].join(" ").toLowerCase();
      return (!query || [item.title, item.song_name, item.category, item.sub_category, item.caption].some(part => part?.toLowerCase().includes(query)))
        && contains(item.title, filters.title || "")
        && contains(item.song_name, filters.song || "")
        && (!filters.category || item.category === filters.category)
        && (!filters.sub_category || item.sub_category === filters.sub_category)
        && contains(item.planned_date, filters.date || "")
        && contains(item.planned_time, filters.time || "")
        && matchesFlag(item.recorded, filters.recorded || "")
        && matchesFlag(item.edited, filters.edited || "")
        && matchesFlag(item.published, filters.published || "")
        && (!filters.details || details.includes(filters.details.toLowerCase()));
    });
  }, [items, search, filters]);

  const updateFilter = (key: string, filter: string) => setFilters(current => ({ ...current, [key]: filter }));
  const textFilter = (key: string, label: string, placeholder = "Filter") => {
    const source = key === "title" ? items.map(item => item.title) : key === "song" ? items.map(item => item.song_name || "") : key === "date" ? items.map(item => item.planned_date || "") : key === "time" ? items.map(item => item.planned_time || "") : [];
    const query = (filters[key] || "").toLowerCase();
    const options = [...new Set(source.filter(item => item && (!query || item.toLowerCase().includes(query))))].slice(0, 15);
    const listId = `content-filter-${key}`;
    return <><input type="search" list={listId} value={filters[key] || ""} onChange={event => updateFilter(key, event.target.value)} aria-label={`Filter by ${label}`} placeholder={placeholder} className="mt-2 w-full min-w-24 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[.68rem] font-normal normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-violet-300/40"/><datalist id={listId}>{options.map(option => <option key={option} value={option}/>)}</datalist></>;
  };
  const selectFilter = (key: string, label: string, options: string[]) => <select value={filters[key] || ""} onChange={event => updateFilter(key, event.target.value)} aria-label={`Filter by ${label}`} className="mt-2 w-full min-w-24 rounded-md border border-white/10 bg-[#111116] px-2 py-1.5 text-[.68rem] font-normal normal-case tracking-normal text-white outline-none focus:border-violet-300/40"><option value="">All</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  const flagFilter = (key: string, label: string) => <select value={filters[key] || ""} onChange={event => updateFilter(key, event.target.value)} aria-label={`Filter by ${label}`} className="mt-2 w-full min-w-20 rounded-md border border-white/10 bg-[#111116] px-2 py-1.5 text-[.68rem] font-normal normal-case tracking-normal text-white outline-none focus:border-violet-300/40"><option value="">All</option><option value="yes">✓ Yes</option><option value="no">✕ No</option><option value="null">— Unset</option></select>;
  const heading = (key: string, label: string, control: ReactNode) => <><button type="button" aria-expanded={activeFilter === key} onClick={() => setActiveFilter(current => current === key ? null : key)} className="inline-flex items-center gap-1 text-left font-bold hover:text-white">{label}<span aria-hidden="true" className="text-white/35">{activeFilter === key ? "⌃" : "⌄"}</span></button>{activeFilter === key && control}</>;

  return <section className="space-y-4">
    <header className="flex flex-wrap items-end gap-3">
      <div className="mr-auto"><p className="text-[.65rem] font-bold uppercase tracking-[.2em] text-violet-300">Publishing library</p><h1 className="mt-1 text-2xl font-black">Content</h1><p className="mt-1 text-sm text-white/45">{loading ? "Loading content…" : `${visible.length} of ${items.length} items`}</p></div>
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, song, caption…" aria-label="Search content" className="w-full rounded-lg border border-white/10 bg-[#111116] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-violet-300/40 sm:w-72" />
      <button type="button" onClick={() => { setFilters({}); setSearch(""); setActiveFilter(null); }} className="rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/65 transition hover:border-white/20 hover:text-white">Clear filters</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111116]">
      <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-[#17171c] text-[.65rem] uppercase tracking-wider text-white/45"><tr>
          <th className="min-w-44 border-b border-white/10 px-3 py-3 text-left">{heading("title", "Title", textFilter("title", "title"))}</th>
          <th className="min-w-36 border-b border-white/10 px-3 py-3 text-left">{heading("song", "Song", textFilter("song", "song"))}</th>
          <th className="min-w-32 border-b border-white/10 px-3 py-3 text-left">{heading("category", "Category", selectFilter("category", "category", categories))}</th>
          <th className="min-w-36 border-b border-white/10 px-3 py-3 text-left">{heading("sub_category", "Sub-category", selectFilter("sub_category", "sub-category", subCategories))}</th>
          <th className="min-w-40 border-b border-white/10 px-3 py-3 text-left">{heading("date", "Planned date", textFilter("date", "planned date", "YYYY-MM-DD"))}</th>
          <th className="min-w-28 border-b border-white/10 px-3 py-3 text-left">{heading("time", "Time", textFilter("time", "time"))}</th>
          <th className="min-w-24 border-b border-white/10 px-3 py-3 text-left">{heading("recorded", "Recorded", flagFilter("recorded", "recorded"))}</th>
          <th className="min-w-24 border-b border-white/10 px-3 py-3 text-left">{heading("edited", "Edited", flagFilter("edited", "edited"))}</th>
          <th className="min-w-24 border-b border-white/10 px-3 py-3 text-left">{heading("published", "Published", flagFilter("published", "published"))}</th>
          <th className="min-w-32 border-b border-white/10 px-3 py-3 text-left">{heading("details", "Details", textFilter("details", "details"))}</th>
        </tr></thead>
        <tbody className="divide-y divide-white/[.06]">
          {visible.map(item => <tr key={item.id} className="align-top hover:bg-white/[.025]">
            <td className="max-w-72 px-3 py-3 font-semibold text-white">{item.title}{item.is_sample && <span className="ml-2 rounded bg-amber-300/10 px-1.5 py-0.5 text-[.6rem] text-amber-200">Sample</span>}</td>
            <td className="whitespace-nowrap px-3 py-3 text-white/75">{value(item.song_name)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-white/75">{value(item.category)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-white/55">{value(item.sub_category)}</td>
            <td className="whitespace-nowrap px-3 py-3 text-white/55">{value(item.planned_date)}{item.is_placeholder_date && <span className="ml-1 text-amber-200/65">· placeholder</span>}</td>
            <td className="whitespace-nowrap px-3 py-3 text-white/55">{value(item.planned_time)}</td>
            <td className="px-3 py-3"><Flag value={item.recorded}/></td><td className="px-3 py-3"><Flag value={item.edited}/></td><td className="px-3 py-3"><Flag value={item.published}/></td>
            <td className="px-3 py-3"><details className="max-w-md"><summary className="cursor-pointer whitespace-nowrap text-xs font-semibold text-violet-200">View details</summary><div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/65">
              <p><b className="text-white/85">Caption:</b><br/><span className="whitespace-pre-wrap">{value(item.caption)}</span></p>
              <p><b className="text-white/85">Text on screen:</b><br/><span className="whitespace-pre-wrap">{value(item.text_on_screen)}</span></p>
              <p><b className="text-white/85">Script:</b><br/><span className="whitespace-pre-wrap">{value(item.script)}</span></p>
              <p><b className="text-white/85">Hashtags:</b><br/><span className="whitespace-pre-wrap">{value(item.hashtags)}</span></p>
              <p><b className="text-white/85">Source URL:</b> {item.source_url ? <a className="break-all text-violet-200 underline" href={item.source_url} target="_blank" rel="noreferrer">{item.source_url}</a> : "—"}</p>
              <p><b className="text-white/85">Media URL:</b> {item.media_url ? <a className="break-all text-violet-200 underline" href={item.media_url} target="_blank" rel="noreferrer">{item.media_url}</a> : "—"}</p>
              <p><b className="text-white/85">Type / purpose / editor:</b> {value(item.media_type)} · {value(item.purpose)} · {value(item.editor)}</p>
              <p><b className="text-white/85">Hidden / post ready / legacy X5:</b> {String(item.hidden ?? "—")} / {String(item.post_ready ?? "—")} / {String(item.legacy_x5 ?? "—")}</p>
              <p><b className="text-white/85">Source row:</b> {item.source_row ?? "—"}</p>
            </div></details></td>
          </tr>)}
          {!loading && visible.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-white/40">{items.length ? "No content matches those filters." : "No content items found."}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-white/35">Content items are read-only here. Song and category are shown in separate columns.</p>
  </section>;
}
