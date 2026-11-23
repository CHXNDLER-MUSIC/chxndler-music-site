import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTypes, type AgreementType } from "@/lib/collaborationAgreements";
import AgreementDocument from "@/components/collab/AgreementDocument";
import AgreementSignatureForm from "@/components/collab/AgreementSignatureForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Collaboration Agreement · CHXNDLER", referrer: "no-referrer", robots: { index: false, follow: false } };
const invalidMessage = "This private agreement link is invalid, expired, or no longer active. Please ask CHXNDLER to send you a fresh link.";

export default async function CollaborationAgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let agreement: { id: string; type: AgreementType; terms: Record<string, any>; title: string; email: string; name: string; version: number; status: string; signedAt: string | null; signature: string | null; adminSignedAt: string | null; signedPdf: boolean } | null = null;
  try {
    if (/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      const db = getSupabaseAdmin();
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const { data: row } = await db.from("collaboration_requests").select("id,email,first_name,last_name,agreement_status,agreement_type,agreement_version,agreement_approved_version,agreement_access_expires_at,agreement_access_version,agreement_terms,collaborator_printed_name,collaborator_signature,collaborator_signed_at,admin_signed_at,signed_agreement_path,songs(title)").eq("agreement_access_token_hash", tokenHash).maybeSingle();
      if (row && row.agreement_access_expires_at && (Date.parse(row.agreement_access_expires_at) > Date.now() || row.agreement_status === "signed") && row.agreement_access_version === row.agreement_approved_version) {
        const { data: snapshot } = await db.from("collaboration_agreement_versions").select("agreement_type,version,structured_terms").eq("request_id", row.id).eq("version", row.agreement_access_version).maybeSingle();
        const type = snapshot?.agreement_type || row.agreement_type;
        if (type && agreementTypes.some(item => item.value === type)) {
          await db.from("collaboration_request_events").insert({ request_id: row.id, event: "agreement_viewed", details: { version: row.agreement_access_version } });
          const terms = (snapshot?.structured_terms || row.agreement_terms || {}) as Record<string, any>;
          agreement = { id: row.id, type: type as AgreementType, terms, title: (Array.isArray(row.songs) ? row.songs[0]?.title : (row.songs as any)?.title) || terms.song_title || "Collaboration project", email: row.email || "", name: row.collaborator_printed_name || terms.collaborator_legal_name || [row.first_name, row.last_name].filter(Boolean).join(" "), version: Number(row.agreement_access_version), status: row.agreement_status || "awaiting_signature", signedAt: row.collaborator_signed_at, signature: row.collaborator_signature, adminSignedAt: row.admin_signed_at, signedPdf: !!row.signed_agreement_path };
        }
      }
    }
  } catch (error) { console.error("[collab/agreement-page] lookup failed", error); }

  if (!agreement) return <main className="grid min-h-[100svh] place-items-center bg-[#08080b] px-5 text-center text-white"><section className="max-w-md"><img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-8 h-14 w-36 object-contain"/><p className="text-xs font-bold tracking-[.24em] text-[#FD52AF]">THE HEARTVERSE · COLLABORATION</p><h1 className="mt-4 text-3xl font-bold">Agreement link unavailable</h1><p className="mt-3 text-sm leading-6 text-white/55">{invalidMessage}</p><a className="mt-7 inline-flex rounded-full border border-[#FD52AF]/50 px-6 py-3 text-sm font-semibold text-white" href="mailto:info@chxndler-music.com?subject=Request%20a%20new%20agreement%20link">Request a fresh link</a></section></main>;

  const fullySigned = agreement.status === "signed" && !!agreement.signedPdf;
  return <main className="min-h-[100svh] bg-[#09090c] px-3 py-6 sm:px-6 sm:py-10"><div className="mx-auto max-w-5xl"><header className="mb-5 flex items-center justify-between gap-4"><a href="/collab" className="text-xs font-bold uppercase tracking-[.16em] text-white/60 hover:text-white">← Back to collab</a><p className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55">{fullySigned ? "Signed" : agreement.status.replaceAll("_", " ")}</p></header><AgreementDocument type={agreement.type} terms={agreement.terms} songTitle={agreement.title} version={agreement.version} agreementId={agreement.id} signedAt={agreement.signedAt} collaboratorSignature={agreement.signature} adminSignedAt={agreement.adminSignedAt} />{fullySigned ? <div className="mx-auto mt-5 max-w-4xl text-center"><a href={`/api/collab/agreement/${token}/pdf`} className="inline-flex rounded-full bg-[#FD52AF] px-6 py-3 text-sm font-bold uppercase text-[#160d13]">Download Signed Agreement</a><p className="mt-2 text-xs text-white/45">This PDF matches the signed agreement version.</p></div> : agreement.signedAt ? <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-emerald-300/20 bg-[#101014] p-6 text-center text-sm leading-6 text-white/65"><p className="text-lg font-bold text-white">Your signature is recorded</p><p className="mt-2">The agreement becomes fully executed after CHXNDLER signs. Return to this private link to download the final PDF.</p></div> : <AgreementSignatureForm token={token} email={agreement.email} initialName={agreement.name} artistName={agreement.terms.collaborator_artist_name || ""} agreementDate={agreement.terms.effective_date || ""} />}</div></main>;
}
