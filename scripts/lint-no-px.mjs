#!/usr/bin/env node
// scans source files for hard-coded pixel units and inline numeric styles
// encourages device-independent units: rem, em, vw, vh, % (or Tailwind equivalents)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORES = new Set(['node_modules', '.git', '.next', 'public', '.npm-cache']);
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css']);

/** Recursively list files under dir (excluding IGNORES) */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORES.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

// Regexes to flag px usage
const rePxUnit = /(\d+(?:\.\d+)?)px\b/; // any "12px" literal
const reArbitraryTailwindPx = /\[[^\]]*\b\d+(?:\.\d+)?px\b[^\]]*\]/; // e.g., w-[400px]
// Heuristic: inline React style with numeric value (interpreted as px)
// Looks for: style={{ ...: 12 }} (possibly across a single line)
const reInlineStyleNumber = /style=\{\{[^}]*?:\s*\d+(?:\.\d+)?(?!\s*['"]).*?\}\}/;

function checkFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const problems = [];

  lines.forEach((line, i) => {
    // quick skip for performance
    if (!line.includes('px') && !line.includes('style={{')) return;
    if (rePxUnit.test(line)) {
      problems.push({ line: i + 1, col: line.indexOf('px') + 1, kind: 'px-unit', snippet: line.trim() });
    } else if (reArbitraryTailwindPx.test(line)) {
      problems.push({ line: i + 1, col: line.indexOf('[') + 1, kind: 'tailwind-px', snippet: line.trim() });
    } else if (reInlineStyleNumber.test(line)) {
      problems.push({ line: i + 1, col: line.indexOf('style={{') + 1, kind: 'inline-style-number', snippet: line.trim() });
    }
  });

  // Secondary pass: catch inline style numbers spanning multiple lines (cheap heuristic)
  if (!problems.some(p => p.kind === 'inline-style-number') && txt.includes('style={{')) {
    // collapse whitespace in style blocks to make the regex work
    const compact = txt.replace(/\s+/g, ' ');
    if (reInlineStyleNumber.test(compact)) {
      problems.push({ line: 0, col: 0, kind: 'inline-style-number', snippet: 'style={{ ...: <number> }}' });
    }
  }

  return problems;
}

const files = walk(ROOT);
let total = 0;
for (const f of files) {
  const probs = checkFile(f);
  if (probs.length) {
    console.log(`\n${path.relative(ROOT, f)}`);
    probs.forEach(p => {
      const loc = p.line ? `${p.line}:${p.col}` : 'line:?';
      const msg = p.kind === 'px-unit'
        ? 'Hard-coded px unit found'
        : p.kind === 'tailwind-px'
        ? 'Tailwind arbitrary px value found'
        : 'Inline numeric style (defaults to px) found';
      console.log(`  ${loc}  ${msg}`);
      if (p.snippet) console.log(`    ${p.snippet}`);
    });
    total += probs.length;
  }
}

if (total > 0) {
  console.log(`\nFound ${total} instance(s) of hard-coded pixel usage.`);
  console.log('- Prefer rem/em for typography and spacing');
  console.log('- Prefer %/vw/vh for layout sizing');
  console.log('- In Tailwind, use scale (e.g., w-64) or arbitrary rem (e.g., w-[16rem])');
  console.log('- For 1px hairlines, consider using border with device-pixel ratio handling or 0.5px where supported');
  process.exit(2);
} else {
  console.log('No hard-coded px issues found.');
}

