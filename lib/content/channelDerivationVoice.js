/**
 * 블로그 → 플레이스·인스타 파생 시 채널 톤 보정
 * 방문 후기 블로그를 그대로 옮기면 채널에 부자연스러움 → 운영 안내·캡션 톤으로 전환
 */

const VISIT_REVIEW_PERSONAS = new Set(["visit_review"]);
const VISIT_SPEAKERS = new Set(["plain_review", "real_use"]);

const VISITOR_PHRASE_RE =
  /다녀왔|솔직\s*후기|직접\s*가\s*봤|체험해\s*봤|오늘\s*방문|들러\s*봤|다시\s*올\s*것\s*같|개인적으로/g;

export function isVisitReviewBlogSource(input = {}, blogLike = null) {
  const persona =
    blogLike?._meta?.contentPersona ||
    blogLike?._meta?.selectedPersona ||
    input.contentPersona;
  const speaker =
    blogLike?._meta?.v4Speaker ||
    blogLike?._meta?.appliedV4Speaker ||
    input.v4Speaker;
  const purpose = input.purposeType || blogLike?._meta?.purposeType;
  const title = String(blogLike?.title || blogLike?.representativeTitle || "");
  return (
    VISIT_REVIEW_PERSONAS.has(String(persona || "")) ||
    VISIT_SPEAKERS.has(String(speaker || "")) ||
    purpose === "visit" ||
    /후기|방문|다녀|체험/.test(title)
  );
}

/**
 * @param {"place"|"instagram"|"insta"} channel
 */
export function adaptInputForChannelDerivation(input = {}, blogLike = null, channel = "place") {
  if (!blogLike || !isVisitReviewBlogSource(input, blogLike)) {
    return input;
  }

  const ch = channel === "insta" ? "instagram" : channel;

  if (ch === "place") {
    return {
      ...input,
      contentPersona: "info_intro",
      contentPersonaSubtype: input.contentPersonaSubtype || "explain",
      channelDeriveVoice: "smartplace_notice",
      channelDeriveBrief:
        "블로그는 방문 후기 톤이지만 플레이스는 사장님 공지·운영 안내형입니다. '다녀왔어요·솔직 후기·개인적으로' 말투 금지. 영업·예약·위치·혜택·이용 방법 중심.",
      placeTone: "informative",
      placePostType: input.placePostType || "notice",
      sourceBlogVoice: "visit_review",
    };
  }

  if (ch === "instagram") {
    return {
      ...input,
      contentPersona: "brand_story",
      channelDeriveVoice: "instagram_promo",
      channelDeriveBrief:
        "블로그 후기를 인스타 캡션으로 — 방문 후기 나열·'오늘 다녀왔는데' 금지. 한 장면·한 혜택·저장·문의 유도 중심.",
      sourceBlogVoice: "visit_review",
    };
  }

  return input;
}

/** 후기 말투 잔여 문장 제거 (플레이스·인스타 본문) */
export function scrubVisitorReviewPhrases(text = "") {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !VISITOR_PHRASE_RE.test(line))
    .join("\n")
    .trim();
}
