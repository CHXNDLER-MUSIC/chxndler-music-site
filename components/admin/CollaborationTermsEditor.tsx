"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const fields = ["ownership", "royalties", "credits", "release_rights"] as const;
const labels: Record<typeof fields[number], string> = { ownership: "Ownership", royalties: "Royalties", credits: "Credits", release_rights: "Release rights" };
type Terms = Record<string, string>;

export default function CollaborationTermsEditor() {
  const [draft, setDraft] = useState<Terms>({});
  const [message, setMessage] = useState("");
  const savedTerms = useRef<Terms | null>(null);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<Terms>({});
  draftRef.current = draft;

  const save = useCallback(async (terms: Terms) => {
    if (saving.current) return;
    saving.current = true;
    let didSave = false;
    setMessage("Saving changes…");
    try {
      const response = await fetch("/api/admin/collaboration-terms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ terms }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Could not save terms."); return; }
      savedTerms.current = terms;
      didSave = true;
      setMessage("Changes saved.");
    } catch {
      setMessage("Could not save terms. Changes will retry when you edit again.");
    } finally {
      saving.current = false;
      const latestDraft = draftRef.current;
      if (didSave && savedTerms.current && fields.every(field => (latestDraft[field] || "").trim()) && fields.some(field => (latestDraft[field] || "").trim() !== (savedTerms.current?.[field] || "").trim())) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void save(draftRef.current); }, 800);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/collaboration-terms", { cache: "no-store" })
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!mounted) return;
        if (!response.ok) { setMessage(data.error || "Could not load agreement terms."); return; }
        const active = (data.versions || []).find((item: { active: boolean }) => item.active) || data.versions?.[0];
        if (active?.terms) { savedTerms.current = active.terms; setDraft(active.terms); }
      })
      .catch(() => { if (mounted) setMessage("Could not load agreement terms."); });
    return () => { mounted = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    const saved = savedTerms.current;
    if (!saved || fields.every(field => (draft[field] || "").trim() === (saved[field] || "").trim())) return;
    if (fields.some(field => !(draft[field] || "").trim())) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(draft); }, 800);
  }, [draft, save]);

  return <details className="mb-5 rounded-xl border border-white/10 bg-white/[.02] p-4">
    <summary className="cursor-pointer font-semibold">Agreement Templates</summary>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {fields.map(field => <label key={field} className="text-xs text-white/55">Standard {labels[field]} terms<textarea value={draft[field] || ""} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white"/></label>)}
    </div>
    {message && <p role="status" className="mt-2 text-xs text-white/60">{message}</p>}
  </details>;
}
