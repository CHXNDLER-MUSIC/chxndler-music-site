import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--disable-gpu"],
});

const consoleErrors = [];
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push("PAGEERROR: " + err.message));

const sizes = [
  { name: "375", width: 375, height: 900 },
  { name: "390", width: 390, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1440", width: 1440, height: 1000 },
];

for (const size of sizes) {
  await page.setViewport({ width: size.width, height: size.height });
  await page.goto("http://localhost:3099/studio", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  console.log(`[${size.name}] scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} overflow=${overflow.scrollWidth > overflow.clientWidth}`);

  await page.screenshot({ path: `/private/tmp/claude-501/-Users-chandlerpierce-Developer-GitHub-chxndler-music-site/e22b2fbd-1e7e-47a6-a0c8-eeddf34da343/scratchpad/studio-${size.name}-top.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-chandlerpierce-Developer-GitHub-chxndler-music-site/e22b2fbd-1e7e-47a6-a0c8-eeddf34da343/scratchpad/studio-${size.name}-mid.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-chandlerpierce-Developer-GitHub-chxndler-music-site/e22b2fbd-1e7e-47a6-a0c8-eeddf34da343/scratchpad/studio-${size.name}-bottom.png` });
}

// Interaction check at desktop size: click a card's Listen button, then the nav "Start a Project" link.
await page.setViewport({ width: 1440, height: 1000 });
await page.goto("http://localhost:3099/studio", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));

const listenClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll("button[aria-label^='Listen to sonic ID']"));
  if (btns[0]) { btns[0].click(); return true; }
  return false;
});
console.log("listen button clicked:", listenClicked);
await new Promise((r) => setTimeout(r, 1500));
const audioPlaying = await page.evaluate(() => {
  const a = document.querySelector("audio");
  return a ? { paused: a.paused, src: a.src.slice(-40) } : null;
});
console.log("audio element state:", JSON.stringify(audioPlaying));

const startClicked = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll("a"));
  const target = links.find((a) => (a.textContent || "").trim().toLowerCase() === "start a project");
  return false;
});

// Click the final CTA's "Start a Project" BUTTON (not the nav anchor) to confirm BookingInline opens.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await new Promise((r) => setTimeout(r, 500));
const ctaClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const target = btns.find((b) => (b.textContent || "").toLowerCase().includes("start a project"));
  target?.click();
  return !!target;
});
console.log("final CTA button clicked:", ctaClicked);
await new Promise((r) => setTimeout(r, 1500));
console.log("booking iframe present:", await page.evaluate(() => !!document.querySelector("iframe")));
await page.screenshot({ path: `/private/tmp/claude-501/-Users-chandlerpierce-Developer-GitHub-chxndler-music-site/e22b2fbd-1e7e-47a6-a0c8-eeddf34da343/scratchpad/studio-booking-open.png` });

console.log("CONSOLE ERRORS:", consoleErrors.length);
consoleErrors.forEach((e) => console.log(" -", e));

await browser.close();
