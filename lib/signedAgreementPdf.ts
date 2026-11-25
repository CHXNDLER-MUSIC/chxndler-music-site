import { readFile } from "node:fs/promises";
import { agreementText, type AgreementType } from "@/lib/collaborationAgreements";

export async function createSignedAgreementPdf(input: { id: string; version: number; song: string; type?: AgreementType; terms: Record<string, any>; collaboratorSignature: string; collaboratorSignedAt: string; adminSignedAt: string; snapshotHash: string }) {
  const { default: PDFDocument } = await import("pdfkit");
  const { default: sharp } = await import("sharp");
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 58, bottom: 58, left: 62, right: 62 }, info: { Title: `CHXNDLER Collaboration Agreement — ${input.song}`, Author: "CHXNDLER", Subject: `Agreement ${input.id} version ${input.version}` } });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const pink = "#C3317E";
  const line = (text: string, opts: { bold?: boolean; size?: number; color?: string; gap?: number } = {}) => { doc.fillColor(opts.color || "#242127").font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 10).text(text, { lineGap: 3 }); if (opts.gap !== 0) doc.moveDown(opts.gap ?? 0.55); };
  const section = (title: string, text: string) => { if (doc.y > 660) doc.addPage(); line(title.toUpperCase(), { bold: true, size: 11, color: pink, gap: 0.3 }); line(text, { size: 10.5, color: "#353139", gap: 0.7 }); };
  try {
    const logo = await readFile(`${process.cwd()}/public/elements/logo.webp`);
    doc.image(await sharp(logo).png().toBuffer(), 62, 42, { fit: [150, 42] });
    doc.y = 98;
  } catch { line("CHXNDLER", { bold: true, size: 17, color: pink, gap: 0.25 }); }
  const agreementType = input.type || input.terms.agreement_type || "singer_feature";
  const completeText = agreementText(agreementType, input.terms);
  const header = completeText.split("\n").slice(0, 3);
  line("COLLABORATION AGREEMENT", { bold: true, size: 9, color: "#77717a", gap: 0.2 });
  line(header[0], { bold: true, size: 14, color: "#17151a", gap: 0.2 });
  line(header[1] || input.song, { bold: true, size: 22, color: "#17151a", gap: 0.2 });
  line(`${header[2] || `Issue date: ${input.terms.agreement_issue_date || "—"}`} · Sent ${input.terms.sent_at ? new Date(input.terms.sent_at).toLocaleDateString() : "—"}`, { size: 9, color: "#77717a" });
  const fullAgreement = completeText.split("\nSIGNATURES\n")[0].split("\n").slice(4).join("\n");
  const majorSections = new Set(["YOUR CONTRIBUTION", "YOUR COMPENSATION & RIGHTS", "PRODUCTION & RELEASE", "COLLABORATION ARRANGEMENTS", "AGREEMENT TERMS"]);
  for (const block of fullAgreement.split(/\n\n+/).filter(Boolean)) {
    const [firstLine, ...remaining] = block.split("\n");
    const isHeading = /^\d{2}\s*·/.test(firstLine);
    const isMajor = majorSections.has(firstLine);
    if (isHeading || isMajor) line(firstLine, { bold: true, size: isMajor ? 11 : 10.5, color: pink, gap: 0.25 });
    else if (/^CHXNDLER COLLABORATION AGREEMENT|^PREVIEW FOR REVIEW|^Agreement version|^Effective date:/.test(firstLine)) line(firstLine, { bold: firstLine.startsWith("CHXNDLER"), size: 8, color: "#77717a", gap: 0.2 });
    const body = [...(isHeading ? [] : [firstLine]), ...remaining].join("\n");
    if (body) line(body, { size: 10, color: "#353139", gap: 0.55 });
  }
  if (doc.y > 620) doc.addPage();
  line("SIGNATURES", { bold: true, size: 11, color: pink, gap: 0.6 });
  const startY = doc.y;
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#77717a").text("SIGNATURE", 62, startY - 12);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#77717a").text("SIGNATURE", 315, startY - 12);
  try { const signature = await readFile(`${process.cwd()}/public/elements/PINK SIGNATURE.png`); doc.image(signature, 62, startY - 3, { fit: [145, 42] }); } catch { doc.font("Helvetica-Oblique").fontSize(22).fillColor(pink).text("CHXNDLER", 62, startY + 2); }
  doc.moveTo(62, startY + 42).lineTo(270, startY + 42).strokeColor("#c9c3c8").stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#29262d").text(`Legal name: ${input.terms.admin_legal_name || "Chandler Pierce"}`, 62, startY + 49, { width: 215 });
  doc.fontSize(8).fillColor("#77717a").text("Artist name: CHXNDLER", 62, startY + 62);
  doc.fontSize(8).fillColor("#77717a").text(`Signature date: ${new Date(input.adminSignedAt).toLocaleDateString()}`, 62, startY + 75);
  doc.font("Helvetica-Oblique").fontSize(20).fillColor(pink).text(input.collaboratorSignature, 315, startY + 8, { width: 215 });
  doc.moveTo(315, startY + 42).lineTo(530, startY + 42).strokeColor("#c9c3c8").stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#29262d").text(`Legal name: ${input.terms.collaborator_printed_name || input.terms.collaborator_legal_name || input.collaboratorSignature}`, 315, startY + 49, { width: 215 });
  doc.fontSize(8).fillColor("#77717a").text(`Artist name: ${input.terms.collaborator_artist_name || "Collaborator"}`, 315, startY + 62);
  doc.fontSize(8).fillColor("#77717a").text(`Signature date: ${new Date(input.collaboratorSignedAt).toLocaleDateString()}`, 315, startY + 75);
  doc.y = startY + 105;
  doc.moveDown(1);
  line(`Electronic signature audit · Snapshot SHA-256: ${input.snapshotHash}`, { size: 7, color: "#77717a", gap: 0.2 });
  line(`Agreement ID ${input.id} · v${input.version} · CHXNDLER site signing record`, { size: 7, color: "#77717a", gap: 0 });
  doc.end();
  return done;
}
