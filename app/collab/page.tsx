import CollabGallery from "@/components/collab/CollabGallery";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { songCoverPath } from "@/lib/songCover";
import { resolveSongLinks } from "@/lib/chxndlerLinks";
import { toYouTubeEmbed } from "@/lib/youtube";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { youtubeSkyFor } from "@/lib/sky-youtube";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import type { ArtistRelease } from "@/components/brand-pitch/artistRelease";
import { getCollabInviteSession } from "@/lib/collabAccess";

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

const NON_RELEASE_TITLES = ["welcome to the heartverse", "you are home", "space music", "welcome back"];
const normalizeTitle = (title: string) => title.trim().replace(/[‘’ʼ`]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

async function fetchArtistSongs(onlySongIds?: string[]): Promise<{ released: ArtistRelease[]; unreleased: ArtistRelease[] }> {
  try {
    if (onlySongIds && !onlySongIds.length) return { released: [], unreleased: [] };
    const supabase = getSupabaseAdmin();
    let songQuery = supabase.from("songs").select("id, slug, title, is_released, audio_status, collaboration_enabled, ready_for_collab, collab_interests, collaboration_opportunities, video_concept, collaboration_description, release_date, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url");
    if (onlySongIds) songQuery = songQuery.in("id", onlySongIds);
    const [initialSongsRes, cardsRes, videoProjectsRes] = await Promise.all([
      songQuery,
      supabase.from("cards").select("card_name"),
      supabase.from("music_video_projects").select("song_id"),
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
        const coreFallback = await supabase.from("songs").select("id, slug, title, is_released, collaboration_enabled, release_date, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url");
        if (!coreFallback.error) {
          // Before the Ready for Collab columns exist, preserve only songs
          // whose prior explicit collaboration setting was enabled.
          songRows = (coreFallback.data || []).map((row) => ({ ...row, ready_for_collab: row.collaboration_enabled === true, audio_status: row.is_released ? "Released" : "Demo", collaboration_opportunities: [] }));
        } else {
          songRows = null;
          console.error("[collab] Could not load song catalog:", initialSongsRes.error, optionalFallback.error, coreFallback.error);
        }
      }
    }
    if (!songRows) return { released: [], unreleased: [] };

    const cardNames = new Map<string, string>();
    for (const card of cardsRes.data ?? []) {
      if (card.card_name) cardNames.set(normalizeTitle(String(card.card_name)), String(card.card_name));
    }

    const songs = songRows
      .filter((row) => !!row.slug && !!row.title && !NON_RELEASE_TITLES.includes(String(row.title).toLowerCase()))
      .map((row) => {
        const slug = String(row.slug);
        const title = String(row.title);
        const released = row.is_released === true || row.audio_status === "Released";
        const hasVideo = !!row.youtube_music_video_url || !!row.sky_video_url || (videoProjectsRes.data || []).some(project => project.song_id === row.id);
        const savedOpportunities = Array.isArray(row.collaboration_opportunities) ? row.collaboration_opportunities : (Array.isArray(row.collab_interests) ? row.collab_interests.map((value: string) => /video/i.test(value) ? "video" : /remix/i.test(value) ? "remix" : /feature|vocal/i.test(value) ? "feature" : "").filter(Boolean) : []);
        const links = resolveSongLinks(row);
        const rawLink = (value: unknown) => typeof value === "string" ? value : "";
        const cardName = cardNames.get(normalizeTitle(title));
        return {
          released,
          release: {
            slug,
            databaseId: String(row.id),
            collaborationEnabled: true,
            readyForCollab: true,
            collaborationInterests: Array.isArray(row.collab_interests) ? row.collab_interests : [],
            audioStatus: row.audio_status || (released ? "Released" : "Demo"),
            isReleased: released,
            collaborationOpportunities: released ? ["remix"] : [...new Set(["remix", ...savedOpportunities.filter((value: string) => value === "feature"), ...(!hasVideo ? ["video"] : [])])],
            collaborationDescription: typeof row.collaboration_description === "string" ? row.collaboration_description : "",
            videoConcept: typeof row.video_concept === "string" ? row.video_concept : "",
            releaseDate: typeof row.release_date === "string" ? row.release_date : null,
            title,
            artist: "CHXNDLER",
            coverArt: songCoverPath(slug, title),
            spotifyUrl: released ? links.spotifyUrl : rawLink(row.spotify_url),
            appleMusicUrl: released ? links.appleMusicUrl : rawLink(row.apple_music_url),
            youtubeUrl: released ? links.youtubeUrl : rawLink(row.youtube_music_video_url),
            videoEmbedUrl: released && !links.isYouTubeFallback ? toYouTubeEmbed(links.youtubeUrl) : null,
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

    const withAudio = async (release: ArtistRelease, isReleased: boolean): Promise<ArtistRelease> => {
      if (!trackPaths) return release;
      const expectedUrl = new URL(releaseAudioSrc(release.slug), "https://local.invalid");
      const expected = (expectedUrl.searchParams.get("path") || decodeURIComponent(expectedUrl.pathname.split("/tracks/").pop() || "")).toLowerCase();
      const expectedKey = keyFor(fileParts(expected).stem);
      const titleKey = keyFor(release.title);
      const actualPath = trackPaths.find((path) => path.toLowerCase() === expected)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === expectedKey)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === titleKey);
      let audioUrl: string | undefined;
      if (actualPath) {
        if (isReleased) audioUrl = `/api/audio?path=${encodeURIComponent(actualPath)}`;
        else {
          const { data, error } = await supabase.storage.from("tracks").createSignedUrl(actualPath, 60 * 10);
          if (!error) audioUrl = data?.signedUrl;
        }
      }
      return {
        ...release,
        audioAvailable: !!actualPath,
        ...(audioUrl ? { audioUrl } : {}),
      };
    };

    return {
      released: await Promise.all(songs.filter((song) => song.released).map((song) => withAudio(song.release, true))),
      unreleased: await Promise.all(songs.filter((song) => !song.released).map((song) => withAudio(song.release, false))),
    };
  } catch (error) {
    console.error("[collab] Could not load artist songs:", error);
    return { released: [], unreleased: [] };
  }
}

export default async function CollabPage() {
  const inviteSession = await getCollabInviteSession();
  let musicVideos: Array<{ id: string; song_id: string; public_concept: string; public_status: string; songs?: { title: string; slug: string } }> = [];
  try {
    const { data } = await getSupabaseAdmin().from("music_video_projects")
      .select("id,song_id,public_concept,public_status,songs(title,slug)").eq("visibility", "public").order("updated_at", { ascending: false });
    musicVideos = (data || []).map((project) => ({ ...project, songs: Array.isArray(project.songs) ? project.songs[0] : project.songs })) as unknown as typeof musicVideos;
  } catch (error) { console.error("[collab] Could not load public music video projects:", error); }
  const catalog = inviteSession
    ? await fetchArtistSongs()
    : await fetchArtistSongs([...new Set(musicVideos.map(project => project.song_id))]);
  if (!inviteSession) return <CollabGallery artistReleases={catalog.released} unreleasedSongs={catalog.unreleased} defaultView="video" invitedDisplayName="" invitedEmail="" musicVideos={musicVideos} canViewFeatures={false} />;
  const allCatalogSongs = [...catalog.released, ...catalog.unreleased];
  const invitedSong = inviteSession.scope === "song" && inviteSession.song_id
    ? allCatalogSongs.find((song) => song.databaseId === inviteSession.song_id && song.readyForCollab === true) || null
    : null;
  const permittedCatalog = inviteSession.scope === "song"
    ? allCatalogSongs.filter(song => song.databaseId === inviteSession.song_id && song.readyForCollab === true)
    : inviteSession.scope === "catalog"
      ? allCatalogSongs.filter(song => song.readyForCollab === true)
      : [];
  const released = permittedCatalog.filter(song => song.audioStatus === "Released" || song.audioStatus === "Final");
  const unreleased = permittedCatalog.filter(song => song.audioStatus !== "Released" && song.audioStatus !== "Final");
  return <CollabGallery artistReleases={released} unreleasedSongs={unreleased} invitedSongSlug={inviteSession.scope === "song" ? invitedSong?.slug || null : null} defaultView={inviteSession.scope === "video" ? "video" : "collabs"} invitedDisplayName={inviteSession.display_name} invitedEmail={inviteSession.email || ""} musicVideos={musicVideos} canViewFeatures />;
}
