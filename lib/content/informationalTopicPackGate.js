/**
 * 정보형·소개 주제 — 방문후기 패드·상담메모·해시태그 최종 차단
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isInformationalTopicInput, topicRaw, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { shouldSkipMissionCatalogConclusion } from "@/lib/product/gpt55LlmPackGuard";
import { stripCatalogContaminationSentences } from "@/lib/product/catalogContaminationGuard";

const VISIT_BODY_RES = [
  /당일\s*상담\s*메모\s*\d+/,
  /직접\s*다녀온\s*이야기/,
  /직접\s*가볼\s*일이\s*생겼/,
  /에\s*직접\s*가서/,
  /쇼룸에서/,
  /누워보니/,
  /솔직\s*후기/,
  /확인해\s*확인해/,
  /둘러확인해/,
  /[가-힣]+와\s+[가-힣]+을\s+포인트/,
  /[가-힣]+와\s+[가-힣]+를\s+포인트/,
  /향와|질감와|성분와/,
];

const VISIT_HEADING_RES = [
  /직접\s*다녀온/,
  /솔직\s*정리/,
  /후기\s*$/,
  /다녀온\s*이야기/,
];

const HASHTAG_LINE_RE = /(?:^|\n)\s*#[\w가-힣]+(?:\s+#[\w가-힣]+)*\s*$/;

export function hasInformationalPackDefects(pack, input = {}) {
  if (!isInformationalTopicInput(input) || !pack) return false;
  const full = [
    pack.title,
    pack.representativeTitle,
    getBlogFullText(pack),
    pack.conclusion,
    ...(pack.hashtags || []),
  ].join("\n");
  return VISIT_BODY_RES.some((re) => re.test(full));
}

function stripHashtagsFromText(text = "") {
  return String(text || "")
    .replace(HASHTAG_LINE_RE, "")
    .replace(/#[\w가-힣]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripBlogPackHashtags(pack) {
  if (!pack) return pack;
  const sections = (pack.sections || []).map((sec) => ({
    ...sec,
    heading: stripHashtagsFromText(sec.heading),
    body: stripHashtagsFromText(sec.body),
  }));
  return {
    ...pack,
    title: stripHashtagsFromText(pack.title),
    representativeTitle: stripHashtagsFromText(pack.representativeTitle || pack.title),
    conclusion: stripHashtagsFromText(pack.conclusion),
    sections,
    hashtags: [],
    fullCopyText: pack.fullCopyText ? stripHashtagsFromText(pack.fullCopyText) : pack.fullCopyText,
  };
}

function informationalTitle(input = {}) {
  const p = deriveTopicWritingContext(input);
  const facet = topicWritingFacet(input) || topicRaw(input) || "안내";
  return `${p.regionBit}${p.brand} ${facet}`.replace(/\s+/g, " ").trim();
}

function informationalHeadingTemplates(input = {}, count = 6) {
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet || "안내";
  const short = subject.length > 24 ? p.topicFacet : subject;
  return [
    `${short}, 처음 찾게 된 계기`,
    `${p.brand} ${short} 한눈에 보기`,
    `${short} 고를 때 헷갈리는 부분`,
    `성분·보관·선물 목적별로 보면`,
    `${p.brand}에서 자주 받는 질문`,
    `${short} 정리`,
    `마무리 — ${short} 선택 기준`,
  ].slice(0, Math.max(1, count));
}

function filterInformationalParagraph(text = "") {
  const t = String(text || "").trim();
  if (!t || VISIT_BODY_RES.some((re) => re.test(t))) return "";
  return t;
}

function buildReplacementParagraph(input = {}, slot = 0) {
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet || "안내";
  const obj = koreanObjectParticle(subject);
  const pool = [
    `${subject}를 고를 때 성분·원재료·보관 방법을 함께 보면 기준이 분명해집니다.`,
    `${p.brand}에서 안내하는 ${subject} 관련 조건은 목적에 따라 우선순위가 달라집니다.`,
    `선물·반려·집에서 먹기 등 용도별로 ${subject}${obj} 달라질 수 있어요.`,
    `유통기한·냉장 보관 여부는 제품마다 다르니 라벨을 먼저 확인하는 편이 좋습니다.`,
    `${p.regionBit}${p.brand} 문의 시 알레르기·성분 표기를 요청할 수 있습니다.`,
    `비슷한 ${subject}를 비교할 때는 원재료 비율과 첨가물 표기를 나란히 보면 수월합니다.`,
    `처음 ${subject}를 찾을 때는 용도와 보관 환경부터 정리해 두면 선택이 빨라집니다.`,
  ];
  return pool[slot % pool.length];
}

function dedupeParagraphs(paragraphs = []) {
  const seen = new Set();
  const out = [];
  for (const para of paragraphs) {
    const key = para.replace(/\s/g, "").slice(0, 48);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(para);
  }
  return out;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyInformationalTopicPackGate(pack, input = {}) {
  if (!pack?.sections?.length || !isInformationalTopicInput(input)) {
    return stripBlogPackHashtags(pack);
  }

  let next = { ...pack };
  const title = informationalTitle(input);
  next.title = title;
  next.representativeTitle = title;

  const headings = informationalHeadingTemplates(input, next.sections.length);
  let slot = 0;

  next.sections = next.sections.map((sec, i) => {
    let heading = String(sec.heading || "").trim();
    if (!heading || VISIT_HEADING_RES.some((re) => re.test(heading))) {
      heading = headings[i] || headings[headings.length - 1];
    }

    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => filterInformationalParagraph(p))
      .filter(Boolean);

    while (paras.length < 2 && slot < 24) {
      paras.push(buildReplacementParagraph(input, slot));
      slot += 1;
    }

    return {
      ...sec,
      heading,
      body: dedupeParagraphs(paras).join("\n\n").trim(),
    };
  });

  const p = deriveTopicWritingContext(input);
  const topic = topicRaw(input) || p.topicFacet || "안내";
  const filteredClose = filterInformationalParagraph(next.conclusion);
  if (shouldSkipMissionCatalogConclusion(next, input)) {
    next.conclusion = filteredClose
      ? stripCatalogContaminationSentences(filteredClose)
      : next.conclusion;
  } else {
    next.conclusion =
      filteredClose ||
      `${p.regionBit}${p.brand} ${topic} — 성분·보관·선물 목적을 함께 보면 선택이 수월합니다. 궁금한 점은 매장 문의로 확인하시면 됩니다.`;
  }

  next = stripBlogPackHashtags(next);
  next._meta = {
    ...(next._meta || {}),
    informationalTopicPackGate: true,
  };
  return next;
}
