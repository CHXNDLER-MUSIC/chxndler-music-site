import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

// Load .env.local for local Node runs (Next.js loads this automatically)
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
  } catch {
    // Best-effort; skip on error
  }
}

loadLocalEnv();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const run = async () => {
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Say hello from gpt-4o-mini." }
    ]
  });
  console.log(chat.choices[0].message.content);
};

run();
