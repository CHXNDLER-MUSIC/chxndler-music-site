import { getSupabaseAdmin } from "@/lib/supabase-admin";
import CollabGallery, { type CollabProject } from "@/components/collab/CollabGallery";

export const dynamic = "force-dynamic";

const BUCKET = "Collabs";
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);
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

    const publicUrl = (path: string) => storage.getPublicUrl(path).data.publicUrl;
    const byType = objects.map((file) => ({ ...file, ...fileParts(file.name) }));
    const covers = byType.filter((file) => IMAGE_EXTENSIONS.has(file.extension) && !/(?:[-_ .])(background|backdrop|bg)$/i.test(file.stem));

    projects = covers.map((cover) => {
      const key = keyFor(cover.stem);
      const directory = cover.path.includes("/") ? cover.path.slice(0, cover.path.lastIndexOf("/")) : "";
      const related = byType.filter((file) => {
        const fileDirectory = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
        return fileDirectory === directory && (keyFor(file.stem) === key || keyFor(file.stem.replace(/(?:[-_ .])(background|backdrop|bg)$/i, "")) === key);
      });
      const audio = related.find((file) => AUDIO_EXTENSIONS.has(file.extension));
      const lyrics = related.find((file) => ["lrc", "txt"].includes(file.extension));
      const background = related.find((file) => VIDEO_EXTENSIONS.has(file.extension) && /(?:[-_ .])(background|backdrop|bg)$/i.test(file.stem))
        ?? related.find((file) => IMAGE_EXTENSIONS.has(file.extension) && /(?:[-_ .])(background|backdrop|bg)$/i.test(file.stem));

      return {
        id: cover.path,
        title: titleFor(cover.stem),
        coverUrl: publicUrl(cover.path),
        audioUrl: audio ? publicUrl(audio.path) : null,
        lyricsUrl: lyrics ? publicUrl(lyrics.path) : null,
        backgroundUrl: background ? publicUrl(background.path) : null,
        backgroundIsVideo: !!background && VIDEO_EXTENSIONS.has(background.extension),
      };
    });
  } catch (error) {
    console.error("[collab] Could not load Collabs bucket:", error);
  }

  return <CollabGallery projects={projects} />;
}
