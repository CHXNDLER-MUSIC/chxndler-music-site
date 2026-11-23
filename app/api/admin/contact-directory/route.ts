import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type DirectoryContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  venue: string | null;
  note: string | null;
  industry_category: string;
  relationship: string | null;
  referred_by: string | null;
  connection_status: string;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  site_profile_status: "unknown" | "has_profile" | "no_profile";
  sources: string[];
  editable: boolean;
  identityKeys: string[];
};

const nameParts = (value: string | null | undefined) => {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  return { first_name: parts.shift() || null, last_name: parts.join(" ") || null };
};
const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const identityKeys = (email: string | null, phone: string | null) => {
  const keys: string[] = [];
  for (const value of (email || "").split(/[;,]/)) {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes("@")) keys.push(`email:${normalized}`);
  }
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 7) keys.push(`phone:${digits}`);
  return [...new Set(keys)];
};

async function readAll(table: string, columns: string, orderBy: string, stableOrderBy = orderBy) {
  const db = getSupabaseAdmin();
  const rows: Record<string, any>[] = [];
  const pageSize = 50;
  for (let from = 0; ; from += pageSize) {
    let query = db.from(table).select(columns).order(orderBy, { ascending: true });
    if (stableOrderBy !== orderBy) query = query.order(stableOrderBy, { ascending: true });
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function makeContact(input: Partial<DirectoryContact> & { id: string; name?: string | null; email?: string | null; phone?: string | null; source: string; category?: string | null; organization?: string | null; role?: string | null; profile?: boolean; editable?: boolean }) {
  const parts = nameParts(input.name);
  const firstName = input.first_name || parts.first_name;
  const lastName = input.last_name || parts.last_name;
  const email = input.email || null;
  const phone = input.phone || null;
  const keys = input.identityKeys || identityKeys(email, phone);
  if (!keys.length && (firstName || lastName)) {
    const normalizedName = normalizeName([firstName, lastName].filter(Boolean).join(" "));
    if (normalizedName.length >= 4) keys.push(`name:${normalizedName}`);
  }
  return {
    id: input.id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    venue: input.venue || input.organization || null,
    note: input.note || null,
    industry_category: input.industry_category || input.category || "Other",
    relationship: input.relationship || input.role || null,
    referred_by: input.referred_by || null,
    connection_status: input.connection_status || "not_contacted",
    last_contacted_at: input.last_contacted_at || null,
    follow_up_at: input.follow_up_at || null,
    site_profile_status: input.site_profile_status || (input.profile ? "has_profile" : "unknown"),
    sources: [input.source],
    editable: Boolean(input.editable),
    identityKeys: keys,
  } satisfies DirectoryContact;
}

function mergeDuplicates(rows: DirectoryContact[]) {
  const parents = rows.map((_, index) => index);
  const find = (index: number): number => parents[index] === index ? index : (parents[index] = find(parents[index]));
  const join = (left: number, right: number) => {
    const a = find(left), b = find(right);
    if (a !== b) parents[b] = a;
  };
  const firstForKey = new Map<string, number>();
  rows.forEach((row, index) => row.identityKeys.forEach(key => {
    const previous = firstForKey.get(key);
    if (previous === undefined) firstForKey.set(key, index);
    else join(index, previous);
  }));
  const groups = new Map<number, DirectoryContact[]>();
  rows.forEach((row, index) => {
    const root = find(index);
    const group = groups.get(root) || [];
    group.push(row);
    groups.set(root, group);
  });

  const priority = (row: DirectoryContact) => row.editable ? 0 : row.sources.includes("Site profiles") ? 1 : row.sources.includes("Guest profiles") ? 2 : 3;
  return [...groups.values()].map(group => {
    const ordered = [...group].sort((a, b) => priority(a) - priority(b));
    const primary = ordered[0];
    const profileStatus = group.some(row => row.site_profile_status === "has_profile")
      ? "has_profile"
      : primary.site_profile_status;
    return {
      ...primary,
      first_name: primary.first_name || ordered.find(row => row.first_name)?.first_name || null,
      last_name: primary.last_name || ordered.find(row => row.last_name)?.last_name || null,
      email: primary.email || ordered.find(row => row.email)?.email || null,
      phone: primary.phone || ordered.find(row => row.phone)?.phone || null,
      venue: primary.venue || ordered.find(row => row.venue)?.venue || null,
      note: primary.note || ordered.find(row => row.note)?.note || null,
      industry_category: primary.industry_category || ordered.find(row => row.industry_category)?.industry_category || "Other",
      relationship: primary.relationship || ordered.find(row => row.relationship)?.relationship || null,
      site_profile_status: profileStatus,
      sources: [...new Set(group.flatMap(row => row.sources))],
      editable: group.some(row => row.editable),
      identityKeys: [],
    };
  }).sort((a, b) => `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`));
}

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();

  try {
    const [marketing, outreach, pitchLeads, profiles, guests, gigs, invites, collaborations, phoneSignups] = await Promise.all([
      readAll("marketing_contacts", "id,first_name,last_name,email,phone,venue,note,industry_category,relationship,referred_by,connection_status,last_contacted_at,follow_up_at,site_profile_status", "first_name", "id"),
      readAll("outreach_records", "id,first_name,last_name,email,contact_name,contact_email,organization,playlist_name,category,platform,song_title,status,sent_at,follow_up_at,pitch,notes", "id"),
      readAll("chx_pitch_opportunities", "import_lead_key,organization,category,lead_type,first_name,last_name,job_role,professional_email,submission_route", "import_lead_key"),
      readAll("profiles", "id,name,email,phone,profile_complete,created_at", "name", "id"),
      readAll("guest_profiles", "guest_id,username,created_at", "username", "guest_id"),
      readAll("gig_outreach", "id,venue,first_name,last_name,contact_email,phone,neighborhood,city,date_sent,notes", "venue", "id"),
      readAll("collaboration_invites", "id,first_name,last_name,invitee_email,phone,display_name,artist_name", "id"),
      readAll("collaboration_requests", "id,first_name,last_name,email,phone,artist_name,profile_link", "id"),
      readAll("phone_signups", "id,phone_number,phone,source,created_at", "created_at"),
    ]);

    const rows: DirectoryContact[] = [];
    for (const row of marketing) rows.push(makeContact({ ...row, id: row.id, source: "Personal contacts", editable: true }));
    for (const row of outreach) {
      const name = row.contact_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.playlist_name || row.organization;
      if (!name && !row.email && !row.contact_email) continue;
      rows.push(makeContact({ id: `outreach:${row.id}`, name, email: row.contact_email || row.email, venue: row.organization || row.platform, note: row.pitch || row.notes, category: row.category || "Playlist / sync", role: row.platform, source: "Playlist / sync outreach" }));
    }
    for (const row of pitchLeads) {
      if (!row.first_name && !row.last_name && !row.professional_email) continue;
      rows.push(makeContact({ id: `pitch:${row.import_lead_key}`, name: [row.first_name, row.last_name].filter(Boolean).join(" "), email: row.professional_email, venue: row.organization, category: row.category || "Sync licensing", role: row.job_role || row.lead_type || row.submission_route, source: "Sync licensing" }));
    }
    for (const row of profiles) rows.push(makeContact({ id: `profile:${row.id}`, name: row.name, email: row.email, phone: row.phone, category: "Site profile", role: row.profile_complete ? "Profile complete" : "Profile in progress", profile: true, source: "Site profiles" }));
    for (const row of guests) rows.push(makeContact({ id: `guest:${row.guest_id}`, name: row.username || "Guest profile", category: "Guest profile", role: "Website guest identity", source: "Guest profiles", identityKeys: [`guest:${row.guest_id}`] }));
    for (const row of gigs) {
      if (!row.first_name && !row.last_name && !row.contact_email && !row.phone) continue;
      rows.push(makeContact({ id: `gig:${row.id}`, name: [row.first_name, row.last_name].filter(Boolean).join(" ") || `${row.venue} contact`, email: row.contact_email, phone: row.phone, venue: row.venue, category: "Gig outreach", role: [row.neighborhood, row.city].filter(Boolean).join(" · ") || "Venue contact", note: row.notes, source: "Gig contacts" }));
    }
    for (const row of invites) rows.push(makeContact({ id: `invite:${row.id}`, name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.display_name || row.artist_name, email: row.invitee_email, phone: row.phone, category: "Collaboration", role: row.artist_name || "Collaboration invite", source: "Collaboration contacts" }));
    for (const row of collaborations) rows.push(makeContact({ id: `collaboration:${row.id}`, name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.artist_name, email: row.email, phone: row.phone, category: "Collaboration", role: row.profile_link || "Collaboration request", source: "Collaboration contacts" }));
    for (const row of phoneSignups) {
      const phone = row.phone_number || row.phone;
      if (!phone) continue;
      rows.push(makeContact({ id: `phone-signup:${row.id}`, name: "Phone signup", phone, category: "Phone signup", role: row.source || "Website signup", source: "Phone signups" }));
    }

    return NextResponse.json({ contacts: mergeDuplicates(rows) });
  } catch (error) {
    console.error("Contact directory load failed:", error);
    return NextResponse.json({ error: "Unable to load the contact directory." }, { status: 500 });
  }
}
