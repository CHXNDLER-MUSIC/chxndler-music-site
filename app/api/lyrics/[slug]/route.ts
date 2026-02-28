import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { slugify } from '@/lib/slug';

// Ensure Node.js runtime for fs access in all environments
export const runtime = 'nodejs';
// Avoid any static optimization — always resolve at request time
export const dynamic = 'force-dynamic';

// Attempts to read a lyrics markdown file for a given slug with a few fallbacks
async function tryReadLyricsFile(slug: string): Promise<string | null> {
  const baseDir = process.cwd();
  // Support both repo-root `lyrics/` and `public/lyrics/` (for deployed environments)
  const lyricsDirs = [
    path.join(baseDir, 'lyrics'),
    path.join(baseDir, 'public', 'lyrics'),
  ];
  for (const lyricsDir of lyricsDirs) {
    const candidates: string[] = [];
    // 1) exact slug.md (e.g., ocean-girl.md)
    candidates.push(path.join(lyricsDir, `${slug}.md`));
    // 2) UPPERCASE slug (no dashes) (e.g., BABY.md)
    candidates.push(path.join(lyricsDir, `${slug.replace(/-/g, '').toUpperCase()}.md`));
    // 3) UPPERCASE with spaces (e.g., OCEAN GIRL.md)
    candidates.push(path.join(lyricsDir, `${slug.replace(/-/g, ' ').toUpperCase()}.md`));
    // 4) UPPERCASE as-is (e.g., PARIS.md)
    candidates.push(path.join(lyricsDir, `${slug.toUpperCase()}.md`));

    for (const file of candidates) {
      try {
        const buf = await fs.readFile(file);
        return buf.toString('utf8');
      } catch {}
    }

    // Fallback: scan directory and match by normalized basename using slugify
    try {
      const entries = await fs.readdir(lyricsDir, { withFileTypes: true } as any);
      for (const ent of entries) {
        const isFile = typeof (ent as any).isFile === 'function' ? (ent as any).isFile() : true;
        if (!isFile) continue;
        const name = (ent as any).name || '';
        if (!name.toLowerCase().endsWith('.md')) continue;
        const base = name.replace(/\.md$/i, '');
        if (slugify(base) === slug) {
          const p = path.join(lyricsDir, name);
          const buf = await fs.readFile(p);
          return buf.toString('utf8');
        }
      }
    } catch {}
  }
  return null;
}

export async function GET(
  _req: Request,
  ctx: { params: { slug: string } }
) {
  const params = await ctx.params;
  const slug = (params?.slug || '').toLowerCase();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    const content = await tryReadLyricsFile(slug);
    if (!content) {
      return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
    }
    return NextResponse.json({ slug, content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lyrics' }, { status: 500 });
  }
}
