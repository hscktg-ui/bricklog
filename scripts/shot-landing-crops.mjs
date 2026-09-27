import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const OUT_DIR = path.join(process.cwd(), "artifacts", "landing-korean-ui");

const SHOTS = [
  { name: "hero-desktop", url: "/", width: 1440, height: 900, scroll: 0 },
  { name: "table-desktop", url: "/", width: 1440, height: 900, scroll: 720 },
  { name: "mid-desktop", url: "/", width: 1440, height: 900, scroll: 1700 },
  { name: "hero-mobile", url: "/", width: 390, height: 844, scroll: 0 },
  { name: "table-mobile", url: "/", width: 390, height: 844, scroll: 700 },
  { name: "detail-desktop", url: "/trend/chatgpt", width: 1440, height: 900, scroll: 0 },
  { name: "detail-desktop-2", url: "/trend/chatgpt", width: 1440, height: 900, scroll: 820 },
  { name: "detail-mobile", url: "/trend/chatgpt", width: 390, height: 844, scroll: 0 },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    if (shot.scroll) {
      await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT_DIR, `${shot.name}.png`) });
    await context.close();
    console.log(`shot ${shot.name}`);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
