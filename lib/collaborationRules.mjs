export const CONTRIBUTION_TYPES = ["Vocals / Feature", "Production / Remix", "Songwriting", "Other"];
export const REQUEST_STATUSES = ["new", "reviewing", "approved", "declined", "agreement_pending", "signed", "in_progress", "completed", "canceled", "archived"];

export function validateCollaborationSubmission(input) {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  return Boolean(
    typeof input.songId === "string" && input.songId.trim() &&
    typeof input.inviteToken === "string" && input.inviteToken.trim() &&
    typeof input.submissionKey === "string" && /^[0-9a-f-]{36}$/i.test(input.submissionKey) &&
    typeof input.artistName === "string" && input.artistName.trim().length > 0 && input.artistName.length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 &&
    CONTRIBUTION_TYPES.includes(input.contributionType) && input.acknowledged === true
  );
}

export function canMarkAgreementSigned({ signedVerified, agreementPath, verifiedDocumentExists }) {
  return signedVerified === true && verifiedDocumentExists === true && typeof agreementPath === "string" && agreementPath.trim().length > 0;
}

export function isConfiguredAdmin(email, configuredEmail) {
  return typeof email === "string" && typeof configuredEmail === "string" &&
    configuredEmail.trim().length > 0 && email.trim().toLowerCase() === configuredEmail.trim().toLowerCase();
}
