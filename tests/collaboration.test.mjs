import test from "node:test";
import assert from "node:assert/strict";
import { validateCollaborationSubmission, canMarkAgreementSigned, isConfiguredAdmin } from "../lib/collaborationRules.mjs";

const valid = { songId: "song-id", inviteToken: "private-token", submissionKey: "123e4567-e89b-12d3-a456-426614174000", artistName: "Artist", email: "artist@example.com", contributionType: "Songwriting", acknowledged: true };

test("submission requires identity, email, invite, contribution and acknowledgment", () => {
  assert.equal(validateCollaborationSubmission(valid), true);
  for (const field of ["songId", "inviteToken", "artistName", "email", "submissionKey", "contributionType"]) {
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
