const META_LAYER_BANNED_PHRASES = [
  "브랜드 기억 엔진",
  "검수 기준",
  "운영 흐름",
  "콘텐츠 축적 시스템",
  "브랜드 메모리 기준",
  "목적 save 고정",
  "informative 기준",
  "emotional 기준",
  "브랜드 메모리",
  "콘텐츠 축적",
  "운영 관점",
  "일관성 유지",
  "브랜드 철학",
  "목적 고정",
  "톤 고정",
  "내부 검수",
  "홍보 문구 금지",
  "핵심 확인 항목",
  "콘텐츠 일관성",
  "확인된 정보만 남기고",
  "방문 전 확인하면 도움이",
  "간단히 짚어봅니다",
  "지역명은 자연스럽게만 사용",
  "동네 방문 맥락",
  "고유 입력 기반",
  "세 칸만 채우면",
  "이 브랜드답게",
  "GPT: 글을",
  "Gemini: 조사",
  "Naver: 지역성",
  "Memory: 브랜드",
  "AI 역할 분리",
  "BRICLOG MISSION",
  "BRICLOG Memory",
];

const META_PHILOSOPHY_EXPLAIN_RE =
  /(브랜드\s*메모리|브랜드\s*철학|콘텐츠\s*일관성|운영\s*관점|검수\s*기준|콘텐츠\s*축적|브랜드\s*기억\s*엔진|일관성을?\s*유지|목적\s*고정|톤\s*고정|브랜드\s*맥락|기존\s*AI\s*글|콘텐츠\s*축|발행\s*직전)/i;

const META_PROCESS_SENTENCE_RE =
  /(브랜드 메모리|브랜드 철학|운영 원칙|검수|콘텐츠 축적|입력값 고정|톤을 .*기준|재작성 비용|생성 직후|운영 시스템|콘텐츠는 문장|콘텐츠 운영|길이 옵션|기능 설명:\s*실제 운영|활용 방식:\s*팀 단위|이 글은 .*답하려고|확인된 정보만 남기고|방문 전 확인하면 도움이|간단히 짚어봅니다|핵심 확인 항목|홍보 문구 금지|내부 검수|목적\s*고정|톤\s*고정|\bsave\b|\binformative\b|\bemotional\b|지역명은\s*자연스럽게|고유\s*입력\s*기반|동네\s*방문\s*맥락)/i;

const OPERATOR_BRAND_META_RE =
  /(콘텐츠는\s*문장\s*장식|콘텐츠\s*운영|판단\s*기준의\s*일관성|콘텐츠가\s*자산으로|실무\s*적용성|문장\s*복제)/i;

const META_LAYER_BANNED_RE = new RegExp(
  META_LAYER_BANNED_PHRASES
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gi"
);

function cleanText(text) {
  return String(text || "")
    .replace(META_LAYER_BANNED_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMetaProcessSentences(text) {
  const raw = String(text || "");
  if (!raw.trim()) return "";
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !META_PROCESS_SENTENCE_RE.test(line))
    .filter((line) => !/[^\.\n]{0,40}\s를\s+차지하고/.test(line));
  return cleanText(lines.join("\n"));
}

export function stripMetaLayerTerms(text) {
  return cleanText(text);
}

export function hasMetaLayerLeak(text) {
  return META_LAYER_BANNED_RE.test(String(text || ""));
}

/** V13 — 브릭로그 철학·운영 설명이 본문에 침범했는지 (브릭로그 자체 글 제외) */
export function hasOperatorMetaLeak(text, ctx = {}) {
  const raw = String(text || "");
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  if (/브릭로그/i.test(brand)) return false;
  const brandMeta = brand
    ? new RegExp(`${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*콘텐츠`, "i").test(raw)
    : false;
  return (
    OPERATOR_BRAND_META_RE.test(raw) ||
    brandMeta ||
    /(발행\s*직전|브랜드\s*맥락이\s*축적|콘텐츠\s*축을\s*고정)/.test(raw)
  );
}

export function hasMetaPhilosophyLeak(text, ctx = {}) {
  const raw = String(text || "");
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const isBriclogArticle = /브릭로그/i.test(brand) || /브릭로그/i.test(raw.slice(0, 200));
  if (isBriclogArticle) return hasMetaLayerLeak(raw);
  return (
    META_PHILOSOPHY_EXPLAIN_RE.test(raw) ||
    hasMetaLayerLeak(raw) ||
    hasOperatorMetaLeak(raw, ctx)
  );
}

export function sanitizeBlogPackMetaLayer(pack) {
  if (!pack) return pack;
  const allowMetaLayer = /브릭로그/i.test(
    `${pack?.title || ""} ${pack?.representativeTitle || ""}`
  );
  const scrub = allowMetaLayer ? cleanText : stripMetaProcessSentences;
  return {
    ...pack,
    title: scrub(pack.title),
    representativeTitle: scrub(pack.representativeTitle),
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: scrub(s.heading),
      body: scrub(s.body),
    })),
    conclusion: scrub(pack.conclusion),
  };
}

export function sanitizeChannelPackMetaLayer(channel, pack) {
  if (!pack) return pack;
  const allowMetaLayer = /브릭로그/i.test(
    `${pack?.title || ""} ${pack?.shortNotice || ""} ${pack?.body || ""}`
  );
  const scrub = allowMetaLayer ? cleanText : stripMetaProcessSentences;
  if (channel === "place") {
    return {
      ...pack,
      title: scrub(pack.title),
      shortNotice: scrub(pack.shortNotice),
      detailBody: scrub(pack.detailBody),
    };
  }
  if (channel === "instagram") {
    return {
      ...pack,
      title: scrub(pack.title),
      body: scrub(pack.body),
      lineBreakBody: scrub(pack.lineBreakBody),
      hashtags: Array.isArray(pack.hashtags)
        ? pack.hashtags
            .map((t) => scrub(t))
            .filter(Boolean)
        : pack.hashtags,
    };
  }
  return pack;
}

export { META_LAYER_BANNED_PHRASES };
