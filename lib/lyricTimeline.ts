// lib/lyricTimeline.ts

export type LyricSegmentMode = "line" | "word";

export type LyricSegment = {
  id: number;
  text: string;
  start: number;   // seconds
  end: number;     // seconds
  mode: LyricSegmentMode;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Generate a smart timeline from raw lyrics and song duration.
 * Short lines, three words or less, become word by word segments.
 */
export function generateLyricTimeline(
  lyrics: string,
  songDurationSec: number
): LyricSegment[] {
  const lines = lyrics
    .split(/\r?\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  const draft: { text: string; mode: LyricSegmentMode }[] = [];

  for (const line of lines) {
    const words = line.split(/\s+/).filter(Boolean);

    if (words.length <= 3) {
      for (const w of words) {
        draft.push({ text: w, mode: "word" });
      }
    } else {
      draft.push({ text: line, mode: "line" });
    }
  }

  const totalUnits = draft.reduce(
    (sum, seg) => sum + countWords(seg.text),
    0
  );

  const padding = 1.5;
  const usableDuration = Math.max(songDurationSec - padding * 2, 5);
  const secondsPerUnit = usableDuration / totalUnits;

  const segments: LyricSegment[] = [];
  let cursor = padding;
  let id = 0;

  for (const seg of draft) {
    const units = countWords(seg.text);
    const segDuration = Math.max(units * secondsPerUnit, 0.4);
    const start = cursor;
    const end = cursor + segDuration;

    segments.push({
      id: id++,
      text: seg.text,
      start,
      end,
      mode: seg.mode,
    });

    cursor = end;
  }

  return segments;
}