import test from "node:test";
import assert from "node:assert/strict";
import { agreementFields, agreementTemplates, agreementText, agreementTypeForContribution, createAgreementDraft, validateAgreement } from "../lib/collaborationAgreements.ts";

const request = {
  id: "request-123",
  artist_name: "ARINES",
  contribution_type: "Vocals / Feature",
  message: "Add a vocal feature",
  songs: { title: "COPYCAT" },
  music_video_project_id: "video-project-123",
};
const invite = { first_name: "Ari", last_name: "Ness", artist_name: "ARINES", agreement_type: "singer_feature" };

test("agreement roles infer from contribution and invite type can override request wording", () => {
  assert.equal(agreementTypeForContribution("Vocals / Feature"), "singer_feature");
  assert.equal(agreementTypeForContribution("Remix"), "remix");
  assert.equal(agreementTypeForContribution("Production"), "producer");
  assert.equal(agreementTypeForContribution("Music Video"), "videographer");
  assert.equal(invite.agreement_type, "singer_feature");
});

for (const type of ["singer_feature", "remix", "producer", "videographer"]) {
  test(`${type} draft has the right parties, role fields, and review-only terms`, () => {
    const terms = createAgreementDraft({ type, request, invite });
    const text = agreementText(type, terms);
    assert.equal(terms.admin_legal_name, "Chandler Pierce");
    assert.equal(terms.admin_artist_name, "CHXNDLER");
    assert.equal(terms.collaborator_legal_name, "Ari Ness");
    assert.equal(terms.collaborator_artist_name, "ARINES");
    assert.equal(terms.song_title, "COPYCAT");
    assert.equal(terms.fee_option, "No fee");
    assert.equal(terms.flat_fee, 0);
    assert.equal(terms.master_royalty, 0);
    assert.equal(terms.publishing_split, "");
    assert.equal(terms.songwriting_status, "unresolved");
    assert.match(text, /preview for review/i);
    assert.match(text, /not signed or binding/i);
    assert.ok(agreementFields[type].length > 0);
  });
}

test("videographer form excludes royalties and template disclaims them", () => {
  const keys = agreementFields.videographer.map(field => field.key);
  assert.equal(keys.some(key => key.includes("royalty") || key.includes("publishing")), false);
  const text = agreementText("videographer", createAgreementDraft({ type: "videographer", request, invite }));
  assert.match(text, /No music-master or publishing royalty/);
  assert.doesNotMatch(text, /Master royalties and composition\/publishing interests are separate/);
});

test("remix and producer defaults preserve originals and do not invent percentage offers", () => {
  const remix = agreementText("remix", createAgreementDraft({ type: "remix", request, invite }));
  const producer = agreementText("producer", createAgreementDraft({ type: "producer", request, invite }));
  assert.match(remix, /retains the original song and original master/i);
  assert.match(remix, /may not independently release/i);
  assert.match(producer, /retains (?:its )?pre-existing materials/i);
  assert.match(producer, /Third-party samples .* must be disclosed/i);
  assert.match(remix, /Master royalty: 0%/);
  assert.match(producer, /Master royalty: 0%/);
  assert.match(remix, /not yet agreed/i);
  assert.match(producer, /not yet agreed/i);
});

test("saved zeros remain deliberate and unresolved songwriting blocks approval", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request, invite, existing: { flat_fee: 0, master_royalty: 0, songwriting_status: "unresolved", publishing_split: "" } });
  assert.equal(draft.flat_fee, 0);
  assert.equal(draft.master_royalty, 0);
  assert.ok(validateAgreement("singer_feature", draft).some(value => value.includes("Songwriting / publishing status")));
  draft.songwriting_status = "separate_agreement";
  assert.equal(validateAgreement("singer_feature", draft).length, 0);
});

test("each collaboration role loads its own reusable contract language", () => {
  assert.notEqual(agreementTemplates.singer_feature.id, agreementTemplates.videographer.id);
  assert.match(agreementTemplates.videographer.legalTerms, /videographer retains rights/i);
  assert.doesNotMatch(agreementTemplates.videographer.legalTerms, /vocal deliverables/i);
});
