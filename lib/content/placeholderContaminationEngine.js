/**
 * Placeholder 오염 SSOT — null/빈 변수·템플릿 잔재·업종 혼합 대명사
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { topicReaderPhrase, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

/** RESET: placeholder 1건이라도 즉시 FAIL */
export const PLACEHOLDER_CONTAMINATION_FAIL_COUNT = 1;

/** 사용자 노출 금지 — 변수성·깨진 문법 패턴 */
export const PLACEHOLDER_CONTAMINATION_PATTERNS = [
  { id: "bare_utilize", re: /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/g },
  { id: "good_content_typo", re: /좋은내용/g },
  { id: "exhibition_news", re: /전시\s*소식/g },
  { id: "this_composition", re: /이\s*구성/g },
  { id: "broken_bomyeon", re: /를\s*보면/g },
  { id: "broken_e_direct", re: /에\s*직접\s*가(?:서|보면)/g },
  { id: "empty_related", re: /관련해서/g },
  { id: "broken_related_bomyeon", re: /관련해서\s*를\s*보면/ },
  { id: "condition_composition", re: /조건\s*및\s*구성/g },
  { id: "neutral_summary", re: /중립적으로\s*정리/g },
  { id: "easy_compare", re: /비교가\s*수월해요/g },
  { id: "broken_josa_e", re: /(?:을|를)\s*에\s*직접/ },
  { id: "literal_undefined", re: /\b(undefined|null)\b/i },
  { id: "template_brackets", re: /\[(?:브랜드|지역|키워드|업종)\]/ },
];

const REQUIRED_INPUT_VAR_KEYS = ["brandName", "region"];
const OPTIONAL_INPUT_VAR_KEYS = ["industry", "storeFeatures"];

/** 생성 전 필수 축 — null/undefined/빈 문자열 */
export function detectEmptyInputVars(input = {}) {
  const empty = [];
  for (const key of REQUIRED_INPUT_VAR_KEYS) {
    const v = input[key];
    if (v == null || String(v).trim() === "") {
      empty.push(key);
    }
  }
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic) {
    empty.push("topic");
  }
  for (const key of OPTIONAL_INPUT_VAR_KEYS) {
    const v = input[key];
    if (v != null && String(v).trim() === "") {
      empty.push(key);
    }
  }
  return { ok: empty.length === 0, empty };
}

export const UTILIZE_GUIDE_SHIELD = "\uE000UTIL_GUIDE\uE001";

/** 본문 scrub 시 「이용 안내」 합성어 보존 */
export function shieldUtilizeGuidePhrase(text = "") {
  return String(text || "").replace(/이용\s*안내/g, UTILIZE_GUIDE_SHIELD);
}

export function unshieldUtilizeGuidePhrase(text = "") {
  return String(text || "").replace(
    new RegExp(UTILIZE_GUIDE_SHIELD, "g"),
    "이용 안내"
  );
}

function stripPlaceholderAllowlist(text) {
  return shieldUtilizeGuidePhrase(text).replace(
    new RegExp(UTILIZE_GUIDE_SHIELD, "g"),
    " "
  );
}

/** placeholder 패턴만 제거 — 합성어 「이용 안내」는 유지 */
export function scrubPlaceholderPatternsFromText(text = "") {
  let out = shieldUtilizeGuidePhrase(text);
  for (const { re } of PLACEHOLDER_CONTAMINATION_PATTERNS) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    out = out.replace(new RegExp(re.source, flags), "");
  }
  return unshieldUtilizeGuidePhrase(out)
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countPlaceholderContamination(full) {
  const scrubbed = stripPlaceholderAllowlist(full);
  const hits = {};
  let total = 0;
  for (const { id, re } of PLACEHOLDER_CONTAMINATION_PATTERNS) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const matcher = new RegExp(re.source, flags);
    const m = scrubbed.match(matcher);
    const n = m ? m.length : 0;
    if (n) {
      hits[id] = n;
      total += n;
    }
  }
  return { total, hits };
}

export function detectPlaceholderContamination(pack, input = {}) {
  const full = typeof pack === "string" ? pack : getBlogFullText(pack);
  const counts = countPlaceholderContamination(full);
  const emptyVars = detectEmptyInputVars(input);
  const reasons = [];

  if (!emptyVars.ok) {
    reasons.push("empty_input_vars");
  }
  if (counts.total >= PLACEHOLDER_CONTAMINATION_FAIL_COUNT) {
    reasons.push("placeholder_contamination");
  }
  if (counts.hits?.bare_utilize >= 1 || counts.hits?.good_content_typo >= 1) {
    if (!reasons.includes("placeholder_contamination")) {
      reasons.push("placeholder_contamination");
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    counts,
    emptyVars: emptyVars.empty,
    failAt: PLACEHOLDER_CONTAMINATION_FAIL_COUNT,
  };
}

/** 업종별 topic 대명사 — 가구 전시 전용어 카페 등에 주입 금지 */
export function resolveIndustryTopicPronouns(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const facet = topicWritingFacet(input);
  const reader = topicReaderPhrase(input, 0);
  const byKey = {
    cafe: ["이번 메뉴", "브런치 소식", "메뉴 구성"],
    tea_cafe: ["차 메뉴", "티 메뉴", "이번 차"],
    pet_cafe: ["매장 메뉴", "반려견 안내", "이용 안내"],
    flower: ["꽃 구성", "시즌 꽃", "다발 구성"],
    furniture: ["쇼룸 체험", "제품 구성", "비교 포인트"],
    salon: ["시술 메뉴", "스타일 안내", "케어 구성"],
    hospital: ["진료 안내", "검진 안내", "치료 구성"],
    education: ["특강 안내", "커리큘럼", "수업 구성"],
    construction: ["시공 범위", "리모델링", "견적 안내"],
    craft: ["체험 프로그램", "클래스 구성", "원데이 안내"],
    pension: ["숙소 안내", "객실 구성", "예약 조건"],
    snack: ["간식 구성", "영양 안내", "급여 방법"],
    marketing: ["캠페인 소식", "콘텐츠 안내", "이번 주제"],
    default: [reader, facet, "이번 안내"].filter(Boolean),
  };
  const list = byKey[key] || byKey.default;
  return [...new Set(list.filter((s) => String(s).trim().length >= 2))].slice(0, 4);
}

/** topic cap 대체어 — 「이용」 단독 placeholder 금지 */
export function resolveTopicCapSubstitute(input = {}) {
  const facet = topicWritingFacet(input);
  if (facet && facet !== "이용" && facet.length >= 2) return facet;
  const reader = topicReaderPhrase(input, 0);
  if (reader && reader !== "이용") return reader;
  const key = resolveBriclogIndustryKey(input);
  if (key === "cafe" || key === "tea_cafe") return "메뉴";
  if (key === "flower") return "꽃 구성";
  if (key === "furniture") return "전시";
  return "매장 안내";
}

export function assertNoPlaceholderContamination(pack, input = {}) {
  const check = detectPlaceholderContamination(pack, input);
  return {
    ok: check.ok,
    stage: "placeholder_contamination",
    reasons: check.reasons,
    counts: check.counts,
    emptyVars: check.emptyVars,
    userMessage: check.ok
      ? null
      : check.emptyVars?.length
        ? "브랜드·지역·주제 정보가 비어 있어 글을 만들 수 없어요."
        : "미완성 표현이 감지되어 다시 작성합니다.",
  };
}
