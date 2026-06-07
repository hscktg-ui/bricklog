/**
 * Display-body guard — 조사 메타·범용 패드·업종 불일치 경험 문장이 본문에 노출되지 않도록
 * (BRICLOG CONTENT DOCTRINE: 새 사실·좋은 설명 — 범용 패드는 둘 다 해당 없음)
 */
import { isFurnitureIndustry } from "@/lib/product/industryContextEngine";

const INTERNAL_RESEARCH_SOURCES = new Set([
  "region_hints",
  "region_axis",
  "brand_axis",
  "entity_variant",
  "inference",
  "input_field",
]);

export const PROMPT_ONLY_RESEARCH_TEXT_RES = [
  /지역명은\s*자연스럽게/,
  /동네\s*방문\s*맥락/,
  /고유\s*입력\s*기반/,
  /방문·체험·비교를\s*전제로/,
  /글을\s*읽는\s*경우/,
  /공식·매장\s*안내\s*기준/,
  /안내\s*기준으로\s*확인/,
  /출처·검색·기사/,
  /원문\s*복사\s*금지/,
  /입력\s*우선/,
  /입력된\s*범위\s*안에서/,
  /본문\s*노출\s*금지/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해/,
  /—\s*지역\s*연관\s*검색/,
  /지역\s*검색·방문\s*맥락/,
  /지역에서의\s*방문·비교\s*검색\s*맥락/,
  /브랜드\s*기준으로\s*제품·서비스를\s*설명/,
  /주제\s*표기\s*변형/,
  /검색·조사용\s*단서/,
  /입력·표기\s*단서/,
  /단서로\s*추론/,
  /입력\s*실마리/,
];

/** knowledgeCoverage · topicAwareLengthPads — 본문 주입 금지 */
export const GENERIC_DISPLAY_PAD_RES = [
  /원재료·사이즈·설치\s*조건을\s*함께\s*확인/,
  /포인트는\s*원재료·사이즈·설치/,
  /브랜드별\s*강점\(품질·서비스·체험·사후\s*지원\)/,
  /공식\s*채널·인증\s*매장\s*정보를\s*우선/,
  /공식\s*홈페이지·매장\s*안내로\s*확인하는\s*것이\s*좋/,
  /어떤\s*포지션인지\s*공식\s*홈페이지/,
  /가격은\s*모델·구성·행사·카드\s*혜택에\s*따라/,
  /매장\s*견적이\s*가장\s*정확/,
  /쇼룸\s*안내\s*기준으로\s*브랜드별/,
  /비교할\s*때\s*기준이\s*되는\s*항목을\s*미리\s*정리/,
  /확인되지\s*않은\s*스펙·가격·효과는\s*단정하지\s*말/,
  /항목별로\s*분리해\s*요청하세요/,
  /행사\s*전후\s*가격\s*차이/,
];

/** experienceVoice — 범용·타 업종 잔재 */
export const GENERIC_EXPERIENCE_VOICE_RES = [
  /^처음엔\s*어디부터\s*볼지\s*막막했는데,\s*기준만\s*정리해\s*두니까\s*훨씬\s*수월했/,
  /^사이즈는\s*솔직히\s*많이\s*아쉬웠습니다/,
  /^검색만\s*하다\s*보면\s*기준이\s*많아서\s*헷갈리는데,\s*목적별로\s*나눠\s*보니까/,
];

export function isInternalResearchSource(source = "") {
  return INTERNAL_RESEARCH_SOURCES.has(String(source || "").toLowerCase());
}

export function isPromptOnlyResearchFactText(text = "", source = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 4) return true;
  if (isInternalResearchSource(source)) return true;
  return PROMPT_ONLY_RESEARCH_TEXT_RES.some((re) => re.test(t));
}

export function isGenericDisplayPadSentence(text = "", input = {}) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (GENERIC_DISPLAY_PAD_RES.some((re) => re.test(t))) return true;
  if (GENERIC_EXPERIENCE_VOICE_RES.some((re) => re.test(t))) return true;
  if (isFurnitureIndustry(input)) {
    if (/사이즈는\s*솔직히/.test(t) && !/매트리스|프레임|침대|베이스|헤드보드/.test(t)) return true;
    if (/온라인\s*쇼핑몰|의류|핏이\s*아쉬/.test(t)) return true;
  }
  if (/현장에서\s*.+?\s*—\s*지역\s*연관/.test(t)) return true;
  return false;
}

export function isDisplayBodyForbidden(text = "", input = {}) {
  return (
    isPromptOnlyResearchFactText(text) ||
    isGenericDisplayPadSentence(text, input)
  );
}

export function filterDisplayBodyParagraphs(paras = [], input = {}) {
  return (paras || []).filter((p) => {
    const t = String(p || "").trim();
    return t && !isDisplayBodyForbidden(t, input);
  });
}

function stripForbiddenSentences(text = "", input = {}) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const paras = raw.split(/\n\n+/);
  const kept = [];
  for (const para of paras) {
    const sentences = para
      .split(/(?<=[.!?…])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const clean = sentences.filter((s) => !isDisplayBodyForbidden(s, input));
    if (clean.length) kept.push(clean.join(" "));
  }
  return kept.join("\n\n").trim();
}

/** 고객 출력 직전 — 금지 문장·문단 제거 */
export function applyDisplayBodyGuardPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (pack._meta?.displayBodyGuard) return pack;

  const sections = (pack.sections || [])
    .map((sec) => ({
      ...sec,
      heading: stripForbiddenSentences(sec.heading, input),
      body: stripForbiddenSentences(sec.body, input),
    }))
    .filter((sec) => String(sec.body || "").replace(/\s/g, "").length >= 20);

  return {
    ...pack,
    title: stripForbiddenSentences(pack.title, input) || pack.title,
    representativeTitle: pack.representativeTitle
      ? stripForbiddenSentences(pack.representativeTitle, input) || pack.representativeTitle
      : pack.representativeTitle,
    sections,
    conclusion: pack.conclusion ? stripForbiddenSentences(pack.conclusion, input) : pack.conclusion,
    intro: pack.intro ? stripForbiddenSentences(pack.intro, input) : pack.intro,
    _meta: {
      ...(pack._meta || {}),
      displayBodyGuard: true,
    },
  };
}
