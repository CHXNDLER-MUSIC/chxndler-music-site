export type AgreementType = "singer_feature" | "producer" | "remix" | "videographer";
export type AgreementFieldKind = "text" | "textarea" | "number" | "percent" | "date" | "select";
export type AgreementField = { key: string; label: string; kind?: AgreementFieldKind; options?: { value: string; label: string }[]; required?: boolean };
export type AgreementTerms = Record<string, any>;

export const agreementTypes: { value: AgreementType; label: string }[] = [
  { value: "singer_feature", label: "Singer / Feature" },
  { value: "producer", label: "Producer" },
  { value: "remix", label: "Remix" },
  { value: "videographer", label: "Videographer" },
];

export const agreementTemplates: Record<AgreementType, { id: string; version: number; label: string; scopeLabel: string; deliverablesKey: string; deliverablesLabel: string; creditKey: string; creditLabel: string; defaults: Record<string, string | number>; legalTerms: string }> = {
  singer_feature: {
    id: "chxndler-singer-feature", version: 4, label: "Singer / Feature", scopeLabel: "Contribution", deliverablesKey: "vocal_deliverables", deliverablesLabel: "Vocal recording and deliverables", creditKey: "artist_credit", creditLabel: "Artist credit",
    defaults: { contribution_description: "Record and perform the agreed vocal feature.", vocal_deliverables: "Lead vocal takes, agreed doubles and ad-libs, and clean, labeled WAV stems in the agreed key and tempo.", artist_credit: "CHXNDLER feat. [Artist Name]" },
    legalTerms: "MASTER & PERFORMER PERMISSIONS\nCHXNDLER owns or controls only the master rights expressly identified in this agreement. The collaborator keeps ownership of their performance and materials unless a separate, effective written transfer is signed. The collaborator gives CHXNDLER permission to record, edit, reproduce, distribute, and promote the agreed performance as part of this named project and to seek authorized licenses for it. No recording royalty transfers master copyright. Commercial release and sync use require the permissions stated here and any required third-party approvals.\n\nROYALTY CALCULATIONS\nRecording royalties apply only to money actually received by CHXNDLER for exploitation of this master, after third-party platform, distributor, payment-processing, tax, refund, and directly attributable recoupable costs. Statements are issued annually within 90 days after year end; amounts under $25 carry forward. The collaborator may ask for reasonable supporting records once per year. Statutory performer payments collected directly by a society remain separate.\n\nSONGWRITING & PUBLISHING\nComposition ownership follows actual authorship and the writer shares expressly listed in this agreement. CHXNDLER does not own or administer the collaborator's composition share because it distributes the recording. CHXNDLER may administer only its own share and any other share it is expressly authorized to administer in writing.\n\nSYNC LICENSING\nMaster and composition permissions are separate. CHXNDLER coordinates master licensing only for rights it controls and requests collaborator approval where this agreement or law requires it. A zero additional master sync share does not waive composition income or rights. No sync use is authorized beyond the granted permissions and required approvals.\n\nCREDITS, PROMOTION & RELEASE\nCHXNDLER manages production and distribution of applicable CHXNDLER-owned recordings and uses the agreed credits, subject to platform limits. Each party may use approved project excerpts for promotion after public release. No unrelated endorsement is implied.\n\nDELIVERABLES & GENERAL\nThe collaborator will provide the listed deliverables by a mutually agreed date; the parties will confirm acceptance and reasonable revisions in writing. Each party will disclose samples, third-party materials, restrictions, or claims affecting their contribution. Changes must be accepted in writing by both parties. This agreement applies only to the named project; no rights transfer is implied beyond the permissions expressly written above. Electronic signatures and counterparts are permitted where applicable law allows." 
  },
  producer: {
    id: "chxndler-producer", version: 4, label: "Producer", scopeLabel: "Production scope", deliverablesKey: "deliverables", deliverablesLabel: "Production deliverables", creditKey: "producer_credit", creditLabel: "Producer credit",
    defaults: { production_scope: "Produce and arrange the agreed contribution for the named project.", deliverables: "Final stereo WAV, agreed stems, and project files specifically listed by the parties.", producer_credit: "Produced by [Artist Name]" },
    legalTerms: "OWNERSHIP & RIGHTS\nEach party retains its pre-existing materials. The collaborator retains rights in original production, performances, and compositions they create, except for the project-specific license expressly granted here. The collaborator grants CHXNDLER a non-exclusive, worldwide license to incorporate and use the listed deliverables in the named project and its promotion. No assignment of new production, performance, or composition rights is implied. Any ownership transfer or exclusive license must be stated in a separate signed provision.\n\nMASTER ROYALTY\nThe default master royalty is 0% unless a different percentage is expressly entered above and accepted in this agreement. This does not decide songwriting or publishing shares.\n\nSONGWRITING & PUBLISHING\nShares follow actual authorship. Any applicable songwriting split must be agreed in writing; a blank split is not a zero share. If not agreed here, the parties will use a separate signed split agreement before release.\n\nRELEASE, DISTRIBUTION & CREDIT\nCHXNDLER controls official release and distribution, subject to the license above. Credit will follow the credit field above and applicable platform limits. Project-related promotional use is permitted; unrelated endorsement is not.\n\nDELIVERABLES & ACCEPTANCE\nThe collaborator will provide the production deliverables listed above. The parties will agree on dates and reasonable revisions in writing. Third-party samples and materials must be disclosed and cleared by the party supplying them.\n\nREPRESENTATIONS\nEach party confirms authority to enter this agreement and will disclose any restrictions, third-party materials, or claims affecting their contribution.\n\nGENERAL\nChanges must be in a writing accepted by both parties. No exclusivity applies unless described under Additional Terms. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law. The parties may sign counterparts and electronic copies where permitted."
  },
  remix: {
    id: "chxndler-remix", version: 4, label: "Remix", scopeLabel: "Remix scope", deliverablesKey: "remix_deliverables", deliverablesLabel: "Remix deliverables", creditKey: "remixer_credit", creditLabel: "Remixer credit",
    defaults: { remix_title: "[Song Title] ([Artist Name] Remix)", contribution_description: "Create the agreed remix using only authorized source materials.", remix_deliverables: "Final stereo WAV and the agreed instrumental and stem files.", remixer_credit: "[Artist Name] Remix" },
    legalTerms: "OWNERSHIP & RIGHTS\nCHXNDLER retains the original song and original master recording, including all rights owned before this collaboration. The collaborator retains rights in pre-existing and newly created material they own. CHXNDLER grants a limited, non-exclusive license to use supplied source materials solely to create and deliver the named remix. The collaborator grants CHXNDLER a non-exclusive, worldwide license to use the delivered remix in the named project and its promotion. No ownership transfer of the remix, performance, or composition is implied.\n\nMASTER ROYALTY\nThe default master royalty is 0% unless a different percentage is expressly entered above and accepted in this agreement.\n\nSONGWRITING & PUBLISHING\nRemixing alone does not set a composition share. Shares follow actual authorship. Any applicable split must be agreed in a separate signed writing; a blank split is not a zero share.\n\nRELEASE & DISTRIBUTION\nThe collaborator may not independently release the remix. CHXNDLER controls official release and distribution subject to the license and any expressly agreed royalty above.\n\nDELIVERABLES, CREDIT & ACCEPTANCE\nThe collaborator will provide the remix deliverables listed above and use the remixer credit above. The parties will agree on delivery dates and reasonable revisions in writing. Third-party samples and materials must be disclosed and cleared by the party supplying them.\n\nREPRESENTATIONS\nEach party confirms authority to grant the rights stated here and will disclose restrictions or third-party claims affecting their contribution.\n\nGENERAL\nChanges must be in a writing accepted by both parties. No exclusivity applies unless described under Additional Terms. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law. The parties may sign counterparts and electronic copies where permitted."
  },
  videographer: {
    id: "chxndler-videographer", version: 4, label: "Videographer", scopeLabel: "Video concept & scope", deliverablesKey: "video_deliverables", deliverablesLabel: "Filming and editing deliverables", creditKey: "credits", creditLabel: "Video credit",
    defaults: { production_scope: "Develop and produce the agreed visual concept for the named song or project.", video_deliverables: "Final approved master video and the short-form edits listed below.", short_form_edits: "As agreed in writing.", revision_rounds: "2", credits: "Video by [Artist Name]", copyright_terms: "CHXNDLER owns the song, master recording, and materials CHXNDLER provides. The videographer owns the footage and video they create. The videographer gives CHXNDLER permission to use the final delivered video worldwide to release and promote this song. This permission does not transfer ownership. Any ownership transfer must be agreed in a separate document signed by both parties.", release_restrictions: "No unreleased footage or project materials may be published before CHXNDLER's written approval. Third-party materials must be disclosed and properly licensed." },
    legalTerms: "OWNERSHIP\nCHXNDLER owns the song, master recording, and materials CHXNDLER provides. The videographer owns the footage and video they create.\n\nPERMISSION TO USE THE VIDEO\nThe videographer gives CHXNDLER permission to use the final delivered video worldwide to release and promote this song. This permission does not transfer ownership of the footage or video. Any ownership transfer must be in a separate document signed by both parties. Each party keeps ownership of materials they owned before this project.\n\nFILMING & DELIVERABLES\nThe parties will use the agreed concept and scope above. The videographer will provide the listed deliverables, revisions, and deadline. Shoot dates, locations, and responsibilities will be confirmed in writing before filming.\n\nFEE & PAYMENT\nThe fee and payment terms above apply. A fee, including no fee, does not change who owns the work. Any additional expenses or work must be agreed in writing first.\n\nCREDIT & RELEASE\nCredit will follow the field above. The videographer must get CHXNDLER's written approval before publishing unreleased footage. Third-party materials must be disclosed and properly licensed.\n\nCHANGES\nChanges to this agreement must be accepted in writing by both parties."
  },
};

export const agreementFields: Record<AgreementType, AgreementField[]> = {
  singer_feature: [
    { key: "collaborator_legal_name", label: "Collaborator legal name", required: true },
    { key: "collaborator_artist_name", label: "Artist / professional name" },
    { key: "song_title", label: "Song / project", required: true },
    { key: "contribution_description", label: "Contribution", kind: "textarea", required: true },
    { key: "vocal_deliverables", label: "Vocal recording and deliverables", kind: "textarea", required: true },
    { key: "artist_credit", label: "Artist credit", required: true },
  ],
  producer: [
    { key: "collaborator_legal_name", label: "Collaborator legal name", required: true },
    { key: "collaborator_artist_name", label: "Artist / professional name" },
    { key: "song_title", label: "Song / project", required: true },
    { key: "contribution_description", label: "Contribution", kind: "textarea", required: true },
    { key: "production_scope", label: "Production scope", kind: "textarea", required: true },
    { key: "deliverables", label: "Production deliverables", kind: "textarea", required: true },
    { key: "producer_credit", label: "Producer credit", required: true },
  ],
  remix: [
    { key: "collaborator_legal_name", label: "Collaborator legal name", required: true },
    { key: "collaborator_artist_name", label: "Artist / professional name" },
    { key: "song_title", label: "Song / project", required: true },
    { key: "remix_title", label: "Remix title", required: true },
    { key: "contribution_description", label: "Contribution", kind: "textarea", required: true },
    { key: "remix_deliverables", label: "Remix deliverables", kind: "textarea", required: true },
    { key: "remixer_credit", label: "Remixer credit", required: true },
  ],
  videographer: [
    { key: "collaborator_legal_name", label: "Videographer legal name", required: true },
    { key: "collaborator_artist_name", label: "Artist / professional name" },
    { key: "song_title", label: "Song / project", required: true },
    { key: "production_scope", label: "Video concept & scope", kind: "textarea", required: true },
    { key: "shoot_dates", label: "Filming dates", kind: "text" },
    { key: "shoot_locations", label: "Filming locations", kind: "text" },
    { key: "video_deliverables", label: "Filming and editing deliverables", kind: "textarea", required: true },
    { key: "short_form_edits", label: "Short-form edits", kind: "text" },
    { key: "revision_rounds", label: "Included revision rounds", kind: "number", required: true },
    { key: "delivery_deadline", label: "Delivery deadline", kind: "date", required: true },
    { key: "credits", label: "Video credit", required: true },
  ],
};

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const nonempty = (value: unknown) => typeof value === "string" && value.trim() !== "";
const today = () => new Date().toISOString().slice(0, 10);

function requestIdentity(request: Record<string, any>, invite?: Record<string, any> | null) {
  const name = [request.first_name || invite?.first_name, request.last_name || invite?.last_name].filter(Boolean).join(" ").trim();
  return {
    legalName: name || invite?.display_name || "",
    artistName: request.artist_name || invite?.artist_name || "",
  };
}

export function agreementTypeForContribution(value?: string | null): AgreementType {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("video") || normalized.includes("videograph")) return "videographer";
  if (normalized.includes("remix")) return "remix";
  if (normalized.includes("production") || normalized.includes("producer")) return "producer";
  return "singer_feature";
}

/** Defaults are filled first, request/invite details second, saved agreement values last. */
export function createAgreementDraft(input: { type: AgreementType; request: Record<string, any>; invite?: Record<string, any> | null; existing?: Record<string, any> | null }): AgreementTerms {
  const { type, request, invite, existing } = input;
  const template = agreementTemplates[type];
  const identity = requestIdentity(request, invite);
  const artist = identity.artistName || identity.legalName || "Artist Name";
  const terms: AgreementTerms = {
    template_id: template.id,
    template_version: template.version,
    agreement_type: type,
    agreement_version: Number(request.agreement_version || 0),
    effective_date: today(),
    admin_legal_name: "Chandler Pierce",
    admin_artist_name: "CHXNDLER",
    collaborator_legal_name: identity.legalName,
    collaborator_artist_name: artist,
    song_title: request.songs?.title || request.song_title || "",
    collaboration_request_id: request.id || "",
    music_video_project_id: request.music_video_project_id || "",
    contribution_description: request.message || request.contribution_type || "",
    fee_option: "No fee",
    flat_fee: 0,
    master_royalty: type === "videographer" ? 0 : 0,
    songwriting_status: "unresolved",
    master_owner: "CHXNDLER",
    songwriting_split: "",
    publishing_split: "",
    payment_terms: "No flat fee is proposed. This does not waive songwriting or publishing rights.",
    legal_terms: template.legalTerms,
    additional_terms: "",
  };
  // Request facts take precedence over reusable wording; saved values are
  // applied below and therefore always win over both.
    terms.contribution_description = request.agreed_contribution_description || request.contribution_type || template.defaults.contribution_description || "";
  if (request.songs?.title || request.song_title) terms.song_title = request.songs?.title || request.song_title;
  if (request.artist_credit) terms[template.creditKey] = request.artist_credit;
  for (const [key, value] of Object.entries(template.defaults)) if (!own(terms, key) || terms[key] === "") terms[key] = value;
  if (Number(request.flat_fee) >= 0 && request.flat_fee !== null && request.flat_fee !== undefined) terms.flat_fee = Number(request.flat_fee);
  if (Number(request.master_royalty) >= 0 && request.master_royalty !== null && request.master_royalty !== undefined) terms.master_royalty = Number(request.master_royalty);
  if (request.publishing_royalty !== null && request.publishing_royalty !== undefined) terms.publishing_split = String(request.publishing_royalty);
  Object.assign(terms, {
    payment_direction: "none",
    master_royalty: Number(request.master_royalty || 0),
    master_participants: Array.isArray(existing?.master_participants) ? existing.master_participants : String(existing?.other_master_participants || "").split("\n").map((line: string) => line.trim()).filter(Boolean).map((line: string) => { const [name, share] = line.split(/[|,\t]/); return { name: name?.trim() || "", share: Number(share?.replace(/%/g, "").trim()) || "" }; }),
    songwriting_status: "unresolved",
    songwriting_split: request.publishing_royalty === null || request.publishing_royalty === undefined ? "" : Number(request.publishing_royalty),
    writer_splits: Array.isArray(existing?.writer_splits) ? existing.writer_splits : ["co_writer", "negotiated"].includes(String(existing?.songwriting_status)) && Number(existing?.songwriting_split ?? existing?.publishing_split) >= 0 ? [
      { name: "CHXNDLER", stage_name: "CHXNDLER", share: 100 - Number(existing?.songwriting_split ?? existing?.publishing_split), pro: "", publisher: "", chxndler: true },
      { name: identity.legalName || "Collaborator", stage_name: identity.artistName || "", share: Number(existing?.songwriting_split ?? existing?.publishing_split), pro: "", publisher: "", collaborator: true },
    ] : [
      { name: "CHXNDLER", stage_name: "CHXNDLER", share: "", pro: "", publisher: "", chxndler: true },
      { name: identity.legalName || "Collaborator", stage_name: identity.artistName || "", share: "", pro: "", publisher: "", collaborator: true },
    ],
    master_sync_mode: "none",
    master_sync_share: 0,
    primary_artist: request.primary_artist || request.songs?.primary_artist || "CHXNDLER",
    producer: request.producer || request.songs?.producer || "CHXNDLER",
    master_owner: request.master_owner || request.songs?.master_owner || "CHXNDLER",
    distribution_responsibility: request.distribution_responsibility || request.songs?.distribution_responsibility || "CHXNDLER",
    publishing_administration: request.publishing_administration || request.songs?.publishing_administration || "CHXNDLER",
    sync_coordination: request.sync_coordination || request.songs?.sync_coordination || "CHXNDLER",
  });
  const substitutions: Record<string, string> = { "[Artist Name]": artist, "[Song Title]": String(terms.song_title || "Song") };
  for (const key of Object.keys(terms)) if (typeof terms[key] === "string") {
    let value = String(terms[key]);
    for (const [needle, replacement] of Object.entries(substitutions)) value = value.replaceAll(needle, replacement);
    terms[key] = value;
  }
  if (existing && typeof existing === "object") {
    const fields = new Set(["template_id", "template_version", "admin_template_version", "admin_template_terms", "agreement_version", "contract_html", "reviewed_pdf", ...agreementFields[type].map(field => field.key), "flat_fee", "payment_direction", "master_royalty", "other_master_participants", "master_participants", "master_owner", "songwriting_status", "songwriting_split", "songwriting_splits", "writer_splits", "publishing_split", "master_sync_mode", "master_sync_share", "advanced_master_sync_share", "primary_artist", "producer", "distribution_responsibility", "publishing_administration", "sync_coordination", "payment_terms", "revenue_definition", "deductions", "accounting_frequency", "legal_terms", "additional_terms", "effective_date", "fee_option", "fee_currency"]);
    for (const key of fields) if (own(existing, key)) terms[key] = existing[key] as string | number | null;
    if (!own(existing, "payment_direction") && Number(existing.flat_fee) > 0) terms.payment_direction = "chxndler_pays";
  }
  if (!nonempty(terms.songwriting_split) && terms.publishing_split !== "" && terms.publishing_split !== null && terms.publishing_split !== undefined) terms.songwriting_split = Number(terms.publishing_split);
  terms.template_id = terms.template_id || template.id;
  terms.template_version = terms.template_version || template.version;
  terms.agreement_type = type;
  if (own(terms, "flat_fee") && terms.flat_fee !== "") terms.flat_fee = Number(terms.flat_fee);
  if (own(terms, "master_royalty") && terms.master_royalty !== "") terms.master_royalty = Number(terms.master_royalty);
  terms.songwriting_status = terms.songwriting_status === "negotiated" ? "co_writer" : terms.songwriting_status === "separate_agreement" ? "unresolved" : terms.songwriting_status ?? "unresolved";
  if (Number(terms.flat_fee) > 0 && (!nonempty(terms.payment_terms) || terms.payment_terms === "No flat fee is proposed. This does not waive songwriting or publishing rights.")) {
    terms.payment_terms = "Payment is due within 30 days after receipt of an invoice and acceptance of the listed deliverables.";
  }
  return terms;
}

export function validateAgreement(type: AgreementType, terms: Record<string, any>, forExecution = false) {
  const missing = agreementFields[type].filter(field => field.required && (field.kind === "number"
    ? terms[field.key] === "" || terms[field.key] === null || terms[field.key] === undefined || !Number.isFinite(Number(terms[field.key])) || Number(terms[field.key]) < 0
    : !nonempty(terms[field.key]))).map(field => field.label);
  const fee = Number(terms.flat_fee);
  const master = Number(terms.master_royalty);
  if (terms.flat_fee === "" || terms.flat_fee === null || terms.flat_fee === undefined || !Number.isFinite(fee) || fee < 0) missing.push("Valid flat fee");
  if (terms.master_royalty === "" || terms.master_royalty === null || terms.master_royalty === undefined || !Number.isFinite(master) || master < 0 || master > 100) missing.push("Master royalty from 0 to 100%");
  if (type !== "videographer") {
    if (!["co_writer", "performance_only", "negotiated", "separate_agreement", "unresolved"].includes(String(terms.songwriting_status || ""))) missing.push("Songwriting status");
    if (forExecution && ["unresolved", "separate_agreement", ""].includes(String(terms.songwriting_status || ""))) missing.push("Resolve songwriting ownership and registration schedule before signing or release clearance");
    if (["co_writer", "negotiated"].includes(String(terms.songwriting_status || ""))) {
      const rows = Array.isArray(terms.writer_splits) ? terms.writer_splits : [];
      const values = rows.map((row: any) => Number(row.share));
      const total = values.reduce((sum: number, value: number) => sum + (Number.isFinite(value) ? value : 0), 0);
      if (rows.length < 2 || rows.some((row: any, index: number) => !nonempty(row.name) || row.share === "" || row.share === null || row.share === undefined || !Number.isFinite(values[index]) || values[index] < 0 || values[index] > 100) || Math.abs(total - 100) > 0.001) missing.push("Composition ownership shares totaling exactly 100%");
    }
  }
  if (fee > 0 && !nonempty(terms.payment_terms)) missing.push("Payment terms");
  const participantRows = Array.isArray(terms.master_participants) ? terms.master_participants : [];
  const participants = participantRows.map((row: any) => Number(row.share));
  const participantTotal = participants.reduce((sum: number, value: number) => sum + (Number.isFinite(value) ? value : 0), 0);
  if (participantRows.some((row: any, index: number) => !nonempty(row.name) || row.share === "" || row.share === null || row.share === undefined || !Number.isFinite(participants[index]) || participants[index] < 0 || participants[index] > 100) || Number(terms.master_royalty) + participantTotal > 100) missing.push("Recording royalty shares totaling no more than 100%");
  if (terms.advanced_master_sync_share !== undefined && terms.advanced_master_sync_share !== "" && (!Number.isFinite(Number(terms.advanced_master_sync_share)) || Number(terms.advanced_master_sync_share) < 0 || Number(terms.advanced_master_sync_share) > 100)) missing.push("Advanced master-side sync share from 0 to 100%");
  if (!nonempty(terms.legal_terms)) missing.push("Standard agreement terms");
  return [...new Set(missing)];
}

const asText = (value: unknown, fallback = "Not specified") => nonempty(value) ? String(value).trim() : fallback;
const money = (value: unknown) => `$${(Number(value) || 0).toFixed(2)}`;
const percent = (value: unknown) => `${(Number(value) || 0).toFixed(2).replace(/\.00$/, "")}%`;

export function agreementText(type: AgreementType, terms: Record<string, any>) {
  const template = agreementTemplates[type];
  const fee = Number(terms.flat_fee || 0);
  const direction = terms.payment_direction === "chxndler_pays" ? "CHXNDLER pays the collaborator" : terms.payment_direction === "collaborator_pays" ? "The collaborator pays CHXNDLER" : "No upfront payment";
  const payment = direction !== "No upfront payment" ? `${direction}: ${money(fee)}. ${fee ? asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.") : "No amount is due."}` : "No upfront payment.";
  const writerRows = Array.isArray(terms.writer_splits) ? terms.writer_splits.map((row: any) => `${asText(row.name)}${nonempty(row.stage_name) ? ` (${row.stage_name})` : ""} — ${percent(row.share)}${nonempty(row.pro) ? ` · PRO: ${row.pro}` : ""}${nonempty(row.publisher) ? ` · Publisher/administrator: ${row.publisher}` : ""}`) : [];
  const masterRows = Array.isArray(terms.master_participants) ? terms.master_participants.map((row: any) => `${asText(row.name)} — ${percent(row.share)}`) : String(terms.other_master_participants || "").split("\n").filter(Boolean);
  const writers = terms.songwriting_status === "performance_only" ? "The collaborator reports no original lyric or music contribution. This does not waive rights arising from actual authorship; any authorship must be accurately documented and registered before release." : terms.songwriting_status === "co_writer" || terms.songwriting_status === "negotiated" ? `Agreed composition ownership schedule:\n${writerRows.join("\n")}\n\nOwnership reflects actual authorship. Writer ownership is distinct from publisher or administrator royalties. CHXNDLER administers its own shares and others only when expressly authorized. Distribution does not transfer or grant control of collaborator publishing interests. The agreed schedule and optional registration details will be accurately registered with relevant organizations and administrators.` : "Songwriting ownership is not yet determined. No composition share is waived, transferred, or presumed. The parties must agree and sign an accurate ownership schedule before execution and release clearance.";
  return [
    `CHXNDLER COLLABORATION AGREEMENT · ${template.label.toUpperCase()}`,
    `Agreement version ${terms.agreement_version || "Draft"} · Template ${asText(terms.template_id, template.id)} v${terms.template_version || template.version} · Admin terms ${asText(terms.admin_template_version, "not versioned")}`,
    `Effective date: ${asText(terms.effective_date, "Upon signature by all parties")}`,
    `Song: ${asText(terms.song_title)} · Collaborator: ${asText(terms.collaborator_legal_name)}${terms.collaborator_artist_name ? ` (${terms.collaborator_artist_name})` : ""}`,
    "",
    "1. CONTRIBUTION & DELIVERABLES",
    `${template.scopeLabel}: ${asText(terms.contribution_description)}\n${template.deliverablesLabel}: ${asText(terms[template.deliverablesKey])}\nThe parties will confirm delivery timing, acceptance, and reasonable revisions in writing. Deliverables will be clean and labeled in the agreed format. Each party will disclose third-party materials and restrictions in their contribution.`,
    "",
    "2. PAYMENT & RECORDING ROYALTIES",
    `${payment}\nCollaborator recording royalty: ${percent(terms.master_royalty)} of Net Master Receipts actually received by CHXNDLER from this master, including streaming, downloads, physical sales, and master-side sync license fees. Net Master Receipts means those receipts less only third-party distributor/platform commissions, refunds, chargebacks, collected sales taxes, and payment processing fees actually charged. No production cost, advance, or other cost is recouped unless expressly stated in this signed agreement. Additional allocated recording shares: ${masterRows.join("; ") || "None"}. CHXNDLER receives the unallocated balance. Recording shares may not exceed 100%. This arrangement is separate from composition income and statutory featured-performer royalties.${nonempty(terms.admin_template_terms?.royalties) ? `\n\nAdministrator template — royalties: ${terms.admin_template_terms.royalties}` : ""}`,
    "",
    "3. SONGWRITING & PUBLISHING",
    writers,
    "",
    "4. MASTER RECORDING, PERMISSIONS & SYNC",
    `CHXNDLER owns or controls the existing master. To the extent legally assignable, the collaborator hereby assigns to CHXNDLER all rights in the new recorded vocal performance and its fixation in the completed master, excluding composition copyright and ownership and any nonwaivable statutory performer compensation. Where assignment is not legally effective, the collaborator grants an exclusive, perpetual, worldwide right to exploit that performance as part of the completed master and its authorized promotion. The collaborator authorizes recording, editing, reproduction, distribution, and promotion of the agreed performance in this song. The recording royalty above includes collaborator participation in master-side sync income; an alternate master-side sync share applies only if expressly entered in Advanced Terms${terms.advanced_master_sync_share !== undefined && terms.advanced_master_sync_share !== "" ? `: ${percent(terms.advanced_master_sync_share)} of net master-side sync receipts calculated on the same basis` : ""}. Composition-side sync is separate and requires authorization from relevant composition rightsholders. CHXNDLER coordinates sync only for rights it controls and after required permissions. No statutory performer royalty is waived.${nonempty(terms.admin_template_terms?.ownership) ? `\n\nAdministrator template — ownership: ${terms.admin_template_terms.ownership}` : ""}`,
    "",
    "5. PRODUCTION, DISTRIBUTION & CREDITS",
    `Primary artist: ${asText(terms.primary_artist, "CHXNDLER")} · Producer: ${asText(terms.producer, "CHXNDLER")} · Master rights holder: ${asText(terms.master_owner, "CHXNDLER")} · Official distribution: ${asText(terms.distribution_responsibility, "CHXNDLER")} · Publishing administration: ${asText(terms.publishing_administration, "CHXNDLER")} · Sync coordination: ${asText(terms.sync_coordination, "CHXNDLER")}\nAgreed credit: ${template.creditLabel}: ${asText(terms[template.creditKey])}. CHXNDLER controls official distribution of the agreed recording. The collaborator will not independently distribute or release the contribution or recording. Approved excerpts and agreed credits may be used to promote the released song; neither party may imply unrelated endorsement. Distribution does not transfer composition ownership.${nonempty(terms.admin_template_terms?.credits) ? `\n\nAdministrator template — credits: ${terms.admin_template_terms.credits}` : ""}${nonempty(terms.admin_template_terms?.release_rights) ? `\n\nAdministrator template — release rights: ${terms.admin_template_terms.release_rights}` : ""}`,
    "",
    "6. STATEMENTS & PAYMENTS",
    "Statements are provided annually within 90 days after calendar year end. Payment is due with the statement; amounts below $25 carry forward. The collaborator may dispute a statement in writing within 24 months and request one reasonable records review each year on 30 days notice. Confirmed errors will be corrected in the next statement or within 30 days. SoundExchange and other statutory featured-performer royalties are separate from contractual distributor/master royalties. For multiple featured artists, a separate SoundExchange allocation may need to be documented. Each party handles its own taxes.",
    "",
    "7. DURATION & GENERAL TERMS",
    `This agreement applies only to ${asText(terms.song_title)} and the contribution described above. Rights for authorized released uses continue for exploitation of that recording. Either party may end undelivered work by written notice; payment for accepted completed work remains due. Uses outside the song require separate written agreement. Each party confirms authority to grant the rights stated and will disclose third-party restrictions or claims. Changes require a writing signed by both parties. Electronic signatures and counterparts are permitted where applicable. If a provision is unenforceable, the rest continues as allowed by law.${nonempty(terms.additional_terms) ? `\n\nAdvanced terms: ${String(terms.additional_terms).trim()}` : ""}`,
    "",
    "SIGNATURES",
    `${asText(terms.admin_legal_name, "Chandler Pierce")} / CHXNDLER: ______________________________ Date: __________`,
    `${asText(terms.collaborator_legal_name, "Collaborator")}: ______________________________ Date: __________`,
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function agreementHtml(type: AgreementType, terms: Record<string, any>) {
  const text = agreementText(type, terms);
  const [contractBody] = text.split("\nSIGNATURES\n");
  const safe = escapeHtml(contractBody);
  const title = `${agreementTemplates[type].label} Collaboration Agreement`;
  const adminName = escapeHtml(asText(terms.admin_legal_name, "Chandler Pierce"));
  const collaboratorName = escapeHtml(asText(terms.collaborator_printed_name || terms.collaborator_legal_name, "Collaborator"));
  const collaboratorSignature = terms.collaborator_signature ? `<span class="typed-signature">${escapeHtml(String(terms.collaborator_signature))}</span>` : "";
  const collaboratorDate = terms.collaborator_signed_at ? new Date(terms.collaborator_signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "________________";
  const icon = (path: string) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const rightsSummary = `<aside class="rights"><h2>Rights at a glance</h2><div class="rights-grid"><div>${icon("M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Zm0 4-4 1.5v2.5c0 2.8 1.5 4.8 4 6 2.5-1.2 4-3.2 4-6V8.5L12 7Z")}<b>Ownership</b><small>Each party keeps rights to material they already own.</small></div><div>${icon("M12 3v18m7-14H5m14 10H5m2-6h10a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4Zm-1 4h10a2 2 0 0 1 0 4H8a2 2 0 0 1 0-4Z")}<b>Royalties</b><small>Fees and master royalties follow the specific terms below.</small></div><div>${icon("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h8")}<b>Songwriting</b><small>Publishing shares are documented separately unless stated here.</small></div><div>${icon("M5 12h13m-5-5 5 5-5 5M4 4v16")}<b>Release use</b><small>Use and release permissions stay within this agreement.</small></div></div><p>Quick guide only. The agreement terms below control.</p></aside>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f4f4f5;color:#17171c;font:15px/1.65 Georgia,'Times New Roman',serif}.page{max-width:850px;margin:40px auto;padding:56px 64px;background:#fff;box-shadow:0 8px 40px #0002}header{border-bottom:2px solid #fd52af;padding-bottom:24px;margin-bottom:32px}header b{font:800 14px Arial,sans-serif;letter-spacing:.18em;color:#c92e83}h1{font:700 30px Arial,sans-serif;margin:12px 0 0}.content{white-space:pre-wrap}.rights{margin:0 0 28px;padding:18px;border:1px solid #ecd5e2;border-radius:14px;background:#fff8fc;font:14px/1.45 Arial,sans-serif}.rights h2{margin:0 0 12px;font-size:16px}.rights-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rights-grid>div{display:grid;grid-template-columns:30px 1fr;column-gap:8px;align-items:center}.rights-grid .icon{grid-row:span 2;width:24px;height:24px;fill:none;stroke:#e6389f;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.rights-grid b{font-size:12px}.rights-grid small{color:#555;font-size:11px}.rights>p{margin:12px 0 0;color:#777;font-size:10px}.signatures{margin-top:30px;padding-top:16px;border-top:1px solid #ddd;font:14px/1.5 Arial,sans-serif}.signatures h2{font-size:16px}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:14px}.signature-line{height:70px;border-bottom:1px solid #555;display:flex;align-items:flex-end}.admin-signature{max-width:210px;max-height:62px;object-fit:contain;object-position:left bottom}.typed-signature{color:#f02699;font:italic 34px 'Brush Script MT','Segoe Script',cursive;line-height:1}.signature-meta{margin-top:7px;font-size:11px;color:#555}.actions{max-width:850px;margin:0 auto 24px;text-align:right}.actions button{border:0;border-radius:999px;background:#fd52af;padding:12px 20px;font-weight:700;cursor:pointer}@media(max-width:640px){.page{margin:0;padding:32px 22px;box-shadow:none}.actions{padding:12px}.rights-grid,.signature-grid{grid-template-columns:1fr}}@media print{body{background:#fff}.page{margin:0 auto;padding:0;box-shadow:none}.actions{display:none}}</style></head><body><main class="page"><header><b>CHXNDLER · COLLABORATION</b><h1>${escapeHtml(title)}</h1></header>${rightsSummary}<div class="content">${safe}</div><section class="signatures"><h2>Signatures</h2><p>By signing, each party agrees to the terms above.</p><div class="signature-grid"><div><div class="signature-line"><img class="admin-signature" src="/elements/PINK%20SIGNATURE.png" alt="Chandler Pierce signature" /></div><p class="signature-meta">${adminName} · CHXNDLER<br/>Date: ______________</p></div><div><div class="signature-line">${collaboratorSignature}</div><p class="signature-meta">${collaboratorName}<br/>Date: ${escapeHtml(collaboratorDate)}</p></div></div></section></main><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>`;
}
