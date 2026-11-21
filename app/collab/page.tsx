import CollabGallery from "@/components/collab/CollabGallery";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { songCoverPath } from "@/lib/songCover";
import { resolveSongLinks } from "@/lib/chxndlerLinks";
import { toYouTubeEmbed } from "@/lib/youtube";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { youtubeSkyFor } from "@/lib/sky-youtube";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import type { ArtistRelease } from "@/components/brand-pitch/artistRelease";
import { getSongBySlug } from "@/lib/songs-consolidated";
import { getCollabInviteSession } from "@/lib/collabAccess";
import CollabAccessGate from "@/components/collab/CollabAccessGate";

export const dynamic = "force-dynamic";

function fileParts(name: string) {
  const dot = name.lastIndexOf(".");
  return {
    stem: (dot > 0 ? name.slice(0, dot) : name).trim(),
    extension: dot > 0 ? name.slice(dot + 1).toLowerCase() : "",
  };
}

function keyFor(stem: string) {
  return stem.toLowerCase().replace(/(?:[-_ .])(background|backdrop|bg)$/i, "").replace(/[^a-z0-9]/g, "");
}

function rawString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const NON_RELEASE_TITLES = ["welcome to the heartverse", "you are home", "space music", "welcome back"];
const normalizeTitle = (title: string) => title.trim().replace(/[‘’ʼ`]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

async function fetchArtistSongs(onlySongIds?: string[]): Promise<{ released: ArtistRelease[]; unreleased: ArtistRelease[] }> {
  try {
    if (onlySongIds && !onlySongIds.length) return { released: [], unreleased: [] };
    const supabase = getSupabaseAdmin();
    let songQuery = supabase.from("songs").select("id, slug, title, is_released, audio_status, collaboration_enabled, ready_for_collab, collab_interests, collaboration_opportunities, video_concept, collaboration_description, release_date, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url");
    if (onlySongIds) songQuery = songQuery.in("id", onlySongIds);
    const [initialSongsRes, cardsRes, videoProjectsRes, youtubeContentRes] = await Promise.all([
      songQuery,
      supabase.from("cards").select("card_name"),
      supabase.from("music_video_projects").select("song_id,public_concept,workspace"),
      supabase.from("youtube_content").select("song_title,video_link"),
    ]);
    // Keep the collaborator catalog available if optional metadata columns
    // have not been deployed to this environment yet. Access is still
    // restricted below using the validated invite session.
    let songRows: Array<Record<string, any>> | null = initialSongsRes.data as Array<Record<string, any>> | null;
    if (initialSongsRes.error) {
      const optionalFallback = await supabase.from("songs").select("id, slug, title, is_released, collaboration_enabled, ready_for_collab, collab_interests, collaboration_description, release_date, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url");
      if (!optionalFallback.error) {
        songRows = (optionalFallback.data || []).map((row) => ({ ...row, audio_status: row.is_released ? "Released" : "Demo", collaboration_opportunities: row.collab_interests || [], video_concept: "", ready_for_collab: row.ready_for_collab ?? row.collaboration_enabled === true }));
      } else {
        // `ready_for_collab` arrived after the original collaboration flag.
        // Keep existing invites usable on databases that have not applied the
        // newer music workspace migration yet.
        const legacyCollabFallback = await supabase.from("songs").select("id, slug, title, is_released, collaboration_enabled");
        if (!legacyCollabFallback.error) {
          songRows = (legacyCollabFallback.data || []).map((row) => ({ ...row, audio_status: row.is_released ? "Released" : "Demo", collab_interests: [], collaboration_description: "", collaboration_opportunities: [], video_concept: "", ready_for_collab: row.collaboration_enabled === true }));
        } else {
          // Keep the final fallback limited to fields present on the oldest
          // song schema; it cannot safely claim that a song is collaboration-ready.
          const coreFallback = await supabase.from("songs").select("id, slug, title, is_released");
          if (!coreFallback.error) {
            songRows = (coreFallback.data || []).map((row) => ({ ...row, collaboration_enabled: false, ready_for_collab: false, audio_status: row.is_released ? "Released" : "Demo", collaboration_opportunities: [] }));
          } else {
            songRows = null;
            console.error("[collab] Could not load song catalog:", initialSongsRes.error, optionalFallback.error, legacyCollabFallback.error, coreFallback.error);
          }
        }
      }
    }
    if (!songRows) return { released: [], unreleased: [] };

    const cardNames = new Map<string, string>();
    for (const card of cardsRes.data ?? []) {
      if (card.card_name) cardNames.set(normalizeTitle(String(card.card_name)), String(card.card_name));
    }

    const catalogVideos = new Map<string, string>();
    for (const item of youtubeContentRes.data ?? []) {
      if (item.song_title && typeof item.video_link === "string" && item.video_link.trim()) {
        catalogVideos.set(normalizeTitle(String(item.song_title)), item.video_link.trim());
      }
    }
    const projectVideos = new Map<string, string>();
    const recordedVideoProjects = new Set<string>();
    const projectPlans = new Map<string, NonNullable<ArtistRelease["videoPlan"]>>();
    for (const project of videoProjectsRes.data ?? []) {
      const url = project.workspace?.release?.videoUrl;
      if (project.song_id && typeof url === "string" && url.trim()) projectVideos.set(String(project.song_id), url.trim());
      const productionStage = String(project.workspace?.production?.stage || "").toLowerCase();
      if (project.song_id && ["editing", "review", "delivered", "released"].includes(productionStage)) recordedVideoProjects.add(String(project.song_id));
      const creative = project.workspace?.creative || {};
      const production = project.workspace?.production || {};
      const shotList = Array.isArray(creative.shotList) ? creative.shotList.filter((shot: unknown): shot is Record<string, unknown> => !!shot && typeof shot === "object" && !Array.isArray(shot)) : [];
      if (project.song_id) projectPlans.set(String(project.song_id), {
        concept: typeof project.public_concept === "string" && project.public_concept.trim() ? project.public_concept.trim() : typeof creative.overallConcept === "string" ? creative.overallConcept.trim() : "",
        performers: typeof creative.charactersPerformers === "string" ? creative.charactersPerformers.trim() : "",
        locations: typeof production.locations === "string" ? production.locations.trim() : "",
        shotList: shotList.map(shot => ({
          scene: typeof shot.scene === "string" ? shot.scene : "",
          description: typeof shot.description === "string" ? shot.description : "",
          location: typeof shot.location === "string" ? shot.location : "",
          lyricSection: typeof shot.lyricSection === "string" ? shot.lyricSection : "",
          status: typeof shot.status === "string" ? shot.status : "",
        })),
      });
    }

    const songs = songRows
      .filter((row) => !!row.slug && !!row.title && !NON_RELEASE_TITLES.includes(String(row.title).toLowerCase()))
      .map((row) => {
        const slug = String(row.slug);
        const title = String(row.title);
        const released = row.is_released === true || row.audio_status === "Released";
        const musicVideoUrl = rawString(row.youtube_music_video_url) || projectVideos.get(String(row.id)) || catalogVideos.get(normalizeTitle(title)) || "";
        const hasVideo = !!musicVideoUrl;
        const savedOpportunities = Array.isArray(row.collaboration_opportunities) ? row.collaboration_opportunities : (Array.isArray(row.collab_interests) ? row.collab_interests.map((value: string) => /video/i.test(value) ? "video" : /remix/i.test(value) ? "remix" : /feature|vocal/i.test(value) ? "feature" : "").filter(Boolean) : []);
        const readyForCollab = row.ready_for_collab === true || row.collaboration_enabled === true;
        const opportunities: NonNullable<ArtistRelease["collaborationOpportunities"]> = [];
        if (readyForCollab) opportunities.push("remix");
        // Some videos are already recorded but are not published yet. Those
        // songs should not be presented as seeking a video collaborator.
        const videoRecorded = recordedVideoProjects.has(String(row.id)) || ["BE MY BEE", "MAKE BELIEVE", "ALWAYS ON MY MIND (ACOUSTIC)", "COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)", "LETTING GO"].includes(normalizeTitle(title));
        if (!hasVideo && !videoRecorded) opportunities.push("video");
        if (!released) opportunities.push(...savedOpportunities.filter((value: string): value is "feature" => value === "feature"));
        const links = resolveSongLinks(row);
        const rawLink = rawString;
        const cardName = cardNames.get(normalizeTitle(title));
        return {
          released,
          release: {
            slug,
            databaseId: String(row.id),
            collaborationEnabled: true,
            readyForCollab,
            collaborationInterests: Array.isArray(row.collab_interests) ? row.collab_interests : [],
            audioStatus: row.audio_status || (released ? "Released" : "Demo"),
            isReleased: released,
            collaborationOpportunities: [...new Set(opportunities)],
            collaborationDescription: typeof row.collaboration_description === "string" ? row.collaboration_description : "",
            videoConcept: typeof row.video_concept === "string" ? row.video_concept : "",
            videoPlan: projectPlans.get(String(row.id)),
            releaseDate: typeof row.release_date === "string" ? row.release_date : null,
            title,
            oneLiner: (() => {
              const subtitle = getSongBySlug(slug)?.subtitle;
              return subtitle && !subtitle.startsWith("Channel ") ? subtitle : `${title} is ready for its next visual chapter.`;
            })(),
            artist: "CHXNDLER",
            coverArt: songCoverPath(slug, title),
            spotifyUrl: released ? links.spotifyUrl : rawLink(row.spotify_url),
            appleMusicUrl: released ? links.appleMusicUrl : rawLink(row.apple_music_url),
            youtubeUrl: released ? links.youtubeUrl : rawLink(row.youtube_music_video_url),
            videoEmbedUrl: toYouTubeEmbed(musicVideoUrl),
            cardArt: cardName ? getCardImageUrl(cardName) : null,
            skyVideoUrl: (row.sky_video_url as string | null) || youtubeSkyFor(slug) || null,
          },
        };
      });

    // Compare unreleased tracks with actual objects in the public Supabase
    // `tracks` bucket. The songs table alone can contain rows before audio is uploaded.
    let trackPaths: string[] | null = null;
    try {
      const trackStorage = supabase.storage.from("tracks");
      const paths: string[] = [];
      const walkTracks = async (folder = "", depth = 0): Promise<void> => {
        if (depth > 8) return;
        const { data, error } = await trackStorage.list(folder, { limit: 1000 });
        if (error) throw error;
        for (const entry of data ?? []) {
          if (!entry.name) continue;
          const path = folder ? `${folder}/${entry.name}` : entry.name;
          if (entry.id) paths.push(path);
          else await walkTracks(path, depth + 1);
        }
      };
      await walkTracks();
      trackPaths = paths;
    } catch (error) {
      console.error("[collab] Could not check Supabase track audio:", error);
    }

    const withAudio = async (release: ArtistRelease): Promise<ArtistRelease> => {
      if (!trackPaths) return release;
      const expectedUrl = new URL(releaseAudioSrc(release.slug), "https://local.invalid");
      const expected = (expectedUrl.searchParams.get("path") || decodeURIComponent(expectedUrl.pathname.split("/tracks/").pop() || "")).toLowerCase();
      const expectedKey = keyFor(fileParts(expected).stem);
      const titleKey = keyFor(release.title);
      const actualPath = trackPaths.find((path) => path.toLowerCase() === expected)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === expectedKey)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === titleKey);
      let audioUrl: string | undefined;
      if (actualPath) audioUrl = `/api/audio?path=${encodeURIComponent(actualPath)}`;
      return {
        ...release,
        audioAvailable: !!actualPath,
        ...(audioUrl ? { audioUrl } : {}),
      };
    };

    return {
      released: await Promise.all(songs.filter((song) => song.released).map((song) => withAudio(song.release))),
      unreleased: await Promise.all(songs.filter((song) => !song.released).map((song) => withAudio(song.release))),
    };
  } catch (error) {
    console.error("[collab] Could not load artist songs:", error);
    return { released: [], unreleased: [] };
  }
}

export default async function CollabPage() {
  const inviteSession = await getCollabInviteSession();
  if (!inviteSession) return <CollabAccessGate />;
  let musicVideos: Array<{ id: string; song_id: string; public_concept: string; public_status: string; songs?: { title: string; slug: string } }> = [];
  try {
    const { data } = await getSupabaseAdmin().from("music_video_projects")
      .select("id,song_id,public_concept,public_status,songs(title,slug)").eq("visibility", "public").order("updated_at", { ascending: false });
    musicVideos = (data || []).map((project) => ({ ...project, songs: Array.isArray(project.songs) ? project.songs[0] : project.songs })) as unknown as typeof musicVideos;
  } catch (error) { console.error("[collab] Could not load public music video projects:", error); }
  const catalog = await fetchArtistSongs();
  const allCatalogSongs = [...catalog.released, ...catalog.unreleased];
  const invitedSong = inviteSession.scope === "song" && inviteSession.song_id
    ? allCatalogSongs.find((song) => song.databaseId === inviteSession.song_id && song.readyForCollab === true) || null
    : null;
  const permittedCatalog = inviteSession.scope === "song"
    ? allCatalogSongs.filter(song => song.databaseId === inviteSession.song_id && song.readyForCollab === true)
    : inviteSession.scope === "catalog"
      ? allCatalogSongs
      : [];
  const released = permittedCatalog.filter(song => song.audioStatus === "Released" || song.audioStatus === "Final");
  const unreleased = permittedCatalog.filter(song => song.audioStatus !== "Released" && song.audioStatus !== "Final");
  return <CollabGallery artistReleases={released} unreleasedSongs={unreleased} invitedSongSlug={inviteSession.scope === "song" ? invitedSong?.slug || null : null} defaultView={inviteSession.scope === "video" ? "video" : "collabs"} invitedDisplayName={inviteSession.display_name} invitedEmail={inviteSession.email || ""} musicVideos={musicVideos} canViewFeatures />;
}
