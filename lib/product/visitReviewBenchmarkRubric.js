/**
 * Visit Review Benchmark Rubric — GPT 방문 후기 목표 품질 채점 SSOT
 *
 * 기준 예시: 여주목마 수영장 오픈 「직접 둘러본 후기」
 * - 계절·상황 훅 → 방문 계기 → 도착 분위기 → 체감 장점 → 차별점 → 방문 전 참고 → 마무리
 * - ~습니다체 산문, 현장 관찰, 키워드·브로슈어 스팸 없음
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { assessColumnVisitNorthStar } from "@/lib/product/columnVisitNorthStar";
import { detectVisitReviewTemplateContamination } from "@/lib/content/visitReviewTopicGate";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import { ENGINE_SPAM_RES } from "@/lib/product/columnistEngineSpam";
import { AGENT_META_LEAK_RES } from "@/lib/content/displayBodyGuards";
import {
  collectSubstantiveResearchFacts,
  countConcreteFactsWovenInBody,
} from "@/lib/product/editorGradeResearchGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const VISIT_REVIEW_BENCHMARK_VERSION = "visit-review-benchmark-v2";
export const VISIT_REVIEW_BENCHMARK_PASS_A = 85;
export const VISIT_REVIEW_BENCHMARK_PASS_DEFAULT = 75;

/** 사용자 제공 GPT 목표 예시 (여주목마) — 회귀·벤치마크 점수용 */
export const GPT_YEOJU_BENCHMARK_PACK = {
  title: "여주목마 수영장 오픈 소식, 직접 둘러본 후기",
  sections: [
    {
      heading: "도입",
      body:
        "최근 여주목마에 새로운 수영장이 오픈했다는 소식을 듣고 현장을 방문해 보았습니다. " +
        "기존에도 식사와 카페, 휴식 공간이 함께 운영되고 있었는데 이번에는 물놀이까지 즐길 수 있는 공간이 추가되면서 " +
        "더욱 다양한 즐길 거리를 갖춘 복합 문화공간으로 변화한 모습이었습니다.",
    },
    {
      heading: "처음 도착해서 느낀 분위기",
      body:
        "현장에 도착해 가장 먼저 느낀 점은 가족 단위 방문객들이 편하게 이용할 수 있도록 공간 구성이 잘 되어 있다는 점이었습니다. " +
        "수영장뿐 아니라 식사 공간과 카페, 휴식 공간이 자연스럽게 연결되어 있어 하루 일정을 보내기에도 부담이 없어 보였습니다. " +
        "특히 아이들과 함께 방문하는 경우 수영 후 바로 식사나 휴식을 이어갈 수 있다는 점이 장점으로 느껴졌습니다.",
    },
    {
      heading: "실외 수영장의 장점",
      body:
        "수영장을 선택할 때 단순히 규모만 보는 경우가 많지만 실제로는 이용 환경과 편의시설이 만족도에 큰 영향을 줍니다. " +
        "탁 트인 공간감 아래에서 즐기는 물놀이는 실내와는 다른 즐거움이 있었습니다.",
    },
    {
      heading: "여주목마가 다른 점",
      body:
        "여주목마는 물놀이와 식사, 휴식을 한 공간에서 해결할 수 있다는 점에서 가족 나들이 장소를 찾는 분들에게 좋은 선택지가 될 수 있을 것 같습니다.",
    },
    {
      heading: "방문 전 참고할 점",
      body:
        "방문 전에는 운영 시간과 이용 요금, 예약 여부를 미리 확인하는 것을 추천드립니다. 성수기와 주말에는 이용객이 많을 수 있기 때문입니다.",
    },
  ],
  conclusion:
    "여주에서 물놀이와 휴식을 함께 즐길 수 있는 공간을 찾고 있다면 여주목마 수영장도 한 번 살펴보시면 좋겠습니다.",
};

const STRUCTURE_HEADING_RES = [
  { id: "hook_or_news", re: /소식|오픈|여름|계절|다가오|찾는|방문해\s*보|둘러보/, weight: 4 },
  { id: "arrival_mood", re: /도착|들어서|처음|분위기|인상|느낀|공간/, weight: 4 },
  { id: "core_experience", re: /수영|체험|물놀이|장점|즐길|이용\s*환경|편의/, weight: 4 },
  { id: "differentiation", re: /다른\s*점|차별|복합|한\s*공간|선택지/, weight: 4 },
  { id: "practical_notes", re: /방문\s*전|운영|요금|예약|확인|참고/, weight: 4 },
];

const FIELD_OBSERVATION_RES = [
  /직접|눈에|느껴|느꼈|인상|분위기|도착|들어서|체감|살펴|둘러보/,
  /가족|아이|동선|공간|연결|편하게|하루/,
  /생각보다|장점|다르|특히/,
];

const BROCHURE_SPAM_RES = [
  /비교가\s*수월/,
  /덜\s*헷갈릴까요/,
  /대표\s*서비스/,
  /방문·상담/,
  /목적별로\s*나눠/,
  /공식\s*안내\s*기준/,
  /로컬\s*매장\s*운영/,
  /비교\s*기준/,
  /매장·상담에서\s*확인/,
  /브랜드\s*자주\s*비교/,
  /기준이\s*조금씩\s*보였/,
  /찾게\s*된\s*계기/,
  /시즌\s*오픈은\s*말만\s*붙이면/,
  /검색만\s*하다\s*보면\s*기준이\s*많아서/,
];

const ABSTRACT_SEASON_FILLER_RES = [
  /마음이\s*먼저\s*움직/,
  /손의\s*감각/,
  /리듬이\s*느려/,
  /시즌\s*오픈은\s*말만\s*붙/,
  /계절이\s*바뀌면\s*브랜드/,
  /기억되는\s*방식이\s*다르/,
  /단순하면서도\s*힘이\s*있다/,
  /한\s*번쯤\s*확인해볼\s*만/,
];

export function resolveVisitReviewPassMin(opts = {}) {
  if (typeof opts.passMin === "number") return opts.passMin;
  return isBriclogResetQualityEnforced()
    ? VISIT_REVIEW_BENCHMARK_PASS_A
    : VISIT_REVIEW_BENCHMARK_PASS_DEFAULT;
}

function normalizeHeadingKey(heading = "") {
  return String(heading || "")
    .replace(/(?:\s*[—–-]\s*이어서)+$/gi, "")
    .replace(/\s+\(\d+\)$/, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function hasDuplicateSectionHeadings(pack) {
  const keys = (pack?.sections || [])
    .map((s) => normalizeHeadingKey(s.heading))
    .filter(Boolean);
  return keys.length !== new Set(keys).size;
}

function hasAgentMetaLeak(full = "") {
  return AGENT_META_LEAK_RES.some((re) => re.test(full));
}

function scoreStructureArc(pack) {
  const headings = (pack?.sections || []).map((s) => `${s.heading || ""} ${s.body || ""}`).join("\n");
  const intro = String(pack?.sections?.[0]?.body || pack?.title || "");
  const full = `${intro}\n${headings}`;

  const hits = STRUCTURE_HEADING_RES.map((rule) => ({
    id: rule.id,
    hit: rule.re.test(full),
    weight: rule.weight,
  }));
  const earned = hits.filter((h) => h.hit).reduce((sum, h) => sum + h.weight, 0);
  const max = STRUCTURE_HEADING_RES.reduce((sum, r) => sum + r.weight, 0);
  const sectionCount = pack?.sections?.length || 0;
  const sectionBonus = sectionCount >= 4 ? 4 : sectionCount >= 3 ? 2 : 0;

  return {
    score: Math.min(20, Math.round((earned / max) * 16) + sectionBonus),
    max: 20,
    hits,
    sectionCount,
  };
}

function scoreFieldPresence(full = "") {
  const hits = FIELD_OBSERVATION_RES.filter((re) => re.test(full)).length;
  return {
    score: Math.min(20, 6 + hits * 5),
    max: 20,
    hitCount: hits,
  };
}

function scoreProseQuality(full = "") {
  const staccato = (full.match(/[.!?]\s*[가-힣]{2,8}[.!?]/g) || []).length;
  const checklist = (full.match(/확인하세요|권합니다|정리해\s*두세요/g) || []).length;
  const polite = /습니다|였습니다|보였습니다|느껴졌습니다/.test(full);
  let score = 8;
  if (polite) score += 4;
  if (staccato < 6) score += 4;
  if (checklist === 0) score += 3;
  if (full.length > 600) score += 3;
  return { score: Math.min(15, score), max: 15, staccato, checklist };
}

function scoreSpamFree(full = "") {
  const violations = [];
  for (const re of [...BROCHURE_SPAM_RES, ...ENGINE_SPAM_RES]) {
    if (re.test(full)) violations.push(re.source.slice(0, 40));
  }
  const north = assessColumnVisitNorthStar({ sections: [{ body: full }] }, {});
  if (!north.spam.ok) {
    for (const v of north.spam.violations || []) {
      violations.push(v.id);
    }
  }
  const penalty = violations.length * 5;
  return {
    score: Math.max(0, 20 - penalty),
    max: 20,
    violations: [...new Set(violations)],
  };
}

function scoreResearchGrounded(pack, input = {}) {
  const full = getBlogFullText(pack);
  const substantive = collectSubstantiveResearchFacts(input);
  const wovenMeta = countConcreteFactsWovenInBody(full, input);
  if (!substantive.length) {
    return { score: 8, max: 15, woven: 0, total: 0, ratio: 0, skipped: true };
  }
  const ratio = wovenMeta.ratio;
  const wovenBonus = wovenMeta.woven >= 3 ? 4 : wovenMeta.woven >= 2 ? 2 : 0;
  return {
    score: Math.min(15, Math.round(4 + ratio * 11) + wovenBonus),
    max: 15,
    woven: wovenMeta.woven,
    total: wovenMeta.total,
    ratio,
  };
}

function scoreBrandNatural(full = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  if (!brand || brand.length < 2) {
    return { score: 8, max: 10, count: 0, skipped: true };
  }
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const count = (full.match(new RegExp(escaped, "g")) || []).length;
  let score = 0;
  if (count >= 1 && count <= 6) score = 10;
  else if (count === 0) score = 4;
  else if (count <= 10) score = 6;
  else score = 2;
  return { score, max: 10, count };
}

/**
 * @param {object} pack
 * @param {object} [input]
 * @param {{ passMin?: number }} [opts]
 */
export function assessVisitReviewBenchmark(pack, input = {}, opts = {}) {
  const passMin = resolveVisitReviewPassMin(opts);
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack?.sections?.length || 0;

  const structure = scoreStructureArc(pack);
  const field = scoreFieldPresence(full);
  const prose = scoreProseQuality(full);
  const spam = scoreSpamFree(full);
  const research = scoreResearchGrounded(pack, input);
  const brand = scoreBrandNatural(full, input);

  const total =
    structure.score +
    field.score +
    prose.score +
    spam.score +
    research.score +
    brand.score;
  const max = 100;

  const contam = detectVisitReviewTemplateContamination(pack, input);
  const northStar = assessColumnVisitNorthStar(pack, input);
  const contract = assessHumanColumnContract(pack, input);

  const abstractHits = ABSTRACT_SEASON_FILLER_RES.filter((re) => re.test(full)).length;
  const concreteWoven = countConcreteFactsWovenInBody(full, input);

  const hardFails = [];
  if (spam.violations.length > 0) hardFails.push("engine_spam");
  if (!contam.ok) hardFails.push("template_contamination");
  if (sections < 3) hardFails.push("sections_low");
  if (chars < 400) hardFails.push("too_short");
  if (hasDuplicateSectionHeadings(pack)) hardFails.push("duplicate_headings");
  if (hasAgentMetaLeak(full)) hardFails.push("meta_instruction_leak");
  if (
    !research.skipped &&
    research.total >= 2 &&
    (research.ratio ?? 0) < 0.35
  ) {
    hardFails.push("research_underwoven");
  }
  if (
    abstractHits >= 2 &&
    concreteWoven.woven < 2 &&
    collectSubstantiveResearchFacts(input).length >= 2
  ) {
    hardFails.push("abstract_season_filler");
  }
  if (
    !research.skipped &&
    concreteWoven.total >= 3 &&
    concreteWoven.woven < 2
  ) {
    hardFails.push("concrete_facts_missing");
  }

  const publishOk =
    hardFails.length === 0 &&
    total >= passMin &&
    northStar.spam.ok &&
    structure.score >= 14 &&
    field.score >= 14 &&
    (research.skipped || research.score >= 10);

  return {
    ok: publishOk,
    publishOk,
    score: total,
    max,
    passMin,
    grade:
      total >= 90
        ? "A"
        : total >= 85
          ? "A-"
          : total >= 75
            ? "B"
            : total >= 60
              ? "C"
              : total >= 45
                ? "D"
                : "F",
    dimensions: { structure, field, prose, spam, research, brand },
    hardFails,
    contam,
    northStar,
    contractOk: contract.ok,
    chars,
    sections,
    version: VISIT_REVIEW_BENCHMARK_VERSION,
  };
}

export function formatVisitReviewBenchmarkReport(assessed, label = "") {
  const d = assessed.dimensions;
  const lines = [
    label ? `=== ${label} ===` : "=== Visit Review Benchmark ===",
    `총점: ${assessed.score}/${assessed.max} (${assessed.grade}) publishOk=${assessed.publishOk}`,
    `  구조(기승전결): ${d.structure.score}/${d.structure.max}`,
    `  현장감: ${d.field.score}/${d.field.max}`,
    `  문체: ${d.prose.score}/${d.prose.max}`,
    `  스팸 없음: ${d.spam.score}/${d.spam.max}${d.spam.violations.length ? ` [${d.spam.violations.join(", ")}]` : ""}`,
    `  조사 반영: ${d.research.score}/${d.research.max} (${d.research.woven || 0}/${d.research.total || 0})`,
    `  브랜드 자연: ${d.brand.score}/${d.brand.max} (언급 ${d.brand.count ?? "—"}회)`,
    `  분량: ${assessed.chars}자 · 섹션 ${assessed.sections}개`,
  ];
  if (assessed.hardFails.length) {
    lines.push(`  hardFails: ${assessed.hardFails.join(", ")}`);
  }
  return lines.join("\n");
}
