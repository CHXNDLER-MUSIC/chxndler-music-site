import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import CollabInviteExperience from "@/components/collab/CollabInviteExperience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "An Invitation to Create · CHXNDLER", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function PersonalizedCollabInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let displayName = "";
  try {
    if (/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const { data } = await getSupabaseAdmin().from("collaboration_invites")
        .select("id,display_name").eq("token_hash", tokenHash).is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle();
      displayName = data?.display_name || "";
    }
  } catch (error) {
    console.error("[collab/invite-page] validation failed", error);
  }

  if (!displayName) return <main style={{ background: "#050505" }} className="grid min-h-screen place-items-center px-5 text-center text-white">
    <section className="max-w-md"><img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-8 h-14 w-36 object-contain"/><p className="text-xs font-bold tracking-[.24em] text-[#FD52AF]">THE HEARTVERSE</p><h1 className="mt-4 text-3xl font-bold">This invitation isn’t active.</h1><p className="mt-3 text-sm leading-6 text-white/55">Ask CHXNDLER for a current personal invitation link.</p></section>
  </main>;

  return <CollabInviteExperience token={token} name={displayName} />;
}
