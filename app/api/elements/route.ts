import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseDir = process.cwd();
    const candidates = [
      path.join(baseDir, 'ELEMENTS.md'),
      path.join(baseDir, 'elements.md'),
      path.join(baseDir, 'docs', 'ELEMENTS.md'),
    ];
    for (const p of candidates) {
      try {
        const buf = await fs.readFile(p);
        return NextResponse.json({ content: buf.toString('utf8') });
      } catch {}
    }
    return NextResponse.json({ error: 'ELEMENTS.md not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load ELEMENTS.md' }, { status: 500 });
  }
}

