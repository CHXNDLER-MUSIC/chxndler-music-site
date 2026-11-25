import test from "node:test";
import assert from "node:assert/strict";
import {
  agreementText,
  agreementPresentation,
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

test("new singer feature draft loads artist and song details without importing private request messages or inventing financial terms", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request });
  assert.equal(draft.collaborator_legal_name, "Alex Example");
  assert.equal(draft.collaborator_artist_name, "LEX");
  assert.equal(draft.song_title, "We're Just Friends");
  assert.equal(draft.contribution_description, "Perform the agreed vocal feature.");
  assert.equal(draft.vocal_deliverables, "Lead vocals, agreed harmonies and ad-libs.");
  assert.equal(draft.flat_fee, "");
  assert.equal(draft.master_royalty, "");
  assert.equal(draft.payment_direction, "");
  assert.equal(draft.artist_credit, "CHXNDLER feat. LEX");
  assert.equal(draft.songwriting_status, "unresolved");
  assert.ok(validateAgreement("singer_feature", draft, true).some(term => term.toLowerCase().includes("songwriting")));
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

test("contract export uses the canonical agreement text and escapes collaborator input", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request, existing: { collaborator_legal_name: "<script>alert(1)</script>", songwriting_status: "separate_agreement" } });
  draft.vocal_deliverables = "Lead takes and WAV stems";
  draft.agreement_version = 4;
  const html = agreementHtml("singer_feature", draft);
  assert.match(html, /Version 4/);
  assert.match(html, /YOUR CONTRIBUTION/);
  assert.match(html, /YOUR COMPENSATION &amp; RIGHTS/);
  assert.match(html, /AGREEMENT TERMS/);
  assert.match(html, /Lead takes and WAV stems/);
  assert.match(html, /SIGNATURES/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("canonical agreement order, arrangement details, and no unrelated admin content", () => {
  const terms = createAgreementDraft({ type: "singer_feature", request, existing: {
    payment_direction: "none", flat_fee: 0, master_royalty: 0,
    songwriting_status: "performance_only", recording_arrangement: "independent",
    target_release_date: "2027-02-05", music_video_participation: "not_interested",
  } });
  const text = agreementText("singer_feature", terms);
  const headings = ["YOUR CONTRIBUTION", "YOUR COMPENSATION & RIGHTS", "PRODUCTION & RELEASE", "COLLABORATION ARRANGEMENTS", "AGREEMENT TERMS", "SIGNATURES"];
  assert.deepEqual(headings.map(value => text.indexOf(value)), [...headings.map(value => text.indexOf(value))].sort((a, b) => a - b));
  assert.match(text, /One-Time Payment: \$0/);
  assert.match(text, /Recording Arrangement: Recording independently/);
  assert.match(text, /Music Video Participation: Not interested/);
  assert.match(text, /subject to change/);
  assert.doesNotMatch(text, /Add a vocal feature and harmonies|Internal admin/i);
});

test("unresolved values stay pending and the sync share only appears when explicitly agreed", () => {
  const pending = createAgreementDraft({ type: "singer_feature", request });
  const view = agreementPresentation("singer_feature", pending);
  assert.deepEqual(view.compensation.map(item => item.value), ["Pending", "Pending", "Pending"]);
  assert.equal(view.compensation.some(item => item.label === "Additional Master Sync Share"), false);
  const sync = agreementPresentation("producer", { ...pending, advanced_master_sync_share: 12.5 });
  assert.equal(sync.compensation.at(-1).label, "Additional Master Sync Share");
  const text = agreementText("producer", { ...pending, advanced_master_sync_share: 12.5, payment_direction: "none", flat_fee: 0, master_royalty: 0, songwriting_status: "performance_only" });
  assert.match(text, /no recording royalty applies to those same receipts/);
  assert.match(text, /Reporting and payment/);
});

test("send validation requires explicit payment, royalty, recording arrangement, video interest, and songwriting terms", () => {
  const pending = createAgreementDraft({ type: "singer_feature", request });
  const unresolved = validateAgreement("singer_feature", pending, true).join(" ");
  assert.match(unresolved, /payment arrangement/i);
  assert.match(unresolved, /Master royalty/i);
  assert.match(unresolved, /Recording arrangement/i);
  assert.match(unresolved, /target release date/i);
  assert.match(unresolved, /Music video participation/i);
  assert.match(unresolved, /songwriting/i);
  const resolved = { ...pending, flat_fee: 0, payment_direction: "none", master_royalty: 0, songwriting_status: "performance_only", recording_arrangement: "chxndler_session", target_release_date: "2027-02-05", music_video_participation: "interested" };
  assert.deepEqual(validateAgreement("singer_feature", resolved, true), []);
});
