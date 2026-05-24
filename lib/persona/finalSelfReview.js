/**
 * Final Self Review — 생성 후 자동 질문·재작성 트리거
 */
import { detectBlogSanitizeIssues } from "@/lib/integrity/blogSanitizer";
import { evaluateContentQualityRoot } from "@/lib/quality/contentQualityRoot";

const REVIEW_LABELS = {
  intent: "핵심 주제가 한 문장으로 정의됐는가?",
  title_body: "제목과 본문이 연결되는가?",
  persona_voice: "화자가 글 전체에서 유지되는가?",
  industry_general: "업종 일반론·키워드 문장이 없는가?",
  repeat: "같은 말이 반복되지 않았는가?",
  scenes: "장면이 3개 이상 있는가?",
  emotion: "감정이 있는가?",
  brand: "브랜드가 보이는가?",
  why: "방문·선택 이유가 있는가?",
  human: "광고처럼 보이지 않는가?",
  banned_heading: "소제목 나열이 없는가?",
  visible_keyword: "검색어가 드러나지 않는가?",
  bad_opener: "정보·키워드로 시작하지 않았는가?",
  repeat_meaning: "같은 말이 반복되지 않았는가?",
  sanitize: "기계 문장·지역 오류가 없는가?",
};

export function runFinalSelfReview(pack, ctx = {}, channel = "blog") {
  const root =
    channel === "blog"
      ? evaluateContentQualityRoot(pack, { ...ctx, contentIntent: ctx.contentIntent }, channel)
      : { ok: true, failures: [] };

  const issues = root.failures.map((id) => ({
    id,
    question: REVIEW_LABELS[id] || id,
    pass: false,
  }));

  if (channel === "blog") {
    const sanitize = detectBlogSanitizeIssues(pack, ctx);
    if (!sanitize.ok) {
      issues.push({
        id: "sanitize",
        question: REVIEW_LABELS.sanitize,
        pass: false,
        detail: sanitize.issues,
      });
    }
  }

  const allIds = [...new Set([...root.failures, "sanitize"])];
  const questions = allIds
    .filter((id) => REVIEW_LABELS[id])
    .map((id) => ({
      id,
      question: REVIEW_LABELS[id],
      pass: !issues.some((i) => i.id === id),
    }));

  const ok = root.ok && !issues.some((i) => !i.pass);

  return {
    ok,
    regen: !ok,
    reason: root.failures[0] || issues[0]?.id || null,
    qualityRoot: root,
    issues,
    questions,
  };
}
