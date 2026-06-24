/**
 * Place · Instagram · Blog — placeholder 브랜드명·주제 comma 오염 보정
 */
import { topicRaw } from "@/lib/content/topicFacetEngine";

const PLACEHOLDER_BRAND_RE =
  /^(?:새\s*브랜드|내\s*매장|내\s*브랜드|브랜드(?:명)?|매장(?:명)?)$/i;

export function isPlaceholderBrandName(name = "") {
  const b = String(name || "").trim();
  if (!b) return true;
  if (PLACEHOLDER_BRAND_RE.test(b)) return true;
  if (b === "매장") return true;
  return false;
}

/** 고객 노출용 브랜드명 — 「새 브랜드」·지역-only placeholder 대체 */
export function resolveChannelBrandName(input = {}) {
  let brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = topicRaw(input);

  brand = brand.replace(/\s*새\s*브랜드\s*$/i, "").trim();

  if (!isPlaceholderBrandName(brand)) return brand;

  if (topic && topic.replace(/\s/g, "").length >= 2) {
    const facility = topic
      .replace(/\s*(?:개장|오픈|리뉴얼|신규).*$/i, "")
      .trim();
    if (facility && facility.replace(/\s/g, "").length >= 2) {
      return facility;
    }
  }

  const regionToken = region.split(/\s+/).filter(Boolean).pop();
  return regionToken || region || topic || "매장";
}

/** 채널·블로그 파이프라인 입력 — topicRaw·brandName 정규화 */
export function enrichChannelInput(input = {}) {
  const brandName = resolveChannelBrandName(input);
  const topic = topicRaw(input) || String(input.topic || "").trim();
  const mainKeyword = topic || String(input.mainKeyword || "").trim();
  return {
    ...input,
    brandName,
    topic,
    mainKeyword,
  };
}

/** 블로그·채널 공통 alias */
export function enrichPipelineInput(input = {}) {
  return enrichChannelInput(input);
}

export const enrichBlogInput = enrichPipelineInput;

/** 블로그 서사·placeholder가 채널에 섞였는지 */
export function detectChannelTemplateLeak(pack, channel = "place", input = {}) {
  const full = [
    pack?.title,
    pack?.shortNotice,
    pack?.detailBody,
    pack?.hook,
    pack?.lineBreakBody,
    pack?.body,
    pack?.ending,
  ]
    .filter(Boolean)
    .join("\n");

  const issues = [];
  if (/새\s*브랜드/.test(full)) issues.push("placeholder_brand");
  if (/왜\s+.+\s*찾게\s*됐/.test(full)) issues.push("blog_arc_why");
  if (/🔎\s*.+\s*찾게/.test(full)) issues.push("blog_arc_emoji");
  if (/매장\s*안내를\s*찾게/.test(full)) issues.push("facet_leak");
  if (channel === "place" && /쇼룸/.test(full) && !/가구|침대|쇼룸|매트리스/i.test(`${input.topic} ${input.industry}`)) {
    issues.push("wrong_industry_showroom");
  }
  if (/순간이했습니다|들해요/.test(full)) issues.push("broken_grammar");
  if (/마음에\s*들(?:해요|더라)/.test(full) && channel === "place") {
    issues.push("review_tone_on_place");
  }
  const emojiArc = (full.match(/^(?:📍|🔎|✔)\s+/gm) || []).length;
  if (emojiArc >= 2) issues.push("emoji_arc_spam");

  return { ok: issues.length === 0, issues };
}
