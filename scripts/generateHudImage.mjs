// Generate a holographic cockpit HUD image via OpenAI Images (gpt-image-1)
// Usage:
//  1) Set OPENAI_API_KEY in .env.local or env
//  2) node scripts/generateHudImage.mjs "Song Title" "One-liner subtitle" 1920x1080
//     (size optional; use 3840x2160 for 4K)

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadLocalEnv() {
  if (process.env.OPENAI_API_KEY) return;
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadLocalEnv();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const title = process.argv[2] || process.env.HUD_SONG_TITLE || "OCEAN GIRL";
const subtitle = process.argv[3] || process.env.HUD_ONE_LINER || "Love flows back like the tide.";
const size = process.argv[4] || process.env.HUD_SIZE || "1920x1080"; // e.g., "3840x2160"
const coverPath = process.env.HUD_COVER || process.argv[5];
const givenSlug = process.env.HUD_SLUG || process.argv[6];
const slug = givenSlug || slugify(title);

const prompt = `Upgrade the spaceship cockpit overlay into a glowing holographic HUD projected on the windshield. Elements: top-left glowing neon title text '${title}', below it subtitle '${subtitle}'. Top-right: tilted 3D holographic album cover card with glowing cyan frame and soft bloom. Center above steering wheel: holographic planet carousel with one large glowing planet and 2–3 smaller orbiting planets with thin luminous rings. Right side: vertical holographic playlist with translucent pill-shaped buttons for each song, current song highlighted with bright cyan glow. Each row has a tiny glowing icon. Left of wheel: circular glowing play/pause and skip buttons floating like projections. HUD panels semi-transparent with neon outlines (cyan, pink #FC54AF, yellow #F2EF1D, blue #38B6FF). Text and icons should look weightless, holographic, with subtle reflections and scanline flicker. Style: cinematic, retro-futuristic, dreamy, premium sci-fi HUD. Ultra-detailed, 16:9.`;

const negative = `No flat app UI, no solid rectangles, no clutter, no generic buttons, no heavy gradients, no cartoon style, no low-res.`;

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Add it to .env.local or export it.");
    process.exit(1);
  }

  console.log(`[images] Generating ${size} with title='${title}', slug='${slug}'`);
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    negative_prompt: negative,
    size,
    background: "transparent",
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  const buf = Buffer.from(b64, "base64");
  const outDir = path.resolve(process.cwd(), "public/generated");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `hud-${slug}-${size.replace(/x/g, 'x')}.png`);
  fs.writeFileSync(out, buf);
  console.log(`[images] Wrote ${out}`);

  // Optional: also stylize the real cover art into a holographic card with transparent background
  if (coverPath && fs.existsSync(coverPath)) {
    console.log(`[images] Stylizing cover card from: ${coverPath}`);
    const promptCard = `Turn this album cover into a tilted 3D holographic card with a glowing cyan frame, subtle scanlines, soft bloom, and transparent background. Angle ~12°, premium sci‑fi HUD styling. Colors: cyan, pink #FC54AF, yellow #F2EF1D, blue #38B6FF.`;
    const edit = await client.images.edits.create({
      model: "gpt-image-1",
      image: fs.createReadStream(coverPath),
      prompt: promptCard,
      size: "1024x1024",
      background: "transparent",
    });
    const b64c = edit.data?.[0]?.b64_json;
    if (b64c) {
      const bufc = Buffer.from(b64c, "base64");
      const outCard = path.join(outDir, `${slug}-album-card.png`);
      fs.writeFileSync(outCard, bufc);
      console.log(`[images] Wrote ${outCard}`);
    } else {
      console.warn("[images] No album card returned from edits endpoint");
    }
  } else if (coverPath) {
    console.warn(`[images] HUD_COVER not found at path: ${coverPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
