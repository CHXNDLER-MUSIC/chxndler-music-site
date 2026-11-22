import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementHtml, agreementTypes, type AgreementType } from "@/lib/collaborationAgreements";
import AgreementSignatureForm from "@/components/collab/AgreementSignatureForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Collaboration Agreement · CHXNDLER", referrer: "no-referrer", robots: { index: false, follow: false } };
const expiredMessage = "This private agreement link is invalid or has expired. Please ask CHXNDLER to send you a fresh link.";

export default async function CollaborationAgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let agreement: { html: string; pdfUrl: string | null; email: string; firstName: string; lastName: string; printedName: string; signed: boolean; copySent: boolean } | null = null;
  try {
    if (/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const db = getSupabaseAdmin();
      const { data: row } = await db.from("collaboration_requests")
        .select("id,email,first_name,last_name,agreement_status,agreement_type,agreement_version,agreement_approved_version,agreement_access_expires_at,agreement_access_version,agreement_terms,agreement_path,collaborator_first_name,collaborator_last_name,collaborator_printed_name,collaborator_signature,collaborator_signed_at,collaborator_signed_version,collaborator_signature_email_sent_at")
        .eq("agreement_access_token_hash", tokenHash).maybeSingle();
      if (row && row.agreement_access_expires_at && new Date(row.agreement_access_expires_at).getTime() > Date.now() && row.agreement_access_version === row.agreement_approved_version) {
        const { data: snapshot } = await db.from("collaboration_agreement_versions").select("agreement_type,version,structured_terms")
          .eq("request_id", row.id).eq("version", row.agreement_access_version).maybeSingle();
        const agreementType = snapshot?.agreement_type || row.agreement_type;
        if (agreementType && agreementTypes.some(item => item.value === agreementType)) {
          const isSigned = row.agreement_status === "signed" && row.collaborator_signed_version === row.agreement_access_version;
          const terms = { ...(snapshot?.structured_terms || row.agreement_terms || {}), ...(isSigned ? {
            collaborator_first_name: row.collaborator_first_name,
            collaborator_last_name: row.collaborator_last_name,
            collaborator_printed_name: row.collaborator_printed_name,
            collaborator_signature: row.collaborator_signature,
            collaborator_signed_at: row.collaborator_signed_at,
          } : {}) };
          let pdfUrl: string | null = null;
          if (row.agreement_path) {
            const { data: pdf } = await db.storage.from("collaboration-agreements").createSignedUrl(row.agreement_path, 30 * 60);
            pdfUrl = pdf?.signedUrl || null;
          }
          agreement = {
            html: agreementHtml(agreementType as AgreementType, terms), pdfUrl,
            email: row.email || "", firstName: row.collaborator_first_name || row.first_name || "", lastName: row.collaborator_last_name || row.last_name || "",
            printedName: row.collaborator_printed_name || terms.collaborator_legal_name || [row.first_name, row.last_name].filter(Boolean).join(" "), signed: isSigned, copySent: !!row.collaborator_signature_email_sent_at,
          };
        }
      }
    }
  } catch (error) {
    console.error("[collab/agreement-page] lookup failed", error);
  }

  if (!agreement) return <main className="grid min-h-[100svh] place-items-center bg-[#050505] px-5 text-center text-white"><section className="max-w-md"><img src="/elements/logo.webp" alt="CHXNDLER" className="mx-auto mb-8 h-14 w-36 object-contain"/><p className="text-xs font-bold tracking-[.24em] text-[#FD52AF]">THE HEARTVERSE · COLLABORATION</p><h1 className="mt-4 text-3xl font-bold">Agreement link unavailable</h1><p className="mt-3 text-sm leading-6 text-white/55">{expiredMessage}</p><a className="mt-7 inline-flex rounded-full border border-[#FD52AF]/50 px-6 py-3 text-sm font-semibold text-white hover:bg-[#FD52AF]/10" href="mailto:info@chxndler-music.com?subject=Request%20a%20new%20agreement%20link">Request a fresh link</a></section></main>;

  return <main className="min-h-[100svh] bg-[#050505] px-3 py-8 text-white sm:px-6"><div className="mx-auto max-w-5xl"><header className="mb-5 flex items-center justify-between gap-4"><a href="/collab" className="text-xs font-bold uppercase tracking-[.16em] text-white/60 hover:text-white">← Back to collab</a><img src="/elements/logo.webp" alt="CHXNDLER" className="h-10 w-28 object-contain"/></header><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-white/50">Review the agreement, then sign below.</p>{agreement.pdfUrl && <a href={agreement.pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:border-[#FD52AF]/50">Download reviewed PDF ↗</a>}</div><div className="overflow-hidden rounded-2xl border border-white/10 bg-white"><iframe title="Collaboration agreement" srcDoc={agreement.html} sandbox="allow-same-origin allow-scripts" className="block h-[min(72vh,900px)] min-h-[520px] w-full border-0" /></div><AgreementSignatureForm token={token} email={agreement.email} initialFirstName={agreement.firstName} initialLastName={agreement.lastName} initialPrintedName={agreement.printedName} isSigned={agreement.signed} copySent={agreement.copySent}/><p className="mx-auto mt-5 max-w-4xl text-center text-[11px] text-white/35">This private agreement page is intended for the named recipient. Do not forward the link.</p></div></main>;
}
