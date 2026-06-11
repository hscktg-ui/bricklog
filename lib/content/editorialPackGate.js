/**
 * EDITORIAL PACK GATE — Coverage 슬롯 덤프 → 칼럼형 5~6섹션 (Mission)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  buildNaturalConcernHeading,
  buildSignatureWhyHeading,
  isSignatureForbiddenHeading,
  rewriteSignatureHeading,
  SIGNATURE_WRITING_FLOW,
} from "@/lib/product/signatureWritingEngine";
import {
  CHECKLIST_TEMPLATE_RES,
  scoreChecklistVoice,
} from "@/lib/product/checklistVoiceEngine";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import { applySignatureWritingGate } from "@/lib/content/signatureWritingGate";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { applyMissionProseGate } from "@/lib/content/missionProseGate";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import {
  isFurnitureExhibitionContext,
  isOpimoTopic,
} from "@/lib/product/furnitureExhibitionEngine";
import { isExhibitionTopic } from "@/lib/product/industryContextEngine";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";

const MISSION_MAX_SECTIONS = 6;

const FLOW_HEADINGS = {
  문제: (input) => buildSignatureWhyHeading(input),
  이유: (input) => buildNaturalConcernHeading(input),
  "비교 기준": () => "비교할 때 막히는 지점",
  브랜드: (input) => {
    const brand = String(input.brandName || "브랜드").trim();
    const region = String(input.region || "").trim();
    return region ? `${region} ${brand}, 선택지로 볼 때` : `${brand}, 선택지로 볼 때`;
  },
  정리: (input) => {
    const region = String(input.region || "").trim();
    return region ? `${region}에서 방문·결정 전에` : "방문·결정 전에";
  },
};

function buildExhibitionFlowHeadings(input = {}) {
  const p = deriveTopicWritingContext(input);
  const topicBit = isOpimoTopic(input) ? "오피모 전시" : p.topicFacet || "전시";
  return {
    문제: () => `${p.regionBit}${p.brand} ${topicBit}, 쇼룸에서 직접 본 점`,
    이유: () => "전시 연출·동선을 본 순서",
    "비교 기준": () => "사진과 달랐던 체감 포인트",
    브랜드: () => `${p.brand} 쇼룸, 상담 때 확인한 것`,
    정리: () => "방문 후 본인 기준으로",
  };
}

function resolveFlowHeadings(input = {}) {
  if (isFurnitureExhibitionContext(input) && isExhibitionTopic(input)) {
    return buildExhibitionFlowHeadings(input);
  }
  return FLOW_HEADINGS;
}

const META_SENTENCE_RES = [
  /지역명은\s*자연스럽게/,
  /고유\s*입력\s*기반/,
  /동네\s*방문\s*맥락/,
  /^입력된\s*범위\s*안에서/,
  /방문·체험·비교를\s*전제로/,
  /글을\s*읽는\s*경우/,
  /공식·매장\s*안내\s*기준/,
  /안내\s*기준으로\s*확인/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해/,
  /사전\s*확인이\s*필요/,
];

function isMetaInstructionSentence(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return true;
  return META_SENTENCE_RES.some((re) => re.test(s));
}

function isTemplateSentence(sentence) {
  const s = String(sentence || "").trim();
  if (!s) return true;
  if (isMetaInstructionSentence(s)) return true;
  return CHECKLIST_TEMPLATE_RES.some((re) => re.test(s));
}

function dedupeTemplateSentences(text) {
  const seen = new Set();
  const kept = [];
  for (const raw of splitKoreanSentences(text)) {
    const s = raw.trim();
    if (!s || s.replace(/\s/g, "").length < 12) continue;
    const key = s.replace(/\s/g, "").slice(0, 48);
    if (isTemplateSentence(s) && seen.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function collectNarrativeSentences(pack) {
  const chunks = [];
  for (const sec of pack?.sections || []) {
    const body = dedupeTemplateSentences(sec?.body || "");
    for (const s of splitKoreanSentences(body)) {
      const t = s.trim();
      if (t && !isTemplateSentence(t)) chunks.push(t);
    }
  }
  return [...new Set(chunks)];
}

function weaveResearchFacts(sentences, input) {
  const facts = (input.researchFacts || [])
    .map((f) => String(f?.fact || f?.text || f || "").trim())
    .filter(Boolean);
  if (!facts.length) return sentences;
  const out = [...sentences];
  for (const fact of facts.slice(0, 4)) {
    if (!out.some((s) => s.includes(fact.slice(0, 8)))) {
      out.splice(Math.min(2, out.length), 0, fact.endsWith(".") ? fact : `${fact}.`);
    }
  }
  return out;
}

function distributeSentences(sentences, flowKeys) {
  const buckets = flowKeys.map(() => []);
  sentences.forEach((s, i) => {
    buckets[i % flowKeys.length].push(s);
  });
  return buckets;
}

function buildFlowSections(pack, input) {
  const flowKeys = SIGNATURE_WRITING_FLOW.slice(0, MISSION_MAX_SECTIONS);
  let sentences = collectNarrativeSentences(pack);
  sentences = weaveResearchFacts(sentences, input);

  if (sentences.length < 6) {
    const region = String(input.region || "").trim();
    const brand = String(input.brandName || "브랜드").trim();
    const topic = String(input.topic || input.mainKeyword || "이용")
      .split(/[,，]/)[0]
      ?.trim();
    const exhibition = /전시|오픈|소식|런칭|쇼케이스/i.test(topic);
    const opimoExhibit = isFurnitureExhibitionContext(input) && isOpimoTopic(input);
    const seed = opimoExhibit
      ? [
          `${region ? `${region} ` : ""}${brand} 쇼룸에서 ${topic} 전시 구성을 직접 확인했어요.`,
          `조명 아래 연출 톤과 전시대 동선을 하나씩 비교해 봤어요.`,
          `전시 기간·체험 가능 모델은 당일 매장 안내를 기준으로 메모해 두었어요.`,
        ]
      : exhibition
      ? [
          `${region ? `${region}에서 ` : ""}${koreanObjectParticle(topic)} 알아보게 된 계기는 전시 일정·체험 가능 모델·행사 조건을 함께 보게 되는 경우가 많습니다.`,
          `${brand} 쇼룸에서 ${topic} 구성을 직접 확인한 뒤, 프로모션·설치 조건을 같이 보면 결정이 빨라집니다.`,
          `전시 모델마다 체험 포인트·구성 차이가 달라, 메모해 두고 상담할 때 꺼내면 효율적입니다.`,
        ]
      : [
          `${region ? `${region}에서 ` : ""}${koreanObjectParticle(topic)} 알아보게 된 계기는 보통 허리·숙면 불편, 예산, 체험 가능 여부부터 정리하는 경우가 많습니다.`,
          `${brand} 매장에 직접 가서 10분 이상 누워보고 각도·지지감을 비교해 본 뒤, 행사·설치 조건을 같이 보면 결정이 빨라집니다.`,
          `모델마다 리모컨 반응·소음·파트너 전달감이 달라, 메모해 두고 상담할 때 꺼내면 효율적입니다.`,
        ];
    sentences = weaveResearchFacts([...seed, ...sentences], input);
  }

  const buckets = distributeSentences(sentences, flowKeys);
  const headingMap = resolveFlowHeadings(input);
  let built = flowKeys.map((key, idx) => {
    const headingFn = headingMap[key] || (() => key);
    let heading = headingFn(input);
    if (isSignatureForbiddenHeading(heading)) {
      heading = rewriteSignatureHeading(heading, input);
    }
    const body = buckets[idx].join("\n\n").trim();
    return { heading, body: body || buckets.flat().join("\n\n").trim() };
  }).filter((s) => s.body.replace(/\s/g, "").length >= 20);

  if (built.length < 3) {
    const mergedBody =
      built.map((s) => s.body).join("\n\n").trim() || sentences.join("\n\n").trim();
    const padKeys = ["문제", "이유", "정리"];
    built = padKeys.map((key) => {
      const headingFn = headingMap[key] || (() => key);
      let heading = headingFn(input);
      if (isSignatureForbiddenHeading(heading)) {
        heading = rewriteSignatureHeading(heading, input);
      }
      return { heading, body: mergedBody };
    });
  }
  return built.slice(0, MISSION_MAX_SECTIONS);
}

function ensureMinEditorialSections(sections, fallbackSections, min = 3) {
  const kept = [...(sections || [])].filter(
    (s) => String(s.body || "").replace(/\s/g, "").length >= 12
  );
  if (kept.length >= min) return kept.slice(0, MISSION_MAX_SECTIONS);
  for (const sec of fallbackSections || []) {
    if (kept.length >= min) break;
    const body = String(sec.body || "").trim();
    if (body.replace(/\s/g, "").length < 24) continue;
    if (kept.some((k) => k.body === body)) continue;
    kept.push({ ...sec });
  }
  return kept.slice(0, MISSION_MAX_SECTIONS);
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyEditorialPackGate(pack, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  if (shouldPreserveGpt55LlmPackBody(pack, input)) return pack;

  const before = scoreChecklistVoice(getBlogFullText(pack), pack);
  const needsReshape =
    !before.ok ||
    (pack.sections || []).length > MISSION_MAX_SECTIONS ||
    before.templateHits >= 3;

  if (!needsReshape) {
    let next = applyHumanWriterHeadingGate(pack, { input });
    next = applySignatureWritingGate(next, { input });
    next = applyMissionProseGate(next, { input });
    return sanitizeBlogPackMetaLayer(next);
  }

  const sections = buildFlowSections(pack, input);
  let next = {
    ...pack,
    sections: sections.length >= 3 ? sections : pack.sections.slice(0, MISSION_MAX_SECTIONS),
    conclusion: sanitizeConclusion(pack.conclusion, input),
    _meta: {
      ...(pack._meta || {}),
      editorialPackGate: {
        reshaped: true,
        beforeSections: pack.sections?.length,
        afterSections: sections.length,
        checklistBefore: before,
      },
    },
  };

  next = applyHumanWriterHeadingGate(next, { input });
  next = applySignatureWritingGate(next, { input });
  const preMissionSections = next.sections;
  next = applyMissionProseGate(next, { input });
  if ((next.sections || []).length < 3) {
    next = {
      ...next,
      sections: ensureMinEditorialSections(next.sections, preMissionSections, 3),
    };
  }
  next = sanitizeBlogPackMetaLayer(next);
  return next;
}

function sanitizeConclusion(conclusion, input) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const c = String(conclusion || "").trim();
  if (/보시길\s*권/.test(c) || /직접\s*비교/.test(c)) {
    return `${region ? `${region} ` : ""}${brand} 매장에서 체험·행사 조건을 본인 기준에 맞춰 정리해 보시면 됩니다.`;
  }
  return c || `${region ? `${region} ` : ""}${brand} — 방문·체험 일정만 잡아도 비교가 수월합니다.`;
}

export { scoreChecklistVoice };
