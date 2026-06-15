import assert from "node:assert/strict";
import {
  GUIDE_PAGES,
  getGuidePage,
  getGuideSitemapPaths,
} from "../lib/seo/guidePages.js";
import { UTM_CAMPAIGN_PRESETS } from "../lib/seo/utmCampaignLinks.js";

assert.ok(GUIDE_PAGES.length >= 6, "at least 6 guide pages");
assert.ok(getGuidePage("cafe-brunch-blog"), "cafe guide");
assert.ok(getGuidePage("beauty-salon-sns"), "beauty guide");
assert.ok(getGuidePage("local-clinic-notice"), "clinic guide");

const paths = getGuideSitemapPaths();
assert.equal(paths.length, GUIDE_PAGES.length + 1);
assert.ok(paths.includes("/guides/cafe-brunch-blog"));

for (const page of GUIDE_PAGES) {
  assert.ok(page.slug && page.title && page.description, page.slug);
  assert.ok(page.sections?.length >= 3, `${page.slug} sections`);
}

assert.ok(UTM_CAMPAIGN_PRESETS.length >= 4);
assert.ok(UTM_CAMPAIGN_PRESETS[0].url.includes("utm_source"));

console.log(`test-guide-pages: ok (${GUIDE_PAGES.length} pages)`);
