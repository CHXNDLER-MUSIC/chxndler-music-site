import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
await page.goto("http://localhost:3000/brands/oatly", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 8000));
const clicked = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const target = buttons.find((b) => (b.textContent || "").toUpperCase().includes("LET'S TALK"));
  target?.click();
  return !!target;
});
console.log("clicked:", clicked);
await new Promise((r) => setTimeout(r, 1000));
console.log("booking iframe present:", await page.evaluate(() => !!document.querySelector('iframe')));
await browser.close();
