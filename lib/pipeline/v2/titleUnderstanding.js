/**
 * STEP 5 — Title Understanding
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { extractTitleAnchors, validateTitleBodyAlignment } from "@/lib/quality/contentQualityRoot";

export function deriveTitleQuestion(title, ctx = {}) {
  const t = String(title || "").trim();
  if (!t) return null;

  const anchors = extractTitleAnchors(t, ctx);
  if (anchors.some((a) => a.type === "brand") && ctx.brandName) {
    return `${ctx.brandName}는 어떤 곳인가?`;
  }
  if (anchors.some((a) => a.type === "region") && ctx.region) {
    return `${ctx.region}에서 무엇을 찾는가?`;
  }
  if (anchors.some((a) => a.type === "season")) {
    return `이 계절, 왜 이 이야기가 필요한가?`;
  }
  if (anchors.some((a) => a.type === "event")) {
    return `이 행사·기념일에 무엇이 달라지는가?`;
  }
  if (ctx.topic) {
    return `‘${ctx.topic}’에 대해 독자가 알고 싶은 것은 무엇인가?`;
  }
  return `이 제목이 말하는 핵심은 무엇인가?`;
}

export function validateTitleAnswersBody(pack, ctx = {}) {
  const title = pack.representativeTitle || pack.title || "";
  const question = deriveTitleQuestion(title, ctx);
  const align = validateTitleBodyAlignment(pack, ctx);
  const full = getBlogFullText(pack);

  const thesis = ctx.contentThesis || ctx.pipeline?.intent?.thesis;
  const thesisHit =
    !thesis || thesis.length < 12 || full.includes(thesis.slice(0, 20));

  return {
    ok: align.ok && thesisHit,
    question,
    align,
    thesisHit,
  };
}

export function injectTitleAnswerHint(pack, ctx) {
  // 고객-facing 본문에 「이 글은 ~에 답하려고」 등 내부 검수 문장을 넣지 않음
  return pack;
}
