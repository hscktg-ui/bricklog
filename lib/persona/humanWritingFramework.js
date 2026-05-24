/**
 * Human Writing Framework + Brand Presence + Why Engine
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { evaluateHumanTemperature } from "@/lib/content/humanTemperature";
const GENERIC_CLICHES = [
  /꽃집은\s+꽃을\s+판다/,
  /카페는\s+커피를\s+판다/,
  /병원은\s+진료한다/,
];

const INFO_OPENERS = [
  /^오늘은\s/,
  /^소개/,
  /^이번\s*글에서는/,
  /^[\w가-힣]+\s*(꽃집|카페|병원|매장)은/,
  /^[\w가-힣]+\s*에서\s*[\w가-힣]+\s*(을|를)\s*찾/,
  /키워드로\s*검색/,
  /^[\w가-힣]+\s*키워드/,
];

const EMOTION_MARKERS =
  /느껴|마음|부담|편해|아쉬|기분|공감|그날|순간|떠올|조용|따뜻|허해|급해/;

const WHY_MARKERS =
  /이유|다시|추천|들러|방문|찾아|왜|때문|부담\s*없|편하|좋았|다녀|재방문|구매/;

const SCENE_MARKERS =
  /퇴근|비\s*오는|주말|아침|거실|기념일|약속|집들이|창밖|퇴근길|늦은\s*시간|갑자기/;

function firstBody(pack) {
  return pack?.sections?.[0]?.body || "";
}

function countBrandMentions(text, brandName) {
  if (!brandName || brandName.length < 2) return 0;
  const re = new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (text.match(re) || []).length;
}

export function startsWithForbiddenOpener(text) {
  const first = String(text || "")
    .trim()
    .split(/\n\n+/)[0]
    ?.split(/(?<=[.!?…])\s+/)[0]
    ?.trim();
  if (!first || first.length < 8) return false;
  return INFO_OPENERS.some((re) => re.test(first));
}

export function hasSceneOpening(pack) {
  const body = firstBody(pack);
  if (!body) return false;
  const firstPara = body.split(/\n\n+/)[0] || body;
  if (startsWithForbiddenOpener(firstPara)) return false;
  return SCENE_MARKERS.test(firstPara) || firstPara.length < 120;
}

export function hasEmotionLayer(text) {
  return EMOTION_MARKERS.test(text || "");
}

export function hasWhyLayer(text) {
  return WHY_MARKERS.test(text || "");
}

export function hasBrandPresence(text, brandName, min = 3) {
  if (!brandName?.trim()) return true;
  return countBrandMentions(text, brandName) >= min;
}

export function hasGenericIndustryTalk(text, industryLabel) {
  if (!industryLabel) return false;
  const generic = [
    new RegExp(`${industryLabel}은\\s*${industryLabel}`),
    /꽃집은\s*꽃을\s*판다/,
    /카페는\s*커피를\s*판다/,
    /병원은\s*진료한다/,
  ];
  if (GENERIC_CLICHES.some((re) => re.test(text))) return true;
  return generic.some((re) => re.test(text));
}

export function evaluateHumanWritingFramework(pack, ctx = {}, channel = "blog") {
  const full =
    channel === "blog"
      ? getBlogFullText(pack)
      : [
          pack?.title,
          pack?.shortBody,
          pack?.detailBody,
          pack?.hook,
          pack?.body,
          pack?.ending,
        ]
          .filter(Boolean)
          .join("\n");

  const checks = {
    hasScene: channel !== "blog" || hasSceneOpening(pack),
    hasEmotion: hasEmotionLayer(full),
    hasBrand:
      channel !== "blog" ||
      !ctx.brandName ||
      hasBrandPresence(full, ctx.brandName, 3),
    hasWhy: hasWhyLayer(full),
    readsHuman:
      !hasMechanicalKeywordPattern(full) &&
      evaluateHumanTemperature(full, channel).ok &&
      !hasGenericIndustryTalk(full, ctx.industryLabel),
  };

  const failures = [];
  if (!checks.hasScene) failures.push("scene");
  if (!checks.hasEmotion) failures.push("emotion");
  if (!checks.hasBrand) failures.push("brand");
  if (!checks.hasWhy) failures.push("why");
  if (!checks.readsHuman) failures.push("human");

  return {
    ok: failures.length === 0,
    checks,
    failures,
    fullText: full,
  };
}

/** 브랜드 언급 부족 시 자연 삽입 */
export function ensureBrandPresenceInPack(pack, ctx) {
  const brand = ctx.brandName?.trim();
  if (!brand || !pack?.sections?.length) return pack;

  const full = getBlogFullText(pack);
  if (countBrandMentions(full, brand) >= 3) return pack;

  const mods = ctx.personaModifiers?.brandBridgePool || [];
  const line =
    mods.find(Boolean) ||
    `${brand} — ${ctx.region ? `${ctx.region} ` : ""}근처에서, 분위기와 구성이 먼저 느껴지는 타입이에요.`;

  const sections = [...pack.sections];
  const idx = Math.min(sections.length - 1, Math.max(1, sections.length - 2));
  const sec = sections[idx];
  if (sec && !sec.body?.includes(brand)) {
    sections[idx] = {
      ...sec,
      body: sec.body ? `${sec.body}\n\n${line}` : line,
    };
  }

  let conclusion = pack.conclusion || "";
  if (!conclusion.includes(brand)) {
    conclusion = conclusion
      ? `${conclusion}\n\n${brand} — ${ctx.region ? `${ctx.region} ` : ""}근처에서 한번 들러 보세요.`
      : `${brand} — 근처에서 한번 들러 보세요.`;
  }

  return { ...pack, sections, conclusion };
}
