export const CONTRIBUTION_TYPES = ["Vocals / Feature", "Production / Remix", "Songwriting", "Other"];
export const REQUEST_STATUSES = ["new", "reviewing", "approved", "declined", "agreement_pending", "signed", "in_progress", "completed", "canceled", "archived"];

export function validateCollaborationSubmission(input) {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  return Boolean(
    typeof input.songId === "string" && input.songId.trim() &&
    typeof input.inviteId === "string" && /^[0-9a-f-]{36}$/i.test(input.inviteId) &&
    typeof input.termsVersion === "string" && input.termsVersion.trim().length > 0 && input.termsVersion.trim().length <= 80 &&
    typeof input.submissionKey === "string" && /^[0-9a-f-]{36}$/i.test(input.submissionKey) &&
    typeof input.artistName === "string" && input.artistName.trim().length > 0 && input.artistName.length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 &&
    CONTRIBUTION_TYPES.includes(input.contributionType) && input.acknowledged === true
  );
}

export function canMarkAgreementSigned({ signedVerified, agreementPath, verifiedDocumentExists }) {
  return signedVerified === true && verifiedDocumentExists === true && typeof agreementPath === "string" && agreementPath.trim().length > 0;
}

const STATUS_TRANSITIONS = {
  new: ["reviewing", "declined", "canceled"],
  reviewing: ["approved", "declined", "canceled"],
  approved: ["agreement_pending", "canceled"],
  agreement_pending: ["signed", "canceled"],
  signed: ["in_progress", "canceled"],
  in_progress: ["completed", "canceled"],
  declined: ["archived"],
  completed: ["archived"],
  canceled: ["archived"],
  archived: [],
};
export function canTransitionCollaborationStatus(current, next) {
  return current === next || Boolean(STATUS_TRANSITIONS[current]?.includes(next));
}

export function isValidCollaborationInvite({ exists, revokedAt, expiresAt, collaborationEnabled, now = Date.now() }) {
  if (exists !== true || revokedAt) return false;
  if (collaborationEnabled !== true) return false;
  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiry) || expiry <= now) return false;
  }
  return true;
}

export function isConfiguredAdmin(email, configuredEmail) {
  return typeof email === "string" && typeof configuredEmail === "string" &&
    configuredEmail.trim().length > 0 && email.trim().toLowerCase() === configuredEmail.trim().toLowerCase();
}
