/**
 * Unified warp trigger helper
 * This is the single source of truth for triggering warp from any source.
 */

export type WarpSource = 'dropdown' | 'planet-button' | 'keyboard' | 'auto';

export interface TriggerWarpParams {
  /** Song identifier - can be id or slug */
  songId?: string;
  /** Song slug - preferred identifier */
  songSlug?: string;
  /** Where the warp was triggered from */
  source: WarpSource;
  /** Available songs array for resolution */
  songs?: Array<{ id?: string; slug?: string; title?: string }>;
  /** The onSongChange callback from parent */
  onSongChange?: (id: string) => void;
  /** Planet name for debugging */
  planetName?: string;
}

export interface WarpResult {
  success: boolean;
  resolvedId: string | null;
  error?: string;
}

/**
 * Resolve a song identifier from various inputs
 */
export function resolveSongId(params: {
  songId?: string;
  songSlug?: string;
  planetName?: string;
  songs?: Array<{ id?: string; slug?: string; title?: string }>;
}): { id: string | null; method: string } {
  const { songId, songSlug, planetName, songs = [] } = params;

  // Priority 1: Direct slug
  if (songSlug && songSlug.trim()) {
    return { id: songSlug.trim().toLowerCase(), method: 'direct-slug' };
  }

  // Priority 2: Direct id
  if (songId && songId.trim()) {
    return { id: songId.trim().toLowerCase(), method: 'direct-id' };
  }

  // Priority 3: Match planet name to song title
  if (planetName && songs.length > 0) {
    const normalizedName = planetName.toLowerCase().trim();

    // Try exact title match
    const exactMatch = songs.find(
      s => s.title?.toLowerCase().trim() === normalizedName
    );
    if (exactMatch) {
      const id = exactMatch.slug || exactMatch.id;
      if (id) return { id: id.toLowerCase(), method: 'planet-title-match' };
    }

    // Try slug match
    const slugMatch = songs.find(
      s => s.slug?.toLowerCase() === normalizedName ||
           s.id?.toLowerCase() === normalizedName
    );
    if (slugMatch) {
      const id = slugMatch.slug || slugMatch.id;
      if (id) return { id: id.toLowerCase(), method: 'planet-slug-match' };
    }
  }

  return { id: null, method: 'no-match' };
}

/**
 * Trigger a warp to a song - unified entry point for all warp sources.
 * Both dropdown selection and planet warp button should call this.
 */
export function triggerWarpToSong(params: TriggerWarpParams): WarpResult {
  const { source, songId, songSlug, songs, onSongChange, planetName } = params;

  // Log entry
  console.log(`[WARP] trigger from ${source}`, {
    songId,
    songSlug,
    planetName,
    hasOnSongChange: !!onSongChange,
    songsCount: songs?.length || 0
  });

  // Resolve the song identifier
  const { id: resolvedId, method } = resolveSongId({
    songId,
    songSlug,
    planetName,
    songs
  });

  console.log(`[WARP] resolved id: ${resolvedId} (method: ${method})`);

  // Validate we have a valid identifier
  if (!resolvedId) {
    const error = `Cannot resolve song identifier. songId=${songId}, songSlug=${songSlug}, planetName=${planetName}`;
    console.error(`[WARP] ERROR: ${error}`);
    return { success: false, resolvedId: null, error };
  }

  // Validate we have the callback
  if (!onSongChange) {
    const error = 'onSongChange callback is not provided';
    console.error(`[WARP] ERROR: ${error}`);
    return { success: false, resolvedId, error };
  }

  // Trigger the warp
  console.log(`[WARP] start - calling onSongChange with: ${resolvedId}`);

  try {
    onSongChange(resolvedId);
    console.log(`[WARP] onSongChange called successfully`);
    return { success: true, resolvedId };
  } catch (err) {
    const error = `onSongChange threw: ${err}`;
    console.error(`[WARP] ERROR: ${error}`);
    return { success: false, resolvedId, error };
  }
}
