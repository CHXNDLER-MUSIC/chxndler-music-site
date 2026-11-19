"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useState } from "react";

type Category = "Software" | "Merch" | "Advertising";
type FinanceRecord = {
  id: string; category: Category; name: string; vendor: string; amount: number | null;
  amount_kind: "recurring_rate" | "estimate" | "budget"; frequency: "monthly" | "annual" | "one_time" | null;
  quantity: number | null; status: string; payment_status: "unknown" | "unpaid" | "paid";
  actual_amount: number | null; paid_on: string | null; renewal_date: string | null;
  campaign_start: string | null; campaign_end: string | null; related_song_id: string | null;
  website: string; purchase_url: string; thumbnail_url: string; description: string; notes: string;
};
type Draft = Omit<FinanceRecord, "id">;
const categories: (Category | "All")[] = ["All", "Software", "Merch", "Advertising"];
const emptyDraft = (): Draft => ({ category: "Software", name: "", vendor: "", amount: null, amount_kind: "recurring_rate", frequency: "monthly", quantity: null, status: "active", payment_status: "unknown", actual_amount: null, paid_on: null, renewal_date: null, campaign_start: null, campaign_end: null, related_song_id: null, website: "", purchase_url: "", thumbnail_url: "", description: "", notes: "" });
const cash = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const dateLabel = (date: string | null) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const actual = (r: FinanceRecord) => r.payment_status === "paid" && r.paid_on && r.actual_amount !== null ? r.actual_amount : null;
const categoryTone: Record<Category, string> = { Software: "text-sky-300 bg-sky-300/10", Merch: "text-amber-300 bg-amber-300/10", Advertising: "text-violet-300 bg-violet-300/10" };
const statusTone: Record<string, string> = { active: "text-emerald-300", running: "text-emerald-300", received: "text-emerald-300", paid: "text-emerald-300", ordered: "text-sky-300", planned: "text-amber-200", needs_review: "text-amber-200", unknown: "text-white/50", unpaid: "text-white/60", cancelled: "text-white/35", completed: "text-white/60" };

export default function FinanceTab() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [period, setPeriod] = useState<"month" | "year" | "all">("month");
  const [recurringView, setRecurringView] = useState<"monthly" | "annual">("monthly");
  const [filter, setFilter] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const response = await fetch("/api/admin/finance", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load finance records.");
      setRecords(payload.records || []);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load finance records."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const inPeriod = useCallback((date: string | null) => {
    if (!date || period === "all") return Boolean(date);
    const d = new Date(`${date}T12:00:00`), now = new Date();
    return period === "month" ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() : d.getFullYear() === now.getFullYear();
  }, [period]);
  const paidRecords = useMemo(() => records.filter(r => actual(r) !== null && inPeriod(r.paid_on)), [records, inPeriod]);
  const totals = useMemo(() => {
    const software = records.filter(r => r.category === "Software" && r.status === "active" && r.amount_kind === "recurring_rate" && r.amount !== null);
    const monthly = software.reduce((sum, r) => sum + (r.frequency === "monthly" ? r.amount! : r.frequency === "annual" ? r.amount! / 12 : 0), 0);
    const annual = software.reduce((sum, r) => sum + (r.frequency === "monthly" ? r.amount! * 12 : r.frequency === "annual" ? r.amount! : 0), 0);
    const spent = (category?: Category) => paidRecords.filter(r => !category || r.category === category).reduce((sum, r) => sum + (actual(r) || 0), 0);
    return { monthly, annual, merch: spent("Merch"), advertising: spent("Advertising"), total: spent() };
  }, [records, paidRecords]);
  const breakdown = useMemo(() => ([{ category: "Software" as Category, value: paidRecords.filter(r => r.category === "Software").reduce((s, r) => s + (actual(r) || 0), 0) }, { category: "Merch" as Category, value: totals.merch }, { category: "Advertising" as Category, value: totals.advertising }]), [paidRecords, totals]);
  const maxBreakdown = Math.max(...breakdown.map(x => x.value), 0);
  const filtered = useMemo(() => records.filter(r => {
    const emptyAdPlaceholder = r.category === "Advertising" && r.amount === null && r.actual_amount === null && !r.campaign_start && !r.campaign_end && !r.notes && !r.description;
    return (!emptyAdPlaceholder || filter !== "All") && (filter === "All" || r.category === filter) && `${r.name} ${r.vendor} ${r.description} ${r.notes}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => a.name.localeCompare(b.name)), [records, filter, query]);
  const openNew = () => setEditor({ id: null, draft: emptyDraft() });
  const openEdit = (record: FinanceRecord) => { const { id, ...draft } = record; setEditor({ id, draft }); };

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editor) return;
    setSaving(true); setNotice("");
    const payload = { ...editor.draft, amount: editor.draft.amount === null || String(editor.draft.amount) === "" ? null : Number(editor.draft.amount), actual_amount: editor.draft.actual_amount === null || String(editor.draft.actual_amount) === "" ? null : Number(editor.draft.actual_amount), quantity: editor.draft.quantity === null || String(editor.draft.quantity) === "" ? null : Number(editor.draft.quantity) };
    try {
      const response = await fetch("/api/admin/finance", { method: editor.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editor.id ? { id: editor.id, ...payload } : payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save.");
      setEditor(null); setNotice("Expense saved."); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editor?.id || !window.confirm("Delete this expense? This cannot be undone.")) return;
    setSaving(true);
    try { const response = await fetch("/api/admin/finance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editor.id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to delete."); setEditor(null); setNotice("Expense deleted."); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to delete."); }
    finally { setSaving(false); }
  }

  const activeRecurringCount = records.filter(r => r.category === "Software" && r.status === "active" && r.amount_kind === "recurring_rate" && r.frequency && r.amount !== null).length;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingRenewals = records.filter(r => r.category === "Software" && r.status === "active" && r.renewal_date && r.renewal_date >= today).sort((a, b) => a.renewal_date!.localeCompare(b.renewal_date!));
  const periodLabel = period === "month" ? "This month" : period === "year" ? "This year" : "All time";
  const recurringDisplay = recurringView === "monthly" ? totals.monthly : totals.annual;

  return <section className="space-y-7 text-white">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[11px] font-bold tracking-[.22em] text-[#FD52AF]">STUDIO COSTS</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Finance</h2><p className="mt-1 text-sm text-white/55">Your music business, at a glance.</p></div>
      <button onClick={openNew} className="rounded-lg bg-[#FD52AF] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff77c0] focus:outline-none focus:ring-2 focus:ring-[#FD52AF] focus:ring-offset-2 focus:ring-offset-black">+ Add Expense</button>
    </header>

    <section aria-label="Financial overview">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Financial overview</h3><div className="flex rounded-lg bg-white/[.05] p-1" aria-label="Recurring cost view">{(["monthly", "annual"] as const).map(v => <button key={v} onClick={() => setRecurringView(v)} className={`rounded-md px-2.5 py-1 text-xs capitalize ${recurringView === v ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}>{v}</button>)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={`Recurring costs · ${recurringView}`} value={activeRecurringCount ? `${cash(recurringDisplay)} / ${recurringView === "monthly" ? "mo" : "yr"}` : "Not set up"} hint={activeRecurringCount ? `${activeRecurringCount} active subscriptions · commitments, not payments` : "Set subscriptions to Active to include them"} accent="pink" />
        <Kpi label="Merch spending" value={cash(totals.merch)} hint={`${periodLabel} · verified payments`} onClick={() => setFilter("Merch")} accent="amber" />
        <Kpi label="Advertising spending" value={cash(totals.advertising)} hint={`${periodLabel} · verified payments`} onClick={() => setFilter("Advertising")} accent="violet" />
        <Kpi label="Total spent" value={cash(totals.total)} hint={`${periodLabel} · dated payments only`} onClick={() => setFilter("All")} accent="blue" />
      </div>
    </section>

    {upcomingRenewals.length > 0 && <details className="rounded-xl border border-white/[.08] bg-[#111114] px-4 py-3"><summary className="cursor-pointer text-xs font-semibold text-white/75">Upcoming renewals <span className="ml-1 font-normal text-white/40">{upcomingRenewals.length}</span></summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{upcomingRenewals.map(r => <button key={r.id} onClick={() => openEdit(r)} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] px-3 py-2 text-left text-xs hover:bg-white/[.06]"><span className="truncate">{r.vendor || r.name}</span><span className="shrink-0 text-white/50">{dateLabel(r.renewal_date)}</span></button>)}</div></details>}

    <section className="rounded-xl border border-white/[.08] bg-[#111114] p-4 sm:p-5" aria-label="Spending breakdown">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Spending breakdown</h3><p className="mt-1 text-xs text-white/45">Actual recorded payments · {periodLabel.toLowerCase()}</p></div><div className="flex gap-1 rounded-lg bg-white/[.04] p-1">{(["month", "year", "all"] as const).map(v => <button key={v} onClick={() => setPeriod(v)} className={`rounded-md px-2.5 py-1.5 text-xs ${period === v ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}>{v === "month" ? "This Month" : v === "year" ? "This Year" : "All Time"}</button>)}</div></div>
      {paidRecords.length ? <div className="space-y-3">{breakdown.map(({ category, value }) => <div key={category} className="grid grid-cols-[100px_1fr_auto] items-center gap-3 text-xs"><span className="text-white/65">{category === "Merch" ? "Merchandise" : category}</span><div className="h-2 overflow-hidden rounded-full bg-white/[.07]"><div className={`h-full rounded-full transition-[width] duration-300 ${category === "Software" ? "bg-sky-300" : category === "Merch" ? "bg-amber-300" : "bg-violet-300"}`} style={{ width: `${maxBreakdown ? Math.max(value / maxBreakdown * 100, value ? 2 : 0) : 0}%` }} /></div><span className="min-w-20 text-right font-medium tabular-nums">{cash(value)}</span></div>)}</div> : <div className="rounded-lg bg-white/[.025] px-4 py-5 text-sm text-white/55"><span className="font-medium text-white/75">No payment history for {periodLabel.toLowerCase()}.</span> Record a payment with its date to build an actual spending chart. Listed rates and planned costs are not treated as spending.</div>}
    </section>

    <section aria-label="Expense tracker">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Expense tracker</h3><p className="mt-1 text-xs text-white/45">Search, review, and update your business costs.</p></div><button onClick={() => void load()} className="text-xs text-white/55 transition hover:text-white">Refresh</button></div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="finance-search">Search expenses</label><input id="finance-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search item or vendor" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111114] px-3 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-[#FD52AF]/60" />
        <div className="flex gap-1 rounded-lg bg-white/[.04] p-1">{categories.map(category => <button key={category} onClick={() => setFilter(category)} className={`rounded-md px-3 py-1.5 text-xs ${filter === category ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>{category}</button>)}</div>
      </div>
      {notice && <p role="status" className="mb-3 text-xs text-[#FD52AF]">{notice}</p>}
      {loadError ? <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/[.06] p-4 text-sm text-rose-100">{loadError}<button className="ml-3 underline" onClick={() => void load()}>Try again</button></div> : loading ? <div className="rounded-xl border border-white/[.08] bg-[#111114] p-6 text-sm text-white/50">Loading expenses…</div> : filtered.length === 0 ? <div className="rounded-xl border border-white/[.08] bg-[#111114] p-6 text-sm text-white/50">{records.length ? "No expenses match your search." : "No expenses yet. Add one to start tracking."}</div> : <div className="overflow-hidden rounded-xl border border-white/[.08] bg-[#111114]">
        <div className="hidden grid-cols-[minmax(180px,1.4fr)_110px_110px_130px_120px_100px] gap-3 border-b border-white/[.08] px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/40 md:grid"><span>Item / Vendor</span><span>Category</span><span>Cost</span><span>Frequency / Qty</span><span>Status</span><span>Date</span></div>
        <div>{filtered.map(record => <button key={record.id} onClick={() => openEdit(record)} className="grid w-full grid-cols-1 gap-2 border-b border-white/[.06] px-4 py-3 text-left transition last:border-0 hover:bg-white/[.025] focus:outline-none focus-visible:bg-white/[.04] md:grid-cols-[minmax(180px,1.4fr)_110px_110px_130px_120px_100px] md:items-center md:gap-3">
          <span className="flex min-w-0 items-center gap-2.5">{record.thumbnail_url && <img src={record.thumbnail_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" loading="lazy" />}<span className="min-w-0"><span className="block truncate text-sm font-medium">{record.name}</span><span className="block truncate text-xs text-white/45">{record.vendor || "Vendor not set"}</span></span></span>
          <span><span className="md:hidden mr-2 text-[10px] uppercase text-white/35">Category</span><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${categoryTone[record.category]}`}>{record.category}</span></span>
          <span className="text-sm tabular-nums"><span className="md:hidden mr-2 text-[10px] uppercase text-white/35">Cost</span>{actual(record) !== null ? cash(actual(record)!) : record.amount !== null ? cash(record.amount) : "—"}<span className="ml-1 text-[10px] text-white/40">{actual(record) !== null ? "paid" : record.amount_kind === "budget" ? "budget" : record.amount_kind === "recurring_rate" ? "rate" : "estimate"}</span></span>
          <span className="text-xs text-white/60"><span className="md:hidden mr-2 text-[10px] uppercase text-white/35">Frequency / Qty</span>{record.frequency === "monthly" ? "Monthly" : record.frequency === "annual" ? "Annual" : record.quantity !== null ? `Qty ${record.quantity}${record.quantity > 0 && record.amount !== null && record.category === "Merch" ? ` · ${cash(record.amount / record.quantity)}/ea` : ""}` : "One-time"}</span>
          <span className={`text-xs capitalize ${statusTone[record.payment_status === "paid" ? "paid" : record.status] || "text-white/60"}`}><span className="md:hidden mr-2 text-[10px] uppercase text-white/35">Status</span>{record.payment_status === "paid" ? "Paid" : record.status.replaceAll("_", " ")}{record.payment_status !== "paid" && record.payment_status !== "unknown" ? ` · ${record.payment_status}` : ""}</span>
          <span className="text-xs text-white/50"><span className="md:hidden mr-2 text-[10px] uppercase text-white/35">Date</span>{record.paid_on ? dateLabel(record.paid_on) : record.renewal_date ? `Renews ${dateLabel(record.renewal_date)}` : "—"}</span>
        </button>)}</div>
      </div>}
      <p className="mt-2 text-[11px] text-white/35">Only payments with a recorded amount and date count toward actual spending.</p>
    </section>

    {editor && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setEditor(null); }}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="finance-editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#141417] p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#FD52AF]">EXPENSE TRACKER</p><h3 id="finance-editor-title" className="mt-1 text-lg font-semibold">{editor.id ? "Edit expense" : "Add expense"}</h3></div><button type="button" disabled={saving} onClick={() => setEditor(null)} aria-label="Close" className="rounded-md px-2 py-1 text-xl text-white/50 hover:bg-white/5 hover:text-white">×</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Expense name" required><input required maxLength={180} value={editor.draft.name} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, name: e.target.value } })} /></Field>
          <Field label="Category"><select value={editor.draft.category} onChange={e => { const category = e.target.value as Category; const draft = { ...editor.draft, category, amount_kind: category === "Software" ? "recurring_rate" as const : category === "Advertising" ? "budget" as const : "estimate" as const, frequency: category === "Software" ? "monthly" as const : "one_time" as const, status: category === "Software" ? "active" : "planned" }; setEditor({ ...editor, draft }); }}><option>Software</option><option>Merch</option><option>Advertising</option></select></Field>
          <Field label={editor.draft.category === "Advertising" ? "Planned budget" : editor.draft.category === "Software" ? "Recurring amount" : "Estimated total cost"}><input type="number" min="0" step="0.01" value={editor.draft.amount ?? ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, amount: e.target.value === "" ? null : Number(e.target.value) } })} /></Field>
          <Field label="Status"><select value={editor.draft.status} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, status: e.target.value } })}>{statusOptions(editor.draft.category).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select></Field>
          {editor.draft.category === "Software" && <Field label="Billing frequency"><select value={editor.draft.frequency || "monthly"} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, frequency: e.target.value as Draft["frequency"] } })}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></Field>}
          {editor.draft.category === "Merch" && <Field label="Quantity"><input type="number" min="0" step="1" value={editor.draft.quantity ?? ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, quantity: e.target.value === "" ? null : Number(e.target.value) } })} />{editor.draft.amount !== null && editor.draft.quantity && editor.draft.quantity > 0 && <span className="mt-1 block text-[11px] text-white/45">Unit cost {cash(editor.draft.amount / editor.draft.quantity)}</span>}</Field>}
          {editor.draft.category === "Advertising" && <><Field label="Actual spend"><input type="number" min="0" step="0.01" value={editor.draft.actual_amount ?? ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, actual_amount: e.target.value === "" ? null : Number(e.target.value), payment_status: e.target.value ? "paid" : editor.draft.payment_status } })} /></Field><Field label="Payment date"><input type="date" value={editor.draft.paid_on || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, paid_on: e.target.value || null, payment_status: e.target.value ? "paid" : editor.draft.payment_status } })} /></Field><Field label="Payment status"><select value={editor.draft.payment_status} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, payment_status: e.target.value as Draft["payment_status"] } })}><option value="unknown">Unknown</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></Field></>}
        </div>
        {editor.draft.category !== "Advertising" && <div className="mt-4 rounded-lg border border-white/[.07] bg-white/[.02] p-3"><p className="mb-2 text-xs font-medium text-white/75">Payment record</p><div className="grid gap-3 sm:grid-cols-3"><Field label="Payment status"><select value={editor.draft.payment_status} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, payment_status: e.target.value as Draft["payment_status"] } })}><option value="unknown">Unknown</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></Field><Field label="Actual amount"><input type="number" min="0" step="0.01" value={editor.draft.actual_amount ?? ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, actual_amount: e.target.value === "" ? null : Number(e.target.value), payment_status: e.target.value ? "paid" : editor.draft.payment_status } })} /></Field><Field label="Paid date"><input type="date" value={editor.draft.paid_on || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, paid_on: e.target.value || null, payment_status: e.target.value ? "paid" : editor.draft.payment_status } })} /></Field></div><p className="mt-2 text-[10px] text-white/40">Actual spending requires both a verified amount and payment date.</p></div>}
        <details className="mt-4 rounded-lg border border-white/[.07] px-3 py-2"><summary className="cursor-pointer text-xs font-medium text-white/65">More details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Vendor / platform"><input value={editor.draft.vendor} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, vendor: e.target.value } })} /></Field>
          <Field label={editor.draft.category === "Merch" ? "Purchase link" : "Website"}><input type="url" value={editor.draft.category === "Merch" ? editor.draft.purchase_url : editor.draft.website} onChange={e => setEditor({ ...editor, draft: editor.draft.category === "Merch" ? { ...editor.draft, purchase_url: e.target.value } : { ...editor.draft, website: e.target.value } })} /></Field>
          {editor.draft.category === "Software" && <Field label="Renewal date"><input type="date" value={editor.draft.renewal_date || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, renewal_date: e.target.value || null } })} /></Field>}
          {editor.draft.category === "Advertising" && <><Field label="Related song"><input value={editor.draft.related_song_id || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, related_song_id: e.target.value || null } })} placeholder="Song ID (optional)" /></Field><Field label="Campaign start"><input type="date" value={editor.draft.campaign_start || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, campaign_start: e.target.value || null } })} /></Field><Field label="Campaign end"><input type="date" value={editor.draft.campaign_end || ""} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, campaign_end: e.target.value || null } })} /></Field></>}
          <Field label="Description"><textarea rows={2} value={editor.draft.description} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, description: e.target.value } })} /></Field><Field label="Notes"><textarea rows={2} value={editor.draft.notes} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, notes: e.target.value } })} /></Field>
          {editor.draft.category === "Merch" && <><Field label="Order status"><select value={editor.draft.status} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, status: e.target.value } })}><option value="planned">Planned</option><option value="ordered">Ordered</option><option value="received">Received</option><option value="cancelled">Cancelled</option><option value="active">Idea</option></select></Field><Field label="Thumbnail URL"><input type="url" value={editor.draft.thumbnail_url} onChange={e => setEditor({ ...editor, draft: { ...editor.draft, thumbnail_url: e.target.value } })} /></Field></>}
        </div></details>
        {notice && <p role="alert" className="mt-3 text-xs text-rose-200">{notice}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div>{editor.id && <button type="button" disabled={saving} onClick={() => void remove()} className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50">Delete expense</button>}</div><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => setEditor(null)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5">Cancel</button><button disabled={saving} className="rounded-lg bg-[#FD52AF] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff77c0] disabled:opacity-50">{saving ? "Saving…" : "Save expense"}</button></div></div>
      </form>
    </div>}
  </section>;
}

function statusOptions(category: Category): [string, string][] {
  if (category === "Software") return [["active", "Active"], ["needs_review", "Needs review"], ["planned", "Planned"], ["cancelled", "Cancelled"]];
  if (category === "Merch") return [["active", "Idea"], ["planned", "Planned"], ["ordered", "Ordered"], ["received", "Received"], ["cancelled", "Cancelled"]];
  return [["planned", "Planned"], ["running", "Running"], ["completed", "Completed"], ["cancelled", "Cancelled"]];
}
function Kpi({ label, value, hint, accent, onClick }: { label: string; value: string; hint: string; accent: string; onClick?: () => void }) {
  const content = <><p className="text-xs text-white/50">{label}</p><p className={`mt-2 text-xl font-semibold tracking-tight tabular-nums ${accent === "pink" ? "text-[#FD52AF]" : "text-white"}`}>{value}</p><p className="mt-1 text-[10px] leading-4 text-white/40">{hint}</p></>;
  return onClick ? <button onClick={onClick} className="rounded-xl border border-white/[.08] bg-[#111114] p-4 text-left transition hover:border-white/15 hover:bg-white/[.04]">{content}</button> : <div className="rounded-xl border border-white/[.08] bg-[#111114] p-4">{content}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const style = "mt-1 w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3 py-2 text-sm text-white outline-none focus:border-[#FD52AF]/60";
  const styled = (child: React.ReactNode, key?: number) => {
    if (!isValidElement<{ className?: string }>(child)) return child;
    return cloneElement(child, { ...(key === undefined ? {} : { key }), className: `${style} ${child.props.className || ""}` });
  };
  return <label className="block text-xs text-white/55">{label}{required && <span className="text-[#FD52AF]"> *</span>}{Array.isArray(children) ? children.map(styled) : styled(children)}</label>;
}
