/**
 * Column Visit North Star — GPT Writer 목표 품질 vs 로컬 엔진 스팸 SSOT
 *
 * 좋은 예: 소식→방문→첫인상→확인 포인트→장점→방문 팁→마무리 (파워블로거 칼럼)
 * 나쁜 예: region+brand 붙임, em-dash glue, "기준이 달라집니다", mission 템플릿 패딩
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

export const COLUMN_VISIT_NORTH_STAR_VERSION = "column-visit-north-star-v1";

/** 로컬 엔진·Mission 패이프라인 전형 스팸 — 1회라도 송출 금지 */
export const ENGINE_SPAM_HARD_RES = [
  { id: "glued_mokma", re: /근처목마|이\s*지역목마/g, max: 0 },
  { id: "scene_mash", re: /현장\s*근처목마|이\s*지역\s*현장목마/g, max: 0 },
  { id: "local_store_context", re: /로컬\s*매장\s*운영·예약\s*맥락/g, max: 0 },
  { id: "compare_axis_spam", re: /에서\s*실제로\s*비교해\s*보면/g, max: 0 },
  { id: "criteria_shift", re: /기준이\s*달라집니다/g, max: 0 },
  { id: "criteria_visible", re: /기준이\s*조금씩\s*보였/g, max: 1 },
  { id: "criteria_catch", re: /기준이\s*잡혀요/g, max: 2 },
  { id: "pronoun_stack", re: /(?:근처|이\s*지역|현장)\s+(?:근처|이\s*지역|현장)/g, max: 0 },
  { id: "glue_then_brand", re: /(?:근처|이\s*지역|현장)\s+[^.\n]{0,16}목마/g, max: 1 },
];

const VISIT_COLUMN_POSITIVE_RES = [
  /방문(?:해|하|한|할)/,
  /둘러보/,
  /직접\s+(?:가|확인|보|느꼈)/,
  /(?:도착|들어가|현장에)/,
  /(?:느꼈|인상|쾌적|분위기)/,
  /마무리|정리해\s*봤/,
];

export function buildColumnVisitNorthStarPromptBlock() {
  return `【브릭로그 목표 품질 — 20년차 파워블로거 방문 칼럼】
글은 「키워드 SEO」가 아니라 「직접 가 본 사람이 쓴 칼럼」이어야 한다.

구성(이 순서·리듬):
1) 제목 — "브랜드+주제, 직접 둘러보고 정리" (지역·브랜드·주제 나열 금지)
2) 도입 — 소식을 듣고 방문한 이유 2~3문장
3) 소제목 4~5개 — 처음 느낀 분위기 / 둘러보며 확인한 점 / 이곳만의 장점 / 방문 전 참고 / 마무리
4) 조사 팩트는 장면·경험 문장 안에 녹일 것 (불릿·나열·안내 문구 금지)
5) 브랜드·지역명은 전체 2~4회 자연스럽게만

절대 금지(로컬 엔진 스팸 — 아래 패턴이 보이면 실패):
- "근처목마", "이 지역목마", "현장 근처목마", "이 지역 현장목마"
- " — " 로 문장 이어 붙이기·접속어 도배 ("그다음", "같은 흐름으로" 연속)
- "기준이 달라집니다", "에서 실제로 비교해 보면", "로컬 매장 운영·예약 맥락"
- "안내 기준으로 정리", "고를 때 기준이 보였" 반복`;
}

export function assessEngineSpamDraft(text = "") {
  const full = String(text || "");
  const violations = [];

  for (const rule of ENGINE_SPAM_HARD_RES) {
    const count = (full.match(rule.re) || []).length;
    if (count > rule.max) {
      violations.push({ id: rule.id, count, max: rule.max });
    }
  }

  const emDash = (full.match(/\s—\s/g) || []).length;
  if (emDash >= 4) {
    violations.push({ id: "em_dash_glue", count: emDash, max: 3 });
  }

  const glueOpeners = (full.match(/(?:그다음|같은\s*흐름으로|정리하면)\s+/g) || []).length;
  if (glueOpeners >= 3) {
    violations.push({ id: "glue_openers", count: glueOpeners, max: 2 });
  }

  return {
    ok: violations.length === 0,
    violations,
    version: COLUMN_VISIT_NORTH_STAR_VERSION,
  };
}

export function scoreColumnVisitReadability(full = "", input = {}) {
  const text = String(full || "");
  const chars = text.replace(/\s/g, "").length;
  if (chars < 200) {
    return { ok: false, score: 20, signals: [], reason: "too_short" };
  }

  const signals = VISIT_COLUMN_POSITIVE_RES.map((re) => ({
    id: re.source,
    hit: re.test(text),
  }));
  const hitCount = signals.filter((s) => s.hit).length;
  const spam = assessEngineSpamDraft(text);

  let score = 35 + hitCount * 9;
  if (/소식|오픈|새롭게/.test(text)) score += 8;
  if (/공식\s*안내|방문\s*전|예약/.test(text)) score += 6;
  if (spam.ok) score += 12;
  else score -= spam.violations.length * 15;

  const brand = String(input.brandName || "").trim();
  if (brand && brand.length >= 2) {
    const brandCount = (text.match(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
      .length;
    if (brandCount >= 1 && brandCount <= 6) score += 8;
    if (brandCount > 10) score -= 12;
  }

  score = Math.max(0, Math.min(100, score));
  return {
    ok: spam.ok && hitCount >= 3 && score >= 58,
    score,
    hitCount,
    signals,
    spam,
    version: COLUMN_VISIT_NORTH_STAR_VERSION,
  };
}

export function assessColumnVisitNorthStar(pack, input = {}) {
  const full = getBlogFullText(pack);
  const spam = assessEngineSpamDraft(full);
  const readability = scoreColumnVisitReadability(full, input);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack?.sections?.length || 0;

  const issues = [];
  if (!spam.ok) {
    issues.push({ type: "engine_spam_draft", violations: spam.violations });
  }
  if (!readability.ok && !spam.ok) {
    issues.push({ type: "not_visit_column", score: readability.score });
  }
  if (sections < 3) issues.push({ type: "sections_low" });
  if (chars < 400) issues.push({ type: "too_short" });

  const publishOk =
    spam.ok &&
    readability.hitCount >= 2 &&
    sections >= 3 &&
    chars >= 400 &&
    readability.score >= 52;

  return {
    ok: publishOk,
    publishOk,
    shouldWithhold: !spam.ok || readability.score < 45 || chars < 400,
    spam,
    readability,
    issues,
    version: COLUMN_VISIT_NORTH_STAR_VERSION,
  };
}
