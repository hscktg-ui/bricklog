/**
 * 860 상세 HTML → 페이지 이미지 (첫눈·중간·전체).
 * Playwright는 스크립트에서만 부른다. Next 클라에 넣지 않는다.
 */
export const DETAIL_PAGE_RASTER_WIDTH = 860;

export async function screenshotDetailPageHtml(html, paths = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 920, height: 1400 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.getElementById("gollaboda-detail-page"));
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete ||
          new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
      )
    );
  });
  await new Promise((r) => setTimeout(r, 800));
  const article = page.locator("#gollaboda-detail-page");
  await article.waitFor({ state: "visible", timeout: 8000 });
  const firstBox = await article.boundingBox();
  if (firstBox) {
    await page.setViewportSize({
      width: 920,
      height: Math.max(1400, Math.ceil(firstBox.y + firstBox.height + 80)),
    });
  }
  if (paths.full) {
    await article.screenshot({ path: paths.full, type: "png" });
  }
  const box = await article.boundingBox();
  if (box) {
    const clip = (y, height, dest) =>
      dest
        ? page.screenshot({
            path: dest,
            type: "png",
            clip: {
              x: Math.max(0, box.x),
              y: Math.max(0, y),
              width: Math.min(DETAIL_PAGE_RASTER_WIDTH, box.width),
              height: Math.min(height, box.height),
            },
          })
        : Promise.resolve();
    await clip(box.y, 980, paths.hero);
    const photoY = Math.min(box.y + 2100, box.y + Math.max(0, box.height - 980));
    await clip(photoY, 980, paths.mid);
  }
  const stack = [];
  if (paths.stackPrefix) {
    const kids = page.locator("#gollaboda-detail-page > *");
    const n = await kids.count();
    for (let i = 0; i < n; i++) {
      const dest = `${paths.stackPrefix}-${String(i).padStart(2, "0")}.png`;
      try {
        await kids.nth(i).screenshot({ path: dest, type: "png" });
        stack.push(dest);
      } catch {
        /* zero-height sibling */
      }
    }
  }
  await browser.close();
  return { ...paths, stack };
}
