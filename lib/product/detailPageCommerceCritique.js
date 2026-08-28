/**
 * 전환형 상세 자동 검수. 0~10 × 10축, 75 미만이면 한 번 수정.
 * 수정 중에도 가격·인증·후기·효능을 만들지 않는다.
 */
import { clipBody, clipHeadline, isNeedFact } from "@/lib/product/detailPageFactDossier";

export const DETAIL_PAGE_COMMERCE_CRITIQUE_VERSION = "detail-commerce-critique-v1";
export const DETAIL_PAGE_COMMERCE_PASS = 75;

const ABSTRACT_RE =
  /크게 외치지 않습니다|기준만 챙기면 됩니다|프리미엄|신선한|정직한|믿을 수 있는|특별한/;

function clamp10(n) {
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function scoreDetailPageCommerce(args = {}) {
  const pack = args.pack || {};
  const html = String(args.html || "");
  const dossier = args.dossier || {};
  const text = [
    pack.headline,
    pack.subhead,
    ...(pack.sections || []).flatMap((s) => [s.title, s.body, ...(s.bullets || []), ...(s.rows || []).map((r) => r?.[1])]),
  ]
    .filter(Boolean)
    .join("\n");

  const hasH1 = (html.match(/<h1[\s>]/g) || []).length === 1;
  const hasTable = html.includes("<table") && html.includes("spec-sheet");
  const hasFaq = html.includes("<dl") || html.includes("data-layout=\"faq\"");
  const hasCta = html.includes("data-cta=\"buy\"") || html.includes("<button");
  const hasNeed = text.includes("[자료 필요");
  const uniqueImgs = new Set(
    [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1])
  ).size;
  const invented =
    /별점|실구매자|FDA|국내 유일|지금 바로 구매/.test(text) ||
    ((dossier.missingRequired || []).includes("가격") && /[0-9]원/.test(text) && !isNeedFact(text));

  const axes = {
    firstScreen: clamp10((html.includes('data-section="hero"') ? 4 : 0) + (hasH1 ? 3 : 0) + (html.includes("data-cta") ? 3 : 1)),
    targetFit: clamp10(text.includes(String(pack.subhead || "").slice(0, 4)) || text.includes("손님") ? 8 : 4),
    factDensity: clamp10(Math.min(10, (dossier.sourceFacts || []).length)),
    completeness: clamp10(hasTable ? (hasNeed ? 8 : 10) : 3),
    imageVariety: clamp10(uniqueImgs >= 3 ? 8 : uniqueImgs === 1 ? 7 : 5),
    mobileRead: clamp10(html.includes("max-width:860px") && html.includes("min-width:360px") ? 9 : html.includes("860px") ? 6 : 3),
    anxiety: clamp10(hasFaq ? 8 : 4),
    ctaFlow: clamp10(hasCta ? 9 : 3),
    brand: clamp10(text.includes(pack.brandName || "") ? 8 : 4),
    seoA11y: clamp10((hasH1 ? 4 : 0) + (html.includes(" alt=") ? 3 : 0) + (html.includes("<button") || html.includes("data-cta") ? 3 : 0)),
  };
  if (invented) axes.factDensity = Math.min(axes.factDensity, 2);
  if (ABSTRACT_RE.test(text)) axes.factDensity = Math.min(axes.factDensity, 5);

  const total = Object.values(axes).reduce((a, b) => a + b, 0);
  return {
    version: DETAIL_PAGE_COMMERCE_CRITIQUE_VERSION,
    axes,
    total,
    pass: DETAIL_PAGE_COMMERCE_PASS,
    ok: total >= DETAIL_PAGE_COMMERCE_PASS && !invented,
    invented: !!invented,
  };
}

export function refineDetailPagePackForCommerce(pack) {
  if (!pack?.sections) return pack;
  const sections = pack.sections.map((s) => ({
    ...s,
    title: clipHeadline(String(s.title || "").replace(ABSTRACT_RE, "").trim() || s.title),
    body: clipBody(String(s.body || "").replace(ABSTRACT_RE, "").trim()),
    bullets: (s.bullets || []).map((b) => clipBody(b, 80)),
  }));
  return { ...pack, sections };
}
