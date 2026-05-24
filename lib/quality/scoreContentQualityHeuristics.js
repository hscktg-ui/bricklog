/**
 * 휴리스틱 기반 콘텐츠 품질 검수 (LLM 보조 전·오프라인)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { evaluateWritingConstitution } from "@/lib/constitution/writingConstitution";
import { scoreSearchIntent } from "@/lib/quality/v4ContentAudit";
import { CORE_AI_CLICHES } from "@/lib/quality/coreQualityEngine";

function countClicheOccurrences(text) {
  let n = 0;
  for (const p of CORE_AI_CLICHES) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}
import { countBrandMentions } from "@/lib/constitution/writingConstitution";
import {
  CQREVIEW_WEIGHTS,
  CQREVIEW_THRESHOLD,
} from "@/lib/quality/contentQualityReviewConstants";

const AD_MARKERS = [/지금 바로/, /놓치지 마/, /최고의/, /업계 1위/, /무조건/];
const EXAGGERATION = [/100%/, /완벽/, /최고의/, /업계 최고/, /감동을 선사/];

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function avgParagraphLen(text) {
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim().length > 8);
  if (!paras.length) return 0;
  return paras.reduce((s, p) => s + p.length, 0) / paras.length;
}

function avgSentenceLen(text) {
  const sents = text.split(/[.!?…]\s+/).filter((s) => s.trim().length > 4);
  if (!sents.length) return text.length;
  return sents.reduce((a, s) => a + s.length, 0) / sents.length;
}

function scoreReadability(text) {
  const sent = avgSentenceLen(text);
  const para = avgParagraphLen(text);
  let s = 88;
  if (sent > 120) s -= 18;
  else if (sent > 90) s -= 10;
  if (para > 520) s -= 12;
  else if (para > 380) s -= 6;
  if (sent < 25) s -= 8;
  return clamp(s);
}

function scoreBrandConsistency(pack, ctx, constitution) {
  let s = 82;
  if (constitution.checks?.brand) s += 8;
  if (constitution.checks?.noRepeat) s += 4;
  if (ctx.brandName) {
    const n = countBrandMentions(getBlogFullText(pack), ctx.brandName);
    if (n >= 3) s += 8;
    else if (n >= 1) s += 2;
    else s -= 15;
  }
  return clamp(s);
}

function scoreReaderPerspective(text, constitution) {
  let s = 80;
  if (constitution.checks?.why) s += 8;
  if (constitution.checks?.human) s += 6;
  if (constitution.checks?.sceneMoments) s += 6;
  const adHits = AD_MARKERS.filter((re) => re.test(text)).length;
  s -= adHits * 12;
  if (text.length > 400) s += 4;
  return clamp(s);
}

function scoreInformationValue(text, ctx, searchIntent) {
  let s = searchIntent?.score ?? 75;
  if (ctx.mainKeyword && text.includes(ctx.mainKeyword)) s += 5;
  if (ctx.region && text.includes(ctx.region)) s += 4;
  if (/\d+원|\d+시|영업|주소|예약|방문/.test(text)) s += 3;
  return clamp(s);
}

function scoreReliability(text) {
  let s = 90;
  const ex = EXAGGERATION.filter((re) => re.test(text)).length;
  s -= ex * 14;
  const cliche = countClicheOccurrences(text);
  s -= Math.min(25, cliche * 5);
  return clamp(s);
}

function scoreSeoFit(pack, ctx) {
  const text = getBlogFullText(pack);
  let s = 78;
  const titles = pack.titles?.length || (pack.title ? 1 : 0);
  if (titles >= 3) s += 6;
  const sections = pack.sections?.length || 0;
  if (sections >= 3) s += 8;
  if (ctx.mainKeyword) {
    const kw = ctx.mainKeyword.trim();
    const count = (text.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
    const len = Math.max(text.length / 100, 1);
    const density = count / len;
    if (density >= 0.15 && density <= 1.2) s += 8;
    else if (density > 2.5) s -= 15;
    else if (count >= 1) s += 4;
  }
  return clamp(s);
}

function scoreNaverBlogFit(text, constitution) {
  let s = 80;
  if (/다녀왔|느꼈|직접|체험|방문/.test(text)) s += 8;
  if (constitution.checks?.sceneMoments) s += 6;
  if (constitution.checks?.noForbiddenOpen) s += 6;
  return clamp(s);
}

function scoreInstagramFit(insta) {
  if (!insta) return 72;
  const body = insta.lineBreakBody || insta.body || "";
  let s = 75;
  if (body.length >= 40 && body.length <= 2200) s += 8;
  if (insta.hook || /^.+\n/.test(body)) s += 6;
  if (/#\w+/.test(body) || insta.hashtags?.length) s += 4;
  return clamp(s);
}

function scoreSmartplaceFit(place, ctx) {
  if (!place) return ctx.region ? 70 : 65;
  let s = 78;
  if (place.title) s += 5;
  if (place.shortNotice) s += 6;
  if (place.detailBody) s += 6;
  if (ctx.region && [place.title, place.shortNotice, place.detailBody].join(" ").includes(ctx.region)) {
    s += 5;
  }
  return clamp(s);
}

function scoreAiTrace(text) {
  const cliche = countClicheOccurrences(text);
  let s = 92 - cliche * 8;
  const gptMarkers = CORE_AI_CLICHES.filter((p) => text.includes(p)).length;
  s -= gptMarkers * 4;
  return clamp(s);
}

export function computeWeightedFinalScore(scores) {
  const platformFit = clamp(
    (scores.naverBlogFit + scores.instagramFit + scores.smartplaceFit) / 3
  );
  const total =
    scores.brandConsistency * CQREVIEW_WEIGHTS.brandConsistency +
    scores.readerPerspective * CQREVIEW_WEIGHTS.readerPerspective +
    scores.informationValue * CQREVIEW_WEIGHTS.informationValue +
    scores.readability * CQREVIEW_WEIGHTS.readability +
    scores.reliability * CQREVIEW_WEIGHTS.reliability +
    scores.seoFit * CQREVIEW_WEIGHTS.seoFit +
    platformFit * CQREVIEW_WEIGHTS.platformFit;
  return { finalScore: clamp(total), platformFit };
}

export function scoreContentQualityHeuristics(pack, ctx = {}, extras = {}) {
  const text = getBlogFullText(pack);
  const constitution = evaluateWritingConstitution(pack, ctx, "blog");
  const searchIntent = scoreSearchIntent(text, ctx);

  const scores = {
    brandConsistency: scoreBrandConsistency(pack, ctx, constitution),
    readability: scoreReadability(text),
    readerPerspective: scoreReaderPerspective(text, constitution),
    informationValue: scoreInformationValue(text, ctx, searchIntent),
    reliability: scoreReliability(text),
    seoFit: scoreSeoFit(pack, ctx),
    naverBlogFit: scoreNaverBlogFit(text, constitution),
    instagramFit: scoreInstagramFit(extras.instagramContent),
    smartplaceFit: scoreSmartplaceFit(extras.placeContent, ctx),
    aiTrace: scoreAiTrace(text),
  };

  const { finalScore, platformFit } = computeWeightedFinalScore(scores);
  const aiIssues = [];
  if (scores.aiTrace < 85) aiIssues.push("AI 관용·추상 표현이 남아 있습니다.");
  if (countClicheOccurrences(text) > 2) aiIssues.push("반복·상투적 문장을 줄여 주세요.");

  return {
    scores: { ...scores, platformFit },
    finalScore,
    approved: finalScore >= CQREVIEW_THRESHOLD,
    aiIssues,
    improvementSuggestions: buildHeuristicSuggestions(scores, text, ctx),
    source: "heuristic",
    perspectives: null,
  };
}

function buildHeuristicSuggestions(scores, text, ctx) {
  const out = [];
  if (scores.readerPerspective < 88) out.push("첫 문단 후킹을 강화해 끝까지 읽을 이유를 주세요.");
  if (scores.brandConsistency < 90) out.push("브랜드 철학·톤·반복 메시지를 본문에 더 분명히 넣어 주세요.");
  if (scores.reliability < 90) out.push("과장·허위에 가까운 표현을 빼고 경험 근거를 보강하세요.");
  if (scores.seoFit < 85) out.push("소제목과 핵심 키워드를 자연스럽게 정리하세요.");
  if (scores.aiTrace < 88) out.push("중복 표현·GPT 특유 문장을 구체 장면으로 바꾸세요.");
  if (ctx?.region?.trim() && !text.includes(ctx.region.trim())) {
    out.push("지역 키워드를 입력 지역에 맞게 자연스럽게 넣어 주세요.");
  }
  return out.slice(0, 5);
}
