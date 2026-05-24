/**
 * 로그인 후 클릭 차단 요소 점검 (로컬 dev 서버 필요)
 * 실행: node scripts/audit-pointer-blockers.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function auditAtPoint(page, x, y) {
  return page.evaluate(({ px, py }) => {
    const el = document.elementFromPoint(px, py);
    if (!el) return { tag: null, blockers: [] };
    const chain = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect?.();
      const coversViewport =
        rect &&
        rect.width >= window.innerWidth * 0.9 &&
        rect.height >= window.innerHeight * 0.9;
      const fixed =
        style.position === "fixed" || style.position === "absolute";
      const pe = style.pointerEvents;
      const blocks =
        pe !== "none" &&
        (coversViewport || (fixed && rect?.width > 200 && rect?.height > 200));
      chain.push({
        tag: node.tagName,
        id: node.id || null,
        className: String(node.className || "").slice(0, 120),
        position: style.position,
        zIndex: style.zIndex,
        pointerEvents: pe,
        opacity: style.opacity,
        coversViewport,
        blocks,
      });
      node = node.parentElement;
    }
    const blockers = chain.filter((c) => c.blocks);
    return { top: chain[0], blockers };
  }, { px: x, py: y });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });

  const title = await page.title();
  console.log("page:", title);

  const center = await auditAtPoint(page, 640, 400);
  const sidebar = await auditAtPoint(page, 120, 300);
  console.log("\n[center click target]", JSON.stringify(center, null, 2));
  console.log("\n[sidebar click target]", JSON.stringify(sidebar, null, 2));

  const blockerCount = await page.evaluate(() => {
    const all = document.querySelectorAll("*");
    let n = 0;
    for (const el of all) {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "absolute") continue;
      const r = el.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.85 || r.height < window.innerHeight * 0.85)
        continue;
      if (s.pointerEvents === "none" || s.opacity === "0" || s.display === "none")
        continue;
      n += 1;
    }
    return n;
  });
  console.log("\nfull-screen pointer-blocking layers:", blockerCount);

  await browser.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
