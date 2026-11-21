export type AgreementType = "singer_feature" | "remix" | "producer" | "videographer";
export type AgreementField = { key: string; label: string; kind?: "text" | "textarea" | "number" | "percent" | "date" | "select"; advanced?: boolean; options?: string[]; defaultValue?: string };

export const agreementTypes: { value: AgreementType; label: string }[] = [
  { value: "singer_feature", label: "Singer / Feature" },
  { value: "remix", label: "Remix" },
  { value: "producer", label: "Producer" },
  { value: "videographer", label: "Videographer" },
];

const sharedFields: AgreementField[] = [
  { key: "collaborator_legal_name", label: "Collaborator legal name" },
  { key: "collaborator_artist_name", label: "Artist / professional name" },
  { key: "contribution_description", label: "Contribution description", kind: "textarea" },
  { key: "fee_option", label: "Compensation", kind: "select", options: ["No fee", "Custom fee"] },
  { key: "flat_fee", label: "Flat fee ($)", kind: "number" },
];

export const agreementFields: Record<AgreementType, AgreementField[]> = {
  singer_feature: [
    ...sharedFields,
    { key: "master_royalty", label: "Master royalty (%) · negotiated", kind: "percent", advanced: true },
    { key: "publishing_split", label: "Publishing / composition split (%) · negotiated", kind: "percent", advanced: true },
    { key: "songwriting_contribution", label: "Songwriting contribution", kind: "textarea" },
    { key: "master_terms", label: "Master ownership and license terms", kind: "textarea", advanced: true, defaultValue: "CHXNDLER retains ownership of the existing master and underlying song. Any master royalty must be expressly negotiated. A flat fee alone does not transfer copyright or eliminate songwriting rights." },
    { key: "vocal_deliverables", label: "Vocal recording deliverables", kind: "textarea" },
    { key: "artist_credit", label: "Artist credit", defaultValue: "CHXNDLER featuring [collaborator artist name]" },
    { key: "release_permissions", label: "Release and distribution permissions", kind: "textarea", advanced: true, defaultValue: "CHXNDLER controls the official release and distribution, subject to the signed agreement." },
    { key: "promotional_permissions", label: "Promotional permissions", kind: "textarea", advanced: true },
    { key: "exclusivity_restrictions", label: "Exclusivity / release restrictions", kind: "textarea", advanced: true },
    { key: "payment_terms", label: "Payment terms", kind: "textarea", advanced: true },
  ],
  remix: [
    ...sharedFields,
    { key: "remixer_credit", label: "Remixer credit", defaultValue: "[collaborator artist name] Remix" },
    { key: "remix_title", label: "Remix title" },
    { key: "master_royalty", label: "Remix master royalty (%) · negotiated", kind: "percent", advanced: true },
    { key: "publishing_split", label: "Publishing / composition split (%) · if applicable", kind: "percent", advanced: true },
    { key: "ownership_terms", label: "Ownership of remix master", kind: "textarea", advanced: true, defaultValue: "CHXNDLER retains ownership of the original song and original master. Ownership of any new remix master and any royalty arrangement must be expressly agreed in writing." },
    { key: "stems_license", label: "License to use original stems / composition", kind: "textarea", advanced: true, defaultValue: "Use of supplied stems and composition is limited to the authorized remix project. No independent release without written authorization." },
    { key: "remix_deliverables", label: "Remix deliverables", kind: "textarea", defaultValue: "Final WAV and agreed stems." },
    { key: "release_approval", label: "Release approval", kind: "textarea", advanced: true, defaultValue: "CHXNDLER controls approval and the official remix release, subject to the signed agreement." },
    { key: "distribution_rights", label: "Distribution rights", kind: "textarea", advanced: true },
    { key: "remix_restrictions", label: "Remix restrictions", kind: "textarea", advanced: true },
    { key: "payment_terms", label: "Payment terms", kind: "textarea", advanced: true },
  ],
  producer: [
    ...sharedFields,
    { key: "producer_credit", label: "Producer credit" },
    { key: "production_scope", label: "Contribution / production scope", kind: "textarea" },
    { key: "master_royalty", label: "Master royalty / producer points (%) · negotiated", kind: "percent", advanced: true },
    { key: "publishing_split", label: "Publishing split (%) · if songwriting contribution exists", kind: "percent", advanced: true },
    { key: "ownership_terms", label: "Ownership / assignment terms", kind: "textarea", advanced: true, defaultValue: "CHXNDLER retains ownership of existing material. Any ownership transfer or license for new production must be expressly defined in the signed agreement." },
    { key: "beat_rights", label: "Beat / instrumental rights", kind: "textarea", advanced: true },
    { key: "sample_clearance", label: "Sample clearance responsibilities", kind: "textarea", advanced: true, defaultValue: "Third-party samples must be disclosed and appropriately cleared before delivery or release." },
    { key: "deliverables", label: "Deliverables", kind: "textarea", defaultValue: "Agreed masters, stems, and project files if specified." },
    { key: "revision_terms", label: "Revision terms", kind: "textarea", advanced: true },
    { key: "release_rights", label: "Release rights", kind: "textarea", advanced: true },
    { key: "payment_terms", label: "Payment terms", kind: "textarea", advanced: true },
  ],
  videographer: [
    { key: "collaborator_legal_name", label: "Videographer legal name" },
    { key: "collaborator_artist_name", label: "Professional / company credit" },
    { key: "production_scope", label: "Production scope", kind: "textarea" },
    { key: "shoot_dates", label: "Shoot date(s)", kind: "textarea" },
    { key: "shoot_locations", label: "Shoot location(s)", kind: "textarea" },
    { key: "fee_option", label: "Project fee", kind: "select", options: ["No fee", "Custom fee"] },
    { key: "flat_fee", label: "Flat project fee ($)", kind: "number" },
    { key: "payment_schedule", label: "Payment schedule", kind: "textarea", advanced: true },
    { key: "video_deliverables", label: "Final video deliverables", kind: "textarea" },
    { key: "short_form_edits", label: "Short-form edits", kind: "textarea" },
    { key: "raw_footage", label: "Raw footage requirements", kind: "textarea", advanced: true },
    { key: "resolution_format", label: "Resolution and format", kind: "textarea" },
    { key: "revision_rounds", label: "Revision rounds", kind: "text" },
    { key: "delivery_deadline", label: "Delivery deadline", kind: "date" },
    { key: "copyright_terms", label: "Copyright ownership / assignment", kind: "textarea", advanced: true, defaultValue: "Commissioned-work ownership will transfer only as expressly stated in a signed written agreement. Work-made-for-hire applies only where legally valid; otherwise an express assignment is required if transfer is intended." },
    { key: "portfolio_permissions", label: "Portfolio permissions", kind: "textarea", advanced: true },
    { key: "credits", label: "Credits", kind: "textarea" },
    { key: "release_restrictions", label: "Release restrictions", kind: "textarea", advanced: true, defaultValue: "CHXNDLER retains final creative and release approval. No unreleased footage may be published without approval. Pre-existing third-party materials must be disclosed and properly licensed." },
  ],
};

export function agreementTypeForContribution(value?: string | null): AgreementType {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("video") || normalized.includes("videograph")) return "videographer";
  if (normalized.includes("remix")) return "remix";
  if (normalized.includes("production") || normalized.includes("producer")) return "producer";
  return "singer_feature";
}

export function createAgreementDraft(input: { type: AgreementType; request: Record<string, any>; invite?: Record<string, any> | null }) {
  const { type, request, invite } = input;
  const legalName = [invite?.first_name, invite?.last_name].filter(Boolean).join(" ").trim() || request.artist_name || "";
  const artistName = invite?.artist_name || request.artist_name || "";
  const terms: Record<string, string> = {
    admin_legal_name: "Chandler Pierce",
    admin_artist_name: "CHXNDLER",
    collaborator_legal_name: legalName,
    collaborator_artist_name: artistName,
    song_title: request.songs?.title || "Original song idea",
    contribution_description: request.message || request.contribution_type || "",
    fee_option: "No fee",
    flat_fee: "",
    master_royalty: "",
    publishing_split: "",
  };
  for (const field of agreementFields[type]) if (field.defaultValue && !terms[field.key]) terms[field.key] = field.defaultValue;
  terms.fee_option = terms.fee_option || "No fee";
  return terms;
}

export function agreementText(type: AgreementType, terms: Record<string, string>) {
  const role = agreementTypes.find(item => item.value === type)?.label || type;
  const lines = [
    "CHXNDLER COLLABORATION AGREEMENT — DRAFT FOR REVIEW",
    "This generated template requires legal review and approval before use. It is not signed or binding until executed by all parties.",
    `Agreement type: ${role}`,
    `Song / project: ${terms.song_title || "Not specified"}`,
    `CHXNDLER: ${terms.admin_legal_name || "Chandler Pierce"} professionally known as ${terms.admin_artist_name || "CHXNDLER"}`,
    `Collaborator: ${terms.collaborator_legal_name || "Not specified"}${terms.collaborator_artist_name ? ` professionally known as ${terms.collaborator_artist_name}` : ""}`,
    "",
    "SCOPE AND TERMS",
  ];
  for (const field of agreementFields[type]) {
    if (["collaborator_legal_name", "collaborator_artist_name", "fee_option"].includes(field.key)) continue;
    const value = terms[field.key]?.trim();
    if (value) lines.push(`${field.label}: ${value}`);
  }
  lines.push(
    `Compensation: ${terms.fee_option === "Custom fee" && terms.flat_fee ? `$${terms.flat_fee}` : "No fee proposed"}.`,
    "Master royalties and composition/publishing interests are separate. Blank percentages are unnegotiated and do not grant rights.",
    "No ownership transfer, distribution permission, or release authorization is effective unless expressly stated in the final agreement signed by both parties.",
    "Unreleased music and footage must remain confidential. Third-party materials must be disclosed and appropriately licensed.",
    "",
    "TERMINATION AND CANCELLATION",
    "Either party may pause work and discuss cancellation in writing. Any fees, completed work, licenses, and rights on cancellation must be expressly agreed in the final signed agreement.",
    "",
    "SIGNATURES — to be completed on the reviewed final document",
    `CHXNDLER / Chandler Pierce: ______________________________   Date: __________`,
    `${terms.collaborator_legal_name || "Collaborator"}: ______________________________   Date: __________`,
  );
  return lines.join("\n");
}
