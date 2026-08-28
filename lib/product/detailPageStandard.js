/**
 * 상품 상세페이지 기준 SSOT
 * 쇼핑몰에서 고르는 화면. 블로그·플레이스 운영글과 분리.
 * 광고처럼 안 보임 · 사실만 · 관찰·의견 · 약한 안내.
 */
import { FORBIDDEN_GLOBAL_PHRASES, AI_CLICHE_PHRASES } from "@/lib/golden/haeshinContentDnaSeed";
import { isDryFactSentence, sentenceExperienceOpinionAxes } from "@/lib/product/briclogExperienceOpinionEngine";
import { scoreDetailPage } from "@/lib/product/detailPageGrade";
import { formatDetailPageDesignBrief } from "@/lib/product/detailPageContext";
import { formatRankingPlaybookForPrompt } from "@/lib/product/detailPageRankingPlaybook";
import { formatCategoryFlowForPrompt } from "@/lib/product/detailPageCategoryFlow";

export const DETAIL_PAGE_STANDARD_VERSION = "gollaboda-pdp-v1";

export const DETAIL_PAGE_STANDARD_RULES = Object.freeze([
  {
    id: "facts_only",
    label: "입력·브랜드에 있는 사실만",
    fail: "없는 가격·인증·임상·후기를 만들지 않는다",
  },
  {
    id: "search_intent",
    label: "고르는 사람이 막힌 지점부터",
    fail: "키워드를 제목처럼 쌓지 않는다",
  },
  {
    id: "explain",
    label: "정보 다음에 이유",
    fail: "특징입니다 나열 금지",
  },
  {
    id: "observe_opinion",
    label: "관찰·경험·의견 중 하나",
    fail: "건조 스펙만 있는 상세는 실패",
  },
  {
    id: "quiet_brand",
    label: "브랜드는 맥락 안에",
    fail: "매 문단 브랜드 외치기 금지",
  },
  {
    id: "soft_cta",
    label: "강한 구매 압박 없이 안내",
    fail: "지금 바로 구매/방문 금지",
  },
]);

export const DETAIL_PAGE_FAKE_REVIEW_RE =
  /별점|★{2,}|실구매자|고객님께서|구매\s*후기|만족도\s*100|무조건\s*추천|대박\s*상품/;

export const DETAIL_PAGE_HARD_CTA_RE =
  /지금\s*바로\s*(?:구매|방문|클릭|주문)|서두르세|한정\s*수량|오늘만|클릭하세요|최고의\s*선택/;

export const DETAIL_PAGE_INVENTED_CLAIM_RE =
  /FDA|임상\s*완료|특허\s*제\d|의사\s*추천|1위\s*브랜드|국내\s*유일(?!\s*성능)/;

function flatten(pack) {
  return [
    pack?.headline,
    pack?.subhead,
    ...(pack?.sections || []).flatMap((s) => [
      s.kicker,
      s.title,
      s.body,
      ...(s.bullets || []),
      ...(s.rows || []).map((r) => (Array.isArray(r) ? r.join(" ") : "")),
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

function bannedHits(text) {
  const hits = [];
  for (const p of FORBIDDEN_GLOBAL_PHRASES) {
    if (p && text.includes(p)) hits.push(p);
  }
  for (const p of AI_CLICHE_PHRASES) {
    if (p && text.includes(p)) hits.push(p);
  }
  return hits;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessDetailPageStandard(pack, input = {}) {
  const text = flatten(pack);
  const reasons = [];
  const brand = String(input.brandName || pack?.brandName || "").trim();

  if (!pack?.sections?.length) reasons.push("empty_sections");
  if (brand && !text.includes(brand)) reasons.push("brand_missing");
  if (DETAIL_PAGE_FAKE_REVIEW_RE.test(text)) reasons.push("fake_review");
  if (DETAIL_PAGE_HARD_CTA_RE.test(text)) reasons.push("hard_cta");
  if (DETAIL_PAGE_INVENTED_CLAIM_RE.test(text)) reasons.push("invented_claim");

  const banned = bannedHits(text);
  if (banned.length) reasons.push("banned_phrase");

  const bodies = (pack?.sections || [])
    .flatMap((s) => [s.body, ...(s.bullets || [])])
    .filter(Boolean);
  const dryCount = bodies.filter((s) => isDryFactSentence(s)).length;
  if (dryCount >= 3) reasons.push("dry_facts");

  const observeOk = bodies.some((s) => sentenceExperienceOpinionAxes(s).length > 0);
  if (bodies.length >= 3 && !observeOk) reasons.push("no_observe_opinion");

  const hasIntent = (pack?.sections || []).some(
    (s) => s.type === "intent" || s.type === "problem"
  );
  if ((pack?.sections || []).length >= 5 && !hasIntent) reasons.push("no_search_intent");

  const ok = reasons.length === 0;
  const reasonSet = new Set(reasons);
  const rules = {
    facts_only: !["invented_claim", "fake_review", "empty_sections", "brand_missing"].some(
      (r) => reasonSet.has(r)
    ),
    search_intent: !reasonSet.has("no_search_intent"),
    explain: !reasonSet.has("dry_facts"),
    observe_opinion:
      !reasonSet.has("no_observe_opinion") && !reasonSet.has("dry_facts"),
    quiet_brand: !reasonSet.has("banned_phrase"),
    soft_cta: !reasonSet.has("hard_cta"),
  };
  return {
    version: DETAIL_PAGE_STANDARD_VERSION,
    ok,
    reasons,
    rules,
    banned,
    dryCount,
  };
}

function softenCtaBody(text) {
  return String(text || "")
    .replace(DETAIL_PAGE_HARD_CTA_RE, "방문 전에 운영 시간을 확인하면 됩니다")
    .replace(/지금 바로/g, "필요할 때");
}

function stripBanned(text) {
  let t = String(text || "");
  for (const p of [...FORBIDDEN_GLOBAL_PHRASES, ...AI_CLICHE_PHRASES]) {
    if (p && t.includes(p)) t = t.split(p).join("");
  }
  t = t.replace(DETAIL_PAGE_FAKE_REVIEW_RE, "");
  t = t.replace(DETAIL_PAGE_INVENTED_CLAIM_RE, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

export function scrubDetailPagePack(pack) {
  if (!pack?.sections) return pack;
  const sections = pack.sections.map((s) => {
    const next = {
      ...s,
      kicker: stripBanned(s.kicker),
      title: stripBanned(s.title),
      heading: stripBanned(s.heading || s.title),
      body: s.type === "cta" ? softenCtaBody(stripBanned(s.body)) : stripBanned(s.body),
      bullets: (s.bullets || []).map(stripBanned).filter(Boolean),
    };
    return next;
  });
  return {
    ...pack,
    headline: stripBanned(pack.headline),
    subhead: stripBanned(pack.subhead),
    sections,
  };
}

function parseBulletLines(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 8);
  }
  return String(value || "")
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseSpecRows(value) {
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        if (Array.isArray(row)) return [String(row[0] || "").trim(), String(row[1] || "").trim()];
        return null;
      })
      .filter((row) => row && row[0] && row[1])
      .slice(0, 16);
  }
  return String(value || "")
    .split(/\n+/)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx < 1) return null;
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
    .filter((row) => row && row[0] && row[1])
    .slice(0, 10);
}

/**
 * 생성 후 사람이 섹션 문장을 고친 팩 — GPT 재호출 없음.
 */
export function applyEditedDetailPageSections(pack, nextSections, input = {}) {
  if (!pack) return pack;
  const sections = (nextSections || [])
    .map((s) => {
      const title = String(s.title || s.heading || "").trim();
      const body = String(s.body || "").trim();
      const bullets = parseBulletLines(s.bullets ?? s.bulletText);
      const rows =
        s.type === "spec" ? parseSpecRows(s.rows ?? s.rowText) : Array.isArray(s.rows) ? s.rows : [];
      if (!title && !body && !bullets.length && !rows.length) return null;
      return {
        ...s,
        title,
        heading: title,
        body,
        bullets,
        rows,
        kicker: String(s.kicker || "").trim(),
      };
    })
    .filter(Boolean);
  if (sections.length < 3) return pack;

  const next = scrubDetailPagePack({
    ...pack,
    headline: String(pack.headline || "").trim() || sections[0]?.title || pack.headline,
    subhead: String(pack.subhead || "").trim(),
    sections,
  });
  const prevMode = pack._meta?.mode;
  const mode = prevMode === "llm" || prevMode === "llm-edited" ? "llm-edited" : "edited";
  const graded = scoreDetailPage(
    next,
    { brandName: input.brandName || pack.brandName || "", pageLength: pack.pageLength || input.pageLength },
    mode
  );
  return {
    ...next,
    _meta: {
      ...(pack._meta || {}),
      standard: graded.standard,
      chars: graded.chars,
      compositionOk: graded.compositionOk,
      densityOk: graded.densityOk,
      visualOk: graded.visualOk,
      edited: true,
      mode,
      sqv: {
        ...(pack._meta?.sqv || {}),
        score: graded.score,
        grade: graded.grade,
      },
      contentQualityValue: graded.score,
    },
  };
}

export function gptDetailPageSystemPrompt({ brandName, sectionIds, input = {} }) {
  return [
    "브릭로그 상세. 스마트스토어·쿠팡 상세. GPT는 섹션 JSON만. 컷 사진은 엔진이 붙인다.",
    formatDetailPageDesignBrief({ brandName, ...input }),
    formatRankingPlaybookForPrompt(),
    formatCategoryFlowForPrompt({ brandName, ...input }),
    "한 섹션은 한 일만. 같은 문장 반복 금지. 입력된 특징은 bullets의 짧은 이름으로.",
    "고르는 사람의 막힌 점 → 이 상품에서 그 점이 어떻게 풀리는지 → 만지거나 써보면 알 관찰.",
    "금지: 가짜 후기, 별점, 없는 가격·인증, 지금 바로 구매, 광고 관용구, ~특징입니다, 블로그 운영 문장, 「고르는 순서가 보이면」 같은 메꿈 마침.",
    `브랜드 "${brandName}"는 본문 속에만 자연스럽게.`,
    `type 순서 고정: ${sectionIds.join(",")}`,
    "highlights는 히어로 제목. mustInclude는 spec rows.",
    "본문은 섹션당 0~1문장. 글자 수를 문장으로 채우지 않는다.",
    "intent bullets는 카테고리 고르는 순서(라벨 — 값, 2~4). usp bullets는 소재·재료. 완전한 문장 금지.",
    "intent는 고민 한 줄(searchIntent). bullets 없음. explain bullets는 카테고리 핵심 소구점 3~5칸. 범용 USP 반복 금지. spec 라벨은 카테고리 단어. 「기준 1」 금지.",
    "패딩 문장 금지.",
    "이미지는 제품 연출컷만. 한글·가격·아이콘·스펙은 JSON 카피에만. 상세페이지 통이미지를 묘사하지 않는다.",
    "payload.plan이 있으면 그 섹션 문법·순서에만 카피를 쓴다.",
    "없는 가격·인증·후기·효능은 만들지 않는다. 없으면 [자료 필요: 항목명]으로 적는다.",
    "CTA 문구는 구매하기. 지금 바로 구매 금지.",
    "헤드라인 24자, 본문 80자. 추상어(프리미엄·신선한·정직한)는 근거 있을 때만.",
    'JSON: {"headline","subhead","sections":[{"type","kicker","title","body","bullets","rows"}]}',
  ].join("\n");
}
