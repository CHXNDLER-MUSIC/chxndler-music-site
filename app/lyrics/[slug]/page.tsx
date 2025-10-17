import { notFound } from 'next/navigation';
import path from 'path';
import { promises as fs } from 'fs';
import { slugify } from '@/lib/slug';

async function readLyricsForSlug(slug: string): Promise<string | null> {
  const baseDir = process.cwd();
  const lyricsDir = path.join(baseDir, 'lyrics');

  const candidates: string[] = [];
  // exact slug.md
  candidates.push(path.join(lyricsDir, `${slug}.md`));
  // UPPERCASE without dashes (e.g., BABY.md)
  candidates.push(path.join(lyricsDir, `${slug.replace(/-/g, '').toUpperCase()}.md`));
  // UPPERCASE with spaces (e.g., OCEAN GIRL.md)
  candidates.push(path.join(lyricsDir, `${slug.replace(/-/g, ' ').toUpperCase()}.md`));
  // UPPERCASE as-is (e.g., PARIS.md)
  candidates.push(path.join(lyricsDir, `${slug.toUpperCase()}.md`));

  for (const file of candidates) {
    try {
      const buf = await fs.readFile(file);
      return buf.toString('utf8');
    } catch {}
  }
  // Fallback: scan lyrics directory and match by normalized basename
  try {
    const entries = await fs.readdir(lyricsDir, { withFileTypes: true } as any);
    for (const ent of entries) {
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
  return null;
}

export default async function LyricsPage({ params }: { params: { slug: string } }) {
  const slug = (params?.slug || '').toLowerCase();
  const content = await readLyricsForSlug(slug);
  if (!content) return notFound();

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ color: '#e6f7ff' }}>
      <div
        className="mx-auto max-w-2xl"
        style={{
          background: 'rgba(3,10,20,0.85)',
          border: '1px solid rgba(25,227,255,0.45)',
          borderRadius: 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(25,227,255,0.35)',
          backdropFilter: 'blur(8px)',
          fontFamily: '\u0027Orbitron\u0027, InterLocal, sans-serif',
          textTransform: 'uppercase'
        }}
      >
        <div className="px-5 py-4 border-b border-cyan-300/30">
          <h1 className="text-xl font-bold">Lyrics</h1>
          <div className="opacity-80 text-sm">{slug.replace(/-/g, ' ')}</div>
        </div>
        <div className="px-5 py-5">
          <article style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>{content}</article>
        </div>
      </div>
    </div>
  );
}
