/**
 * 콘텐츠 품질 검수 AI 프롬프트 (4관점 평가)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { CQREVIEW_PERSPECTIVES } from "@/lib/quality/contentQualityReviewConstants";

export function buildContentQualityReviewMessages(pack, ctx = {}, heuristicReview = {}) {
  const text = getBlogFullText(pack).slice(0, 12000);
  const h = heuristicReview.scores || {};

  return [
    {
      role: "system",
      content: `You are BRICLOG Content Quality Review Engine.
Evaluate Korean marketing content from these perspectives: ${CQREVIEW_PERSPECTIVES.join(", ")}.
Return ONLY valid JSON:
{
  "scores": {
    "brandConsistency": 0-100,
    "readability": 0-100,
    "readerPerspective": 0-100,
    "informationValue": 0-100,
    "reliability": 0-100,
    "seoFit": 0-100,
    "naverBlogFit": 0-100,
    "instagramFit": 0-100,
    "smartplaceFit": 0-100,
    "aiTrace": 0-100
  },
  "perspectives": [
    { "role": "브랜드 전문가", "note": "한 줄" },
    { "role": "마케팅 실무자", "note": "한 줄" },
    { "role": "블로거", "note": "한 줄" },
    { "role": "일반 독자", "note": "한 줄" }
  ],
  "improvementSuggestions": ["...", "..."],
  "aiIssues": ["발견된 AI 흔적"],
  "summary": "2문장 요약"
}
Be strict but fair. aiTrace: lower if generic AI clichés, abstract praise, filler.`,
    },
    {
      role: "user",
      content: `브랜드: ${ctx.brandName || "—"}
지역: ${ctx.region || "—"}
키워드: ${ctx.mainKeyword || ctx.topic || "—"}
휴리스틱 참고: ${JSON.stringify(h)}

본문:
${text}`,
    },
  ];
}

export function buildContentQualityRevisionMessages(pack, ctx, review) {
  const text = getBlogFullText(pack).slice(0, 10000);
  const suggestions = (review.improvementSuggestions || []).join("\n- ");
  const aiFix = (review.aiIssues || []).join("\n- ");

  return [
    {
      role: "system",
      content: `You are BRICLOG senior editor. Revise the blog JSON to reach quality score 95+.
Keep brand voice, facts, region, keywords. Remove AI clichés and exaggeration.
Return ONLY JSON: { "blog": { "titles":[], "title":"", "representativeTitle":"", "sections":[{"heading":"","body":""}], "ending":"" } }`,
    },
    {
      role: "user",
      content: `개선 요청:
- ${suggestions || "전반 품질 향상"}
${aiFix ? `\nAI 흔적 제거:\n- ${aiFix}` : ""}

현재 점수: ${review.finalScore}
브랜드: ${ctx.brandName || ""} / 지역: ${ctx.region || ""}

원문 JSON 구조 유지하며 수정. 본문 요약:
${text.slice(0, 6000)}`,
    },
  ];
}
