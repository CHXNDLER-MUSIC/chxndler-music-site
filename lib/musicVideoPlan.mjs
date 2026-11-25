import { randomUUID } from "node:crypto";

export const MUSIC_VIDEO_PLAN_VERSION = "chxndler.music-video-plan.v1";
export const PROJECT_STATUSES = ["concept", "planning", "agreement", "filming", "editing", "delivered", "complete"];
export const SCENE_STATUSES = ["planned", "ready", "filmed"];
export const TASK_STATUSES = ["To Do", "In Progress", "Done"];
export const CAST_STATUSES = ["Planned", "Contacted", "Confirmed", "Declined", "Considering", "Invited", "Completed"];
export const LOCATION_STATUSES = ["Idea", "Contacted", "Confirmed"];
export const RESOURCE_STATUSES = ["Needed", "Sourced", "Ready"];
export const FRAMING_VALUES = ["Wide", "Medium", "Close-up", "Detail", "Moving"];
const FORMATS = ["Narrative", "Performance", "Visualizer", "Hybrid"];
const EDITING_STATUSES = ["Not Started", "Editing", "In Review", "Final"];
const PUBLICATION_STATUSES = ["Not published", "Scheduled", "Published"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const asObject = value => value && typeof value === "object" && !Array.isArray(value);
const hasText = value => typeof value === "string" && value.trim().length > 0;
const emptyValue = value => value == null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);
const normalized = value => String(value || "").normalize("NFKC").trim().toLocaleLowerCase();
const uniqueStrings = values => [...new Set((values || []).filter(hasText).map(value => value.trim()))];
const dateIsValid = value => {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validUrl = value => {
  if (!hasText(value)) return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const secondsBetween = (start, end) => {
  const [sh, sm] = start.split(":").map(Number), [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};
const addUnique = (existing, incoming, key = value => normalized(value)) => {
  const result = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(result.map(key));
  for (const item of incoming || []) {
    const identity = key(item);
    if (!seen.has(identity)) { result.push(item); seen.add(identity); }
  }
  return result;
};

export function validateMusicVideoPlan(plan) {
  const errors = [];
  const warnings = [];
  const error = (path, message) => errors.push({ path, message });
  const checkList = (parent, key, path, check, { optional = false } = {}) => {
    const list = parent?.[key];
    if (list === undefined && optional) return [];
    if (!Array.isArray(list)) { error(path, "Must be an array."); return []; }
    list.forEach((item, index) => check(item, `${path}[${index}]`));
    return list;
  };
  const checkKey = (value, path) => {
    if (!hasText(value) || value.trim().length > 100 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) error(path, "Use a stable key (letters, numbers, dot, underscore, colon, or dash). Max 100 characters.");
  };
  const checkDate = (value, path, optional = false) => {
    if (value == null && optional) return;
    if (!dateIsValid(value)) error(path, "Use a real calendar date in YYYY-MM-DD format, or null when not known.");
  };
  const checkName = (value, path) => { if (!hasText(value) || value.trim().length > 180) error(path, "Enter a name up to 180 characters."); };

  if (!asObject(plan)) return { valid: false, errors: [{ path: "$", message: "Plan must be a JSON object." }], warnings };
  if (plan.schemaVersion !== MUSIC_VIDEO_PLAN_VERSION) error("schemaVersion", `Must equal ${MUSIC_VIDEO_PLAN_VERSION}.`);
  if (!asObject(plan.project)) error("project", "Project details are required.");
  const project = plan.project || {};
  if (typeof project.songId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.songId)) error("project.songId", "Use the UUID of an existing song. The importer never creates songs.");
  checkName(project.songTitle, "project.songTitle");
  if (project.videoType !== "Official Music Video") error("project.videoType", "Only Official Music Video plans are supported.");
  if (project.projectTitle != null && (!hasText(project.projectTitle) || project.projectTitle.length > 180)) error("project.projectTitle", "Use a non-empty title up to 180 characters, or omit it.");
  if (!PROJECT_STATUSES.includes(project.planningStatus)) error("project.planningStatus", `Choose one of: ${PROJECT_STATUSES.join(", ")}.`);

  if (!asObject(plan.vision)) error("vision", "Vision details are required.");
  const vision = plan.vision || {};
  if (!hasText(vision.concept) || vision.concept.length > 5000) error("vision.concept", "Enter the core concept (up to 5,000 characters)." );
  if (!hasText(vision.narrativeOverview) || vision.narrativeOverview.length > 12000) error("vision.narrativeOverview", "Enter the narrative overview (up to 12,000 characters)." );
  if (!FORMATS.includes(vision.format)) error("vision.format", `Choose one of: ${FORMATS.join(", ")}.`);
  for (const key of ["visualStyles", "moods", "inspirationLinks", "colorPalette"]) {
    if (vision[key] !== undefined && (!Array.isArray(vision[key]) || vision[key].some(item => !hasText(item)))) error(`vision.${key}`, "Must be an array of non-empty strings.");
  }
  for (const [index, url] of (Array.isArray(vision.inspirationLinks) ? vision.inspirationLinks : []).entries()) if (!validUrl(url)) error(`vision.inspirationLinks[${index}]`, "Use an http or https URL.");
  for (const [index, color] of (Array.isArray(vision.colorPalette) ? vision.colorPalette : []).entries()) if (!/^#[0-9a-f]{6}$/i.test(color)) error(`vision.colorPalette[${index}]`, "Use a six-digit hex color.");
  checkList(vision, "referenceImages", "vision.referenceImages", (item, path) => {
    if (!asObject(item)) return error(path, "Use an object containing a URL.");
    if (!validUrl(item.url)) error(`${path}.url`, "Use an http or https image URL.");
    if (item.alt != null && (typeof item.alt !== "string" || item.alt.length > 500)) error(`${path}.alt`, "Alt text must be at most 500 characters.");
  }, { optional: true });

  const scenes = checkList(plan, "scenes", "scenes", (scene, path) => {
    if (!asObject(scene)) return error(path, "Scene must be an object.");
    checkKey(scene.importKey, `${path}.importKey`);
    if (!Number.isInteger(scene.order) || scene.order < 1 || scene.order > 200) error(`${path}.order`, "Use an integer from 1 to 200.");
    checkName(scene.title, `${path}.title`);
    if (!hasText(scene.description) || scene.description.length > 12000) error(`${path}.description`, "Enter a scene description up to 12,000 characters.");
    if (!SCENE_STATUSES.includes(scene.status)) error(`${path}.status`, `Choose one of: ${SCENE_STATUSES.join(", ")}.`);
    for (const key of ["castKeys", "wardrobeKeys", "propKeys"]) if (scene[key] !== undefined && (!Array.isArray(scene[key]) || scene[key].some(value => !hasText(value)))) error(`${path}.${key}`, "Must be an array of resource keys.");
    if (scene.locationKey != null) checkKey(scene.locationKey, `${path}.locationKey`);
    checkList(scene, "referenceImages", `${path}.referenceImages`, (reference, refPath) => {
      if (!asObject(reference)) return error(refPath, "Use an object containing a URL.");
      if (!validUrl(reference.url)) error(`${refPath}.url`, "Use an http or https image URL.");
      if (reference.alt != null && (typeof reference.alt !== "string" || reference.alt.length > 500)) error(`${refPath}.alt`, "Alt text must be at most 500 characters.");
    }, { optional: true });
    checkList(scene, "shots", `${path}.shots`, (shot, shotPath) => {
      if (!asObject(shot)) return error(shotPath, "Shot must be an object.");
      checkKey(shot.importKey, `${shotPath}.importKey`);
      if (!Number.isInteger(shot.order) || shot.order < 1 || shot.order > 500) error(`${shotPath}.order`, "Use an integer from 1 to 500.");
      if (!hasText(shot.description) || shot.description.length > 4000) error(`${shotPath}.description`, "Enter a shot description up to 4,000 characters.");
      if (shot.framing != null && !FRAMING_VALUES.includes(shot.framing)) error(`${shotPath}.framing`, `Choose one of: ${FRAMING_VALUES.join(", ")}.`);
      if (shot.referenceImage != null && !validUrl(shot.referenceImage)) error(`${shotPath}.referenceImage`, "Use an http or https image URL.");
      if (shot.done != null && typeof shot.done !== "boolean") error(`${shotPath}.done`, "Must be true or false.");
    }, { optional: true });
  });
  const sceneKeys = new Set();
  for (const scene of scenes) {
    if (!scene?.importKey) continue;
    if (sceneKeys.has(scene.importKey)) error("scenes", `Duplicate scene importKey: ${scene.importKey}.`);
    sceneKeys.add(scene.importKey);
    const shotKeys = new Set();
    for (const shot of scene.shots || []) {
      if (shotKeys.has(shot.importKey)) error(`scenes.${scene.importKey}.shots`, `Duplicate shot importKey: ${shot.importKey}.`);
      shotKeys.add(shot.importKey);
    }
  }
  if (!scenes.length) error("scenes", "Add at least one storyboard scene.");
  if (scenes.length > 100) error("scenes", "A plan can contain at most 100 scenes.");
  const sceneOrders = scenes.map(scene => scene?.order).filter(Number.isInteger);
  if (new Set(sceneOrders).size !== sceneOrders.length) error("scenes", "Scene order values must be unique.");

  if (!asObject(plan.production)) error("production", "Production details are required.");
  const production = plan.production || {};
  if (production.shootDateStatus != null && !["confirmed", "proposed", "tbd"].includes(production.shootDateStatus)) error("production.shootDateStatus", "Choose confirmed, proposed, or tbd.");
  if (production.shootDate != null) checkDate(production.shootDate, "production.shootDate");
  if (production.shootDate && production.shootDateStatus === "tbd") error("production.shootDate", "A TBD shoot date must be null.");
  if (production.shootDate && !production.shootDateStatus) error("production.shootDateStatus", "State whether this date is confirmed or proposed.");
  if (production.estimatedShootHours != null && (typeof production.estimatedShootHours !== "number" || production.estimatedShootHours <= 0 || production.estimatedShootHours > 10)) error("production.estimatedShootHours", "Use a duration greater than 0 and no more than 10 hours for the one-day limit.");
  if (typeof production.estimatedShootHours === "number" && production.estimatedShootHours > 5) warnings.push({ path: "production.estimatedShootHours", message: "This exceeds the usual 3–5 hour target. Consider simplifying the plan." });
  if (production.budget != null && !(typeof production.budget === "string" && production.budget.length <= 200 || typeof production.budget === "number" && Number.isFinite(production.budget) && production.budget >= 0)) error("production.budget", "Use a non-negative amount or a short text estimate, or null when unknown.");
  if (production.notes != null && (typeof production.notes !== "string" || production.notes.length > 12000)) error("production.notes", "Notes must be at most 12,000 characters.");

  const resources = { castCrew: [], locations: [], wardrobe: [], props: [] };
  const resourceKeys = new Set();
  const checkResourceList = (key, statusValues, options = {}) => checkList(production, key, `production.${key}`, (row, path) => {
    if (!asObject(row)) return error(path, "Resource must be an object.");
    checkKey(row.importKey, `${path}.importKey`);
    checkName(row.name, `${path}.name`);
    if (!statusValues.includes(row.status)) error(`${path}.status`, `Choose one of: ${statusValues.join(", ")}.`);
    if (row.notes != null && (typeof row.notes !== "string" || row.notes.length > 4000)) error(`${path}.notes`, "Notes must be at most 4,000 characters.");
    if (options.description && row.description != null && (typeof row.description !== "string" || row.description.length > 4000)) error(`${path}.description`, "Description must be at most 4,000 characters.");
    if (options.image && row.imageUrl != null && !validUrl(row.imageUrl)) error(`${path}.imageUrl`, "Use an http or https image URL.");
    if (options.cast) {
      if (!hasText(row.role) || row.role.length > 120) error(`${path}.role`, "Enter a project role up to 120 characters.");
      for (const contact of ["email", "phone"]) if (row[contact] != null && (typeof row[contact] !== "string" || row[contact].length > 320)) error(`${path}.${contact}`, "Contact details must be text up to 320 characters.");
    }
    if (options.location && row.address != null && (!hasText(row.address) || row.address.length > 500 || row.addressStatus !== "verified")) error(`${path}.address`, "Only provide an address when it is verified and mark addressStatus as verified.");
  });
  resources.castCrew = checkResourceList("castCrew", CAST_STATUSES, { cast: true });
  resources.locations = checkResourceList("locations", LOCATION_STATUSES, { location: true, image: true });
  resources.wardrobe = checkResourceList("wardrobe", RESOURCE_STATUSES, { description: true, image: true });
  resources.props = checkResourceList("props", RESOURCE_STATUSES, { description: true, image: true });
  for (const list of Object.values(resources)) for (const row of list) {
    if (!row?.importKey) continue;
    if (resourceKeys.has(row.importKey)) error("production", `Resource importKey must be unique across cast, locations, wardrobe, and props: ${row.importKey}.`);
    resourceKeys.add(row.importKey);
  }
  const resourceSet = key => new Set((resources[key] || []).map(row => row.importKey));
  for (const scene of scenes) {
    if (scene.locationKey && !resourceSet("locations").has(scene.locationKey)) error(`scenes.${scene.importKey}.locationKey`, "Does not match a production location.");
    for (const [field, resourcesKey] of [["castKeys", "castCrew"], ["wardrobeKeys", "wardrobe"], ["propKeys", "props"]]) {
      for (const key of scene[field] || []) if (!resourceSet(resourcesKey).has(key)) error(`scenes.${scene.importKey}.${field}`, `Unknown resource key: ${key}.`);
    }
  }

  checkList(production, "tasks", "production.tasks", (task, path) => {
    if (!asObject(task)) return error(path, "Task must be an object.");
    checkKey(task.importKey, `${path}.importKey`);
    checkName(task.title, `${path}.title`);
    if (task.dueDate != null) checkDate(task.dueDate, `${path}.dueDate`);
    if (task.assignee != null && (typeof task.assignee !== "string" || task.assignee.length > 180)) error(`${path}.assignee`, "Assignee must be text up to 180 characters.");
    if (!TASK_STATUSES.includes(task.status)) error(`${path}.status`, `Choose one of: ${TASK_STATUSES.join(", ")}.`);
    if (task.notes != null && (typeof task.notes !== "string" || task.notes.length > 4000)) error(`${path}.notes`, "Notes must be at most 4,000 characters.");
  });
  const taskKeys = new Set();
  for (const task of production.tasks || []) { if (taskKeys.has(task.importKey)) error("production.tasks", `Duplicate task importKey: ${task.importKey}.`); taskKeys.add(task.importKey); }

  const schedule = checkList(production, "shootSchedule", "production.shootSchedule", (block, path) => {
    if (!asObject(block)) return error(path, "Schedule block must be an object.");
    checkKey(block.importKey, `${path}.importKey`);
    checkName(block.title, `${path}.title`);
    if (!Array.isArray(block.sceneKeys) || !block.sceneKeys.length) error(`${path}.sceneKeys`, "Assign at least one scene.");
    else for (const key of block.sceneKeys) if (!sceneKeys.has(key)) error(`${path}.sceneKeys`, `Unknown scene key: ${key}.`);
    if (!resourceSet("locations").has(block.locationKey)) error(`${path}.locationKey`, "Choose a listed production location.");
    for (const [field, resourcesKey] of [["castKeys", "castCrew"], ["wardrobeKeys", "wardrobe"], ["propKeys", "props"]]) {
      if (!Array.isArray(block[field])) error(`${path}.${field}`, "Must be an array of resource keys.");
      else for (const key of block[field]) if (!resourceSet(resourcesKey).has(key)) error(`${path}.${field}`, `Unknown resource key: ${key}.`);
    }
    if (!TIME_RE.test(block.startTime || "")) error(`${path}.startTime`, "Use 24-hour HH:mm time.");
    if (!TIME_RE.test(block.endTime || "")) error(`${path}.endTime`, "Use 24-hour HH:mm time.");
    else if (TIME_RE.test(block.startTime || "") && secondsBetween(block.startTime, block.endTime) <= 0) error(`${path}.endTime`, "End time must be after start time and within the same day.");
    for (const field of ["setupMinutes", "travelMinutes"]) if (!Number.isInteger(block[field]) || block[field] < 0 || block[field] > 600) error(`${path}.${field}`, "Use a whole number of minutes from 0 to 600.");
    if (block.notes != null && (typeof block.notes !== "string" || block.notes.length > 4000)) error(`${path}.notes`, "Notes must be at most 4,000 characters.");
  });
  const scheduleKeys = new Set();
  for (const block of schedule) { if (scheduleKeys.has(block.importKey)) error("production.shootSchedule", `Duplicate schedule importKey: ${block.importKey}.`); scheduleKeys.add(block.importKey); }
  const orderedSchedule = [...schedule].filter(block => TIME_RE.test(block.startTime || "") && TIME_RE.test(block.endTime || "")).sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let index = 0; index < orderedSchedule.length; index++) {
    const block = orderedSchedule[index];
    const start = secondsBetween("00:00", block.startTime);
    if (index && start < secondsBetween("00:00", orderedSchedule[index - 1].endTime)) error("production.shootSchedule", `Schedule blocks overlap: ${orderedSchedule[index - 1].title} and ${block.title}.`);
  }
  if (orderedSchedule.length && secondsBetween(orderedSchedule[0].startTime, orderedSchedule.at(-1).endTime) > 600) error("production.shootSchedule", "The schedule spans more than one practical 10-hour shoot day. Simplify or split the plan before import.");
  if (new Set(schedule.map(block => block.locationKey)).size > 2) warnings.push({ path: "production.shootSchedule", message: "The schedule uses more than two locations. Verify travel and simplify if they are not nearby." });
  if (orderedSchedule.some(block => block.travelMinutes > 0) && schedule.length < 2) warnings.push({ path: "production.shootSchedule", message: "Travel time is included; confirm the locations are different and nearby." });

  if (!asObject(plan.release)) error("release", "A release plan is required.");
  const release = plan.release || {};
  if (!EDITING_STATUSES.includes(release.editingStatus)) error("release.editingStatus", `Choose one of: ${EDITING_STATUSES.join(", ")}.`);
  if (typeof release.finalVideoApproved !== "boolean") error("release.finalVideoApproved", "Must be true or false.");
  if (release.targetVideoReleaseDate != null) checkDate(release.targetVideoReleaseDate, "release.targetVideoReleaseDate");
  if (!PUBLICATION_STATUSES.includes(release.publicationStatus)) error("release.publicationStatus", `Choose one of: ${PUBLICATION_STATUSES.join(", ")}.`);
  if (release.publishedVideoUrl != null && !validUrl(release.publishedVideoUrl)) error("release.publishedVideoUrl", "Use an http or https URL, or null when unknown.");
  if (release.actualPublicationDate != null) checkDate(release.actualPublicationDate, "release.actualPublicationDate");
  if (release.publicationStatus === "Published" && !release.publishedVideoUrl) error("release.publishedVideoUrl", "A Published release needs its actual public URL.");
  if (release.publicationStatus !== "Published" && release.actualPublicationDate) error("release.actualPublicationDate", "Only set the actual publication date when publicationStatus is Published.");

  if (plan.extensions != null && !asObject(plan.extensions)) error("extensions", "Use an object for optional fields that the current organizer does not map.");
  if (JSON.stringify(plan).length > 350_000) error("$", "The plan is too large (maximum 350 KB).");
  return { valid: errors.length === 0, errors, warnings };
}

function makeCounter() { return { created: 0, updated: 0, unchanged: 0, skipped: 0 }; }
function isPublished(project) {
  const release = project?.workspace?.release || {};
  return release.publicationConfirmed === true || release.publicationStatus === "Published";
}
function conflictKey(songId, path) { return `${songId}::${path}`; }
function mergeField(songId, path, current, incoming, conflicts, choices, { locked = false } = {}) {
  if (emptyValue(incoming)) return { value: current, changed: false };
  if (emptyValue(current)) return { value: incoming, changed: true };
  if (JSON.stringify(current) === JSON.stringify(incoming)) return { value: current, changed: false };
  const key = conflictKey(songId, path);
  const choice = choices?.[key];
  conflicts.push({ key, path, existing: current, incoming, choice: choice || null, allowedChoices: locked ? ["keep"] : ["keep", "replace"], locked });
  return choice === "replace" && !locked ? { value: incoming, changed: true } : { value: current, changed: false };
}
function matchRow(rows, item, { nameKey = "name" } = {}) {
  const byKey = rows.findIndex(row => row.importKey && row.importKey === item.importKey);
  if (byKey >= 0) return { index: byKey, ambiguous: false };
  const byName = rows.map((row, index) => ({ row, index })).filter(({ row }) => normalized(row[nameKey]) === normalized(item[nameKey]));
  return { index: byName.length === 1 ? byName[0].index : -1, ambiguous: byName.length > 1 };
}
function resourceTarget(key) { return ({ castCrew: "actors", locations: "locations", wardrobe: "outfits", props: "props" })[key]; }
function emptyCounts() { return { projects: makeCounter(), concepts: makeCounter(), scenes: makeCounter(), shots: makeCounter(), resources: makeCounter(), tasks: makeCounter(), schedule: makeCounter() }; }
function markCounter(counter, kind) { counter[kind]++; }

export function previewMusicVideoPlanImport({ plan, project = null, song, choices = {}, allowCreateProject = false }) {
  const validation = validateMusicVideoPlan(plan);
  const summary = { counts: emptyCounts(), conflicts: [], warnings: [...validation.warnings], errors: [...validation.errors], skipped: false, unchanged: true, candidateWorkspace: null, candidateProject: null, songId: plan?.project?.songId || null, songTitle: song?.title || plan?.project?.songTitle || "Unknown song", projectId: project?.id || null };
  if (!validation.valid) return summary;
  if (!song) { summary.errors.push({ path: "project.songId", message: "No existing song has this ID. Songs are never created by plan imports." }); return summary; }
  if (!project && !allowCreateProject) {
    summary.skipped = true; summary.counts.projects.skipped++;
    summary.warnings.push({ path: "project", message: "No primary video project exists. Preview again with explicit project creation enabled to create one." });
    return summary;
  }
  if (project && isPublished(project)) {
    summary.skipped = true; summary.counts.projects.skipped++;
    summary.warnings.push({ path: "project", message: "This video is already marked Published; its plan was skipped to protect published work." });
    return summary;
  }

  const songId = song.id;
  const existingWorkspace = project?.workspace && asObject(project.workspace) ? structuredClone(project.workspace) : {};
  const workspace = structuredClone(existingWorkspace);
  const creative = asObject(workspace.creative) ? workspace.creative : {};
  const production = asObject(workspace.production) ? workspace.production : {};
  const release = asObject(workspace.release) ? workspace.release : {};
  const people = asObject(workspace.people) ? workspace.people : {};

  const currentConcepts = Array.isArray(creative.concepts) ? creative.concepts.map(row => ({ ...row })) : [];
  let conceptIndex = currentConcepts.findIndex(row => row.importKey === "plan-main");
  if (conceptIndex < 0) conceptIndex = currentConcepts.findIndex(row => row.id === creative.selectedConceptId);
  if (conceptIndex < 0 && currentConcepts.length) conceptIndex = 0;
  if (conceptIndex < 0) {
    const legacy = creative.story || creative.overallConcept || creative.synopsis || creative.concept || "";
    const newConcept = { id: randomUUID(), importKey: "plan-main", title: "", synopsis: "", styles: [], moods: [], scenes: [] };
    if (legacy) newConcept.synopsis = legacy;
    currentConcepts.push(newConcept); conceptIndex = currentConcepts.length - 1;
    markCounter(summary.counts.concepts, "created"); summary.unchanged = false;
  }
  const targetConcept = { ...currentConcepts[conceptIndex] };
  const conceptWasNew = summary.counts.concepts.created > 0;
  targetConcept.importKey = targetConcept.importKey || "plan-main";
  const setConceptField = (path, field, incoming) => {
    const result = mergeField(songId, path, targetConcept[field], incoming, summary.conflicts, choices);
    if (result.changed) { targetConcept[field] = result.value; summary.unchanged = false; }
  };
  setConceptField("vision.concept", "conceptStatement", plan.vision.concept);
  setConceptField("vision.narrativeOverview", "synopsis", plan.vision.narrativeOverview);
  setConceptField("project.projectTitle", "title", plan.project.projectTitle);
  setConceptField("vision.format", "videoFormat", plan.vision.format);
  for (const [source, destination] of [["visualStyles", "styles"], ["moods", "moods"]]) {
    const existing = Array.isArray(targetConcept[destination]) ? targetConcept[destination] : [];
    const next = addUnique(existing, plan.vision[source]);
    if (JSON.stringify(existing) !== JSON.stringify(next)) { targetConcept[destination] = next; summary.unchanged = false; }
  }
  const styleBuiltins = ["Cinematic", "Dreamy", "Surreal", "Retro", "Raw", "Minimal", "Futuristic", "Documentary", "Experimental"];
  const moodBuiltins = ["Emotional", "Playful", "Dark", "Romantic", "Energetic", "Hopeful", "Intimate", "Mysterious", "Melancholic"];
  targetConcept.customStyles = addUnique(targetConcept.customStyles || [], plan.vision.visualStyles.filter(value => !styleBuiltins.includes(value)));
  targetConcept.customMoods = addUnique(targetConcept.customMoods || [], plan.vision.moods.filter(value => !moodBuiltins.includes(value)));
  for (const [source, destination] of [["inspirationLinks", "inspirationLinks"], ["colorPalette", "colorPalette"]]) {
    const existing = Array.isArray(targetConcept[destination]) ? targetConcept[destination] : [];
    const next = addUnique(existing, plan.vision[source]);
    if (JSON.stringify(existing) !== JSON.stringify(next)) { targetConcept[destination] = next; summary.unchanged = false; }
  }
  const existingInspirationImages = Array.isArray(targetConcept.inspirationImages) ? targetConcept.inspirationImages : [];
  const existingImageDetails = Array.isArray(targetConcept.inspirationImageDetails) ? targetConcept.inspirationImageDetails : [];
  const newImageDetails = (plan.vision.referenceImages || []).filter(image => !existingInspirationImages.includes(image.url)).map(image => ({ ...image }));
  if (newImageDetails.length) {
    targetConcept.inspirationImages = addUnique(existingInspirationImages, newImageDetails.map(image => image.url));
    targetConcept.inspirationImageDetails = [...existingImageDetails, ...newImageDetails]; summary.unchanged = false;
  }
  if (plan.vision.notes) {
    const result = mergeField(songId, "vision.notes", targetConcept.notes, plan.vision.notes, summary.conflicts, choices);
    if (result.changed) { targetConcept.notes = result.value; summary.unchanged = false; }
  }

  // Reuse named resources and stable import keys instead of creating another copy on each import.
  const resourceMaps = {};
  for (const sourceKey of ["castCrew", "locations", "wardrobe", "props"]) {
    const workspaceKey = resourceTarget(sourceKey);
    const rows = Array.isArray(people[workspaceKey]) ? people[workspaceKey].map(row => ({ ...row })) : [];
    const byPlanKey = new Map();
    for (const incoming of plan.production[sourceKey]) {
      const match = matchRow(rows, incoming);
      if (match.ambiguous) {
        summary.warnings.push({ path: `production.${sourceKey}.${incoming.importKey}`, message: `Several existing ${workspaceKey} records are named “${incoming.name}”; this resource was skipped to avoid a duplicate.` });
        markCounter(summary.counts.resources, "skipped"); continue;
      }
      const created = match.index < 0;
      const row = created ? { id: randomUUID(), name: incoming.name, importKey: incoming.importKey } : { ...rows[match.index] };
      const before = JSON.stringify(row);
      row.importKey = row.importKey || incoming.importKey;
      row.name = mergeField(songId, `resource.${sourceKey}.${incoming.importKey}.name`, row.name, incoming.name, summary.conflicts, choices).value;
      if (sourceKey === "castCrew") {
        row.role = mergeField(songId, `resource.${sourceKey}.${incoming.importKey}.role`, row.role, incoming.role, summary.conflicts, choices).value;
        row.kind = row.kind || incoming.kind || "crew";
        for (const field of ["email", "phone", "status", "notes"]) row[field] = mergeField(songId, `resource.${sourceKey}.${incoming.importKey}.${field}`, row[field], incoming[field], summary.conflicts, choices, { locked: field === "status" && row.status === "Completed" }).value;
        if (incoming.notes && emptyValue(row.agreement)) row.agreement = incoming.notes;
      } else if (sourceKey === "locations") {
        for (const field of ["address", "addressStatus", "notes", "status", "imageUrl"]) row[field] = mergeField(songId, `resource.${sourceKey}.${incoming.importKey}.${field}`, row[field], incoming[field], summary.conflicts, choices).value;
      } else {
        row.kind = row.kind || (sourceKey === "wardrobe" ? "Outfit" : "Prop");
        for (const field of ["description", "notes", "status", "imageUrl"]) row[field] = mergeField(songId, `resource.${sourceKey}.${incoming.importKey}.${field}`, row[field], incoming[field], summary.conflicts, choices).value;
      }
      if (created) rows.push(row); else rows[match.index] = row;
      byPlanKey.set(incoming.importKey, row);
      const changed = created || before !== JSON.stringify(row);
      markCounter(summary.counts.resources, created ? "created" : changed ? "updated" : "unchanged");
      if (changed) summary.unchanged = false;
    }
    resourceMaps[sourceKey] = byPlanKey;
    people[workspaceKey] = rows;
  }

  const priorScenes = Array.isArray(targetConcept.scenes) ? targetConcept.scenes.map(row => ({ ...row })) : [];
  const importedScenes = [...plan.scenes].sort((a, b) => a.order - b.order);
  const matchedSceneIds = new Set();
  const nextScenes = [];
  for (const scenePlan of importedScenes) {
    let match = priorScenes.findIndex(row => row.importKey === scenePlan.importKey);
    if (match < 0) {
      const titleMatches = priorScenes.map((row, index) => ({ row, index })).filter(({ row }) => normalized(row.title) === normalized(scenePlan.title));
      if (titleMatches.length === 1) match = titleMatches[0].index;
      else if (titleMatches.length > 1) summary.warnings.push({ path: `scenes.${scenePlan.importKey}`, message: `Several existing scenes are titled “${scenePlan.title}”; a new scene will be added with its stable key.` });
    }
    const created = match < 0;
    let scene = created ? { id: randomUUID(), importKey: scenePlan.importKey, title: "", description: "", status: "planned", referenceImages: [], shots: [] } : { ...priorScenes[match] };
    const before = JSON.stringify(scene);
    scene.importKey = scene.importKey || scenePlan.importKey;
    for (const field of ["title", "description", "status"]) {
      const result = mergeField(songId, `scene.${scenePlan.importKey}.${field}`, scene[field], scenePlan[field], summary.conflicts, choices, { locked: field === "status" && scene.status === "filmed" });
      scene[field] = result.value;
    }
    scene.sourceNotes = { ...(scene.sourceNotes || {}), ...(scenePlan.notes ? { planNotes: scenePlan.notes } : {}) };
    const refs = Array.isArray(scene.referenceImages) ? scene.referenceImages.map(ref => typeof ref === "string" ? { id: randomUUID(), url: ref } : { ...ref }) : [];
    const refUrls = new Set(refs.map(ref => ref.url));
    for (const reference of scenePlan.referenceImages || []) if (!refUrls.has(reference.url)) { refs.push({ id: randomUUID(), ...reference }); refUrls.add(reference.url); }
    scene.referenceImages = refs;
    if (!scene.referenceUrl && refs[0]?.url) scene.referenceUrl = refs[0].url;

    const findResource = (type, key) => resourceMaps[type].get(key);
    const location = scenePlan.locationKey ? findResource("locations", scenePlan.locationKey) : null;
    if (location) {
      scene.location = mergeField(songId, `scene.${scenePlan.importKey}.location`, scene.location, location.name, summary.conflicts, choices).value;
      scene.locationId = location.id;
    }
    const assigned = (keys, type, nameField, idField) => {
      const found = keys.map(key => findResource(type, key)).filter(Boolean);
      const names = found.map(row => row.name);
      const ids = found.map(row => row.id);
      const nextNames = addUnique(scene[nameField] || [], names);
      const nextIds = addUnique(scene[idField] || [], ids);
      scene[nameField] = nextNames; scene[idField] = nextIds;
    };
    assigned(scenePlan.castKeys || [], "castCrew", "characters", "characterIds");
    assigned(scenePlan.wardrobeKeys || [], "wardrobe", "outfits", "outfitIds");
    assigned(scenePlan.propKeys || [], "props", "props", "propIds");
    scene.outfit = scene.outfits?.[0] || scene.outfit || "";

    const oldShots = Array.isArray(scene.shots) ? scene.shots.map(row => ({ ...row })) : [];
    const nextShots = [];
    for (const shotPlan of [...(scenePlan.shots || [])].sort((a, b) => a.order - b.order)) {
      let shotIndex = oldShots.findIndex(row => row.importKey === shotPlan.importKey);
      if (shotIndex < 0) {
        const textMatches = oldShots.map((row, index) => ({ row, index })).filter(({ row }) => normalized(row.text || row.description) === normalized(shotPlan.description));
        if (textMatches.length === 1) shotIndex = textMatches[0].index;
      }
      const shotCreated = shotIndex < 0;
      const shot = shotCreated ? { id: randomUUID(), importKey: shotPlan.importKey, text: "", done: false } : { ...oldShots[shotIndex] };
      const shotBefore = JSON.stringify(shot);
      shot.importKey = shot.importKey || shotPlan.importKey;
      shot.text = mergeField(songId, `scene.${scenePlan.importKey}.shot.${shotPlan.importKey}.description`, shot.text, shotPlan.description, summary.conflicts, choices).value;
      if (shotPlan.framing) shot.type = mergeField(songId, `scene.${scenePlan.importKey}.shot.${shotPlan.importKey}.framing`, shot.type, shotPlan.framing, summary.conflicts, choices).value;
      if (shotPlan.referenceImage) shot.referenceUrl = mergeField(songId, `scene.${scenePlan.importKey}.shot.${shotPlan.importKey}.referenceImage`, shot.referenceUrl, shotPlan.referenceImage, summary.conflicts, choices).value;
      if (shotPlan.done === true) shot.done = true;
      const shotChanged = shotCreated || shotBefore !== JSON.stringify(shot);
      markCounter(summary.counts.shots, shotCreated ? "created" : shotChanged ? "updated" : "unchanged");
      if (shotChanged) summary.unchanged = false;
      nextShots.push(shot);
    }
    const importedShotKeys = new Set(nextShots.map(shot => shot.importKey));
    scene.shots = [...nextShots, ...oldShots.filter(shot => !importedShotKeys.has(shot.importKey))];
    const changed = created || before !== JSON.stringify(scene);
    markCounter(summary.counts.scenes, created ? "created" : changed ? "updated" : "unchanged");
    if (changed) summary.unchanged = false;
    if (!created) matchedSceneIds.add(scene.id);
    nextScenes.push(scene);
  }
  const importedKeys = new Set(nextScenes.map(scene => scene.importKey));
  const unmatchedOldScenes = priorScenes.filter(scene => !matchedSceneIds.has(scene.id) && !importedKeys.has(scene.importKey));
  for (const scene of unmatchedOldScenes) {
    scene.number = nextScenes.length + 1;
    nextScenes.push(scene);
  }
  nextScenes.forEach((scene, index) => { scene.number = index + 1; });
  targetConcept.scenes = nextScenes;
  if (JSON.stringify(currentConcepts[conceptIndex]) !== JSON.stringify(targetConcept)) {
    currentConcepts[conceptIndex] = targetConcept;
    if (!conceptWasNew) markCounter(summary.counts.concepts, "updated");
    summary.unchanged = false;
  } else if (!conceptWasNew) markCounter(summary.counts.concepts, "unchanged");
  const nextCreative = { ...creative, concepts: currentConcepts, selectedConceptId: targetConcept.id };
  if (!creative.videoType) nextCreative.videoType = plan.project.videoType;
  workspace.creative = nextCreative;
  workspace.videoType = mergeField(songId, "project.videoType", workspace.videoType, plan.project.videoType, summary.conflicts, choices).value;
  if (plan.project.projectTitle) workspace.projectTitle = mergeField(songId, "project.projectTitle", workspace.projectTitle, plan.project.projectTitle, summary.conflicts, choices).value;

  const nextProduction = { ...production };
  const productionFields = [
    ["estimatedShootHours", plan.production.estimatedShootHours],
    ["budget", plan.production.budget == null ? undefined : String(plan.production.budget)],
    ["notes", plan.production.notes],
  ];
  for (const [field, incoming] of productionFields) {
    const result = mergeField(songId, `production.${field}`, nextProduction[field], incoming, summary.conflicts, choices);
    if (result.changed) { nextProduction[field] = result.value; summary.unchanged = false; }
  }
  if (plan.production.shootDateStatus === "confirmed" && plan.production.shootDate) {
    const result = mergeField(songId, "production.shootDate", nextProduction.shootDate, plan.production.shootDate, summary.conflicts, choices);
    if (result.changed) { nextProduction.shootDate = result.value; summary.unchanged = false; }
  } else if (plan.production.shootDateStatus === "proposed" && plan.production.shootDate) {
    const result = mergeField(songId, "production.proposedShootDate", nextProduction.proposedShootDate, plan.production.shootDate, summary.conflicts, choices);
    if (result.changed) { nextProduction.proposedShootDate = result.value; summary.unchanged = false; }
  }

  const existingTasks = Array.isArray(production.tasks) ? production.tasks.map(row => ({ ...row })) : [];
  const nextTasks = [...existingTasks];
  for (const taskPlan of plan.production.tasks) {
    const match = matchRow(nextTasks, { importKey: taskPlan.importKey, name: taskPlan.title }, { nameKey: "name" });
    if (match.ambiguous) { summary.warnings.push({ path: `production.tasks.${taskPlan.importKey}`, message: `Several existing tasks are titled “${taskPlan.title}”; this task was skipped to avoid duplication.` }); markCounter(summary.counts.tasks, "skipped"); continue; }
    const created = match.index < 0;
    const task = created ? { id: randomUUID(), importKey: taskPlan.importKey, name: taskPlan.title } : { ...nextTasks[match.index] };
    const before = JSON.stringify(task);
    task.importKey = task.importKey || taskPlan.importKey;
    for (const [planField, rowField] of [["title", "name"], ["dueDate", "dueDate"], ["assignee", "assignee"], ["status", "status"], ["notes", "notes"]]) {
      const locked = planField === "status" && task.status === "Done";
      task[rowField] = mergeField(songId, `task.${taskPlan.importKey}.${planField}`, task[rowField], taskPlan[planField], summary.conflicts, choices, { locked }).value;
    }
    if (created) nextTasks.push(task); else nextTasks[match.index] = task;
    const changed = created || before !== JSON.stringify(task);
    markCounter(summary.counts.tasks, created ? "created" : changed ? "updated" : "unchanged");
    if (changed) summary.unchanged = false;
  }
  nextProduction.tasks = nextTasks;

  const existingSchedule = Array.isArray(production.shootSchedule) ? production.shootSchedule.map(row => ({ ...row })) : [];
  const nextSchedule = [...existingSchedule];
  for (const blockPlan of plan.production.shootSchedule) {
    const existingIndex = nextSchedule.findIndex(row => row.importKey === blockPlan.importKey);
    const created = existingIndex < 0;
    const block = created ? { id: randomUUID(), importKey: blockPlan.importKey } : { ...nextSchedule[existingIndex] };
    const before = JSON.stringify(block);
    block.importKey = block.importKey || blockPlan.importKey;
    const location = resourceMaps.locations.get(blockPlan.locationKey);
    const fieldValues = {
      title: blockPlan.title,
      sceneKeys: blockPlan.sceneKeys,
      sceneIds: blockPlan.sceneKeys.map(key => nextScenes.find(scene => scene.importKey === key)?.id).filter(Boolean),
      locationKey: blockPlan.locationKey,
      location: location?.name,
      locationId: location?.id,
      startTime: blockPlan.startTime,
      endTime: blockPlan.endTime,
      setupMinutes: blockPlan.setupMinutes,
      travelMinutes: blockPlan.travelMinutes,
      castKeys: blockPlan.castKeys,
      cast: blockPlan.castKeys.map(key => resourceMaps.castCrew.get(key)?.name).filter(Boolean),
      wardrobeKeys: blockPlan.wardrobeKeys,
      wardrobe: blockPlan.wardrobeKeys.map(key => resourceMaps.wardrobe.get(key)?.name).filter(Boolean),
      propKeys: blockPlan.propKeys,
      props: blockPlan.propKeys.map(key => resourceMaps.props.get(key)?.name).filter(Boolean),
      notes: blockPlan.notes,
    };
    for (const [field, incoming] of Object.entries(fieldValues)) {
      const result = mergeField(songId, `schedule.${blockPlan.importKey}.${field}`, block[field], incoming, summary.conflicts, choices);
      if (result.changed) block[field] = result.value;
    }
    if (created) nextSchedule.push(block); else nextSchedule[existingIndex] = block;
    const changed = created || before !== JSON.stringify(block);
    markCounter(summary.counts.schedule, created ? "created" : changed ? "updated" : "unchanged");
    if (changed) summary.unchanged = false;
  }
  nextSchedule.sort((a, b) => String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99")));
  nextProduction.shootSchedule = nextSchedule;
  workspace.production = nextProduction;

  const nextRelease = { ...release };
  const releaseFields = [
    ["editingStatus", plan.release.editingStatus],
    ["finalApproved", plan.release.finalVideoApproved ? "yes" : "no"],
    ["releaseDate", plan.release.targetVideoReleaseDate],
    ["videoUrl", plan.release.publishedVideoUrl],
    ["publicationStatus", plan.release.publicationStatus],
    ["publicationDate", plan.release.actualPublicationDate],
  ];
  for (const [field, incoming] of releaseFields) {
    const result = mergeField(songId, `release.${field}`, nextRelease[field], incoming, summary.conflicts, choices, { locked: field === "publicationStatus" && nextRelease.publicationStatus === "Published" });
    if (result.changed) { nextRelease[field] = result.value; summary.unchanged = false; }
  }
  if (plan.release.publicationStatus === "Published" && plan.release.publishedVideoUrl) {
    const result = mergeField(songId, "release.publicationConfirmed", nextRelease.publicationConfirmed, true, summary.conflicts, choices, { locked: nextRelease.publicationConfirmed === true });
    if (result.changed) { nextRelease.publicationConfirmed = true; summary.unchanged = false; }
  } else if (emptyValue(nextRelease.publicationConfirmed)) nextRelease.publicationConfirmed = false;
  workspace.release = nextRelease;

  const extensions = asObject(plan.extensions) ? plan.extensions : {};
  workspace.imports = {
    ...(asObject(workspace.imports) ? workspace.imports : {}),
    musicVideoPlan: {
      version: MUSIC_VIDEO_PLAN_VERSION,
      extensions,
    },
  };
  const candidateProject = { ...(project || {}), song_id: songId, project_type: "primary", status: plan.project.planningStatus, public_concept: plan.vision.concept, workspace };
  if (project?.status && candidateProject.status !== project.status) {
    const result = mergeField(songId, "project.planningStatus", project.status, plan.project.planningStatus, summary.conflicts, choices);
    candidateProject.status = result.value;
    if (result.changed) summary.unchanged = false;
  }
  if (project?.public_concept) {
    const result = mergeField(songId, "project.publicConcept", project.public_concept, plan.vision.concept, summary.conflicts, choices);
    candidateProject.public_concept = result.value;
    if (result.changed) summary.unchanged = false;
  }
  markCounter(summary.counts.projects, project ? (summary.unchanged ? "unchanged" : "updated") : "created");
  if (!project) summary.unchanged = false;
  if (JSON.stringify(workspace) !== JSON.stringify(existingWorkspace)) summary.unchanged = false;
  summary.projectId = project?.id || null;
  summary.candidateWorkspace = workspace;
  summary.candidateProject = candidateProject;
  return summary;
}

export function unresolvedMusicVideoPlanConflicts(previews, choices = {}) {
  return previews.flatMap(preview => preview.conflicts.filter(conflict => !conflict.locked && !["keep", "replace"].includes(choices[conflict.key])));
}

export function hasPublishedMusicVideo(project) { return isPublished(project); }
