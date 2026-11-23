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
  const section = (title: string, text: string) => { if (doc.y > 660) doc.addPage(); line(title.toUpperCase(), { bold: true, size: 11, color: pink, gap: 0.3 }); line(text, { size: 10, color: "#353139", gap: 0.7 }); };
  try {
    const logo = await readFile(`${process.cwd()}/public/elements/logo.webp`);
    doc.image(await sharp(logo).png().toBuffer(), 62, 42, { fit: [150, 42] });
    doc.y = 98;
  } catch { line("CHXNDLER", { bold: true, size: 17, color: pink, gap: 0.25 }); }
  line("COLLABORATION AGREEMENT", { bold: true, size: 9, color: "#77717a", gap: 0.2 });
  line(input.song, { bold: true, size: 24, color: "#17151a", gap: 0.3 });
  line(`Agreement ${input.id} · Version ${input.version} · Effective ${new Date(Math.max(Date.parse(input.adminSignedAt), Date.parse(input.collaboratorSignedAt))).toLocaleDateString()}`, { size: 9, color: "#77717a" });
  const agreementType = input.type || input.terms.agreement_type || "singer_feature";
  const fullAgreement = agreementText(agreementType, input.terms).split("\nSIGNATURES\n")[0];
  for (const block of fullAgreement.split(/\n\n+/).filter(Boolean)) {
    const [firstLine, ...remaining] = block.split("\n");
    const isHeading = /^\d+\./.test(firstLine);
    if (isHeading) line(firstLine, { bold: true, size: 10, color: pink, gap: 0.25 });
    else if (/^CHXNDLER COLLABORATION AGREEMENT|^PREVIEW FOR REVIEW|^Agreement version|^Effective date:/.test(firstLine)) line(firstLine, { bold: firstLine.startsWith("CHXNDLER"), size: 8, color: "#77717a", gap: 0.2 });
    const body = [...(isHeading ? [] : [firstLine]), ...remaining].join("\n");
    if (body) line(body, { size: 9, color: "#353139", gap: 0.45 });
  }
  if (doc.y > 620) doc.addPage();
  try { const signature = await readFile(`${process.cwd()}/public/elements/PINK SIGNATURE.png`); doc.image(signature, 62, doc.y, { fit: [115, 36] }); doc.y += 38; } catch { /* Keep the signature section readable without the image asset. */ }
  line("SIGNATURES", { bold: true, size: 11, color: pink, gap: 0.6 });
  const startY = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#77717a").text("CHXNDLER", 62, startY);
  doc.font("Helvetica-Oblique").fontSize(20).fillColor(pink).text("Chandler Pierce", 62, startY + 20);
  doc.moveTo(62, startY + 54).lineTo(270, startY + 54).strokeColor("#c9c3c8").stroke();
  doc.font("Helvetica").fontSize(9).fillColor("#29262d").text(input.terms.admin_legal_name || "Chandler Pierce", 62, startY + 61);
  doc.fontSize(8).fillColor("#77717a").text(`Signed ${new Date(input.adminSignedAt).toLocaleString()}`, 62, startY + 75);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#77717a").text("COLLABORATOR", 315, startY);
  doc.font("Helvetica-Oblique").fontSize(20).fillColor(pink).text(input.collaboratorSignature, 315, startY + 20, { width: 230 });
  doc.moveTo(315, startY + 54).lineTo(530, startY + 54).strokeColor("#c9c3c8").stroke();
  doc.font("Helvetica").fontSize(9).fillColor("#29262d").text(input.terms.collaborator_legal_name || input.collaboratorSignature, 315, startY + 61);
  doc.fontSize(8).fillColor("#77717a").text(`Signed ${new Date(input.collaboratorSignedAt).toLocaleString()}`, 315, startY + 75);
  doc.y = startY + 110;
  doc.moveDown(1);
  line(`Electronic signature audit · Snapshot SHA-256: ${input.snapshotHash}`, { size: 7, color: "#77717a", gap: 0.2 });
  line(`Agreement ID ${input.id} · v${input.version} · CHXNDLER site signing record`, { size: 7, color: "#77717a", gap: 0 });
  doc.end();
  return done;
}
