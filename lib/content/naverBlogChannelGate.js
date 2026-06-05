/**
 * NAVER BLOG CHANNEL GATE — 1만 건 학습 프로필 + 엔진 규칙 기반 보정
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  getNaverBlogAvoidPhrases,
  getNaverBlogOpenerSignals,
  loadNaverBlogChannelProfile,
} from "@/lib/channel/naverBlogChannelProfile";
import {
  buildNaverLearnedTitleCandidates,
  getNaverCategoryTargets,
  hasNaverTitleShape,
  NAVER_ENGINE_AVOID,
  polishNaverBlogVoice,
  resolveNaverLearnCategory,
  scoreNaverVoiceDensity,
} from "@/lib/channel/naverBlogEngineRules";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { scoreChecklistVoice, isChecklistInstructionSentence } from "@/lib/product/checklistVoiceEngine";
import { titleIncludesAllEntities } from "@/lib/content/humanTitleEngine";

const CHECKLIST_END_RE = /(?:확인|참고|점검|정리)하세요\.?$|권합니다\.?$|필요합니다\.?$/;

function hasOpenerSignal(text) {
  const head = String(text || "").slice(0, 500);
  const signals = getNaverBlogOpenerSignals();
  return signals.some((s) => head.includes(s)) || scoreNaverVoiceDensity(head) >= 2;
}

function isNaverAvoidSentence(s) {
  const t = String(s || "").trim();
  if (!t) return true;
  const hard = [...getNaverBlogAvoidPhrases(), ...NAVER_ENGINE_AVOID].filter(
    (p) => p && !/미리 정리/.test(p)
  );
  if (!CHECKLIST_END_RE.test(t) && !/체크리스트|알아보시다|검색하시는/.test(t)) {
    return hard.some(
      (p) => /방문·예약 안내|공식·매장|체험 전 알아둘/.test(p) && t.includes(p)
    );
  }
  return hard.some((p) => p && t.includes(p));
}

function reframeForNaverVoice(s, p, industry, usedReframes = null) {
  const t = String(s || "").trim();
  if (!t) return t;
  let out = polishNaverBlogVoice(t);
  const needsReframe =
    CHECKLIST_END_RE.test(out) ||
    isNaverAvoidSentence(out) ||
    isChecklistInstructionSentence(out);
  if (!needsReframe) return out;

  const cat = resolveNaverLearnCategory(industry);
  const topicBit = p.topicFacet || p.topic;
  const candidates = [];
  if (/행사|할인|프로모|전시|오픈/.test(out)) {
    candidates.push(`${p.regionBit || ""}${p.brand}에서 ${topicBit} 조건을 당일 안내로 짚어 봤어요.`);
  }
  if (/설치|배송|예약|방문|주차/.test(out)) {
    candidates.push(`${p.regionBit || ""}방문 전에 전화로 일정·주차를 확인하고 갔어요.`);
  }
  if (/통로|철거|회수|층간|엘리베이터/.test(out)) {
    candidates.push(`${p.regionBit || ""}설치 전 동선·층간 이동 조건을 매장과 맞춰 봤어요.`);
  }
  if (/체압|지지|누워|자세|소음|진동|각도|무중력|제로지/.test(out)) {
    candidates.push(`${p.brand} 매장에서 10분 넘게 누워보니 ${topicBit} 체감이 꽤 달랐어요.`);
  }
  if (/보증|A\/S|교환|반품|증정|할인|행사|프로모/.test(out)) {
    candidates.push(`${p.regionBit || ""}${p.brand}에서 ${topicBit} 혜택·조건을 매장에서 들었어요.`);
  }
  if (/비교|모델|라인업/.test(out)) {
    candidates.push(`${p.brand} ${topicBit}는 매장에서 직접 비교해 보는 편이 수월했어요.`);
  }
  if (cat === "병원" || cat === "약국") {
    candidates.push(`${p.regionBit || ""}${p.brand} 예약·대기 흐름을 직접 겪어 본 뒤 정리해 봤어요.`);
  }
  if (cat === "법률" || cat === "세무" || cat === "노무") {
    candidates.push(`${p.topic} 상담 전에 궁금했던 점을 메모해 두고 문의했어요.`);
  }

  if (usedReframes && candidates.length) {
    const fresh = candidates.find((c) => !usedReframes.has(c.replace(/\s/g, "").slice(0, 40)));
    if (fresh) {
      usedReframes.add(fresh.replace(/\s/g, "").slice(0, 40));
      return fresh;
    }
  } else if (candidates[0]) {
    return candidates[0];
  }

  return out
    .replace(/확인하세요\.?$/, "직접 짚어 봤어요.")
    .replace(/정리해\s*두세요\.?$/, "정리해 두었어요.")
    .replace(/알아두(?:세요|면)\.?$/i, "알아두었어요.")
    .replace(/권합니다\.?$/, "추천드려요.")
    .replace(/필요합니다\.?$/, "필요했어요.");
}

function buildNaverOpener(p, industry) {
  const regionBit = p.region ? `${p.region} ` : "";
  const cat = resolveNaverLearnCategory(industry);
  const topicObj = p.topicObj || koreanObjectParticle(p.topic || "이용");
  const exhibition = /전시|오픈|소식|런칭/i.test(`${p.topicRaw || ""} ${p.topic || ""}`);

  if (exhibition || cat === "가구점") {
    return `${regionBit}${p.brand} 쇼룸에 다녀와 ${p.topic} 구성을 직접 확인해 봤어요.`;
  }
  if (cat === "카페" || cat === "음식점") {
    return `${regionBit}${p.brand}에 직접 가서 ${topicObj} 먼저 맛·분위기부터 확인해 봤어요.`;
  }
  if (cat === "병원" || cat === "약국") {
    return `${regionBit}${p.brand} 예약하고 방문해 본 뒤, ${p.topic} 흐름을 솔직히 정리해 봤어요.`;
  }
  if (cat === "미용실" || cat === "헬스장") {
    return `${regionBit}${p.brand}에 다녀와 ${p.topic} 체험해 본 솔직한 후기예요.`;
  }
  return `${regionBit}${p.brand}에 처음 가봤을 때 ${topicObj} 어디서부터 볼지부터 정리해 봤어요.`;
}

function polishSectionBody(body, p, industry, usedReframes = null) {
  const seen = new Set();
  const kept = [];
  for (const raw of splitKoreanSentences(body)) {
    let s = polishNaverBlogVoice(raw.trim());
    if (!s || s.replace(/\s/g, "").length < 10) continue;
    if (
      isNaverAvoidSentence(s) ||
      CHECKLIST_END_RE.test(s) ||
      isChecklistInstructionSentence(s)
    ) {
      s = reframeForNaverVoice(s, p, industry, usedReframes);
    }
    const key = s.replace(/\s/g, "").slice(0, 44);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function applyNaverTitleGate(pack, ctx, input) {
  if (pack._meta?.missionProseFallback) return pack;
  const title = String(pack.representativeTitle || pack.title || "").trim();
  if (hasNaverTitleShape(title) && titleIncludesAllEntities(title, ctx, input)) {
    return pack;
  }
  const candidates = buildNaverLearnedTitleCandidates(ctx, input).filter((t) =>
    titleIncludesAllEntities(t, ctx, input)
  );
  if (!candidates.length) return pack;
  const nextTitle = candidates[0];
  return { ...pack, title: nextTitle, representativeTitle: nextTitle };
}

function weaveVoiceIfThin(body, p, industry) {
  const density = scoreNaverVoiceDensity(body);
  const targets = getNaverCategoryTargets(industry);
  const minVoice = Math.max(1, Math.round(targets.voiceRate / 35));
  if (density >= minVoice) return body;

  const regionBit = p.region ? `${p.region} ` : "";
  const subject = p.topicFacet || p.topicRaw || p.topic;
  const bridges = [
    `${regionBit}솔직히 ${p.brand} ${subject} 보러 직접 다녀왔어요.`,
    `그래서 쇼룸에서 느낀 점부터 적어 봤어요.`,
  ];
  const bridge = bridges.find((b) => !body.includes(b.slice(0, 12)));
  return bridge ? `${bridge}\n\n${body}`.trim() : body;
}

export function scoreNaverBlogChannelFit(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const input = ctx.input || ctx;
  const industry = input.industry || input.industryLabel || "";
  const targets = getNaverCategoryTargets(industry);
  let score = 70;
  const issues = [];

  if (hasOpenerSignal(full)) score += 8;
  else issues.push("weak_opener");

  const voiceHits = scoreNaverVoiceDensity(full);
  const voiceOk = voiceHits >= Math.max(1, Math.round(targets.voiceRate / 40));
  if (voiceOk) score += 10;
  else issues.push("low_naver_voice");

  const checklist = scoreChecklistVoice(full, pack);
  if (checklist.ok) score += 10;
  else {
    score -= Math.min(
      22,
      checklist.templateHits * 3 + Math.round(checklist.confirmRatio * 20)
    );
    issues.push("checklist_voice");
  }

  const avoidHits = [...getNaverBlogAvoidPhrases(), ...NAVER_ENGINE_AVOID].filter(
    (p) => p && full.includes(p)
  ).length;
  score -= Math.min(20, avoidHits * 4);
  if (avoidHits >= 2) issues.push("naver_avoid_phrase");

  const title = pack.representativeTitle || pack.title || "";
  if (hasNaverTitleShape(title)) score += 6;
  else issues.push("weak_title");

  if ((pack.sections || []).length >= 4 && (pack.sections || []).length <= 6) {
    score += 6;
  }

  score = Math.max(0, Math.min(100, score));
  return {
    ok:
      score >= 76 &&
      !issues.includes("naver_avoid_phrase") &&
      !issues.includes("checklist_voice"),
    score,
    issues,
    voiceHits,
    targets,
    profileAge: loadNaverBlogChannelProfile().learnedAt || null,
  };
}

export function applyNaverBlogChannelGate(pack, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;

  const input = ctx.input || ctx;
  const industry = input.industry || input.industryLabel || "";
  const p = deriveTopicWritingContext(input);

  let next = applyNaverTitleGate(pack, ctx, input);

  const usedReframes = new Set();

  let sections = (next.sections || []).map((sec) => ({
    ...sec,
    heading: polishNaverBlogVoice(sec?.heading || ""),
    body: polishSectionBody(sec?.body || "", p, industry, usedReframes),
  }));

  if (pack._meta?.missionProseFallback) {
    return { ...next, sections };
  }

  const fullBefore = getBlogFullText({ ...next, sections });
  if (!hasOpenerSignal(fullBefore) && sections[0]?.body) {
    sections = sections.map((sec, i) =>
      i === 0
        ? {
            ...sec,
            body: `${buildNaverOpener(p, industry)}\n\n${sec.body}`.trim(),
          }
        : sec
    );
  }

  if (sections[0]?.body) {
    sections[0] = {
      ...sections[0],
      body: weaveVoiceIfThin(sections[0].body, p, industry),
    };
  }

  if (next.conclusion) {
    next = {
      ...next,
      conclusion: polishNaverBlogVoice(
        reframeForNaverVoice(next.conclusion, p, industry)
      ),
    };
  }

  sections = sections.filter((s) => s.body?.replace(/\s/g, "").length >= 30);
  if (sections.length < 3) {
    const original = next.sections || [];
    sections = original.map((sec, idx) => {
      const prior = sections[idx] || sections.find((s) => s.heading === sec.heading);
      let body =
        prior?.body ||
        polishSectionBody(sec?.body || "", p, industry) ||
        reframeForNaverVoice(sec?.body || "", p, industry);
      if (body.replace(/\s/g, "").length < 30) {
        body = `${buildNaverOpener(p, industry)}\n\n${body}`.trim();
      }
      return {
        ...sec,
        heading: polishNaverBlogVoice(prior?.heading || sec?.heading || ""),
        body,
      };
    }).filter((s) => s.body?.replace(/\s/g, "").length >= 30);
  }
  if (!sections.length) return pack;

  return {
    ...next,
    sections,
    _meta: {
      ...next._meta,
      naverBlogChannelGate: scoreNaverBlogChannelFit({ ...next, sections }, ctx),
    },
  };
}
