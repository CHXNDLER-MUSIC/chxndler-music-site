import test from "node:test";
import assert from "node:assert/strict";
import { COLLAB_CATALOG_FILTERS, filterCollabCatalog } from "../lib/collabCatalog.mjs";

const songs = [
  { id: "demo-video", audioStatus: "Demo", readyForCollab: true, collaborationOpportunities: ["video"] },
  { id: "final-video", audioStatus: "Final", readyForCollab: true, collaborationOpportunities: ["video"] },
  { id: "feature-video", audioStatus: "In Progress", readyForCollab: true, collaborationOpportunities: ["feature", "video"] },
  { id: "released-remix", audioStatus: "Released", readyForCollab: true, collaborationOpportunities: ["remix"] },
  { id: "plain-demo", audioStatus: "Demo", readyForCollab: true, collaborationOpportunities: [] },
  { id: "not-shared", audioStatus: "Demo", readyForCollab: false, collaborationOpportunities: ["feature"] },
];

test("The private catalog has no All Songs tab", () => {
  assert.deepEqual(COLLAB_CATALOG_FILTERS, ["collabs", "video", "complete"]);
});

test("Open for Collab includes every explicitly ready song, even without selected interests", () => {
  assert.deepEqual(filterCollabCatalog(songs, "collabs").map(song => song.id), ["demo-video", "final-video", "feature-video", "released-remix", "plain-demo"]);
});

test("Video Needed includes demo and final songs and intersects with other opportunities", () => {
  assert.deepEqual(filterCollabCatalog(songs, "video").map(song => song.id), ["demo-video", "final-video", "feature-video"]);
});

test("Open for Collab never exposes a song that is not explicitly ready", () => {
  assert.equal(filterCollabCatalog(songs, "collabs").some(song => song.id === "not-shared"), false);
});

test("Complete is based on audio status and does not clear opportunities", () => {
  const complete = filterCollabCatalog(songs, "complete");
  assert.deepEqual(complete.map(song => song.id), ["final-video", "released-remix"]);
  assert.deepEqual(complete[0].collaborationOpportunities, ["video"]);
});
