import test from "node:test";
import assert from "node:assert/strict";
import { validateCollaborationSubmission, canMarkAgreementSigned, isConfiguredAdmin, canTransitionCollaborationStatus, isValidCollaborationInvite } from "../lib/collaborationRules.mjs";

const valid = { songId: "song-id", inviteId: "123e4567-e89b-12d3-a456-426614174001", submissionKey: "123e4567-e89b-12d3-a456-426614174000", termsVersion: "2026-11-18-v1", artistName: "Artist", email: "artist@example.com", contributionType: "Songwriting", acknowledged: true };

test("submission requires identity, email, invite, contribution and acknowledgment", () => {
  assert.equal(validateCollaborationSubmission(valid), true);
  assert.equal(validateCollaborationSubmission({ ...valid, contributionType: "Other" }), true);
  for (const field of ["songId", "inviteId", "artistName", "email", "submissionKey", "termsVersion", "contributionType"]) {
    assert.equal(validateCollaborationSubmission({ ...valid, [field]: "" }), false, `${field} is required`);
  }
  assert.equal(validateCollaborationSubmission({ ...valid, acknowledged: false }), false);
  assert.equal(validateCollaborationSubmission({ ...valid, email: "bad" }), false);
  assert.equal(validateCollaborationSubmission({ ...valid, contributionType: "50/50" }), false);
});

test("an agreement cannot be marked signed without a verified stored document", () => {
  assert.equal(canMarkAgreementSigned({ signedVerified: false, agreementPath: "private/file.pdf", verifiedDocumentExists: true }), false);
  assert.equal(canMarkAgreementSigned({ signedVerified: true, agreementPath: "", verifiedDocumentExists: true }), false);
  assert.equal(canMarkAgreementSigned({ signedVerified: true, agreementPath: "private/file.pdf", verifiedDocumentExists: false }), false);
  assert.equal(canMarkAgreementSigned({ signedVerified: true, agreementPath: "private/file.pdf", verifiedDocumentExists: true }), true);
});

test("admin email matching is case-insensitive and denies missing configuration", () => {
  assert.equal(isConfiguredAdmin("Admin@example.com", "admin@example.com"), true);
  assert.equal(isConfiguredAdmin("other@example.com", "admin@example.com"), false);
  assert.equal(isConfiguredAdmin("admin@example.com", ""), false);
});

test("private invite access requires a live token and enabled song", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  assert.equal(isValidCollaborationInvite({ exists: true, collaborationEnabled: true, expiresAt: "2026-11-18T12:01:00Z", now }), true);
  assert.equal(isValidCollaborationInvite({ exists: false, collaborationEnabled: true, now }), false);
  assert.equal(isValidCollaborationInvite({ exists: true, revokedAt: "2026-11-18T11:00:00Z", collaborationEnabled: true, now }), false);
  assert.equal(isValidCollaborationInvite({ exists: true, collaborationEnabled: false, now }), false);
  assert.equal(isValidCollaborationInvite({ exists: true, expiresAt: "2026-11-18T11:59:00Z", collaborationEnabled: true, now }), false);
});

test("request workflow permits only intended next steps", () => {
  assert.equal(canTransitionCollaborationStatus("new", "reviewing"), true);
  assert.equal(canTransitionCollaborationStatus("new", "canceled"), true);
  assert.equal(canTransitionCollaborationStatus("reviewing", "approved"), true);
  assert.equal(canTransitionCollaborationStatus("approved", "agreement_pending"), true);
  assert.equal(canTransitionCollaborationStatus("agreement_pending", "signed"), true);
  assert.equal(canTransitionCollaborationStatus("signed", "in_progress"), true);
  assert.equal(canTransitionCollaborationStatus("new", "in_progress"), false);
  assert.equal(canTransitionCollaborationStatus("declined", "signed"), false);
});
