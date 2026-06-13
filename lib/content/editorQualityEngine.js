/**
 * BRICLOG Editor Quality — 전문 에디터 기본값·내부 문장 차단
 */
import {
  stripMetaLayerTerms,
  sanitizeBlogPackMetaLayer,
  hasMetaPhilosophyLeak,
} from "@/lib/content/metaLayerSeparation";
import {
  applyBrandContentEngine,
  isMechanicalListingTitle,
} from "@/lib/content/brandContentEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { FILLER_PADDING_PATTERNS } from "@/lib/content/humanDeliveryRules";
import { detectVerbatimTopicUsage, sanitizeVerbatimTopicInPack, ensureVerbatimTopicCompliance } from "@/lib/content/informationUnitEngine";
import { detectSearchSnippetLeak, stripSearchSnippetLeakFromPack, shouldStripDeliverySentence } from "@/lib/product/brandJournalistDirective";
import {
  detectForbiddenIntro,
  detectBrandRegionEditorViolations,
  scoreEditorV95,
} from "@/lib/product/briclogEditorEngineV95";
import { deriveTopicWritingContext, topicRaw, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { buildMissionConclusionLine } from "@/lib/product/missionProseEngine";
import { shouldSkipMissionCatalogConclusion } from "@/lib/product/gpt55LlmPackGuard";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine";
import { stripIndustryContaminationFromPack } from "@/lib/product/industryContaminationEngine";
import { applyHumanEditorGuardPass } from "@/lib/content/humanEditorGuardPass";
import {
  wordOverlapRatio,
  stripGlobalExactDuplicateSentences,
  applyDuplicateKiller,
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
} from "@/lib/content/duplicateKillerEngine";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { detectIndustryContamination } from "@/lib/product/industryContaminationEngine";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";
import {
  buildSectionPlan,
  scoreSectionPlanCoverage,
} from "@/lib/content/sectionPlannerEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { collapseMechanicalHookFlood } from "@/lib/content/mechanicalHookGuard";
import {
  applyEditorV95Pass,
  polishEditorV95Delivery,
  assertEditorV95ForOutput,
} from "@/lib/product/briclogEditorEngineV95";
import { resolveTopicCapSubstitute } from "@/lib/content/placeholderContaminationEngine";
import { smartCompressBlogPack } from "@/lib/content/editorLengthControlEngine";
import {
  ensureMinBlogSections,
  normalizeBlogLengthAndStructure,
} from "@/lib/content/blogLengthControl";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import {
  applyGpt55PrePublishChecks,
  applyGpt55VoiceFinalPass,
  shouldUseGpt55LightDelivery,
} from "@/lib/product/gpt55LightDelivery";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";

export const EDITOR_DEFAULT_VOICE_BRIEF = `【BRICLOG · 전문 에디터 기본값】
- 차분함·신뢰감·정보성·자연스러운 설득. 과장·광고 CTA·GPT식 요약 금지.
- 브랜드·주제 중심 칼럼. 기(배경)→승(정보)→전(기준·주의)→결(정리) 흐름.
- 각 문단은 앞뒤와 자연스럽게 이어질 것. 단순 정보 나열·소제목만 늘리기 금지.
- 금지: 지나친 친근체·과한 감성·「많은 분들이」「종합적으로 보면」「도움이 되시길」
- 내부 검수·프롬프트·엔진 용어는 본문에 절대 출력하지 않는다.`;

const EDITOR_AUDIT_SENTENCE_RES = [
  /이\s*글은\s*.+에\s*답하려고\s*썼/,
  /이\s*글은\s*.+에\s*답/,
  /확인된\s*정보만\s*남기/,
  /과장\s*표현은\s*모두\s*덜어/,
  /방문\s*전\s*확인하면/,
  /도움이\s*되는\s*항목부터/,
  /간단히\s*짚어봅니다/,
  /핵심\s*확인\s*항목/,
  /홍보\s*문구\s*금지/,
  /내부\s*검수/,
  /콘텐츠\s*일관성/,
  /검수\s*기준/,
  /목적\s*고정/,
  /톤\s*고정/,
  /\bsave\b/i,
  /\binformative\b/i,
  /\bemotional\b/i,
  /GPT|ChatGPT|AI가\s*쓴/,
  /프롬프트|프롬프트\s*흔적/,
  /엔진\s*규칙|ENGINE\s*RULE/i,
];

const CASUAL_TONE_RE =
  /(ㅋㅋ|ㅎㅎ|ㅎ_ㅎ|대박|미쳤|진짜\s*루|완전\s*추천|꼭\s*가보세요|무조건|최고의\s*선택|찾아보시면\s*어떨까|~+\s*찾)/;

const INDUSTRY_ANCHOR_RES = {
  cafe: /메뉴|브런치|커피|음료|좌석|카페|원두|디저트|테이블|분위기/,
  flower: /꽃|다발|포장|리본|생화|플라워|화환|선물/,
  furniture: /매트리스|프레임|쇼룸|침대|가구|체험|전시/,
  salon: /염색|두피|시술|헤어|컷|펌|손상/,
  hospital: /진료|검사|치료|접수|상담|병원/,
  restaurant: /메뉴|예약|코스|식사|맛|테이블/,
  default: /매장|브랜드|이용|방문|상담/,
};

function sentenceHasAuditLeak(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return true;
  for (const re of EDITOR_AUDIT_SENTENCE_RES) {
    if (re.test(s)) return true;
  }
  return false;
}

export function stripEditorAuditSentences(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  const sentences = out.split(/(?<=[.!?。])\s+|\n+/);
  const kept = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (sentenceHasAuditLeak(trimmed)) continue;
    kept.push(trimmed);
  }

  out = stripMetaLayerTerms(kept.join("\n\n"));
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeEditorLeakPack(pack) {
  if (!pack) return pack;
  let next = sanitizeBlogPackMetaLayer(pack);
  return {
    ...next,
    title: stripEditorAuditSentences(next.title),
    representativeTitle: stripEditorAuditSentences(next.representativeTitle),
    sections: (next.sections || []).map((s) => ({
      ...s,
      heading: stripEditorAuditSentences(s.heading),
      body: stripEditorAuditSentences(s.body),
    })),
    conclusion: stripEditorAuditSentences(next.conclusion),
  };
}

function hasCasualOrFiller(full) {
  if (CASUAL_TONE_RE.test(full)) return true;
  let filler = 0;
  for (const re of FILLER_PADDING_PATTERNS) {
    if (re.test(full)) filler += 1;
  }
  return filler >= 3;
}

/** 기·승·전·결 흐름 휴리스틱 */
export function scoreGiSeungJeonGyeol(pack) {
  const sections = pack?.sections || [];
  if (sections.length < 3) {
    return { ok: false, score: 40, reasons: ["structure_thin"] };
  }

  const full = getBlogFullText(pack);
  const reasons = [];
  let score = 100;

  const gi = /(왜|검색|찾|고민|상황|배경|궁금)/.test(
    String(sections[0]?.body || "").slice(0, 200)
  );
  const seung = /(정보|기능|구성|지역|브랜드|조건|라인업|가격|절차)/.test(full);
  const jeon = /(비교|기준|주의|확인|체크|선택|판단|포인트)/.test(full);
  const gyeol = Boolean(String(pack?.conclusion || "").trim().length >= 24);

  if (!gi) {
    reasons.push("missing_gi");
    score -= 15;
  }
  if (!seung) {
    reasons.push("missing_seung");
    score -= 15;
  }
  if (!jeon) {
    reasons.push("missing_jeon");
    score -= 15;
  }
  if (!gyeol) {
    reasons.push("missing_gyeol");
    score -= 20;
  }

  return { ok: score >= 70, score, reasons, gi, seung, jeon, gyeol };
}

export function scoreProfessionalEditorTone(pack) {
  const full = getBlogFullText(pack);
  const reasons = [];
  let score = 100;

  if (hasCasualOrFiller(full)) {
    reasons.push("casual_or_filler");
    score -= 25;
  }
  if (/^(안녕하세요|여러분)/m.test(full)) {
    reasons.push("blog_opening_cliche");
    score -= 10;
  }
  if ((full.match(/!\s/g) || []).length >= 4) {
    reasons.push("excessive_exclamation");
    score -= 10;
  }

  return { ok: score >= 72, score, reasons };
}

export function applyEditorQualityPack(pack, ctx = {}, input = {}) {
  if (!pack) return pack;
  let next = sanitizeEditorLeakPack(pack);
  next = sanitizeVerbatimTopicInPack(next, input);
  next = applyBrandContentEngine(next, ctx, input);
  next = sanitizeVerbatimTopicInPack(next, input);
  next = sanitizeEditorLeakPack(next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorQualityEngine: true,
    },
  };
}

export function detectEditorQualityIssues(pack, ctx = {}, input = {}) {
  const issues = [];
  const full = getBlogFullText(pack);

  if (hasMetaPhilosophyLeak(full, ctx)) {
    issues.push({ type: "meta_leak" });
  }
  for (const re of EDITOR_AUDIT_SENTENCE_RES) {
    if (re.test(full)) {
      issues.push({ type: "audit_sentence_leak" });
      break;
    }
  }

  const title = pack?.representativeTitle || pack?.title || "";
  if (isMechanicalListingTitle(title, ctx, input)) {
    issues.push({ type: "mechanical_title" });
  }

  const verbatim = detectVerbatimTopicUsage(pack, input);
  if (!verbatim.ok) {
    issues.push({
      type: "verbatim_topic_dump",
      count: verbatim.count,
      maxAllowed: verbatim.maxAllowed,
    });
  }

  const snippetLeak = detectSearchSnippetLeak(pack, input);
  if (!snippetLeak.ok) {
    issues.push({
      type: "search_snippet_leak",
      count: snippetLeak.count,
      hits: snippetLeak.hits?.slice(0, 3),
    });
  }

  const gi = scoreGiSeungJeonGyeol(pack);
  if (!gi.ok) {
    issues.push({ type: "structure_flow", reasons: gi.reasons });
  }

  const tone = scoreProfessionalEditorTone(pack);
  if (!tone.ok) {
    issues.push({ type: "editor_tone", reasons: tone.reasons });
  }

  const intro = detectForbiddenIntro(
    String(pack?.sections?.[0]?.body || "").slice(0, 400)
  );
  if (!intro.ok) {
    issues.push({ type: "forbidden_intro_v95", hits: intro.hits });
  }

  const v95 = scoreEditorV95(pack, ctx, input);
  if (!v95.editorPass) {
    issues.push({
      type: "editor_v95",
      score: v95.score,
      issues: (v95.issues || []).slice(0, 4),
    });
  }

  const dupCheck = detectDuplicateKillerIssues(full);
  if (!dupCheck.ok) {
    issues.push({
      type: "duplicate_content",
      hits: (dupCheck.issues || []).slice(0, 4),
    });
  }

  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || ctx.topic || "").trim();
  if (brand && !full.includes(brand)) issues.push({ type: "missing_brand" });
  if (region && !full.includes(region)) issues.push({ type: "missing_region" });
  if (topic && topic.length >= 2 && !full.includes(topic.split(/\s+/)[0])) {
    issues.push({ type: "missing_topic" });
  }

  return { ok: issues.length === 0, issues, gi, tone };
}

/** 기·승·전·결·결말 보강 — salvage·display 직전 */
export function ensureEditorDeliveryStructure(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const p = deriveTopicWritingContext(input);
  const facet = topicWritingFacet(input) || p.topicFacet || "매장 안내";
  let next = { ...pack };
  const conc = String(next.conclusion || "").trim();
  if (
    !shouldSkipMissionCatalogConclusion(next, input) &&
    conc.replace(/\s/g, "").length < 24
  ) {
    const injected = buildMissionConclusionLine(p, input, facet, next);
    if (injected) next.conclusion = injected;
  }

  const sections = [...next.sections];
  const gi = sections[0];
  if (gi) {
    const opener = String(gi.body || "").slice(0, 240);
    if (!/(왜|검색|찾|고민|상황|배경|궁금)/.test(opener)) {
      const lead = buildHumanStoryProblemOpeningLead(input);
      if (lead && !String(gi.body || "").includes(lead.slice(0, 14))) {
        sections[0] = { ...gi, body: `${lead}\n\n${gi.body}`.trim() };
      }
    }
  }

  const full = getBlogFullText({ ...next, sections });
  if (!/(비교|기준|주의|확인|체크|선택|판단|포인트)/.test(full)) {
    const idx = Math.min(2, sections.length - 1);
    const line = `${p.brand} ${facet}를 볼 때 가격·구성·예약 방법을 나눠 비교하는 편이 좋습니다.`;
    sections[idx] = {
      ...sections[idx],
      body: `${sections[idx].body}\n\n${line}`.trim(),
    };
  }

  return { ...next, sections };
}

function paragraphKey(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 56);
}

export function pruneDuplicateParagraphsGlobally(pack) {
  const seenKeys = new Set();
  const seenNorms = [];
  const sections = (pack.sections || []).map((sec) => {
    const kept = [];
    for (const para of String(sec.body || "").split(/\n\n+/)) {
      const t = para.trim();
      if (t.replace(/\s/g, "").length < 12) continue;
      const key = paragraphKey(t);
      if (seenKeys.has(key)) continue;
      let dup = false;
      for (const prev of seenNorms) {
        if (wordOverlapRatio(prev, t) >= 0.72) {
          dup = true;
          break;
        }
      }
      if (dup) continue;
      seenKeys.add(key);
      seenNorms.push(t);
      kept.push(t);
    }
    return { ...sec, body: kept.join("\n\n").trim() };
  });
  return { ...pack, sections: sections.filter((s) => s.body.replace(/\s/g, "").length >= 20) };
}

function planGapExperienceLine(slot, p, input) {
  const subject = topicRaw(input) || p.topicFacet || topicWritingFacet(input) || "안내";
  const id = String(slot?.id || "").replace(/_x\d+$/i, "");
  const bySlot = {
    menu: `${p.regionBit}${p.brand}에서 ${subject} 메뉴 구성을 직접 비교해 봤어요.`,
    space: `${p.regionBit}${p.brand} 좌석·분위기를 체류 시간까지 염두에 두고 봤어요.`,
    price: `가격대별 옵션을 메모해 두고 집에서 다시 비교했어요.`,
    product: `${p.regionBit}${p.brand} 진열대에서 ${subject} 구성을 하나씩 확인했어요.`,
    visit: `${p.regionBit}방문 전 주차·영업 시간을 확인하고 갔어요.`,
    delivery: `당일 픽업·배송 시간대를 따로 안내받고 메모했어요.`,
    pack: `포장·리본 샘플을 같이 보며 톤을 맞췄어요.`,
  };
  return (
    bySlot[id] ||
    `${p.regionBit}${p.brand} ${subject} — ${slot.infoUnit || slot.label} 쪽을 현장에서 직접 짚어 봤어요.`
  );
}

export function weaveSectionPlanGaps(pack, input = {}) {
  const plan = buildSectionPlan({}, input);
  const coverage = scoreSectionPlanCoverage(plan, pack, "blog");
  if (coverage.ok || !coverage.missing?.length) return pack;

  const p = deriveTopicWritingContext(input);
  let sections = [...(pack.sections || [])];
  const missing = coverage.missing.slice(0, Math.min(4, sections.length));

  for (let i = 0; i < missing.length; i += 1) {
    const slot = missing[i];
    const line = planGapExperienceLine(slot, p, input);
    const idx = i % sections.length;
    const sec = sections[idx];
    const body = String(sec.body || "").trim();
    if (body.includes(line.slice(0, 14))) continue;
    if (slot.keywords.some((k) => body.includes(k))) continue;
    sections[idx] = {
      ...sec,
      body: body ? `${body}\n\n${line}`.trim() : line,
    };
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      sectionPlanWoven: true,
      sectionPlanCoverage: scoreSectionPlanCoverage(plan, { ...pack, sections }, "blog"),
    },
  };
}

export function ensureTierMinConclusion(pack, input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  if (chars >= tier.min) return pack;
  if (shouldSkipMissionCatalogConclusion(pack, input)) return pack;
  const p = deriveTopicWritingContext(input);
  const facet = topicWritingFacet(input) || p.topicFacet || "매장 안내";
  let conclusion = String(pack.conclusion || "").trim();
  const tail = buildMissionConclusionLine(p, input, facet, pack);
  if (!tail) return pack;
  if (!conclusion || conclusion.replace(/\s/g, "").length < 28) {
    conclusion = tail;
  } else if (countBlogBodyCharsWithSpaces({ ...pack, conclusion: `${conclusion}\n\n${tail}` }) <= tier.max) {
    conclusion = `${conclusion}\n\n${tail}`.trim();
  }
  return { ...pack, conclusion };
}

function stripOffTopicSentencesFromText(text, input = {}) {
  const parts = String(text || "").split(/(?<=[.!?。])\s+|\n+/);
  const kept = [];
  for (const sentence of parts) {
    const s = sentence.trim();
    if (!s || s.replace(/\s/g, "").length < 8) continue;
    if (shouldStripDeliverySentence(s, input)) continue;
    if (CASUAL_TONE_RE.test(s)) continue;
    const cross = detectIndustryContamination(s, input);
    if (!cross.ok) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function paragraphAnchoredToBrief(para, input = {}, sectionIdx = 0) {
  const p = deriveTopicWritingContext(input);
  const brand = String(p.brand || input.brandName || "").trim();
  const region = String(p.region || input.region || "").trim();
  const topic = topicRaw(input) || p.topicFacet || "";
  const blob = String(para || "");
  if (sectionIdx === 0 && /(?:왜|찾|고민|막히|솔직|검색|헷갈)/.test(blob.slice(0, 140))) {
    return true;
  }
  if (brand.length >= 2 && blob.includes(brand)) return true;
  if (region.length >= 2 && blob.includes(region)) return true;
  if (topic.length >= 2) {
    const stem = topic.replace(/\s+/g, "").slice(0, Math.min(8, topic.length));
    if (stem.length >= 2 && blob.replace(/\s/g, "").includes(stem)) return true;
  }
  const { key } = getIndustryFlavorForInput(input);
  const anchorRe = INDUSTRY_ANCHOR_RES[key] || INDUSTRY_ANCHOR_RES.default;
  return anchorRe.test(blob);
}

function stripUnanchoredParagraphsFromPack(pack, input = {}) {
  const sections = (pack.sections || []).map((sec, i) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept = paras.filter((para) => {
      if (paragraphAnchoredToBrief(para, input, i)) return true;
      if (shouldStripDeliverySentence(para, input)) return false;
      const cross = detectIndustryContamination(para, input);
      if (!cross.ok) return false;
      return true;
    });
    if (!kept.length && paras.length) kept.push(paras[0]);
    return { ...sec, body: kept.join("\n\n").trim() };
  });
  return {
    ...pack,
    sections: sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 20),
  };
}

function unwrapLengthNormalize(result, fallback) {
  if (result?.pack?.sections?.length) return result.pack;
  if (result?.sections?.length) return result;
  return fallback;
}

function scrubVerbatimUntilOk(pack, input = {}) {
  let next = sanitizeVerbatimTopicInPack(pack, input, "blog", { force: true });
  for (let round = 0; round < 6; round += 1) {
    if (detectVerbatimTopicUsage(next, input).ok) break;
    next = ensureVerbatimTopicCompliance(next, input, "blog");
    next = sanitizeVerbatimTopicInPack(next, input, "blog", { force: true });
  }
  return next;
}

/**
 * human 등급 송출 마감 — 중복·주제 dominance·verbatim·정보 밀도·editor v95
 */
export function applyHumanGradeFinishingPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const forceFull = ctx.forceFull === true || ctx.humanLikeRequired === true;
  const contract = assessHumanColumnContract(pack, input);
  const useGpt55LightOnly =
    shouldUseGpt55LightDelivery(pack, input) &&
    !forceFull &&
    contract.ok &&
    contract.humanVoiceMet;

  if (useGpt55LightOnly) {
    let next = applyGpt55PrePublishChecks(pack, input);
    next = applyGpt55VoiceFinalPass(next, input, { force: true });
    next = stripGlobalExactDuplicateSentences(next);
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        humanGradeFinishingPass: true,
        gpt55Light: true,
      },
    };
  }
  const mergedCtx = { ...ctx, input };
  let next = pack;
  for (let round = 0; round < 2; round += 1) {
    next = applyProfessionalEditorDeliveryPass(next, mergedCtx, input);
    next = collapseMechanicalHookFlood(next, input);
    const full = getBlogFullText(next);
    const dup = detectDuplicateKillerIssues(full, {
      sameInfoMax: 2,
      similarityPercent: 72,
    });
    const info = scoreInformationYield(full, mergedCtx, "blog");
    const verbatim = detectVerbatimTopicUsage(next, input);
    if (dup.ok && info.ok && verbatim.ok) break;
  }
  next = applyEditorV95Pass(next, mergedCtx, input);
  next = polishEditorV95Delivery(next, mergedCtx, input);
  next = applyNarrativeArcShape(next, input, { force: true });
  next = applyHumanVoiceDeliveryPass(next, input, { force: true });
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(next);
  const rescuePack = Boolean(
    pack._meta?.missionProseFallback ||
      pack._meta?.deliveryRescue ||
      pack._meta?.draftFallback
  );
  if (chars > tier.max) {
    next = smartCompressBlogPack(next, tier.max, mergedCtx, input);
  } else if (chars < tier.min && rescuePack) {
    next = deepenMissionProseToMin(next, tier.min, input);
  } else if (chars < tier.min) {
    next = ensureMissionProseTierLength(next, { input });
    if (countBlogBodyCharsWithSpaces(next) < tier.min) {
      next = unwrapLengthNormalize(
        normalizeBlogLengthAndStructure(next, mergedCtx, input),
        next
      );
    }
  }
  next = stripGlobalExactDuplicateSentences(next);
  next = ensureMinBlogSections(next, mergedCtx, input, 4);
  next = scrubVerbatimUntilOk(next, input);
  const entityViolations = detectBrandRegionEditorViolations(getBlogFullText(next), input);
  if (!entityViolations.ok) {
    next = applyHumanEditorGuardPass(next, mergedCtx, input);
  }
  for (let ed = 0; ed < 3; ed += 1) {
    next = polishEditorV95Delivery(next, mergedCtx, input);
    if (assertEditorV95ForOutput(next, mergedCtx, input).ok) break;
    next = applyEditorV95Pass(next, mergedCtx, input);
    next = scrubVerbatimUntilOk(next, input);
  }
  next = applyNarrativeArcShape(next, input, { force: true });
  next = applyHumanVoiceDeliveryPass(next, input, { force: true });
  if (countBlogBodyCharsWithSpaces(next) > tier.max) {
    next = smartCompressBlogPack(next, tier.max, mergedCtx, input);
    next = ensureMinBlogSections(next, mergedCtx, input, 4);
  }
  next = scrubVerbatimUntilOk(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanGradeFinishingPass: true,
      editorInfoYield: scoreInformationYield(getBlogFullText(next), mergedCtx, "blog").score,
    },
  };
}

/**
 * 전문 에디터 송출 패스 — 업종 오염·검색 스니펫·주제 단절·AI 잡담 제거
 */
export function applyProfessionalEditorDeliveryPass(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  let next = pruneDuplicateParagraphsGlobally(pack);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = scrubVerbatimUntilOk(next, input);
  next = weaveTopicDominanceIntoPack(next, { ...ctx, input });
  next = weaveSectionPlanGaps(next, input);
  next = stripIndustryContaminationFromPack(next, input);
  next = stripSearchSnippetLeakFromPack(next, input);
  next = sanitizeEditorLeakPack(next);
  next = {
    ...next,
    sections: (next.sections || []).map((sec) => ({
      ...sec,
      heading: stripOffTopicSentencesFromText(sec.heading, input),
      body: stripOffTopicSentencesFromText(sec.body, input),
    })),
    conclusion: next.conclusion
      ? stripOffTopicSentencesFromText(next.conclusion, input)
      : next.conclusion,
  };
  next = stripUnanchoredParagraphsFromPack(next, input);
  next = applyEditorQualityPack(next, ctx, input);
  next = applyDuplicateKiller(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = applyHumanEditorGuardPass(next, ctx, input);
  next = scrubVerbatimUntilOk(next, input);
  next = weaveTopicDominanceIntoPack(next, { ...ctx, input });
  next = applyDuplicateKiller(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = ensureTierMinConclusion(next, input);

  const yieldScore = scoreInformationYield(getBlogFullText(next), { input }, "blog");

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      professionalEditorDeliveryPass: true,
      editorInfoYield: yieldScore.score,
      editorInfoYieldOk: yieldScore.ok,
    },
  };
}
