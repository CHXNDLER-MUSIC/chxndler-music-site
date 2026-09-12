import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--disable-gpu"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.setViewport({ width: 1440, height: 1100 });
await page.goto("http://localhost:3000/brands/oatly", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));

async function clickByLabel(label) {
  const box = await page.evaluate((l) => {
    const btn = document.querySelector(`button[aria-label="${l}"]`);
    btn?.scrollIntoView({ block: "center" });
    const r = btn?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  }, label);
  await new Promise((r) => setTimeout(r, 300));
  const box2 = await page.evaluate((l) => {
    const btn = document.querySelector(`button[aria-label="${l}"]`);
    const r = btn?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  }, label);
  if (!box2) throw new Error("button not found: " + label);
  await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
}

async function dragAndReport(label) {
  await page.waitForSelector(".tilt-spin-card", { timeout: 5000 });
  const box = await page.evaluate(() => {
    const r = document.querySelector(".tilt-spin-card").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(cx + i * 10, cy);
    await new Promise((r) => setTimeout(r, 25));
  }
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 500));
  const wrapperStyle = await page.evaluate(() => document.querySelector(".tilt-spin-card")?.firstElementChild?.getAttribute("style"));
  console.log(`${label} after 10x10px drag (expect rotateY ~80deg): ${wrapperStyle}`);

  const hoverCheck = await page.evaluate(() => {
    const card = document.querySelector(".tilt-spin-card");
    const wrapper = card.firstElementChild;
    const before = wrapper.getAttribute("style");
    const rect = card.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent("pointermove", { pointerId: 99, clientX: rect.left + 5, clientY: rect.top + 5, buttons: 0, bubbles: true }));
    card.dispatchEvent(new PointerEvent("pointermove", { pointerId: 99, clientX: rect.right - 5, clientY: rect.bottom - 5, buttons: 0, bubbles: true }));
    return { before, after: wrapper.getAttribute("style") };
  });
  console.log(`  hover-only afterward: ${hoverCheck.before === hoverCheck.after ? "OK unchanged" : "REGRESSION: " + JSON.stringify(hoverCheck)}`);
}

console.log("=== COVER ART VIEWER ===");
await clickByLabel("View WOW NO COW cover art");
await new Promise((r) => setTimeout(r, 900));
console.log("--- cover stage ---");
await dragAndReport("cover");
for (const label of ["cd", "vinyl", "cassette"]) {
  await page.evaluate((l) => {
    const tabs = Array.from(document.querySelectorAll("button[role='tab']"));
    tabs.find((t) => (t.textContent || "").toLowerCase().includes(l))?.click();
  }, label);
  await new Promise((r) => setTimeout(r, 500));
  console.log(`--- ${label} stage ---`);
  await dragAndReport(label);
}
await page.evaluate(() => document.querySelector("button[aria-label='Close']")?.click());
await new Promise((r) => setTimeout(r, 500));

console.log("=== CAMPAIGN DETAIL VIEWER (The Carton) ===");
await clickByLabel("Explore The Carton");
await new Promise((r) => setTimeout(r, 900));
await dragAndReport("The Carton");

await browser.close();
console.log("done");
