import {
  FEEDBACK_TAGS,
  feedbackTagsForChannel,
} from "@/lib/feedback/constants";

/** 태그 → 문장 다듬기/재생성 힌트 */
const TAG_REWRITE_PHRASES = {
  too_weak: "블로그 본문의 구체 장면·운영 사실을 더 반영해",
  too_bloggy: "블로그 설명문·SEO 말투를 빼고 채널 톤으로",
  emoji_low: "이모지를 Hook·마무리에 2~4개 자연스럽게",
  too_ad: "광고·과장 표현을 줄이고 자연스럽게",
  too_ai: "AI 티가 나지 않게 다듬어",
  gpt_tone: "GPT 말투·뻔한 표현을 줄여",
  repeat: "반복 문장·키워드 반복을 줄여",
  low_emotion: "더 따뜻하고 감성 있게",
  low_info: "구체적인 정보·맥락을 보강해",
  brand_weak: "브랜드 이름·특징이 더 드러나게",
  seo_weak: "메인 키워드를 자연스럽게 녹여",
  title_weak: "제목만 더 매력적으로",
  length_wrong: "본문 길이를 목표 분량에 맞게",
};

const TONE_HINTS = [
  { re: /담백|간결|짧게|짧은/, tone: "informative" },
  { re: /감성|따뜻|부드/, tone: "emotional" },
  { re: /프리미엄|고급/, tone: "premium" },
  { re: /신뢰|전문/, tone: "trust" },
  { re: /생활|일상/, tone: "lifestyle" },
];

/**
 * @param {{ reaction?: string, tags?: string[], memo?: string, blogInput?: object }} payload
 * @returns {{ shouldRewrite: boolean, feedbackText: string, scope: string, inputPatch: object }}
 */
export function buildRewriteFromFeedback({
  reaction = "neutral",
  tags = [],
  memo = "",
  blogInput = {},
  channel = "blog",
} = {}) {
  const parts = [];
  let scope = "all";
  const tagList = feedbackTagsForChannel(channel);

  for (const id of tags) {
    const phrase = TAG_REWRITE_PHRASES[id];
    if (phrase) parts.push(phrase);
    else {
      const label = tagList.find((t) => t.id === id)?.label;
      if (label) parts.push(label);
    }
    if (id === "title_weak") scope = "title";
    if (id === "emoji_low" && (channel === "instagram" || channel === "insta")) {
      scope = "all";
    }
  }

  const memoTrim = String(memo || "").trim();
  if (memoTrim) parts.push(memoTrim);

  const inputPatch = {};
  const combined = [memoTrim, ...parts].join(" ");

  if (/주제|토픽|키워드.*틀|주제.*다시|다른\s*주제/i.test(combined)) {
    const topicMatch = memoTrim.match(
      /(?:주제|토픽)(?:를|은|는)?\s*[:：]?\s*([^\n.]+)/i
    );
    if (topicMatch?.[1]) {
      const topic = topicMatch[1].trim();
      inputPatch.topic = topic;
      inputPatch.mainKeyword = topic.split(/[,，]/)[0]?.trim() || topic;
    }
  }

  for (const hint of TONE_HINTS) {
    if (hint.re.test(combined)) {
      inputPatch.tone = hint.tone;
      break;
    }
  }

  if (/톤|말투|어조/i.test(combined) && !inputPatch.tone) {
    if (/담백|간결/.test(combined)) inputPatch.tone = "informative";
    else if (/감성|따뜻/.test(combined)) inputPatch.tone = "emotional";
  }

  const channelDefault =
    channel === "place" || channel === "smartplace"
      ? "블로그 기반으로 스마트플레이스 공지 톤을 더 강하게"
      : channel === "instagram" || channel === "insta"
        ? "블로그 장면을 인스타 캡션 리듬·이모지로 더 강하게"
        : "전체적으로 다듬어 주세요";
  const feedbackText = parts.filter(Boolean).join(". ") || channelDefault;
  const shouldRewrite =
    reaction !== "good" && (tags.length > 0 || !!memoTrim || reaction === "bad");

  return { shouldRewrite, feedbackText, scope, inputPatch, channel };
}
