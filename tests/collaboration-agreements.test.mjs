import test from "node:test";
import assert from "node:assert/strict";
import { agreementFields, agreementPresentation, agreementStatusLabel, agreementText, agreementTypeForContribution, calculateSplitSummary, createAgreementDraft, productionTooltipText, validateAgreement } from "../lib/collaborationAgreements.ts";

const request = { id: "request-123", artist_name: "ARINES", contribution_type: "Vocals / Feature", message: "Private application note", songs: { title: "COPYCAT", release_date: "2027-02-05" }, music_video_project_id: "video-project-123" };
const invite = { first_name: "Ari", last_name: "Ness", artist_name: "ARINES", agreement_type: "singer_feature" };

test("contribution roles map to their existing agreement templates", () => {
  assert.equal(agreementTypeForContribution("Vocals / Feature"), "singer_feature");
  assert.equal(agreementTypeForContribution("Remix"), "remix");
  assert.equal(agreementTypeForContribution("Production"), "producer");
  assert.equal(agreementTypeForContribution("Music Video"), "videographer");
});

test("agreement statuses stay concise in the UI", () => {
  assert.equal(agreementStatusLabel("draft"), "Draft");
  assert.equal(agreementStatusLabel("sending"), "Draft");
  assert.equal(agreementStatusLabel("awaiting_signature"), "Sent");
  assert.equal(agreementStatusLabel("offer_sent"), "Sent");
  assert.equal(agreementStatusLabel("signed"), "Signed");
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

test("version 7 uses the approved five sections and exact master ownership terms", () => {
  const terms = { ...createAgreementDraft({ type: "singer_feature", request, invite }), flat_fee: 0, payment_direction: "none", master_royalty: 8, songwriting_status: "performance_only", recording_arrangement: "chxndler_session", music_video_participation: "not_interested" };
  const text = agreementText("singer_feature", terms);
  for (const title of ["01 · Contribution", "02 · Compensation & Songwriting", "03 · Recording & Release", "04 · Creative Use & Credits", "05 · General Terms"]) assert.ok(text.includes(title));
  assert.match(text, /The collaboration details, compensation, royalty splits, ownership and credits outlined above form part of this agreement\./);
  assert.match(text, /The collaborator hereby assigns their copyright interest in the master recording to CHXNDLER, excluding songwriting ownership and nonwaivable statutory rights\./);
  assert.match(text, /CHXNDLER retains exclusive master ownership and control over editing, distribution, promotion, licensing and release, subject to applicable composition rights\./);
  assert.match(text, /The collaborator may not upload, distribute, release or license the recording without CHXNDLER's written permission\. CHXNDLER decides whether and when the recording is released\./);
  assert.match(text, /New York law governs this agreement\. Electronic signatures are accepted\./);
  assert.doesNotMatch(text, /AI voice cloning|90 days|payment threshold|disputes|within 30 days|cancellation/i);
});

test("v7 signed summary includes both legal names and complete independent splits", () => {
  const terms = { ...createAgreementDraft({ type: "singer_feature", request, invite }), flat_fee: 0, payment_direction: "none", master_royalty: 20, master_participants: [{ name: "Guest Writer LLC", legal_name: "G. Writer", share: 5 }], songwriting_status: "co_writer", writer_splits: [{ name: "Chandler Pierce", stage_name: "CHXNDLER", share: 70, chxndler: true }, { name: "Ari Ness", stage_name: "ARINES", share: 20, collaborator: true }, { name: "Gina Writer", stage_name: "GINA", share: 10 }] };
  const text = agreementText("singer_feature", terms);
  assert.match(text, /RECORDING ROYALTY SPLITS[\s\S]*CHXNDLER \(Chandler Pierce\): 75%[\s\S]*ARINES \(Ari Ness\): 20%[\s\S]*Guest Writer LLC \(G\. Writer\): 5%/);
  assert.match(text, /SONGWRITING OWNERSHIP SPLITS[\s\S]*CHXNDLER \(Chandler Pierce\): 70%[\s\S]*ARINES \(Ari Ness\): 20%[\s\S]*GINA \(Gina Writer\): 10%/);
});

test("compensation split presentation uses artist names while signed text retains legal names", () => {
  const terms = {
    ...createAgreementDraft({ type: "singer_feature", request, invite }),
    template_version: 7,
    master_owner: "CHXNDLER",
    master_royalty: 20,
    master_participants: [{ name: "Master display", artist_name: "MASTER ARTIST", legal_name: "Master Legal Name", share: 5 }],
    songwriting_status: "co_writer",
    writer_splits: [
      { name: "Chandler Pierce", stage_name: "CHXNDLER", share: 75, chxndler: true },
      { name: "Ari Ness", stage_name: "ARINES", share: 20, collaborator: true },
      { name: "Gina Writer Legal", stage_name: "GINA WRITER", share: 5 },
    ],
  };
  const presentation = agreementPresentation("singer_feature", terms);
  assert.deepEqual(presentation.masterSplitRows.map(row => row.name), ["CHXNDLER", "ARINES", "MASTER ARTIST"]);
  assert.deepEqual(presentation.writerSplitRows.map(row => row.name), ["CHXNDLER", "ARINES", "GINA WRITER"]);
  const signedText = agreementText("singer_feature", terms);
  assert.match(signedText, /MASTER ARTIST \(Master Legal Name\): 5%/);
  assert.match(signedText, /GINA WRITER \(Gina Writer Legal\): 5%/);
});

test("version 6 retains its historical agreement wording", () => {
  const terms = { ...createAgreementDraft({ type: "singer_feature", request, invite }), template_version: 6, flat_fee: 0, payment_direction: "none", master_royalty: 0 };
  const text = agreementText("singer_feature", terms);
  assert.match(text, /AI voice cloning and digital replicas require separate written consent/);
  assert.doesNotMatch(text, /The collaborator hereby assigns their copyright interest/);
});

test("royalty accounting is conditional and separately agreed sync share replaces duplicate accounting", () => {
  const noRoyalty = { ...createAgreementDraft({ type: "singer_feature", request, invite }), template_version: 6, flat_fee: 0, payment_direction: "none", master_royalty: 0, writer_splits:[{name:"Chandler Pierce",stage_name:"CHXNDLER",share:100,chxndler:true},{name:"Ari Ness",stage_name:"ARINES",share:0,collaborator:true}], songwriting_status: "performance_only", recording_arrangement: "independent", music_video_participation: "interested" };
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
  const base = { ...createAgreementDraft({ type: "producer", request, invite }), template_version: 6 };
  for (const [arrangement, label] of [["chxndler_session", "Recording with CHXNDLER"], ["independent", "Recording independently"], ["other", "Another agreed arrangement"]]) {
    const terms = { ...base, recording_arrangement: arrangement, recording_arrangement_details: "At the collaborator’s studio", music_video_participation: "interested" };
    const view = agreementPresentation("producer", terms);
    assert.match(view.arrangements[0][1], arrangement === "other" ? /At the collaborator/ : new RegExp(label));
  }
  for (const choice of ["interested", "not_interested"]) {
    assert.ok(agreementPresentation("producer", { ...base, music_video_participation: choice }).arrangements.some(row => row[1].includes(choice === "interested" ? "Interested" : "Not interested")));
  }
  assert.equal(agreementPresentation("producer", { ...base, music_video_participation: "interested" }).arrangements.find(row => row[0] === "Music Video Participation")[1], "Interested");
  assert.equal(agreementPresentation("producer", { ...base, target_release_date: "2026-12-26" }).arrangements.find(row => row[0] === "Target Release Date")[1], "12-26-2026");
});

test("all one-time payment models require a positive amount and render the direction clearly", () => {
  const base = createAgreementDraft({ type: "singer_feature", request, invite });
  for (const [direction, amount, expected] of [["none", 0, "$0"], ["chxndler_pays", 450, "CHXNDLER pays"], ["collaborator_pays", 125, "collaborator pays"]]) {
    const terms = { ...base, payment_direction: direction, flat_fee: amount, fee_currency: "USD", payment_due_date: amount ? "2027-03-01" : "", master_royalty: 0, writer_splits:[{name:"Chandler Pierce",share:100,chxndler:true},{name:"Ari Ness",share:0,collaborator:true}], songwriting_status: "performance_only", recording_arrangement: "chxndler_session", music_video_participation: "interested" };
    assert.deepEqual(validateAgreement("singer_feature", terms, true), []);
    assert.ok(agreementPresentation("singer_feature", terms).compensation[0].value.includes(expected));
  }
  assert.ok(validateAgreement("singer_feature", { ...base, payment_direction: "chxndler_pays", flat_fee: 0 }, true).some(issue => /payment amount/i.test(issue)));
  assert.ok(validateAgreement("singer_feature", { ...base, payment_direction: "chxndler_pays", flat_fee: 450, payment_due_date: "" }, true).some(issue => /payment due date/i.test(issue)));
});

test("royalty and sync combinations include only applicable reporting terms", () => {
  const base = { ...createAgreementDraft({ type: "producer", request, invite }), template_version: 6 };
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
    assert.equal(agreementPresentation("singer_feature", terms).compensation[2].value, "40%");
    assert.match(agreementText("singer_feature", terms), /Chandler Pierce \(Chandler Pierce\): 60%[\s\S]*Ari Ness \(Ari Ness\): 40%/);
    assert.match(agreementText("singer_feature", terms), /Each songwriter retains their agreed composition ownership/i);
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
  draft.payment_due_date = "2027-03-01";
  assert.deepEqual(validateAgreement("singer_feature", draft, true), []);
  const restored = createAgreementDraft({ type: "singer_feature", request, invite, existing: draft });
  assert.equal(restored.master_royalty, 20);
  assert.equal(restored.writer_splits[1].share, 20);
  const generated = agreementText("singer_feature", restored);
  assert.match(generated, /RECORDING ROYALTY SPLITS[\s\S]*CHXNDLER \(Chandler Pierce\): 70%[\s\S]*ARINES \(Ari Ness\): 20%[\s\S]*Guest Producer \(Guest Producer\): 10%/);
  assert.match(generated, /SONGWRITING OWNERSHIP SPLITS[\s\S]*CHXNDLER \(Chandler Pierce\): 80%[\s\S]*ARINES \(Ari Ness\): 20%/);
  assert.match(generated, /New York law governs this agreement/i);
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

test("compensation card shows only the current collaborator songwriting share", () => {
  const base = createAgreementDraft({ type: "singer_feature", request, invite });
  const terms = {
    ...base,
    songwriting_status: "co_writer",
    writer_splits: [
      { name: "Chandler Pierce", stage_name: "CHXNDLER", share: 60, chxndler: true },
      { name: "Ari Ness", stage_name: "ARINES", share: 20, collaborator: true },
      { name: "Guest Writer", stage_name: "GUEST", share: 20 },
    ],
  };
  assert.equal(agreementPresentation("singer_feature", terms).compensation[2].value, "20%");
  assert.match(agreementText("singer_feature", terms), /CHXNDLER \(Chandler Pierce\): 60%[\s\S]*ARINES \(Ari Ness\): 20%[\s\S]*GUEST \(Guest Writer\): 20%/);
  assert.equal(agreementPresentation("singer_feature", { ...terms, songwriting_status: "performance_only" }).compensation[2].value, "0%");
  assert.match(agreementPresentation("singer_feature", terms).compensation[1].help, /separate from master ownership and songwriting/i);
  assert.match(agreementPresentation("singer_feature", terms).compensation[2].help, /separate from recording royalties/i);
});

test("Production & Release labels and tooltip copy stay consistent in agreement views", () => {
  const terms = createAgreementDraft({ type: "singer_feature", request, invite });
  assert.deepEqual(agreementPresentation("singer_feature", terms).productionRows.map(row => row[0]), ["Primary Artist", "Producer", "Master Owner", "Distribution Rights"]);
  assert.equal(productionTooltipText["Primary Artist"], "The main artist credited on the official release.");
  assert.equal(productionTooltipText.Producer, "The person responsible for producing the musical recording.");
  assert.equal(productionTooltipText["Master Owner"], "The owner of the sound recording. Receiving recording royalties does not automatically grant ownership of the master.");
  assert.equal(productionTooltipText["Distribution Rights"], "The party authorized to distribute and release the recording on streaming platforms and other services.");
});
