/**
 * Content Quality Root Cause System
 * 맥락 · 화자 · 목적 · 흐름 — 업종/키워드 템플릿이 아닌 품질 게이트
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { evaluateWritingConstitution } from "@/lib/constitution/writingConstitution";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

const INDUSTRY_GENERALIZATION = [
  /꽃집은\s+꽃을\s+판다/,
  /카페는\s+커피를\s+판다/,
  /병원은\s+진료한다/,
  /업종\s*일반/,
  /지역\s*소개만/,
  /[\w가-힣]+\s*업종은/,
  /일반적으로\s+[\w가-힣]+은/,
  /키워드로\s+검색/,
  /메인\s*키워드/,
  /SEO/,
  /검색량/,
  /상권\s*분석/,
];

const PERSONA_VOICE = {
  brand_story: {
    allowed: [/저희|우리\s+매장|이곳은|준비해\s+두었|안내해\s+드립/],
    forbidden: [/다녀왔는데|솔직히\s+후기|체험단|취재할\s+때/],
  },
  visit_review: {
    allowed: [/다녀|느꼈|후기|솔직히|개인적으로|방문해\s+보/],
    forbidden: [/저희는\s+지향|운영\s*방침은|브랜드가\s+지향/],
  },
  info_intro: {
    allowed: [/보면\s+좋|알아두|가이드|비교|설명|확인해\s+보/],
    forbidden: [/저희\s+매장은\s+무조건/],
  },
  local_guide: {
    allowed: [/이\s+동네|근처|살면|추천|주민|로컬/],
    forbidden: [/저희\s+브랜드는\s+국내/],
  },
};

const SEASON_WORDS = /봄|여름|가을|겨울|장마|초여름|한겨울|시즌|계절/;
const EVENT_WORDS = /어버이|스승|기념|이벤트|오픈|행사|프로모|가정의달|선물/;

export function resolveContentIntent(ctx = {}) {
  if (ctx.contentIntent?.ok && ctx.contentIntent.thesis) {
    return ctx.contentIntent;
  }
  const topic = (ctx.topic || "").trim();
  const main = (ctx.main || ctx.mainKeyword || ctx.writingSubject || "").trim();
  const brand = (ctx.brandName || "").trim();
  const region = (ctx.region || "").trim();
  const include = (ctx.includePhrases || ctx.includeList?.join(", ") || "").trim();

  const subject = topic || main;
  if (!subject || subject.length < 4) {
    return {
      ok: false,
      thesis: null,
      userIntent: null,
      readerGain: null,
      reason: "no_subject",
    };
  }

  const persona = ctx.contentPersona || "brand_story";
  let userIntent = "";
  let readerGain = "";

  if (persona === "visit_review") {
    userIntent = `${brand || region || "이곳"}을 직접 경험한 솔직한 인상을 남기고 싶다`;
    readerGain = "비슷한 상황의 독자가 참고할 만한 방문 포인트를 얻는다";
  } else if (persona === "info_intro") {
    userIntent = `${subject}에 대해 헷갈리는 점을 정리해 전하고 싶다`;
    readerGain = "선택·방문 전에 알아두면 좋은 기준을 얻는다";
  } else if (persona === "local_guide") {
    userIntent = `${region || "이 동네"}에서 실제로 쓸 만한 ${subject} 이야기를 전하고 싶다`;
    readerGain = "근처에 사는 사람에게 도움이 되는 생활 정보를 얻는다";
  } else {
    userIntent = brand
      ? `${brand}의 ${subject} 이야기를 브랜드 입장에서 전하고 싶다`
      : `${subject}에 대한 브랜드 이야기를 전하고 싶다`;
    readerGain = brand
      ? `${brand}가 어떤 곳인지, 왜 들러 볼 만한지 느끼게 된다`
      : "막연했던 선택이 구체적인 장면으로 정리된다";
  }

  if (include) {
    userIntent = `${userIntent} (${include} 반영)`;
  }

  const thesis = `${subject} — ${userIntent.replace(/\s+/g, " ").slice(0, 72)}`;

  return {
    ok: thesis.length >= 12,
    thesis,
    userIntent,
    readerGain,
    coreTopic: subject,
    reason: null,
  };
}

export function extractTitleAnchors(title, ctx = {}) {
  const t = String(title || "");
  const anchors = [];

  if (ctx.brandName && t.includes(ctx.brandName)) anchors.push({ type: "brand", value: ctx.brandName });
  if (ctx.region && t.includes(ctx.region.replace(/\s/g, ""))) {
    anchors.push({ type: "region", value: ctx.region });
  } else if (ctx.region && t.includes(ctx.region.split(" ").pop())) {
    anchors.push({ type: "region", value: ctx.region });
  }
  if (SEASON_WORDS.test(t)) anchors.push({ type: "season", pattern: SEASON_WORDS });
  if (EVENT_WORDS.test(t)) anchors.push({ type: "event", pattern: EVENT_WORDS });
  if (ctx.topic && ctx.topic.length > 3 && t.includes(ctx.topic.slice(0, Math.min(8, ctx.topic.length)))) {
    anchors.push({ type: "topic", value: ctx.topic });
  }
  if (ctx.main && t.includes(ctx.main.split(" ").slice(-1)[0])) {
    anchors.push({ type: "product", value: ctx.main });
  }
  if (/무인|24시간|꽃다발|생화|커피|진료|쇼룸/.test(t)) {
    anchors.push({ type: "service", value: "service_hint" });
  }

  return anchors;
}

function bodyCoversAnchor(full, anchor, ctx) {
  if (anchor.type === "brand") {
    return (full.match(new RegExp(anchor.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length >= 2;
  }
  if (anchor.type === "region") {
    return full.includes(anchor.value) || full.includes(anchor.value.replace(/\s/g, ""));
  }
  if (anchor.type === "season") return anchor.pattern.test(full);
  if (anchor.type === "event") return anchor.pattern.test(full);
  if (anchor.type === "topic" && anchor.value) {
    const stem = anchor.value.slice(0, Math.min(6, anchor.value.length));
    return stem.length >= 3 && full.includes(stem);
  }
  if (anchor.type === "product" && anchor.value) {
    const kw = anchor.value.split(/\s+/).pop();
    return kw && kw.length > 1 && full.includes(kw);
  }
  if (anchor.type === "service") {
    return /무인|24시간|꽃다발|생화|커피|진료|쇼룸|구성|서비스/.test(full);
  }
  return true;
}

export function validateTitleBodyAlignment(pack, ctx = {}) {
  const title = pack.representativeTitle || pack.title || "";
  const full = getBlogFullText(pack);
  const anchors = extractTitleAnchors(title, ctx);
  const missing = anchors.filter((a) => !bodyCoversAnchor(full, a, ctx));

  return {
    ok: missing.length === 0,
    title,
    anchors,
    missing: missing.map((m) => m.type),
  };
}

export function validatePersonaVoice(pack, persona = "brand_story") {
  const full = getBlogFullText(pack);
  const rules = PERSONA_VOICE[persona] || PERSONA_VOICE.brand_story;
  const bad = rules.forbidden.filter((re) => re.test(full));
  return {
    ok: bad.length === 0,
    persona,
    violations: bad.map((r) => r.source),
  };
}

export function detectIndustryGeneralization(text, industryLabel) {
  const t = String(text || "");
  if (INDUSTRY_GENERALIZATION.some((re) => re.test(t))) return true;
  if (industryLabel && new RegExp(`${industryLabel}은\\s`).test(t)) return true;
  return false;
}

export function hasRepeatedMeaning(text) {
  return hasDuplicateSentences(text, 18);
}

export function evaluateContentQualityRoot(pack, ctx = {}, channel = "blog") {
  const constitution = evaluateWritingConstitution(pack, ctx, channel);
  const intent = ctx.contentIntent || resolveContentIntent(ctx);
  const titleAlign = validateTitleBodyAlignment(pack, ctx);
  const personaCheck = validatePersonaVoice(pack, ctx.contentPersona || "brand_story");
  const full = getBlogFullText(pack);

  const checks = {
    intentDefined: intent.ok !== false,
    titleBodyAlign: titleAlign.ok,
    personaConsistent: personaCheck.ok,
    noIndustryGeneral: !detectIndustryGeneralization(full, ctx.industryLabel),
    noRepeat: !hasRepeatedMeaning(full),
    constitution: constitution.ok,
  };

  const failures = [];
  if (!checks.intentDefined) failures.push("intent");
  if (!checks.titleBodyAlign) failures.push("title_body");
  if (!checks.personaConsistent) failures.push("persona_voice");
  if (!checks.noIndustryGeneral) failures.push("industry_general");
  if (!checks.noRepeat) failures.push("repeat");
  for (const f of constitution.failures) {
    if (!failures.includes(f)) failures.push(f);
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    intent,
    titleAlign,
    personaCheck,
    constitution,
  };
}

/** 제목 앵커가 본문에 약할 때 브랜드·주제 연결 문단 보강 */
export function alignBodyToTitle(pack, ctx) {
  const align = validateTitleBodyAlignment(pack, ctx);
  if (align.ok || !align.missing.length) return pack;

  const sections = [...(pack.sections || [])];
  const brand = ctx.brandName;
  const thesis = ctx.contentIntent?.thesis || ctx.contentThesis;

  let extra = "";
  if (align.missing.includes("brand") && brand) {
    extra = `${brand} — ${ctx.contentIntent?.readerGain || "분위기와 운영 방식이 글 전체에 스며들도록 썼어요."}`;
  } else if (align.missing.includes("topic") && ctx.topic) {
    extra = `이 글의 핵심은 ‘${ctx.topic}’에 대한 이야기예요.`;
  } else if (align.missing.includes("season")) {
    extra = `계절이 바뀌면 필요한 장면도 달라지는데, 그 흐름을 중심으로 적어봤어요.`;
  } else if (thesis) {
    extra = thesis;
  }

  if (extra && sections.length > 0) {
    const idx = Math.min(sections.length - 1, 2);
    const sec = sections[idx];
    if (!sec.body?.includes(extra.slice(0, 20))) {
      sections[idx] = {
        ...sec,
        body: sec.body ? `${sec.body}\n\n${extra}` : extra,
      };
    }
  }

  return { ...pack, sections };
}

export function buildIntentDrivenTitles(ctx, intent) {
  if (!intent?.ok) return [];
  const { region, brandName, topic } = ctx;
  const core = intent.coreTopic || topic || ctx.main;
  const out = [];

  if (brandName && region) {
    out.push(`${region}, ${brandName} — ${core}`.slice(0, 42));
  }
  if (brandName) {
    out.push(`${brandName}, ${core}`.slice(0, 40));
  }
  out.push(`${core} — ${region || "오늘의 이야기"}`.slice(0, 44));
  if (intent.thesis) {
    out.push(intent.thesis.slice(0, 48));
  }

  return [...new Set(out.filter((t) => t.length > 8))].slice(0, 5);
}
