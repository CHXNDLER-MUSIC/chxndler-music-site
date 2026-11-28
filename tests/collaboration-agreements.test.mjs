import test from "node:test";
import assert from "node:assert/strict";
import { agreementFields, agreementPresentation, agreementText, agreementTypeForContribution, calculateSplitSummary, createAgreementDraft, validateAgreement } from "../lib/collaborationAgreements.ts";

const request = { id: "request-123", artist_name: "ARINES", contribution_type: "Vocals / Feature", message: "Private application note", songs: { title: "COPYCAT", release_date: "2027-02-05" }, music_video_project_id: "video-project-123" };
const invite = { first_name: "Ari", last_name: "Ness", artist_name: "ARINES", agreement_type: "singer_feature" };

test("contribution roles map to their existing agreement templates", () => {
  assert.equal(agreementTypeForContribution("Vocals / Feature"), "singer_feature");
  assert.equal(agreementTypeForContribution("Remix"), "remix");
  assert.equal(agreementTypeForContribution("Production"), "producer");
  assert.equal(agreementTypeForContribution("Music Video"), "videographer");
});

for (const type of ["singer_feature", "remix", "producer", "videographer"]) {
  test(`${type} keeps party and role fields, excludes internal request messages, and validates relevant terms`, () => {
    const terms = createAgreementDraft({ type, request, invite });
    const text = agreementText(type, terms);
    assert.equal(terms.admin_legal_name, "Chandler Pierce");
    assert.equal(terms.admin_artist_name, "CHXNDLER");
    assert.equal(terms.collaborator_legal_name, "Ari Ness");
    assert.equal(terms.collaborator_artist_name, "ARINES");
    assert.equal(terms.song_title, "COPYCAT");
    assert.equal(terms.flat_fee, 0);
    assert.equal(terms.master_royalty, "");
    assert.equal(terms.songwriting_status, "unresolved");
    assert.doesNotMatch(text, /Private application note/);
    assert.match(text, /Agreement Terms|AGREEMENT TERMS/);
    assert.ok(agreementFields[type].length > 0);
  });
}

test("feature deliverables do not require WAV stems by default", () => {
  const terms = createAgreementDraft({ type: "singer_feature", request, invite });
  assert.equal(terms.vocal_deliverables, "Lead vocals, agreed harmonies and ad-libs.");
  assert.doesNotMatch(terms.vocal_deliverables, /WAV|stems/i);
});

test("signed terms state the five requested sections and separate recording from songwriting rights", () => {
  const terms = { ...createAgreementDraft({ type: "singer_feature", request, invite }), flat_fee: 0, payment_direction: "none", master_royalty: 8, songwriting_status: "performance_only", recording_arrangement: "chxndler_session", music_video_participation: "not_interested" };
  const text = agreementText("singer_feature", terms);
  for (const title of ["01 · Contribution", "02 · Compensation & Songwriting", "03 · Recording & Release", "04 · Creative Use & Credits", "05 · General Terms"]) assert.ok(text.includes(title));
  assert.match(text, /songwriting rights and nonwaivable statutory royalties remain separate/i);
  assert.match(text, /may not independently release, upload, or distribute/i);
  assert.match(text, /AI voice cloning and digital replicas require separate written consent/i);
  assert.match(text, /governed by the laws of the State of New York/i);
  assert.match(text, /release date is subject to change/i);
});

test("royalty accounting is conditional and separately agreed sync share replaces duplicate accounting", () => {
  const noRoyalty = { ...createAgreementDraft({ type: "singer_feature", request, invite }), flat_fee: 0, payment_direction: "none", master_royalty: 0, writer_splits:[{name:"Chandler Pierce",stage_name:"CHXNDLER",share:100,chxndler:true},{name:"Ari Ness",stage_name:"ARINES",share:0,collaborator:true}], songwriting_status: "performance_only", recording_arrangement: "independent", music_video_participation: "interested" };
  const noRoyaltyText = agreementText("singer_feature", noRoyalty);
  assert.doesNotMatch(noRoyaltyText, /Reporting and payment|Amounts below|Agreed deductions/i);
  const syncText = agreementText("singer_feature", { ...noRoyalty, advanced_master_sync_share: 10 });
  assert.doesNotMatch(syncText, /Additional Master Sync Share/);
  assert.match(syncText, /master-side sync revenue follows the agreed master revenue split/i);
});

test("saved zero values remain intentional and songwriting stays unresolved until selected", () => {
  const terms = createAgreementDraft({ type: "singer_feature", request, invite, existing: { flat_fee: 0, master_royalty: 0, payment_direction: "none", songwriting_status: "unresolved" } });
  assert.equal(terms.flat_fee, 0);
  assert.equal(terms.master_royalty, 0);
  assert.ok(validateAgreement("singer_feature", terms, true).some(value => value.toLowerCase().includes("songwriting")));
  terms.songwriting_status = "performance_only";
  terms.writer_splits = [{name:"Chandler Pierce",stage_name:"CHXNDLER",share:100,chxndler:true},{name:"Ari Ness",stage_name:"ARINES",share:0,collaborator:true}];
  terms.recording_arrangement = "independent";
  terms.music_video_participation = "not_interested";
  assert.deepEqual(validateAgreement("singer_feature", terms, true), []);
});

test("all supported recording arrangements and video interest choices render distinctly", () => {
  const base = createAgreementDraft({ type: "producer", request, invite });
  for (const [arrangement, label] of [["chxndler_session", "Recording with CHXNDLER"], ["independent", "Recording independently"], ["other", "Another agreed arrangement"]]) {
    const terms = { ...base, recording_arrangement: arrangement, recording_arrangement_details: "At the collaborator’s studio", music_video_participation: "interested" };
    const view = agreementPresentation("producer", terms);
    assert.match(view.arrangements[0][1], arrangement === "other" ? /At the collaborator/ : new RegExp(label));
  }
  for (const choice of ["interested", "not_interested"]) {
    assert.ok(agreementPresentation("producer", { ...base, music_video_participation: choice }).arrangements.some(row => row[1].includes(choice === "interested" ? "Interested" : "Not interested")));
  }
});

test("all one-time payment models require a positive amount and render the direction clearly", () => {
  const base = createAgreementDraft({ type: "singer_feature", request, invite });
  for (const [direction, amount, expected] of [["none", 0, "$0"], ["chxndler_pays", 450, "CHXNDLER pays"], ["collaborator_pays", 125, "collaborator pays"]]) {
    const terms = { ...base, payment_direction: direction, flat_fee: amount, fee_currency: "USD", payment_terms: amount ? "Within 14 days after invoice" : "", master_royalty: 0, writer_splits:[{name:"Chandler Pierce",share:100,chxndler:true},{name:"Ari Ness",share:0,collaborator:true}], songwriting_status: "performance_only", recording_arrangement: "chxndler_session", music_video_participation: "interested" };
    assert.deepEqual(validateAgreement("singer_feature", terms, true), []);
    assert.ok(agreementPresentation("singer_feature", terms).compensation[0].value.includes(expected));
  }
  assert.ok(validateAgreement("singer_feature", { ...base, payment_direction: "chxndler_pays", flat_fee: 0 }, true).some(issue => /payment amount/i.test(issue)));
});

test("royalty and sync combinations include only applicable reporting terms", () => {
  const base = createAgreementDraft({ type: "producer", request, invite });
  const standard = { ...base, flat_fee: 0, payment_direction: "none", writer_splits:[{name:"Chandler Pierce",share:100,chxndler:true},{name:"Ari Ness",share:0,collaborator:true}], songwriting_status: "performance_only", recording_arrangement: "independent", music_video_participation: "interested" };
  const cases = [
    { master_royalty: 0, advanced_master_sync_share: 0, expectsAccounting: false },
    { master_royalty: 8, advanced_master_sync_share: 0, expectsAccounting: true },
    { master_royalty: 0, advanced_master_sync_share: 12, expectsAccounting: false },
    { master_royalty: 8, advanced_master_sync_share: 12, expectsAccounting: true },
  ];
  for (const item of cases) {
    const text = agreementText("producer", { ...standard, ...item });
    assert.equal(/Reporting and payment/.test(text), item.expectsAccounting);
    assert.doesNotMatch(text, /Additional Master Sync Share/);
  }
  const missingBasis = { ...standard, master_royalty: 8, revenue_definition: "", deductions: "", accounting_frequency: "" };
  assert.match(agreementText("producer", missingBasis), /Pending confirmation/);
  assert.ok(validateAgreement("producer", missingBasis, true).some(issue => /revenue definition/i.test(issue)));
});

test("songwriting performance-only, co-writer, negotiated, and unresolved scenarios keep authorship explicit", () => {
  const base = createAgreementDraft({ type: "singer_feature", request, invite });
  const core = { ...base, flat_fee: 0, payment_direction: "none", master_royalty: 0, recording_arrangement: "chxndler_session", target_release_date: "2027-02-05", music_video_participation: "not_interested" };
  assert.deepEqual(validateAgreement("singer_feature", { ...core, writer_splits:[{name:"Chandler Pierce",share:100,chxndler:true},{name:"Ari Ness",share:0,collaborator:true}], songwriting_status: "performance_only" }, true), []);
  for (const songwriting_status of ["co_writer", "negotiated"]) {
    const writer_splits = [{ name: "Chandler Pierce", share: 60, chxndler: true }, { name: "Ari Ness", share: 40, collaborator: true }];
    const terms = { ...core, songwriting_status, writer_splits };
    assert.deepEqual(validateAgreement("singer_feature", terms, true), []);
    assert.match(agreementPresentation("singer_feature", terms).compensation[2].value, /Chandler Pierce: 60%.*Ari Ness: 40%/);
    assert.match(agreementText("singer_feature", terms), /Each writer retains their composition rights; administration and composition sync licenses follow the applicable ownership/i);
  }
  const unresolved = { ...core, songwriting_status: "unresolved" };
  assert.equal(agreementPresentation("singer_feature", unresolved).compensation[2].value, "Pending");
  assert.ok(validateAgreement("singer_feature", unresolved, true).some(issue => /songwriting/i.test(issue)));
});

test("deal builder terms round-trip independently from editing through agreement generation", () => {
  const draft = createAgreementDraft({ type: "singer_feature", request, invite });
  assert.equal(draft.payment_direction, "none");
  assert.equal(draft.flat_fee, 0);
  draft.payment_direction = "chxndler_pays";
  draft.flat_fee = 250;
  draft.master_royalty = 20;
  draft.master_participants = [{ name: "Guest Producer", share: 10 }];
  draft.songwriting_status = "co_writer";
  draft.writer_splits = [
    { name: "Chandler Pierce", stage_name: "CHXNDLER", share: 80, chxndler: true },
    { name: "Ari Ness", stage_name: "ARINES", share: 20, collaborator: true },
  ];
  draft.recording_arrangement = "chxndler_session";
  draft.music_video_participation = "interested";
  draft.payment_terms = "Within 14 days";
  assert.deepEqual(validateAgreement("singer_feature", draft, true), []);
  const restored = createAgreementDraft({ type: "singer_feature", request, invite, existing: draft });
  assert.equal(restored.master_royalty, 20);
  assert.equal(restored.writer_splits[1].share, 20);
  const generated = agreementText("singer_feature", restored);
  assert.match(generated, /Recording royalties \(separate from master ownership\):[\s\S]*CHXNDLER — 70%[\s\S]*ARINES — 20%[\s\S]*Guest Producer — 10%/);
  assert.match(generated, /Songwriting ownership of the underlying lyrics and composition:[\s\S]*Chandler Pierce \(CHXNDLER\) — 80%[\s\S]*Ari Ness \(ARINES\) — 20%/);
  assert.match(generated, /governed by the laws of the State of New York/i);
});

test("each royalty and composition split rejects invalid or incomplete participant rows", () => {
  const terms = {
    ...createAgreementDraft({ type: "singer_feature", request, invite }),
    flat_fee: 0,
    payment_direction: "none",
    master_royalty: 20,
    master_participants: [{ name: "", share: 10 }],
    songwriting_status: "co_writer",
    writer_splits: [
      { name: "Chandler Pierce", share: 80, chxndler: true },
      { name: "", share: 20, collaborator: true },
    ],
    recording_arrangement: "independent",
    music_video_participation: "not_interested",
  };
  const errors = validateAgreement("singer_feature", terms, true);
  assert.ok(errors.some(issue => /recording royalty/i.test(issue)));
  assert.ok(errors.some(issue => /composition ownership/i.test(issue)));
  terms.master_participants = [{ name: "Guest", share: 90 }];
  terms.writer_splits[1] = { name: "Ari Ness", share: 30, collaborator: true };
  assert.ok(validateAgreement("singer_feature", terms, true).some(issue => /recording royalty/i.test(issue)));
  assert.ok(validateAgreement("singer_feature", terms, true).some(issue => /composition ownership/i.test(issue)));
});

test("both split tables calculate the primary remainder and total from participant shares", () => {
  const recording = calculateSplitSummary([20, 0]);
  assert.equal(recording.primaryShare, 80);
  assert.equal(recording.total, 100);
  const multipleRecordingParticipants = calculateSplitSummary([20, 10]);
  assert.equal(multipleRecordingParticipants.primaryShare, 70);
  assert.equal(multipleRecordingParticipants.total, 100);

  const songwriting = calculateSplitSummary([20]);
  assert.equal(songwriting.primaryShare, 80);
  assert.equal(songwriting.total, 100);
  assert.equal(calculateSplitSummary([80, 20]).valid, true);
  assert.equal(calculateSplitSummary([80, 20, 1]).valid, false);
  assert.equal(calculateSplitSummary([-1]).valid, false);
});
