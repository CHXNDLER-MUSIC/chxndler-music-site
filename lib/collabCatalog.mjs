export const COLLAB_CATALOG_FILTERS = ["collabs", "video", "complete"];

const isFinished = song => song.audioStatus === "Final" || song.audioStatus === "Released" || song.isReleased === true;
const needsVideo = song => song.collaborationOpportunities?.includes("video");

export function filterCollabCatalog(songs, filter) {
  if (filter === "collabs") return songs.filter(song => song.readyForCollab === true);
  if (filter === "video") return songs.filter(needsVideo);
  if (filter === "complete") return songs.filter(song => isFinished(song) && !needsVideo(song));
  return [];
}
