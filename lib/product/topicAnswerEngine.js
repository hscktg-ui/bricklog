/**
 * TOPIC ANSWER ENGINE — 작성 후 "제목에 대한 답을 했는가?"
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { buildTopicMap } from "@/lib/product/topicMapEngine";
import { isTopicAnswerEnforced } from "@/lib/product/missionFlags";

export const TOPIC_ANSWER_VERSION = "v1";
export const MIN_TITLE_ANSWER_RATE = 0.6;

/** 제목 유형별 본문이 답해야 할 항목 */
const TITLE_ANSWER_PACKS = [
  {
    id: "voucher",
    titleMatch: /온누리|지역사랑|상품권|e-?카드|결제\s*수단/i,
    items: [
      {
        id: "voucher_what",
        label: "상품권·결제 수단 설명",
        patterns: [/온누리|지역사랑|상품권|결제\s*수단|e-?카드/i],
        required: true,
      },
      {
        id: "voucher_how",
        label: "사용 방법",
        patterns: [/사용\s*방법|이용\s*방법|결제\s*방법|사용\s*가능|결제\s*시/i],
        required: true,
      },
      {
        id: "voucher_apply",
        label: "적용 방식·할인율",
        patterns: [/적용|할인|%\s*|혜택\s*율|10\s*%|할인율/i],
        required: true,
      },
      {
        id: "voucher_benefit",
        label: "혜택",
        patterns: [/혜택|할인|적립|추가\s*혜택/i],
        required: false,
      },
      {
        id: "voucher_caution",
        label: "주의사항",
        patterns: [/주의|확인|불가|제외|한도|유의/i],
        required: true,
      },
    ],
  },
  {
    id: "discount_event",
    titleMatch: /할인|프로모션|이벤트|특가|%|세일/i,
    items: [
      {
        id: "event_what",
        label: "행사·할인 내용",
        patterns: [/할인|프로모션|이벤트|특가|혜택/i],
        required: true,
      },
      {
        id: "event_period",
        label: "기간·조건",
        patterns: [/기간|언제|까지|조건|대상/i],
        required: true,
      },
      {
        id: "event_how",
        label: "적용·이용 방법",
        patterns: [/적용|이용|사용|방법|받는/i],
        required: true,
      },
      {
        id: "event_caution",
        label: "주의사항",
        patterns: [/주의|확인|제외|불가/i],
        required: false,
      },
    ],
  },
  {
    id: "visit_review",
    titleMatch: /방문\s*후기|직접\s*가|다녀|체험\s*후기/i,
    items: [
      {
        id: "visit_context",
        label: "방문 맥락",
        patterns: [/방문|다녀|직접|가\s*봤|체험/i],
        required: true,
      },
      {
        id: "visit_observation",
        label: "관찰·인상",
        patterns: [/느낌|인상|보니|확인|공간|분위기/i],
        required: true,
      },
      {
        id: "visit_info",
        label: "확인된 정보",
        patterns: [/운영|메뉴|가격|위치|안내|시간/i],
        required: true,
      },
    ],
  },
];

function resolveTitle(pack = {}, input = {}) {
  return (
    String(pack.representativeTitle || pack.title || "").trim() ||
    String(input.topic || input.mainKeyword || "").trim()
  );
}

function itemCovered(item, blob = "") {
  const text = String(blob || "");
  return (item.patterns || []).some((re) => {
    if (re.test(text)) return true;
    const src = re.source || "";
    if (/이용/.test(src)) {
      const alt = new RegExp(src.replace(/이용\\s*/, ""), re.flags);
      return alt.test(text);
    }
    return false;
  });
}

/**
 * 제목에서 본문이 답해야 할 체크리스트 생성
 */
export function buildTitleAnswerChecklist(title = "", input = {}) {
  const t = String(title || "").trim();
  const topicMap = input.topicMap || buildTopicMap(input);
  const packs = TITLE_ANSWER_PACKS.filter((p) => p.titleMatch.test(t));

  let items = [];
  if (packs.length) {
    for (const pack of packs) {
      items.push(...pack.items);
    }
  }

  const mapItems = (topicMap.requiredExplanationItems || []).slice(0, 6).map(
    (row) => ({
      id: `map_${row.id}`,
      label: row.label,
      patterns: row.patterns || [],
      keywords: row.keywords || [],
      required: true,
    })
  );

  for (const row of mapItems) {
    const labelHit = t.includes(String(row.label || "").slice(0, 6));
    const keywordHit = (row.keywords || []).some((kw) => kw && t.includes(kw));
    if (labelHit || keywordHit || items.length === 0) {
      items.push({
        ...row,
        patterns: [
          ...(row.patterns || []),
          ...(row.keywords || []).map(
            (kw) => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
          ),
        ],
      });
    }
  }

  if (!items.length && t) {
    const tokens = t
      .replace(/[^\p{L}\p{N}\s%]/gu, " ")
      .split(/\s+/)
      .filter((tok) => tok.length >= 2)
      .slice(0, 4);
    items = tokens.map((tok, i) => ({
      id: `title_token_${i}`,
      label: `${tok} 설명`,
      patterns: [new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")],
      required: true,
    }));
  }

  const seen = new Set();
  items = items.filter((item) => {
    const key = item.id || item.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    version: TOPIC_ANSWER_VERSION,
    title: t,
    items,
    requiredCount: items.filter((i) => i.required !== false).length,
  };
}

/**
 * "이 글은 제목에 대한 답을 했는가?"
 */
export function assessTopicAnswer(pack, input = {}) {
  const title = resolveTitle(pack, input);
  const checklist = buildTitleAnswerChecklist(title, input);
  const full = getBlogFullText(pack);

  const results = (checklist.items || []).map((item) => ({
    ...item,
    covered: itemCovered(item, full),
  }));

  const required = results.filter((r) => r.required !== false);
  const covered = results.filter((r) => r.covered);
  const requiredCovered = required.filter((r) => r.covered);
  const rate = results.length ? covered.length / results.length : 0;
  const requiredRate = required.length
    ? requiredCovered.length / required.length
    : 1;

  const missing = results.filter((r) => !r.covered).map((r) => r.label);
  const missingRequired = required.filter((r) => !r.covered).map((r) => r.label);

  const ok =
    results.length === 0 ||
    (requiredRate >= MIN_TITLE_ANSWER_RATE && rate >= MIN_TITLE_ANSWER_RATE);

  return {
    ok,
    title,
    checklist,
    results,
    rate,
    requiredRate,
    missing,
    missingRequired,
    needsRegen: !ok,
    reasons: ok
      ? []
      : missingRequired.length
        ? ["title_answer_insufficient", "title_answer_missing_required"]
        : ["title_answer_insufficient"],
    userMessage: ok
      ? null
      : `제목「${title.slice(0, 40)}」에 대한 설명이 부족해 다시 다듬는 중입니다.`,
  };
}

export function assertTopicAnswerPostWrite(pack, input = {}) {
  if (!isTopicAnswerEnforced()) {
    return { ok: true, skipped: true };
  }
  const assessment = assessTopicAnswer(pack, input);
  return {
    ok: assessment.ok,
    stage: "topic_answer",
    ...assessment,
  };
}

export function formatTopicAnswerBrief(checklist = {}) {
  if (!checklist?.title) return "";
  return [
    "【TOPIC ANSWER — 제목에 답하기】",
    `제목: ${checklist.title}`,
    "본문이 답해야 할 항목:",
    ...(checklist.items || []).map((i) => `- ${i.label}`),
    "설명 부족 시 재작성",
  ].join("\n");
}
