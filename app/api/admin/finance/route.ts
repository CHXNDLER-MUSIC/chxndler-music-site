import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const categories = ["Software", "Merch", "Advertising"] as const;
const statuses = ["active", "needs_review", "planned", "cancelled", "ordered", "received", "running", "completed"] as const;
const paymentStatuses = ["unknown", "unpaid", "paid"] as const;
const frequencies = ["monthly", "annual", "one_time"] as const;
const fields = [
  "category", "record_type", "name", "vendor", "amount", "amount_kind", "frequency",
  "quantity", "status", "payment_status", "actual_amount", "paid_on", "renewal_date",
  "campaign_start", "campaign_end", "related_song_id", "website", "purchase_url",
  "thumbnail_url", "description", "notes",
] as const;

async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

function validDate(value: unknown) {
  return value === null || value === "" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
function parseAmount(value: unknown) {
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 && Math.round(n * 100) === n * 100 ? n : undefined;
}
function cleanBody(body: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  for (const field of fields) if (Object.hasOwn(body, field)) out[field] = body[field];
  if (!partial && (!categories.includes(out.category as typeof categories[number]) || typeof out.name !== "string" || !out.name.trim())) return { error: "Choose a category and enter an expense name." };
  if ("category" in out && !categories.includes(out.category as typeof categories[number])) return { error: "Choose Software, Merch, or Advertising." };
  if ("name" in out) {
    if (typeof out.name !== "string" || !out.name.trim()) return { error: "Enter an expense name." };
    out.name = out.name.trim().slice(0, 180);
  }
  for (const key of ["vendor", "website", "purchase_url", "thumbnail_url", "description", "notes"] as const) {
    if (key in out) {
      if (typeof out[key] !== "string") return { error: "Invalid " + key.replaceAll("_", " ") + "." };
      out[key] = (out[key] as string).trim().slice(0, key === "notes" || key === "description" ? 5000 : 1000);
    }
  }
  for (const key of ["amount", "actual_amount"] as const) {
    if (key in out) {
      const value = parseAmount(out[key]);
      if (value === undefined) return { error: "Amounts must be non-negative values with up to two decimal places." };
      out[key] = value;
    }
  }
  if ("quantity" in out) {
    if (out.quantity === null || out.quantity === "") out.quantity = null;
    else if (!Number.isInteger(Number(out.quantity)) || Number(out.quantity) < 0) return { error: "Quantity must be a whole number of zero or more." };
    else out.quantity = Number(out.quantity);
  }
  for (const key of ["paid_on", "renewal_date", "campaign_start", "campaign_end"] as const) {
    if (key in out) {
      if (!validDate(out[key])) return { error: "Enter a valid " + key.replaceAll("_", " ") + "." };
      out[key] = out[key] || null;
    }
  }
  if ("frequency" in out && out.frequency !== null && out.frequency !== "" && !frequencies.includes(out.frequency as typeof frequencies[number])) return { error: "Choose monthly, annual, or one-time frequency." };
  if ("frequency" in out && out.frequency === "") out.frequency = null;
  if ("status" in out && !statuses.includes(out.status as typeof statuses[number])) return { error: "Choose a valid status." };
  if ("payment_status" in out && !paymentStatuses.includes(out.payment_status as typeof paymentStatuses[number])) return { error: "Choose a valid payment status." };
  if ("amount_kind" in out && !["recurring_rate", "estimate", "budget"].includes(String(out.amount_kind))) return { error: "Choose a valid amount type." };
  if ("related_song_id" in out && out.related_song_id !== null && out.related_song_id !== "") {
    if (typeof out.related_song_id !== "string" || !/^[0-9a-f-]{36}$/i.test(out.related_song_id)) return { error: "Choose a valid related song." };
  } else if ("related_song_id" in out) out.related_song_id = null;
  if ("category" in out) out.record_type = out.category === "Software" ? "subscription" : out.category === "Merch" ? "merch_item" : "campaign";
  return { value: out };
}

export async function GET() {
  const denied = await gate();
  if (denied) return denied;
  const { data, error } = await getSupabaseAdmin().from("finance_records").select("*").order("category").order("name");
  if (error) return NextResponse.json({ error: "Finance storage is unavailable. Apply the finance tracker migration, then refresh." }, { status: 503 });
  return NextResponse.json({ records: data || [] });
}

export async function POST(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const parsed = cleanBody(await request.json());
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const row = {
    category: "Software", record_type: "expense", name: "", vendor: "", amount: null,
    amount_kind: "estimate", frequency: null, quantity: null, status: "planned",
    payment_status: "unknown", actual_amount: null, paid_on: null, renewal_date: null,
    campaign_start: null, campaign_end: null, related_song_id: null, website: "",
    purchase_url: "", thumbnail_url: "", description: "", notes: "",
    ...(parsed.value || {}),
  };
  const { data, error } = await getSupabaseAdmin().from("finance_records").insert(row).select("*").single();
  if (error || !data) return NextResponse.json({ error: "Unable to save this expense. Check the finance migration and try again." }, { status: 500 });
  return NextResponse.json({ record: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid expense." }, { status: 400 });
  const parsed = cleanBody(body, true);
  if (parsed.error || !Object.keys(parsed.value || {}).length) return NextResponse.json({ error: parsed.error || "No changes to save." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: current, error: readError } = await db.from("finance_records").select("payment_status,actual_amount,paid_on").eq("id", body.id).maybeSingle();
  if (readError || !current) return NextResponse.json({ error: "This expense could not be found." }, { status: 404 });
  const next = { ...current, ...(parsed.value || {}) };
  if (next.payment_status === "paid" && (next.actual_amount === null || !next.paid_on)) return NextResponse.json({ error: "A paid expense needs an actual amount and payment date." }, { status: 400 });
  const { data, error } = await db.from("finance_records").update({ ...parsed.value, updated_at: new Date().toISOString() }).eq("id", body.id).select("*").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to update this expense." }, { status: 500 });
  return NextResponse.json({ record: data });
}

export async function DELETE(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid expense." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("finance_records").delete().eq("id", body.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to delete this expense." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
