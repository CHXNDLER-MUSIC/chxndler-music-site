import test from "node:test";
import assert from "node:assert/strict";
import {
  agreementHtml,
  agreementTemplates,
  createAgreementDraft,
  validateAgreement,
} from "../lib/collaborationAgreements.ts";

const request = {
  id: "request-1",
  first_name: "Alex",
  last_name: "Example",
  artist_name: "LEX",
  message: "Add a vocal feature and harmonies.",
  contribution_type: "Feature / Vocals",
  songs: { title: "We're Just Friends" },
  flat_fee: null,
  master_royalty: null,
};

test("new singer feature draft loads request details and safe financial defaults", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request });
  assert.equal(draft.collaborator_legal_name, "Alex Example");
  assert.equal(draft.collaborator_artist_name, "LEX");
  assert.equal(draft.song_title, "We're Just Friends");
  assert.equal(draft.contribution_description, request.message);
  assert.equal(draft.artist_credit, "CHXNDLER feat. LEX");
  assert.equal(draft.flat_fee, 0);
  assert.equal(draft.master_royalty, 0);
  assert.equal(draft.songwriting_status, "unresolved");
  assert.ok(validateAgreement("singer_feature", draft).some(term => term.includes("Songwriting")));
});

test("saved negotiated values and template version take precedence over defaults", () => {
  const draft = createAgreementDraft({
    type: "singer_feature",
    request,
    existing: { collaborator_legal_name: "A. Example", flat_fee: 0, master_royalty: 0, template_id: "archived-singer-template", template_version: 7, songwriting_status: "separate_agreement" },
  });
  assert.equal(draft.collaborator_legal_name, "A. Example");
  assert.equal(draft.flat_fee, 0);
  assert.equal(draft.master_royalty, 0);
  assert.equal(draft.template_id, "archived-singer-template");
  assert.equal(draft.template_version, 7);
  assert.deepEqual(validateAgreement("singer_feature", { ...draft, vocal_deliverables: "WAV stems", artist_credit: "CHXNDLER feat. LEX" }), []);
});

test("role templates use contribution-specific language", () => {
  const singer = agreementTemplates.singer_feature.legalTerms;
  const producer = agreementTemplates.producer.legalTerms;
  const remix = agreementTemplates.remix.legalTerms;
  const video = agreementTemplates.videographer.legalTerms;
  assert.match(singer, /vocal deliverables|performance/i);
  assert.match(producer, /stems|production/i);
  assert.match(remix, /source materials|remix/i);
  assert.match(video, /videographer|footage|revision/i);
  assert.doesNotMatch(video, /vocal feature/i);
});

test("contract preview includes saved terms and escapes collaborator input", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request, existing: { collaborator_legal_name: "<script>alert(1)</script>", songwriting_status: "separate_agreement" } });
  draft.vocal_deliverables = "Lead takes and WAV stems";
  draft.agreement_version = 4;
  const html = agreementHtml("singer_feature", draft);
  assert.match(html, /Agreement version 4/);
  assert.match(html, /Flat fee: \$0\.00/);
  assert.match(html, /Lead takes and WAV stems/);
  assert.match(html, /SIGNATURES/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});
