import CollabGallery, { type CollabProject } from "@/components/collab/CollabGallery";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { songCoverPath } from "@/lib/songCover";
import { resolveSongLinks } from "@/lib/chxndlerLinks";
import { toYouTubeEmbed } from "@/lib/youtube";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import { youtubeSkyFor } from "@/lib/sky-youtube";
import { releaseAudioSrc } from "@/components/brand-pitch/artistRelease";
import type { ArtistRelease } from "@/components/brand-pitch/artistRelease";

export const dynamic = "force-dynamic";

const BUCKET = "Collabs";
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);
const TEXT_EXTENSIONS = new Set(["txt", "md"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

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

function titleFor(stem: string) {
  return stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

const NON_RELEASE_TITLES = ["welcome to the heartverse", "you are home", "space music", "welcome back"];
const normalizeTitle = (title: string) => title.trim().replace(/[‘’ʼ`]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

async function fetchArtistSongs(): Promise<{ released: ArtistRelease[]; unreleased: ArtistRelease[] }> {
  try {
    const supabase = getSupabaseAdmin();
    const [songsRes, cardsRes] = await Promise.all([
      supabase.from("songs").select("id, slug, title, is_released, collaboration_enabled, spotify_url, apple_music_url, youtube_music_video_url, sky_video_url"),
      supabase.from("cards").select("card_name"),
    ]);
    if (songsRes.error || !songsRes.data) return { released: [], unreleased: [] };

    const cardNames = new Map<string, string>();
    for (const card of cardsRes.data ?? []) {
      if (card.card_name) cardNames.set(normalizeTitle(String(card.card_name)), String(card.card_name));
    }

    const songs = songsRes.data
      .filter((row) => !!row.slug && !!row.title && !NON_RELEASE_TITLES.includes(String(row.title).toLowerCase()))
      .map((row) => {
        const slug = String(row.slug);
        const title = String(row.title);
        const released = row.is_released === true;
        const links = resolveSongLinks(row);
        const rawLink = (value: unknown) => typeof value === "string" ? value : "";
        const cardName = cardNames.get(normalizeTitle(title));
        return {
          released,
          release: {
            slug,
            databaseId: String(row.id),
            collaborationEnabled: row.collaboration_enabled === true,
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

    const withAudio = (release: ArtistRelease): ArtistRelease => {
      if (!trackPaths) return release;
      const expected = decodeURIComponent(new URL(releaseAudioSrc(release.slug)).pathname.split("/tracks/").pop() || "").toLowerCase();
      const expectedKey = keyFor(fileParts(expected).stem);
      const titleKey = keyFor(release.title);
      const actualPath = trackPaths.find((path) => path.toLowerCase() === expected)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === expectedKey)
        ?? trackPaths.find((path) => keyFor(fileParts(path.split("/").pop() || path).stem) === titleKey);
      return {
        ...release,
        audioAvailable: !!actualPath,
        ...(actualPath ? { audioUrl: supabase.storage.from("tracks").getPublicUrl(actualPath).data.publicUrl } : {}),
      };
    };

    return {
      released: songs.filter((song) => song.released).map((song) => withAudio(song.release)).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
      unreleased: songs.filter((song) => !song.released).map((song) => withAudio(song.release)).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
    };
  } catch (error) {
    console.error("[collab] Could not load artist songs:", error);
    return { released: [], unreleased: [] };
  }
}

export default async function CollabPage() {
  let projects: CollabProject[] = [];

  try {
    const storage = getSupabaseAdmin().storage.from(BUCKET);
    const objects: Array<{ path: string; name: string }> = [];
    const walk = async (folder = "", depth = 0): Promise<void> => {
      // Keep traversal bounded in case an unexpected deeply nested path exists.
      if (depth > 8) return;
      const { data, error } = await storage.list(folder, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;

      for (const entry of data ?? []) {
        if (!entry.name) continue;
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        if (entry.id) objects.push({ path, name: entry.name });
        else await walk(path, depth + 1);
      }
    };
    await walk();

    const signedUrl = async (path: string) => {
      const { data, error } = await storage.createSignedUrl(path, 60 * 60 * 24);
      if (error || !data?.signedUrl) throw error ?? new Error(`Could not sign Collabs asset: ${path}`);
      return data.signedUrl;
    };
    const byType = objects.map((file) => ({ ...file, ...fileParts(file.name) }));
    const projectFolders = [...new Set(byType
      .filter((file) => file.path.includes("/"))
      .map((file) => file.path.split("/")[0]))];
    const isBackground = (stem: string) => /(?:[-_ .])(background|backdrop|bg)$/i.test(stem);

    projects = await Promise.all(projectFolders.map(async (folder) => {
      const folderFiles = byType.filter((file) => file.path.startsWith(`${folder}/`) && file.name !== ".emptyFolderPlaceholder");
      const folderKey = keyFor(folder);
      const covers = folderFiles.filter((file) => IMAGE_EXTENSIONS.has(file.extension) && !isBackground(file.stem));
      const cover = covers.find((file) => keyFor(file.stem) === folderKey) ?? covers[0];
      const audio = folderFiles.find((file) => AUDIO_EXTENSIONS.has(file.extension) && keyFor(file.stem) === folderKey && !/(?:[-_ .])\(?instrumental\)?$/i.test(file.stem))
        ?? folderFiles.find((file) => AUDIO_EXTENSIONS.has(file.extension) && !/(?:[-_ .])\(?instrumental\)?$/i.test(file.stem));
      const instrumental = folderFiles.find((file) => AUDIO_EXTENSIONS.has(file.extension) && /(?:[-_ .])\(?instrumental\)?$/i.test(file.stem));
      const audioKey = audio ? keyFor(audio.stem.replace(/(?:[-_ .])\((?:demo|acoustic|instrumental)\)$/i, "")) : folderKey;
      const meaning = folderFiles.find((file) => TEXT_EXTENSIONS.has(file.extension) && /(?:[-_ .])(song[-_ .]?)?meaning$/i.test(file.stem));
      const lyrics = folderFiles.find((file) => ["lrc", "txt"].includes(file.extension) && keyFor(file.stem) === audioKey && file !== meaning)
        ?? folderFiles.find((file) => ["lrc", "txt"].includes(file.extension) && file !== meaning);
      const background = folderFiles.find((file) => VIDEO_EXTENSIONS.has(file.extension) && isBackground(file.stem) && keyFor(file.stem) === audioKey)
        ?? folderFiles.find((file) => IMAGE_EXTENSIONS.has(file.extension) && isBackground(file.stem) && keyFor(file.stem) === audioKey)
        ?? folderFiles.find((file) => (VIDEO_EXTENSIONS.has(file.extension) || IMAGE_EXTENSIONS.has(file.extension)) && isBackground(file.stem));

      return {
        id: folder,
        title: titleFor(folder),
        coverUrl: cover ? await signedUrl(cover.path) : null,
        audioUrl: audio ? await signedUrl(audio.path) : null,
        instrumentalUrl: instrumental ? await signedUrl(instrumental.path) : null,
        lyricsUrl: lyrics ? await signedUrl(lyrics.path) : null,
        meaningUrl: meaning ? await signedUrl(meaning.path) : null,
        backgroundUrl: background ? await signedUrl(background.path) : null,
        backgroundIsVideo: !!background && VIDEO_EXTENSIONS.has(background.extension),
      };
    }));
  } catch (error) {
    console.error("[collab] Could not load Collabs bucket:", error);
  }

  const { released, unreleased } = await fetchArtistSongs();
  let musicVideos: Array<{ id: string; song_id: string; public_concept: string; public_status: string; songs?: { title: string; slug: string } }> = [];
  try {
    const { data } = await getSupabaseAdmin().from("music_video_projects")
      .select("id,song_id,public_concept,public_status,songs(title,slug)").eq("visibility", "public").order("updated_at", { ascending: false });
    musicVideos = (data || []) as typeof musicVideos;
  } catch (error) { console.error("[collab] Could not load public music video projects:", error); }
  return <CollabGallery projects={projects} artistReleases={released} unreleasedSongs={unreleased} musicVideos={musicVideos} />;
}
