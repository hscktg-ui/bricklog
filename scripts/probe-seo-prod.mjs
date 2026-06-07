const urls = ["https://briclog.ai", "https://www.briclog.ai", "https://briclog.ai/og.png", "https://briclog.ai/robots.txt", "https://briclog.ai/sitemap.xml"];

for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const ct = res.headers.get("content-type") || "";
    console.log("\n===", url, res.status, ct);
    if (url.endsWith(".png")) {
      console.log("length:", res.headers.get("content-length"));
      continue;
    }
    const text = await res.text();
    if (url.includes("robots") || url.includes("sitemap")) {
      console.log(text.slice(0, 500));
      continue;
    }
    const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
    console.log("title:", title);
    for (const re of [
      /property="og:image"[^>]*content="([^"]+)"/gi,
      /property="og:title"[^>]*content="([^"]+)"/gi,
      /property="og:description"[^>]*content="([^"]+)"/gi,
      /name="description"[^>]*content="([^"]+)"/gi,
      /name="google-site-verification"[^>]*content="([^"]+)"/gi,
      /name="naver-site-verification"[^>]*content="([^"]+)"/gi,
    ]) {
      const hits = [...text.matchAll(re)].map((m) => m[1]);
      if (hits.length) console.log(re.source.slice(0, 30), hits);
    }
    console.log("has jsonld:", text.includes("application/ld+json"));
    console.log("has h1:", /<h1[^>]*>/i.test(text));
    console.log("has seo intro:", text.includes("briclog-seo-intro"));
    console.log(
      "og uses static png:",
      /og\.png/i.test(text) && !/opengraph-image/i.test(text)
    );
    console.log("body preview:", text.replace(/\s+/g, " ").slice(text.indexOf("<body"), text.indexOf("<body") + 600));
  } catch (e) {
    console.error(url, e.message);
  }
}
