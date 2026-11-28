export type AgreementType = "singer_feature" | "producer" | "remix" | "videographer";
export type AgreementFieldKind = "text" | "textarea" | "number" | "percent" | "date" | "select";
export type AgreementField = { key: string; label: string; kind?: AgreementFieldKind; options?: { value: string; label: string }[]; required?: boolean };
export type AgreementTerms = Record<string, any>;

export const productionTooltipText: Record<string, string> = {
  "Primary Artist": "The main artist credited on the official release.",
  Producer: "The person responsible for producing the musical recording.",
  "Master Owner": "The owner of the sound recording. Receiving recording royalties does not automatically grant ownership of the master.",
  "Distribution Rights": "The party authorized to distribute and release the recording on streaming platforms and other services.",
};

export const agreementTypes: { value: AgreementType; label: string }[] = [
  { value: "singer_feature", label: "Singer / Feature" },
  { value: "producer", label: "Producer" },
  { value: "remix", label: "Remix" },
  { value: "videographer", label: "Videographer" },
];

export function agreementStatusLabel(status?: string | null) {
  const value = String(status || "draft").toLowerCase();
  if (value === "signed") return "Signed";
  if (["sent", "offer_sent", "awaiting_signature"].includes(value)) return "Sent";
  return "Draft";
}

export const agreementTemplates: Record<AgreementType, { id: string; version: number; label: string; scopeLabel: string; deliverablesKey: string; deliverablesLabel: string; creditKey: string; creditLabel: string; defaults: Record<string, string | number>; legalTerms: string }> = {
  singer_feature: {
    id: "chxndler-singer-feature", version: 7, label: "Singer / Feature", scopeLabel: "Contribution", deliverablesKey: "vocal_deliverables", deliverablesLabel: "Vocal recording and deliverables", creditKey: "artist_credit", creditLabel: "Artist credit",
    defaults: { contribution_description: "Perform the agreed vocal feature.", vocal_deliverables: "Lead vocals, agreed harmonies and ad-libs.", artist_credit: "CHXNDLER feat. [Artist Name]" },
    legalTerms: "MASTER & PERFORMER PERMISSIONS\nCHXNDLER owns or controls only the master rights expressly identified in this agreement. The collaborator keeps ownership of their performance and materials unless a separate, effective written transfer is signed. The collaborator gives CHXNDLER permission to record, edit, reproduce, distribute, and promote the agreed performance as part of this named project and to seek authorized licenses for it. No recording royalty transfers master copyright. Commercial release and sync use require the permissions stated here and any required third-party approvals.\n\nROYALTY CALCULATIONS\nRecording royalties apply only to money actually received by CHXNDLER for exploitation of this master, after third-party platform, distributor, payment-processing, tax, refund, and directly attributable recoupable costs. Statements are issued annually within 90 days after year end; amounts under $25 carry forward. The collaborator may ask for reasonable supporting records once per year. Statutory performer payments collected directly by a society remain separate.\n\nSONGWRITING & PUBLISHING\nComposition ownership follows actual authorship and the writer shares expressly listed in this agreement. CHXNDLER does not own or administer the collaborator's composition share because it distributes the recording. CHXNDLER may administer only its own share and any other share it is expressly authorized to administer in writing.\n\nSYNC LICENSING\nMaster and composition permissions are separate. CHXNDLER coordinates master licensing only for rights it controls and requests collaborator approval where this agreement or law requires it. A zero additional master sync share does not waive composition income or rights. No sync use is authorized beyond the granted permissions and required approvals.\n\nCREDITS, PROMOTION & RELEASE\nCHXNDLER manages production and distribution of applicable CHXNDLER-owned recordings and uses the agreed credits, subject to platform limits. Each party may use approved project excerpts for promotion after public release. No unrelated endorsement is implied.\n\nDELIVERABLES & GENERAL\nThe collaborator will provide the listed deliverables by a mutually agreed date; the parties will confirm acceptance and reasonable revisions in writing. Each party will disclose samples, third-party materials, restrictions, or claims affecting their contribution. Changes must be accepted in writing by both parties. This agreement applies only to the named project; no rights transfer is implied beyond the permissions expressly written above. Electronic signatures and counterparts are permitted where applicable law allows." 
  },
  producer: {
    id: "chxndler-producer", version: 7, label: "Producer", scopeLabel: "Production scope", deliverablesKey: "deliverables", deliverablesLabel: "Production deliverables", creditKey: "producer_credit", creditLabel: "Producer credit",
    defaults: { production_scope: "Produce and arrange the agreed contribution for the named project.", deliverables: "Final stereo WAV, agreed stems, and project files specifically listed by the parties.", producer_credit: "Produced by [Artist Name]" },
    legalTerms: "OWNERSHIP & RIGHTS\nEach party retains its pre-existing materials. The collaborator retains rights in original production, performances, and compositions they create, except for the project-specific license expressly granted here. The collaborator grants CHXNDLER a non-exclusive, worldwide license to incorporate and use the listed deliverables in the named project and its promotion. No assignment of new production, performance, or composition rights is implied. Any ownership transfer or exclusive license must be stated in a separate signed provision.\n\nMASTER ROYALTY\nThe default master royalty is 0% unless a different percentage is expressly entered above and accepted in this agreement. This does not decide songwriting or publishing shares.\n\nSONGWRITING & PUBLISHING\nShares follow actual authorship. Any applicable songwriting split must be agreed in writing; a blank split is not a zero share. If not agreed here, the parties will use a separate signed split agreement before release.\n\nRELEASE, DISTRIBUTION & CREDIT\nCHXNDLER controls official release and distribution, subject to the license above. Credit will follow the credit field above and applicable platform limits. Project-related promotional use is permitted; unrelated endorsement is not.\n\nDELIVERABLES & ACCEPTANCE\nThe collaborator will provide the production deliverables listed above. The parties will agree on dates and reasonable revisions in writing. Third-party samples and materials must be disclosed and cleared by the party supplying them.\n\nREPRESENTATIONS\nEach party confirms authority to enter this agreement and will disclose any restrictions, third-party materials, or claims affecting their contribution.\n\nGENERAL\nChanges must be in a writing accepted by both parties. No exclusivity applies unless described under Additional Terms. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law. The parties may sign counterparts and electronic copies where permitted."
  },
  remix: {
    id: "chxndler-remix", version: 7, label: "Remix", scopeLabel: "Remix scope", deliverablesKey: "remix_deliverables", deliverablesLabel: "Remix deliverables", creditKey: "remixer_credit", creditLabel: "Remixer credit",
    defaults: { remix_title: "[Song Title] ([Artist Name] Remix)", contribution_description: "Create the agreed remix using only authorized source materials.", remix_deliverables: "Final stereo WAV and the agreed instrumental and stem files.", remixer_credit: "[Artist Name] Remix" },
    legalTerms: "OWNERSHIP & RIGHTS\nCHXNDLER retains the original song and original master recording, including all rights owned before this collaboration. The collaborator retains rights in pre-existing and newly created material they own. CHXNDLER grants a limited, non-exclusive license to use supplied source materials solely to create and deliver the named remix. The collaborator grants CHXNDLER a non-exclusive, worldwide license to use the delivered remix in the named project and its promotion. No ownership transfer of the remix, performance, or composition is implied.\n\nMASTER ROYALTY\nThe default master royalty is 0% unless a different percentage is expressly entered above and accepted in this agreement.\n\nSONGWRITING & PUBLISHING\nRemixing alone does not set a composition share. Shares follow actual authorship. Any applicable split must be agreed in a separate signed writing; a blank split is not a zero share.\n\nRELEASE & DISTRIBUTION\nThe collaborator may not independently release the remix. CHXNDLER controls official release and distribution subject to the license and any expressly agreed royalty above.\n\nDELIVERABLES, CREDIT & ACCEPTANCE\nThe collaborator will provide the remix deliverables listed above and use the remixer credit above. The parties will agree on delivery dates and reasonable revisions in writing. Third-party samples and materials must be disclosed and cleared by the party supplying them.\n\nREPRESENTATIONS\nEach party confirms authority to grant the rights stated here and will disclose restrictions or third-party claims affecting their contribution.\n\nGENERAL\nChanges must be in a writing accepted by both parties. No exclusivity applies unless described under Additional Terms. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law. The parties may sign counterparts and electronic copies where permitted."
  },
  videographer: {
    id: "chxndler-videographer", version: 6, label: "Videographer", scopeLabel: "Video concept & scope", deliverablesKey: "video_deliverables", deliverablesLabel: "Filming and editing deliverables", creditKey: "credits", creditLabel: "Video credit",
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
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

/** A split is made up of the primary participant's remainder and all explicit shares. */
export function calculateSplitSummary(otherShares: unknown[]) {
  const values = otherShares.map(value => value === "" || value === null || value === undefined ? Number.NaN : Number(value));
  const valid = values.every(value => Number.isFinite(value) && value >= 0 && value <= 100);
  const otherTotal = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const primaryShare = 100 - otherTotal;
  return { primaryShare, otherTotal, total: primaryShare + otherTotal, valid: valid && primaryShare >= 0 };
}

function requestIdentity(request: Record<string, any>, invite?: Record<string, any> | null) {
  const name = [request.first_name || invite?.first_name, request.last_name || invite?.last_name].filter(Boolean).join(" ").trim();
  return {
    legalName: request.collaborator_profile?.legal_name || name || invite?.display_name || "",
    artistName: request.collaborator_profile?.artist_name || request.artist_name || invite?.artist_name || "",
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
    agreement_issue_date: today(),
    effective_date: "",
    admin_legal_name: "Chandler Pierce",
    admin_artist_name: "CHXNDLER",
    collaborator_legal_name: identity.legalName,
    collaborator_artist_name: artist,
    song_title: request.songs?.title || request.song_title || "",
    collaboration_request_id: request.id || "",
    music_video_project_id: request.music_video_project_id || "",
    contribution_role: request.contribution_type || template.label,
    contribution_description: request.agreed_contribution_description || template.defaults.contribution_description || "",
    recording_arrangement: existing?.recording_arrangement || request.recording_arrangement || "",
    recording_arrangement_details: existing?.recording_arrangement_details || "",
    delivery_deadline: existing?.delivery_deadline || request.delivery_deadline || "",
    target_release_date: existing?.target_release_date || request.songs?.release_date || request.release_date || "",
    music_video_participation: existing?.music_video_participation || "",
    fee_option: existing?.fee_option || "",
    flat_fee: existing && own(existing, "flat_fee") ? existing.flat_fee : request.flat_fee !== null && request.flat_fee !== undefined ? Number(request.flat_fee) : 0,
    payment_direction: existing && own(existing, "payment_direction") ? existing.payment_direction : existing && own(existing, "flat_fee") || request.flat_fee !== null && request.flat_fee !== undefined ? (Number(existing?.flat_fee ?? request.flat_fee) > 0 ? "chxndler_pays" : "none") : "none",
    master_royalty: existing && own(existing, "master_royalty") ? existing.master_royalty : request.master_royalty !== null && request.master_royalty !== undefined ? Number(request.master_royalty) : "",
    revenue_definition: existing && own(existing, "revenue_definition") ? existing.revenue_definition : "Net master receipts actually received by CHXNDLER",
    deductions: existing && own(existing, "deductions") ? existing.deductions : "Third-party platform and distributor commissions, processing fees, refunds, chargebacks, and collected taxes actually charged",
    accounting_frequency: existing && own(existing, "accounting_frequency") ? existing.accounting_frequency : "Statements and payments annually, within 90 days after year-end",
    payment_threshold: existing && own(existing, "payment_threshold") ? existing.payment_threshold : 25,
    songwriting_status: "unresolved",
    master_owner: "CHXNDLER",
    songwriting_split: "",
    publishing_split: "",
    payment_terms: existing?.payment_terms || request.payment_terms || "",
    payment_due_date: existing?.payment_due_date || request.payment_due_date || "",
    fee_currency: existing?.fee_currency || request.fee_currency || "USD",
    legal_terms: "No additional terms.",
    additional_terms: "",
  };
  // Request facts take precedence over reusable wording; saved values are
  // applied below and therefore always win over both.
  terms.contribution_description = request.agreed_contribution_description || template.defaults.contribution_description || "";
  if (request.songs?.title || request.song_title) terms.song_title = request.songs?.title || request.song_title;
  if (request.artist_credit) terms[template.creditKey] = request.artist_credit;
  for (const [key, value] of Object.entries(template.defaults)) if (!own(terms, key) || terms[key] === "") terms[key] = value;
  if (request.flat_fee !== null && request.flat_fee !== undefined && request.flat_fee !== "" && Number(request.flat_fee) >= 0) terms.flat_fee = Number(request.flat_fee);
  if (request.master_royalty !== null && request.master_royalty !== undefined && request.master_royalty !== "" && Number(request.master_royalty) >= 0) terms.master_royalty = Number(request.master_royalty);
  if (request.publishing_royalty !== null && request.publishing_royalty !== undefined) terms.publishing_split = String(request.publishing_royalty);
  Object.assign(terms, {
    payment_direction: terms.payment_direction,
    master_royalty: terms.master_royalty,
    master_participants: Array.isArray(existing?.master_participants) ? existing.master_participants : String(existing?.other_master_participants || "").split("\n").map((line: string) => line.trim()).filter(Boolean).map((line: string) => { const [name, share] = line.split(/[|,\t]/); return { name: name?.trim() || "", share: Number(share?.replace(/%/g, "").trim()) || "" }; }),
    songwriting_status: "unresolved",
    songwriting_split: request.publishing_royalty === null || request.publishing_royalty === undefined ? "" : Number(request.publishing_royalty),
    writer_splits: Array.isArray(existing?.writer_splits) ? existing.writer_splits : ["co_writer", "negotiated"].includes(String(existing?.songwriting_status)) && Number(existing?.songwriting_split ?? existing?.publishing_split) >= 0 ? [
      { name: "Chandler Pierce", stage_name: "CHXNDLER", share: 100 - Number(existing?.songwriting_split ?? existing?.publishing_split), pro: "", publisher: "", chxndler: true },
      { name: identity.legalName || "Collaborator", stage_name: identity.artistName || "", share: Number(existing?.songwriting_split ?? existing?.publishing_split), pro: "", publisher: "", collaborator: true },
    ] : existing?.songwriting_status === "performance_only" ? [
      { name: "Chandler Pierce", stage_name: "CHXNDLER", share: 100, pro: "", publisher: "", chxndler: true },
      { name: identity.legalName || "Collaborator", stage_name: identity.artistName || "", share: 0, pro: "", publisher: "", collaborator: true },
    ] : [
      { name: "Chandler Pierce", stage_name: "CHXNDLER", share: "", pro: "", publisher: "", chxndler: true },
      { name: identity.legalName || "Collaborator", stage_name: identity.artistName || "", share: "", pro: "", publisher: "", collaborator: true },
    ],
    master_sync_mode: existing?.master_sync_mode || "none",
    master_sync_share: existing?.master_sync_share ?? "",
    primary_artist: request.primary_artist || request.songs?.primary_artist || "CHXNDLER",
    producer: request.producer || request.songs?.producer || "CHXNDLER",
    master_owner: request.master_owner || request.songs?.master_owner || "CHXNDLER",
    distribution_responsibility: request.distribution_responsibility || request.songs?.distribution_responsibility || "CHXNDLER",
    publishing_administration: request.publishing_administration || request.songs?.publishing_administration || "CHXNDLER",
    sync_coordination: request.sync_coordination || request.songs?.sync_coordination || "CHXNDLER",
    governing_law: existing?.governing_law || request.governing_law || "New York",
  });
  const substitutions: Record<string, string> = { "[Artist Name]": artist, "[Song Title]": String(terms.song_title || "Song") };
  for (const key of Object.keys(terms)) if (typeof terms[key] === "string") {
    let value = String(terms[key]);
    for (const [needle, replacement] of Object.entries(substitutions)) value = value.replaceAll(needle, replacement);
    terms[key] = value;
  }
  if (existing && typeof existing === "object") {
  const fields = new Set(["template_id", "template_version", "admin_template_version", "admin_template_terms", "agreement_version", "contract_html", "reviewed_pdf", ...agreementFields[type].map(field => field.key), "flat_fee", "payment_direction", "master_royalty", "other_master_participants", "master_participants", "master_owner", "songwriting_status", "songwriting_split", "songwriting_splits", "writer_splits", "publishing_split", "master_sync_mode", "master_sync_share", "advanced_master_sync_share", "primary_artist", "producer", "distribution_responsibility", "publishing_administration", "sync_coordination", "payment_terms", "payment_due_date", "revenue_definition", "deductions", "accounting_frequency", "payment_threshold", "legal_terms", "additional_terms", "effective_date", "agreement_issue_date", "fee_option", "fee_currency", "contribution_role", "recording_arrangement", "recording_arrangement_details", "target_release_date", "music_video_participation", "governing_law"]);
    for (const key of fields) if (own(existing, key)) terms[key] = existing[key] as string | number | null;
    if (!nonempty(terms.payment_direction)) terms.payment_direction = Number(terms.flat_fee) > 0 ? "chxndler_pays" : "none";
  }
  // The request is the source for this choice until the agreement has a saved value.
  const validRecordingArrangements = ["chxndler_session", "independent"];
  if (validRecordingArrangements.includes(String(request.recording_arrangement || "")) && !validRecordingArrangements.includes(String(terms.recording_arrangement || ""))) {
    terms.recording_arrangement = request.recording_arrangement;
  }
  if (!nonempty(terms.music_video_participation) && nonempty(request.music_video_participation)) {
    terms.music_video_participation = request.music_video_participation;
  }
  if (!nonempty(terms.songwriting_split) && terms.publishing_split !== "" && terms.publishing_split !== null && terms.publishing_split !== undefined) terms.songwriting_split = Number(terms.publishing_split);
  terms.template_id = terms.template_id || template.id;
  terms.template_version = type !== "videographer" && String(terms.master_owner || "").trim().toUpperCase() === "CHXNDLER" ? template.version : Math.min(template.version, 6);
  terms.agreement_type = type;
  if (own(terms, "flat_fee") && terms.flat_fee !== "") terms.flat_fee = Number(terms.flat_fee);
  if (own(terms, "master_royalty") && terms.master_royalty !== "") terms.master_royalty = Number(terms.master_royalty);
  terms.songwriting_status = terms.songwriting_status === "negotiated" ? "co_writer" : terms.songwriting_status === "separate_agreement" ? "unresolved" : terms.songwriting_status ?? "unresolved";
  if (Number(terms.flat_fee) > 0 && Number(terms.template_version || 0) < 7 && !nonempty(terms.payment_terms)) {
    terms.payment_terms = "Payment is due within 30 days after receipt of an invoice and acceptance of the listed deliverables.";
  }
  return terms;
}

export function validateAgreement(type: AgreementType, terms: Record<string, any>, forExecution = false) {
  const missing = agreementFields[type].filter(field => field.required && (field.kind === "number" ? terms[field.key] === "" || terms[field.key] === null || terms[field.key] === undefined || !Number.isFinite(Number(terms[field.key])) || Number(terms[field.key]) < 0 : !nonempty(terms[field.key]))).map(field => field.label);
  if (Number(terms.template_version || 0) >= 7 && (type === "videographer" || String(terms.master_owner || "").trim().toUpperCase() !== "CHXNDLER")) missing.push("CHXNDLER full master ownership for this agreement template");
  const fee = Number(terms.flat_fee);
  if (!Number.isFinite(fee) || fee < 0) missing.push("Valid upfront payment amount");
  if (!["none", "chxndler_pays", "collaborator_pays"].includes(String(terms.payment_direction || ""))) missing.push("Upfront payment selection");
  if (terms.payment_direction === "none" && fee !== 0) missing.push("No upfront payment must be $0");
  if (["chxndler_pays", "collaborator_pays"].includes(String(terms.payment_direction)) && (!Number.isFinite(fee) || fee <= 0)) missing.push("Enter the fixed payment amount");
  const royaltyRows = Array.isArray(terms.master_participants) ? terms.master_participants : [];
  const royaltySplit = calculateSplitSummary([terms.master_royalty, ...royaltyRows.map((row:any)=>row.share)]);
  if (terms.master_royalty === "" || terms.master_royalty === null || terms.master_royalty === undefined || !royaltySplit.valid || royaltyRows.some((row:any)=>!nonempty(row.name)||row.share===""||row.share===null||row.share===undefined)) missing.push("Recording royalty shares totaling exactly 100%");
  if (forExecution && !["chxndler_session", "independent"].includes(String(terms.recording_arrangement || ""))) missing.push("Recording arrangement");
  if (forExecution && !nonempty(terms.target_release_date)) missing.push("Proposed target release date");
  if (forExecution && !["interested", "not_interested"].includes(String(terms.music_video_participation || ""))) missing.push("Music video participation selection");
  if (type !== "videographer") {
    if (!["co_writer", "performance_only", "negotiated"].includes(String(terms.songwriting_status || ""))) missing.push("Songwriting decision");
    const rows = Array.isArray(terms.writer_splits) ? terms.writer_splits : [];
    if (["co_writer", "negotiated"].includes(String(terms.songwriting_status))) {
      const values=rows.map((row:any)=>Number(row.share)); const total=values.reduce((sum:number,value:number)=>sum+(Number.isFinite(value)?value:0),0);
      const primary = rows.find((row:any)=>row.chxndler);
      const writerSplit = calculateSplitSummary(rows.filter((row:any)=>!row.chxndler).map((row:any)=>row.share));
      if(rows.length<2||!primary||rows.some((row:any,index:number)=>!nonempty(row.name)||row.share===""||row.share===null||row.share===undefined||!Number.isFinite(values[index])||values[index]<0||values[index]>100)||!writerSplit.valid||Math.abs(Number(primary?.share)-writerSplit.primaryShare)>0.001||Math.abs(total-writerSplit.total)>0.001) missing.push("Composition ownership shares totaling exactly 100%");
    }
    if(terms.songwriting_status==="performance_only"&&rows.length){const total=rows.reduce((sum:number,row:any)=>sum+Number(row.share||0),0);const primary=rows.find((row:any)=>row.chxndler);const writerSplit=calculateSplitSummary(rows.filter((row:any)=>!row.chxndler).map((row:any)=>row.share));if(rows.some((row:any)=>!nonempty(row.name)||row.share===""||row.share===null||!Number.isFinite(Number(row.share))||Number(row.share)<0||Number(row.share)>100)||!primary||!writerSplit.valid||Math.abs(Number(primary?.share)-writerSplit.primaryShare)>0.001||Math.abs(total-writerSplit.total)>0.001)missing.push("Composition ownership shares totaling exactly 100%");}
  }
  if (fee > 0 && Number(terms.template_version || 0) >= 7 && !nonempty(terms.payment_due_date)) missing.push("Agreed payment due date");
  else if (fee > 0 && Number(terms.template_version || 0) < 7 && !nonempty(terms.payment_terms)) missing.push("Payment terms");
  if (forExecution && Number(terms.template_version || 0) < 7 && royaltySplit.otherTotal > 0 && (!nonempty(terms.revenue_definition)||!nonempty(terms.deductions)||!nonempty(terms.accounting_frequency))) missing.push("Royalty revenue definition, deductions, and reporting frequency");
  return [...new Set(missing)];
}

export function agreementReviewFlags(type: AgreementType, terms: Record<string, any>) {
  const flags: string[] = [];
  const fee = Number(terms.flat_fee);
  const master = Number(terms.master_royalty);
  const masterResolved = terms.master_royalty !== "" && terms.master_royalty !== null && terms.master_royalty !== undefined && Number.isFinite(master);
  const writerParticipation = type !== "videographer" && ["co_writer", "negotiated"].includes(String(terms.songwriting_status || ""));
  if (terms.payment_direction === "none" && fee === 0 && masterResolved && master === 0 && !writerParticipation) flags.push("No upfront payment, recording royalty, or songwriting participation is included. Review this arrangement before sending.");
  return flags;
}

const asText = (value: unknown, fallback = "Not specified") => nonempty(value) ? String(value).trim() : fallback;
const money = (value: unknown) => `$${(Number(value) || 0).toFixed(2)}`;
const percent = (value: unknown) => `${(Number(value) || 0).toFixed(2).replace(/\.00$/, "")}%`;
const displayAgreementDate = (value: unknown) => {
  const date = String(value || "");
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}-${match[3]}-${match[1]}` : date;
};

function legacyAgreementSections(type: AgreementType, terms: Record<string, any>) {
  const template = agreementTemplates[type];
  const fee = Number(terms.flat_fee || 0);
  const direction = terms.payment_direction === "chxndler_pays" ? "CHXNDLER pays the collaborator" : terms.payment_direction === "collaborator_pays" ? "The collaborator pays CHXNDLER" : "No upfront payment";
  const payment = fee > 0 && direction !== "No upfront payment" ? `${direction}: ${money(fee)}. ${asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.")}` : "No upfront payment.";
  const writerRows = Array.isArray(terms.writer_splits) ? terms.writer_splits.map((row: any) => `${asText(row.name)}${nonempty(row.stage_name) ? ` (${row.stage_name})` : ""} — ${percent(row.share)}`) : [];
  const masterRows = Array.isArray(terms.master_participants) ? terms.master_participants.map((row: any) => `${asText(row.name)} — ${percent(row.share)}`) : String(terms.other_master_participants || "").split("\n").filter(Boolean);
  const writerSection = type === "videographer" ? "This video services agreement does not grant or change ownership of the song or composition. Any songwriting contribution must be documented in a separate signed writer split." : terms.songwriting_status === "performance_only" ? "Performance Only. No composition share is granted under this agreement. This does not waive a right arising from actual authorship; any such authorship must be documented in an accurate signed split schedule." : terms.songwriting_status === "co_writer" || terms.songwriting_status === "negotiated" ? `Co-Writer. Agreed composition ownership:\n${writerRows.join("\n")}\nThese shares reflect actual authorship. Each writer retains their composition rights. CHXNDLER administers its own shares and any other shares only when expressly authorized in writing. Master ownership and distribution do not transfer composition ownership.` : "Songwriting status and any required writer shares must be resolved in the editor before this agreement can be approved for signature.";
  const syncShare = terms.advanced_master_sync_share !== undefined && terms.advanced_master_sync_share !== "" ? Number(terms.advanced_master_sync_share) : 0;
  const syncSentence = syncShare > 0 ? `For master-side sync receipts, the collaborator receives ${percent(syncShare)} of net receipts after only third-party platform, distributor, processing charges, refunds, chargebacks, and collected taxes. This replaces the collaborator's ordinary recording royalty for those same sync receipts; it is not added on top.` : "The recording royalty above includes the collaborator's share of master-side sync receipts; those receipts are counted once. Composition-side sync requires permission from the relevant composition owners.";
  const customTemplateTerms = nonempty(terms.legal_terms) && terms.legal_terms !== template.legalTerms && terms.legal_terms !== "No additional terms." ? `\n\nAdditional agreed terms: ${String(terms.legal_terms).trim()}` : "";
  return [
    { title: "01 · Contribution", body: `${asText(terms.collaborator_legal_name)}${terms.collaborator_artist_name ? ` (${terms.collaborator_artist_name})` : ""} will provide ${template.scopeLabel.toLowerCase()}: ${asText(terms.contribution_description)} Deliverables: ${asText(terms[template.deliverablesKey])}${terms.delivery_deadline ? ` Target delivery: ${terms.delivery_deadline}.` : ""} The parties will agree on delivery timing, acceptance, and reasonable revisions in writing. Each party will disclose third-party material or restrictions in their contribution.` },
    { title: "02 · Payment & Royalties", body: `${payment}\n\nThe collaborator receives ${percent(terms.master_royalty)} of net master receipts actually received by CHXNDLER for this recording. Net receipts deduct only third-party platform or distributor commissions, payment processing fees, refunds, chargebacks, and collected taxes actually charged. No other costs are recouped unless expressly stated in this agreement. Statements and payment are annual within 90 days after year end; balances below $25 carry forward. ${syncSentence} Statutory performer royalties payable by a collection society remain separate. ${masterRows.length ? `Other recording royalty participants: ${masterRows.join("; ")}.` : ""}` },
    { title: "03 · Songwriting & Publishing", body: writerSection },
    { title: "04 · Recording Rights & Release", body: type === "videographer" ? `${asText(terms.master_owner, "CHXNDLER")} owns or controls the song and completed sound recording. The videographer retains copyright in their original footage and video unless the parties sign a separate transfer. The videographer grants CHXNDLER an exclusive, worldwide, perpetual license to edit, reproduce, distribute, publicly display, promote, and license the delivered video and agreed edits with this song. The grant includes music videos, promotional clips, and authorized sync placements, subject to composition permissions. CHXNDLER manages the official release and distribution of the song and video. Neither party may independently distribute the completed master or video without the other party's written authorization. Any AI replica of a person requires separate express written permission.` : `${asText(terms.master_owner, "CHXNDLER")} owns or controls the completed master as identified here. To the extent assignable, the collaborator assigns to CHXNDLER their rights in the recorded performance as fixed in this master, excluding composition rights and nonwaivable statutory compensation. If assignment is ineffective, the collaborator grants CHXNDLER an exclusive, worldwide, perpetual license to edit, reproduce, distribute, promote, and license the performance as part of this master and its authorized derivatives. This permission includes the song's music video, promotional clips, edits, remixes, and master-side sync placements, subject to the composition permissions required for each use. CHXNDLER manages production, official distribution, promotion, and licensing of the master. Neither party may independently distribute the completed master without the other's written authorization. AI voice cloning or a digital replica of the collaborator requires separate express written permission.` },
    { title: "05 · Credits & General Terms", body: `Agreed credit: ${asText(terms[template.creditKey])}. Producer credit: ${asText(terms.producer_credit, "CHXNDLER, when accurate")}. Each party permits reasonable use of their approved name, artist name, and likeness to identify and promote this collaboration and its release. Each party confirms they have authority to enter this agreement and grant the rights stated. This agreement covers ${asText(terms.song_title)} only. Either party may end undelivered work by written notice; accrued payment obligations and permissions already used for an authorized release remain in effect. Changes require written agreement by both parties. Disputes will first be discussed in good faith; if unresolved, they will be handled under the laws of ${asText(terms.governing_law, "Maryland")}, without affecting rights that cannot legally be waived. Electronic signatures and dates are permitted. The issue date is ${asText(terms.agreement_issue_date, "the date shown when issued")}; each party's signature date is recorded separately.${customTemplateTerms}${nonempty(terms.additional_terms) ? `\n\nAgreed project terms: ${String(terms.additional_terms).trim()}` : ""}` },
  ];
}

function legacyAgreementText(type: AgreementType, terms: Record<string, any>) {
  const template = agreementTemplates[type];
  const sections = agreementSections(type, terms).map(section => `${section.title.toUpperCase()}\n${section.body}`).join("\n\n");
  return [`CHXNDLER × ${asText(terms.collaborator_artist_name, "Collaborator")}`, asText(terms.song_title), `Issue date: ${asText(terms.agreement_issue_date, "Not set")} · Version ${terms.agreement_version || "Draft"} · ${template.label}`, "", sections, "", "SIGNATURES", `${asText(terms.admin_legal_name, "Chandler Pierce")} / CHXNDLER · Date: __________`, `${asText(terms.collaborator_legal_name, "Collaborator")} · Date: __________`].join("\n").replace(/\n{3,}/g, "\n\n");
}

function agreementSectionsV4(type: AgreementType, terms: Record<string, any>) {
  const fee = Number(terms.flat_fee);
  const royalty = Number(terms.master_royalty);
  const hasRoyalty = royalty > 0 || (terms.master_participants || []).some((row: any) => Number(row.share) > 0);
  const syncShare = Number(terms.advanced_master_sync_share || 0);
  const payment = terms.payment_direction === "none" && fee === 0 ? "One-Time Payment: $0." : fee > 0 && terms.payment_direction === "chxndler_pays" ? "One-Time Payment: CHXNDLER pays the collaborator " + money(fee) + " " + asText(terms.fee_currency, "USD") + ". Payment timing: " + asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.") : fee > 0 && terms.payment_direction === "collaborator_pays" ? "One-Time Payment: the collaborator pays CHXNDLER " + money(fee) + " " + asText(terms.fee_currency, "USD") + ". Payment timing: " + asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.") : "One-Time Payment: Pending.";
  const masterRows = Array.isArray(terms.master_participants) ? terms.master_participants.filter((row: any) => nonempty(row.name) && row.share !== "" && row.share !== null && row.share !== undefined).map((row: any) => asText(row.name) + " — " + percent(row.share)) : [];
  const hasSync = syncShare > 0;
  const royaltyAdministration = hasRoyalty || hasSync ? " Applicable recording and master sync royalties are calculated from " + asText(terms.revenue_definition, "Pending confirmation") + ", after " + asText(terms.deductions, "Pending confirmation") + ". Reporting and payment: " + asText(terms.accounting_frequency, "Pending confirmation") + (terms.payment_threshold !== "" && terms.payment_threshold !== null && terms.payment_threshold !== undefined && Number(terms.payment_threshold) > 0 ? ". Amounts below " + money(terms.payment_threshold) + " carry forward." : ".") + (masterRows.length ? " Other recording royalty shares: " + masterRows.join("; ") + "." : "") : "";
  const syncDetail = hasSync ? " The additional master sync share of " + percent(syncShare) + (hasRoyalty ? " applies to master-side licensing receipts in place of the recording royalty on those same receipts; they are not stacked." : " is the agreed share of master-side licensing receipts; no recording royalty applies to those same receipts.") : "";
  const writing = type === "videographer" ? "No songwriting share is included. Any actual songwriting contribution and ownership must be documented separately; this agreement does not override authorship rights." : terms.songwriting_status === "performance_only" ? "No songwriting contribution is included. This does not waive rights arising from actual authorship." : ["co_writer", "negotiated"].includes(String(terms.songwriting_status)) ? "Agreed writer shares appear above and reflect actual authorship. Each writer retains their composition rights. CHXNDLER administers only its own share and any other share expressly authorized in writing." : "Songwriting ownership is pending confirmation and must be resolved before signing.";
  const arrangement = terms.recording_arrangement === "chxndler_session" ? "recording with CHXNDLER" : terms.recording_arrangement === "independent" ? "recording independently" : asText(terms.recording_arrangement_details, "the agreed recording arrangement");
  const videoUse = "The agreed recording may be used in a music video under the recording rights granted here, regardless of the collaborator’s interest selection.";
  const rights = type === "videographer" ? "The videographer retains ownership of original footage and video unless a separate signed transfer says otherwise, and grants CHXNDLER permission to use the delivered video as agreed above." : "The collaborator transfers applicable rights in the recorded performance to CHXNDLER or, where transfer is unavailable, grants CHXNDLER an exclusive, worldwide, perpetual license to use it as part of the recording. Composition rights and nonwaivable statutory royalties remain separate.";
  const compensationIntro = hasRoyalty || hasSync ? "Payment, recording royalties and songwriting ownership follow the agreed terms above." : "Payment and songwriting ownership follow the agreed terms above.";
  const releaseRights = type === "videographer"
    ? "CHXNDLER manages the official release and distribution of the song and video. The videographer may not publish unreleased footage or independently distribute the completed video without CHXNDLER’s written permission."
    : "CHXNDLER manages the official release, distribution, promotion and licensing of the master. The collaborator may not independently release, upload or distribute the recording, including alternate versions containing the agreed recording, without CHXNDLER’s written permission.";
  const law = asText(terms.governing_law, "Maryland");
  const extras = nonempty(terms.additional_terms) ? " Agreed project-specific terms: " + String(terms.additional_terms).trim() : "";
  return [
    { title: "01 · Contribution", body: "Both parties agree to the contributions and recording arrangements outlined above (" + arrangement + "), including agreed delivery requirements and reasonable revisions." },
    { title: "02 · Compensation & Songwriting", body: compensationIntro + " " + payment + royaltyAdministration + syncDetail + " " + writing + " Songwriting rights and nonwaivable statutory royalties remain separate from recording ownership." },
    { title: "03 · Recording & Release", body: rights + " " + releaseRights + " The proposed release date is subject to change. " + videoUse },
    { title: "04 · Creative Use & Credits", body: "CHXNDLER may use the recording in music videos, promotional content, edits, remixes and authorized licensing, subject to required songwriting permissions. Both parties agree to the specified credits and permit reasonable use of their approved artist names and likenesses to promote the release. Music video appearance is optional and non-binding. Both parties may share approved promotional content. AI voice cloning and digital replicas require separate written consent." },
    { title: "05 · General Terms", body: "Both parties confirm they have the necessary rights to provide their contributions and will disclose third-party material or restrictions. This agreement applies only to " + asText(terms.song_title, "the specified song") + ". Either party may end undelivered work by written notice; accrued payment obligations and permissions already used for an authorized release remain in effect. Changes require mutual written approval. The parties will first try to resolve disputes in good faith; unresolved disputes are governed by " + law + ". Electronic signatures and counterparts are permitted. Issue date: " + asText(terms.agreement_issue_date, "not set") + "; signature dates are recorded separately." + extras },
  ];
}

function agreementSectionsV6(type: AgreementType, terms: Record<string, any>) {
  // Older saved and signed versions retain the exact terms they were issued with.
  if (Number(terms.template_version || 0) < 5) return agreementSectionsV4(type, terms);
  const fee = Number(terms.flat_fee);
  const royalty = Number(terms.master_royalty);
  const hasRoyalty = royalty > 0 || (terms.master_participants || []).some((row: any) => Number(row.share) > 0);
  const payment = terms.payment_direction === "none" && fee === 0 ? "One-Time Payment: $0." : fee > 0 && terms.payment_direction === "chxndler_pays" ? "One-Time Payment: CHXNDLER pays the collaborator " + money(fee) + " " + asText(terms.fee_currency, "USD") + ". Payment timing: " + asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.") : fee > 0 && terms.payment_direction === "collaborator_pays" ? "One-Time Payment: the collaborator pays CHXNDLER " + money(fee) + " " + asText(terms.fee_currency, "USD") + ". Payment timing: " + asText(terms.payment_terms, "Due within 30 days after invoice and acceptance of deliverables.") : "One-Time Payment: Pending.";
  const masterRows = Array.isArray(terms.master_participants) ? terms.master_participants.filter((row: any) => nonempty(row.name) && row.share !== "" && row.share !== null && row.share !== undefined).map((row: any) => asText(row.name) + " — " + percent(row.share)) : [];
  const royaltyAdministration = hasRoyalty ? " Applicable recording royalties are calculated from " + asText(terms.revenue_definition, "Pending confirmation") + ", after " + asText(terms.deductions, "Pending confirmation") + ". Reporting and payment: " + asText(terms.accounting_frequency, "Pending confirmation") + (terms.payment_threshold !== "" && terms.payment_threshold !== null && terms.payment_threshold !== undefined && Number(terms.payment_threshold) > 0 ? ". Amounts below " + money(terms.payment_threshold) + " carry forward." : ".") + (masterRows.length ? " Other recording royalty shares: " + masterRows.join("; ") + "." : "") : "";
  const collaborator = asText(terms.collaborator_artist_name, "Collaborator");
  const royaltySplit = calculateSplitSummary([terms.master_royalty, ...(terms.master_participants || []).map((row:any)=>row.share)]);
  const royaltyRows = [`CHXNDLER — ${percent(royaltySplit.primaryShare)}`, `${collaborator} — ${percent(terms.master_royalty)}`, ...(terms.master_participants || []).map((row:any)=>`${asText(row.name)} — ${percent(row.share)}`)];
  const writerRows = (terms.writer_splits || []).map((row:any)=>`${asText(row.name)}${nonempty(row.stage_name)?` (${String(row.stage_name).trim()})`:""} — ${percent(row.share)}`);
  const writing = type === "videographer" ? "No songwriting share is included. Any actual songwriting contribution and ownership must be documented separately; this agreement does not override authorship rights." : terms.songwriting_status === "performance_only" ? "The collaborator receives 0% songwriting ownership under this agreement. Other songwriter shares are preserved as listed below. This does not waive rights arising from actual authorship.\n" + ((terms.writer_splits || []).length ? (terms.writer_splits || []).map((row:any)=>`${asText(row.name)}${nonempty(row.stage_name)?` (${String(row.stage_name).trim()})`:""} — ${percent(row.share)}`).join("\n") : `Chandler Pierce (CHXNDLER) — 100%\n${asText(terms.collaborator_legal_name, collaborator)} (${collaborator}) — 0%`) : ["co_writer", "negotiated"].includes(String(terms.songwriting_status)) ? "Agreed writer shares appear above and reflect actual authorship. Each writer retains their composition rights. CHXNDLER administers only its own share and any other share expressly authorized in writing." : "Songwriting ownership is pending confirmation and must be resolved before signing.";
  const arrangement = terms.recording_arrangement === "chxndler_session" ? "recording with CHXNDLER" : terms.recording_arrangement === "independent" ? "recording independently" : asText(terms.recording_arrangement_details, "the agreed recording arrangement");
  const extras = nonempty(terms.additional_terms) ? " Agreed project-specific terms: " + String(terms.additional_terms).trim() : "";
  const rights = type === "videographer" ? "The videographer retains ownership of original footage and video unless a separate signed transfer says otherwise, and grants CHXNDLER permission to use the delivered video as agreed above." : "CHXNDLER owns and controls the master recording and the rights in the recorded performance granted under this agreement. The collaborator grants the permissions needed to record, edit, reproduce, distribute, promote, and license the agreed contribution as part of this project.";
  const releaseRights = type === "videographer" ? "CHXNDLER retains control of the song release and distribution. The videographer may not publish unreleased footage or independently distribute the completed video without CHXNDLER’s written permission." : "CHXNDLER retains control of distribution and release authority for the master. The collaborator may not independently release, upload, or distribute the recording without CHXNDLER’s written permission.";
  return [
    { title: "01 · Contribution", body: "Both parties agree to the contributions and recording arrangements outlined above (" + arrangement + "), including agreed delivery requirements and reasonable revisions." },
    { title: "02 · Compensation & Songwriting", body: "Payment, recording royalties, and songwriting ownership follow these independent agreed terms. " + payment + "\n\nRecording royalties (separate from master ownership):\n" + royaltyRows.join("\n") + ".\n\n" + royaltyAdministration + "\n\n" + (["co_writer", "negotiated"].includes(String(terms.songwriting_status)) ? "Songwriting ownership of the underlying lyrics and composition:\n" + writerRows.join("\n") + ". Each writer retains their composition rights; administration and composition sync licenses follow the applicable ownership and licensing rights." : writing) + " Any master-side sync revenue follows the agreed master revenue split unless otherwise agreed in a signed writing. Songwriting rights and nonwaivable statutory royalties remain separate from recording ownership." },
    { title: "03 · Recording & Release", body: rights + " " + releaseRights + " CHXNDLER is the primary artist, producer, master owner, and distributor under this standard arrangement. The proposed release date is subject to change." },
    { title: "04 · Creative Use & Credits", body: "CHXNDLER may use the recording in music videos, promotional content, edits, remixes, and authorized licensing, subject to the composition permissions described above. Both parties agree to the specified credits and permit reasonable use of their approved artist names and likenesses to promote the release. Music video appearance is optional and non-binding. Both parties may share approved promotional content. AI voice cloning and digital replicas require separate written consent." },
    { title: "05 · General Terms", body: "Both parties confirm they have the necessary rights to provide their contributions and will disclose third-party material or restrictions. This agreement applies only to " + asText(terms.song_title, "the specified song") + ". Either party may end undelivered work by written notice; accrued payment obligations and permissions already used for an authorized release remain in effect. Changes require mutual written approval. The parties will first try to resolve disputes in good faith. This agreement is governed by the laws of the State of New York. Electronic signatures and counterparts are permitted. Issue date: " + asText(terms.agreement_issue_date, "not set") + "; signature dates are recorded separately." + extras },
  ];
}

const agreementTermsV7 = {
  preamble: "The collaboration details, compensation, royalty splits, ownership and credits outlined above form part of this agreement.",
  sections: [
    { title: "01 · Contribution", body: "Both parties agree to the specified contributions, recording arrangements, delivery requirements and reasonable revisions." },
    { title: "02 · Compensation & Songwriting", body: "Recording royalties are calculated from master revenue received after applicable third-party fees, refunds, chargebacks and transaction taxes.\n\nRoyalties are paid through automated distributor splits where available. Any remaining recording royalties received directly by CHXNDLER are paid according to the agreed split at least annually.\n\nRecording royalties do not grant master ownership. Each songwriter retains their agreed composition ownership and collects songwriting royalties through their respective royalty organizations or publishing administrators. Applicable statutory royalty rights remain unaffected." },
    { title: "03 · Recording & Release", body: "The collaborator hereby assigns their copyright interest in the master recording to CHXNDLER, excluding songwriting ownership and nonwaivable statutory rights.\n\nCHXNDLER retains exclusive master ownership and control over editing, distribution, promotion, licensing and release, subject to applicable composition rights.\n\nThe collaborator may not upload, distribute, release or license the recording without CHXNDLER's written permission. CHXNDLER decides whether and when the recording is released." },
    { title: "04 · Creative Use & Credits", body: "Both parties agree to the specified credits and permit reasonable promotional use of their names and approved likenesses.\n\nCHXNDLER may use the recording in music videos, promotional content, edits and remixes, subject to applicable composition rights. Music video participation is optional." },
    { title: "05 · General Terms", body: "Both parties confirm they have the necessary rights to their contributions and will disclose any third-party material or restrictions.\n\nThis agreement applies only to the specified song. Changes require mutual written approval.\n\nNew York law governs this agreement. Electronic signatures are accepted." },
  ],
};

export function agreementSections(type: AgreementType, terms: Record<string, any>) {
  // Version 7 is specifically the full-master-ownership agreement. Older
  // versions continue to render their original clauses; video services retain
  // their separate agreement template.
  if (Number(terms.template_version || 0) >= 7 && type !== "videographer" && String(terms.master_owner || "").trim().toUpperCase() === "CHXNDLER") return agreementTermsV7.sections;
  if (Number(terms.template_version || 0) < 5) return agreementSectionsV4(type, terms);
  return agreementSectionsV6(type, terms);
}

export function agreementPresentation(type: AgreementType, terms: Record<string, any>) {
  const template = agreementTemplates[type];
  const royalty = terms.master_royalty === "" || terms.master_royalty === null || terms.master_royalty === undefined ? "Pending" : percent(terms.master_royalty);
  const fee = terms.flat_fee === "" || terms.flat_fee === null || terms.flat_fee === undefined || !Number.isFinite(Number(terms.flat_fee)) ? "Pending" : terms.payment_direction === "none" && Number(terms.flat_fee) === 0 ? "$0" : ["chxndler_pays", "collaborator_pays"].includes(String(terms.payment_direction)) && Number(terms.flat_fee) > 0 ? money(terms.flat_fee) + " " + asText(terms.fee_currency, "USD") : "Pending";
  const writerRows = Array.isArray(terms.writer_splits) ? terms.writer_splits : [];
  const collaboratorWriter = writerRows.find((row:any)=>!row.chxndler && (row.collaborator || nonempty(terms.collaborator_legal_name) && String(row.name||"").trim().toLowerCase() === String(terms.collaborator_legal_name).trim().toLowerCase() || nonempty(terms.collaborator_artist_name) && String(row.stage_name||"").trim().toLowerCase() === String(terms.collaborator_artist_name).trim().toLowerCase()));
  const collaboratorWritingShare = type === "videographer" || terms.songwriting_status === "performance_only" ? "0%" : ["co_writer", "negotiated"].includes(String(terms.songwriting_status)) ? collaboratorWriter && collaboratorWriter.share !== "" && collaboratorWriter.share !== null && collaboratorWriter.share !== undefined && Number.isFinite(Number(collaboratorWriter.share)) ? percent(collaboratorWriter.share) : "Pending" : "Pending";
  const legacyVersion = Number(terms.template_version || 0) < 5;
  const sync = legacyVersion ? Number(terms.advanced_master_sync_share || 0) : 0;
  const productionRows = legacyVersion ? [
    ["Primary Artist", asText(terms.primary_artist, "CHXNDLER"), "artist"], ["Producer", asText(terms.producer, "CHXNDLER, when accurate"), "producer"],
    ["Master Owner", asText(terms.master_owner, "CHXNDLER"), "master"], ["Distribution Rights", "Managed by " + asText(terms.distribution_responsibility, "CHXNDLER") + (nonempty(terms.distribution_service) ? " · " + String(terms.distribution_service).trim() : ""), "distribution"],
    ["Publishing", asText(terms.publishing_administration, "CHXNDLER") + " — authorized shares only", "publishing"], ["Sync Licensing", "Managed by " + asText(terms.sync_coordination, "CHXNDLER") + " — required permissions apply", "sync"],
  ] : [
    ["Primary Artist", "CHXNDLER", "artist"], ["Producer", "CHXNDLER", "producer"],
    ["Master Owner", "CHXNDLER", "master"], ["Distribution Rights", "CHXNDLER", "distribution"],
  ];
  const arrangement = terms.recording_arrangement === "chxndler_session" ? "Recording with CHXNDLER" : terms.recording_arrangement === "independent" ? "Recording independently" : terms.recording_arrangement === "other" ? asText(terms.recording_arrangement_details, "Other, as agreed") : "Pending";
  const video = terms.music_video_participation === "interested" ? "Interested" : terms.music_video_participation === "not_interested" ? "Not interested" : "Pending";
  const royaltySplit = calculateSplitSummary([terms.master_royalty, ...(Array.isArray(terms.master_participants) ? terms.master_participants.map((row: any) => row.share) : [])]);
  const masterSplitRows = [
    { name: "CHXNDLER", legalName: asText(terms.admin_legal_name, "Chandler Pierce"), share: royaltySplit.valid && terms.master_royalty !== "" && terms.master_royalty !== null && terms.master_royalty !== undefined ? percent(royaltySplit.primaryShare) : "Pending" },
    { name: asText(terms.collaborator_artist_name, asText(terms.collaborator_legal_name, "Collaborator")), legalName: asText(terms.collaborator_legal_name, "Legal name pending"), share: terms.master_royalty === "" || terms.master_royalty === null || terms.master_royalty === undefined ? "Pending" : percent(terms.master_royalty) },
    ...(Array.isArray(terms.master_participants) ? terms.master_participants.filter((row: any) => nonempty(row.name)).map((row: any) => ({ name: asText(row.artist_name, asText(row.stage_name, String(row.name).trim())), legalName: asText(row.legal_name, String(row.name).trim()), share: row.share === "" || row.share === null || row.share === undefined ? "Pending" : percent(row.share) })) : []),
  ];
  const writerSplitRows = Array.isArray(terms.writer_splits) ? terms.writer_splits.map((row: any) => ({ name: asText(row.stage_name, asText(row.name, "Songwriter")), legalName: asText(row.name, "Legal name pending"), share: row.share === "" || row.share === null || row.share === undefined ? "Pending" : percent(row.share) })) : [];
  const usesV7Template = Number(terms.template_version || 0) >= 7 && type !== "videographer" && String(terms.master_owner || "").trim().toUpperCase() === "CHXNDLER";
  const legalPreamble = usesV7Template ? agreementTermsV7.preamble : "";
  return {
    collaborator: asText(terms.collaborator_artist_name, asText(terms.collaborator_legal_name, "Collaborator")),
    song: asText(terms.song_title, "Song / project"),
    role: asText(terms.contribution_role, template.label),
    deliverables: asText(terms[template.deliverablesKey], "Pending confirmation"),
    compensation: [
      { label: "One-Time Payment", value: fee === "$0" || fee === "Pending" ? fee : fee + (terms.payment_direction === "chxndler_pays" ? " · CHXNDLER pays" : terms.payment_direction === "collaborator_pays" ? " · collaborator pays" : ""), icon: "wallet", help: "A fixed payment for your contribution." },
      { label: "Recording Royalties", value: royalty, icon: "disc", help: "Your agreed share of revenue from the recording, separate from master ownership and songwriting." },
      { label: "Songwriting Ownership", value: collaboratorWritingShare, icon: "pen", help: "Your ownership share of the underlying lyrics and musical composition, separate from recording royalties." },
      ...(sync > 0 ? [{ label: "Additional Master Sync Share", value: percent(sync), icon: "clapperboard", help: Number(terms.master_royalty) > 0 ? "This applies in place of recording royalties on the same master-side licensing revenue so those receipts are counted once." : "This is the agreed share of master-side licensing revenue; no recording royalty applies to those same receipts." }] : []),
    ],
    masterSplitRows,
    writerSplitRows,
    paymentDueDate: fee !== "$0" && fee !== "Pending" && nonempty(terms.payment_due_date) ? displayAgreementDate(terms.payment_due_date) : "",
    productionRows,
    arrangements: [["Recording Arrangement", arrangement], ...(nonempty(terms.delivery_deadline) ? [["Delivery Date", String(terms.delivery_deadline)]] : []), ["Target Release Date", terms.target_release_date ? displayAgreementDate(terms.target_release_date) : "Pending"], ["Music Video Participation", video], ["Artist Credit", asText(terms[template.creditKey], "Pending")]],
    legalSections: agreementSections(type, terms),
    legalPreamble,
    usesV7Template,
  };
}

export function agreementText(type: AgreementType, terms: Record<string, any>) {
  const view = agreementPresentation(type, terms);
  const lines = [
    "CHXNDLER × " + view.collaborator, view.song,
    "Issue date: " + asText(terms.agreement_issue_date, "Not set") + " · Version " + (terms.agreement_version || "Draft"), "",
    "YOUR CONTRIBUTION", view.role, view.deliverables, "",
    "YOUR COMPENSATION & RIGHTS", ...view.compensation.map((item: any) => item.label + ": " + item.value), ...(view.paymentDueDate ? ["Payment due date: " + view.paymentDueDate] : []), "",
    ...(view.usesV7Template ? ["RECORDING ROYALTY SPLITS", ...view.masterSplitRows.map((row: any) => `${row.name} (${row.legalName}): ${row.share}`), "", "SONGWRITING OWNERSHIP SPLITS", ...(view.writerSplitRows.length ? view.writerSplitRows.map((row: any) => `${row.name} (${row.legalName}): ${row.share}`) : ["Pending confirmation"]), ""] : []),
    "PRODUCTION & RELEASE", ...view.productionRows.map((row: any) => row[0] + ": " + row[1]), "",
    "COLLABORATION ARRANGEMENTS", ...view.arrangements.map((row: any) => row[0] + ": " + row[1]), "",
    "AGREEMENT TERMS", ...(view.legalPreamble ? [view.legalPreamble, ""] : []), ...view.legalSections.flatMap((section: any) => [section.title + "\n" + section.body, ""]),
    "SIGNATURES", "Legal name: " + asText(terms.admin_legal_name, "Chandler Pierce") + " · Artist name: CHXNDLER · Signature date: __________",
    "Legal name: " + asText(terms.collaborator_legal_name, "Collaborator") + (nonempty(terms.collaborator_artist_name) ? " · Artist name: " + String(terms.collaborator_artist_name).trim() : "") + " · Signature date: __________",
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function agreementHtml(type: AgreementType, terms: Record<string, any>) {
  const text = agreementText(type, terms);
  const safe = escapeHtml(text);
  const title = `CHXNDLER Collaboration Agreement — ${asText(terms.song_title, "Song")}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f4f4f5;color:#17171c;font:15px/1.65 Arial,sans-serif}.page{max-width:850px;margin:36px auto;padding:48px 58px;background:#fff}header{border-bottom:2px solid #fd52af;padding-bottom:22px;margin-bottom:24px}header img{width:138px;height:40px;object-fit:contain;object-position:left}header p{margin:16px 0 0;color:#c92e83;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}h1{font-size:29px;margin:8px 0}.content{white-space:pre-wrap;font-size:14px;line-height:1.75}.print{max-width:850px;margin:0 auto 24px;text-align:right}.print button{border:0;border-radius:999px;background:#fd52af;padding:11px 18px;font-weight:700;cursor:pointer}@media(max-width:640px){.page{margin:0;padding:28px 20px}.content{font-size:13px}}@media print{body{background:#fff}.page{margin:0 auto;padding:0}.print{display:none}}</style></head><body><main class="page"><header><img src="/elements/logo.webp" alt="CHXNDLER"/><p>Collaboration Agreement</p><h1>${escapeHtml(asText(terms.song_title, "Song / project"))}</h1></header><div class="content">${safe}</div></main><div class="print"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>`;
}
