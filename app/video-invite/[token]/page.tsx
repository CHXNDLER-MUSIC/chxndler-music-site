"use client";

import { use, useEffect, useState } from "react";

type Deliverable = { title?: string; description?: string; format?: string; dueDate?: string; status?: string; deliveryLink?: string; revisionFeedback?: string };
type Project = { id: string; status: string; public_concept: string; songs?: { title: string }; workspace: { creative?: Record<string, unknown>; production?: { shootDate?: string; requirements?: unknown[]; deliverables?: Deliverable[] }; collaboration?: { proposal?: Record<string, unknown>; discussion?: Array<{ author?: string; text?: string; createdAt?: string }> } } };
const tabs = ["Creative", "Production", "Collaboration"] as const;
type Tab = typeof tabs[number];

export default function VideographerInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ project: Project; recipientEmail: string } | null>(null);
  const [error, setError] = useState("Loading private project…");
  const [tab, setTab] = useState<Tab>("Creative");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [proposal, setProposal] = useState({ approach: "", schedule: "", budget: "", deliverables: "", revisions: "" });

  useEffect(() => {
    fetch(`/api/music-video-invites?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Invite not found."); setData(result); setError(""); })
      .catch(reason => setError(reason.message || "Unable to load this invite."));
  }, [token]);

  async function update(payload: Record<string, unknown>) {
    setFeedback("Saving…");
    const response = await fetch(`/api/music-video-invites?token=${encodeURIComponent(token)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setFeedback(result.error || "Could not save."); return false; }
    const refreshed = await fetch(`/api/music-video-invites?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then(r => r.json());
    if (refreshed.project) setData(refreshed);
    setFeedback("Saved"); return true;
  }

  if (!data) return <main className="grid min-h-screen place-items-center bg-[#09090c] p-6 text-center text-white/60">{error}</main>;
  const { project } = data, workspace = project.workspace || {}, creative = workspace.creative || {}, production = workspace.production || {}, collaboration = workspace.collaboration || {};
  const deliverables = production.deliverables || [], discussion = collaboration.discussion || [];
  const card = "rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-7";
  const label = "text-xs font-bold uppercase tracking-[.18em] text-white/40";
  const value = (key: string) => { const item = creative[key]; return typeof item === "string" ? item : ""; };
  return <main className="min-h-screen bg-[#09090c] px-4 py-8 text-white sm:px-8 sm:py-12"><div className="mx-auto max-w-5xl">
    <header className="mb-8"><p className="text-xs font-bold tracking-[.25em] text-[#ff3ea5]">CHXNDLER · PRIVATE VIDEO PROJECT</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{project.songs?.title} <span className="text-white/50">music video</span></h1><p className="mt-3 text-sm text-white/45">Invitation for {data.recipientEmail} · {project.status}</p><p className="mt-6 max-w-3xl whitespace-pre-wrap leading-7 text-white/75">{project.public_concept || "Creative brief in progress."}</p></header>
    <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-2">{tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`min-w-32 flex-1 rounded-xl px-4 py-3 text-sm font-bold ${tab === item ? "bg-[#ff3ea5] text-black" : "text-white/60 hover:bg-white/5"}`}>{item}</button>)}</nav>
    {tab === "Creative" && <div className="grid gap-4 sm:grid-cols-2">{[["Song meaning", "songMeaning"], ["Themes", "themes"], ["Audience feeling", "audienceFeeling"], ["Important lyrics", "importantLyrics"], ["Visual direction", "visualDirection"], ["Concept", "vision"], ["Story", "story"], ["Visual aesthetic", "aesthetic"]].filter(([, key]) => value(key)).map(([title, key]) => <section className={card} key={key}><h2 className={label}>{title}</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-white/80">{value(key)}</p></section>)}</div>}
    {tab === "Production" && <div className="space-y-4"><section className={card}><h2 className={label}>Shoot date</h2><p className="mt-3 text-lg">{production.shootDate || "To be scheduled"}</p></section><section className={card}><h2 className={label}>Production requirements</h2>{production.requirements?.length ? <ul className="mt-4 list-inside list-disc space-y-2 text-white/75">{production.requirements.map((item: any, i) => <li key={i}>{typeof item === "string" ? item : item.title || item.name || "Production item"}</li>)}</ul> : <p className="mt-3 text-white/50">Requirements are being prepared.</p>}</section><section className={card}><h2 className={label}>Deliverables</h2><div className="mt-4 space-y-4">{deliverables.length ? deliverables.map((item, index) => <DeliverableCard key={index} item={item} index={index} onSubmit={link => update({ action: "deliverable", index, deliveryLink: link })} />) : <p className="text-white/50">Deliverables will be added to the approved scope.</p>}</div></section></div>}
    {tab === "Collaboration" && <div className="space-y-4"><section className={card}><h2 className={label}>Submit a production proposal</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{([["Creative approach", "approach"], ["Schedule / shoot days", "schedule"], ["Budget and additional expenses", "budget"], ["Deliverables", "deliverables"], ["Included revisions", "revisions"]] as const).map(([title, key]) => <label key={key} className="text-sm text-white/60">{title}<textarea value={proposal[key]} onChange={event => setProposal(current => ({ ...current, [key]: event.target.value }))} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[#ff3ea5]" /></label>)}</div><button onClick={() => update({ action: "proposal", proposal })} className="mt-4 rounded-xl bg-[#ff3ea5] px-5 py-3 font-bold text-black">Submit proposal</button></section><section className={card}><h2 className={label}>Project discussion</h2><div className="mt-4 space-y-3">{discussion.map((item, index) => <article key={index} className="rounded-xl bg-black/25 p-4"><p className="text-xs text-[#ff7cc2]">{item.author || "Project owner"} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</p><p className="mt-2 whitespace-pre-wrap text-white/80">{item.text}</p></article>)}{!discussion.length && <p className="text-white/45">Start a project-specific discussion.</p>}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><textarea value={message} onChange={event => setMessage(event.target.value)} rows={2} placeholder="Ask a question or share an idea…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-[#ff3ea5]" /><button onClick={async () => { if (await update({ action: "comment", text: message })) setMessage(""); }} className="rounded-xl border border-white/15 px-5 py-3 font-bold">Send</button></div></section></div>}
    <p className="mt-6 min-h-5 text-sm text-white/45" aria-live="polite">{feedback}</p><p className="mt-3 text-xs text-white/30">Private project link · Access can be revoked by the project owner.</p>
  </div></main>;
}

function DeliverableCard({ item, index, onSubmit }: { item: Deliverable; index: number; onSubmit: (link: string) => Promise<boolean> }) {
  const [link, setLink] = useState(item.deliveryLink || ""), [status, setStatus] = useState("");
  return <article className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{item.title || `Deliverable ${index + 1}`}</h3><p className="mt-1 text-sm text-white/50">{[item.description, item.format, item.dueDate && `Due ${item.dueDate}`].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{item.status || "Pending"}</span></div>{item.revisionFeedback && <p className="mt-3 rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">Revision requested: {item.revisionFeedback}</p>}<div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={link} onChange={event => setLink(event.target.value)} placeholder="HTTPS delivery link" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" /><button onClick={async () => setStatus(await onSubmit(link) ? "Submitted" : "Could not submit")} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold">Submit delivery</button></div>{status && <p className="mt-2 text-xs text-white/50">{status}</p>}</article>;
}
