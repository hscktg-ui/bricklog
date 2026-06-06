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

/** 사용자 문장 → 재작성 의도 (본문에 원문 삽입 금지) */
const MEMO_INTENT_MAP = [
  {
    re: /광고|과장|홍보\s*같|너무\s*광고/,
    intents: ["reduce_ad_tone", "increase_information_density", "remove_exaggeration"],
    hint: "광고성 표현을 줄이고 확인 가능한 정보를 보강",
  },
  {
    re: /짧|분량|길이.*부족|더\s*길|너무\s*짧/,
    intents: ["add_information_units", "add_examples", "expand_explanations"],
    hint: "정보 단위·사례·설명을 보강 (분량 패딩 없이)",
  },
  {
    re: /지역|동네|근처|로컬/,
    intents: ["strengthen_local_intent", "add_regional_context"],
    hint: "지역 검색 의도와 지역 고객 상황을 강화",
  },
  {
    re: /브랜드\s*느낌|브랜드\s*없|톤|말투|어조/,
    intents: ["strengthen_brand_voice", "align_tone_manner"],
    hint: "브랜드 철학·톤앤매너·대표 표현을 강화",
  },
  {
    re: /반복|똑같|비슷한\s*문장/,
    intents: ["remove_repetition", "restructure_sections"],
    hint: "반복 문장을 제거하고 구조를 재설계",
  },
  {
    re: /정보|구체|자세|설명\s*부족/,
    intents: ["add_information_units", "clarify_selection_criteria"],
    hint: "선택 기준·확인 사항 등 정보 단위를 추가",
  },
  {
    re: /ai|인공|기계|뻔한/,
    intents: ["humanize_prose", "remove_template_phrases"],
    hint: "템플릿 표현을 줄이고 자연스러운 문장으로",
  },
];

const TAG_INTENT_MAP = {
  too_ad: ["reduce_ad_tone", "increase_information_density"],
  low_info: ["add_information_units", "clarify_selection_criteria"],
  repeat: ["remove_repetition", "restructure_sections"],
  brand_weak: ["strengthen_brand_voice", "align_tone_manner"],
  too_weak: ["add_information_units", "add_examples"],
  length_wrong: ["add_information_units", "expand_explanations"],
  too_ai: ["humanize_prose", "remove_template_phrases"],
  gpt_tone: ["humanize_prose", "remove_template_phrases"],
};

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
  const feedbackIntents = new Set();
  let scope = "all";
  const tagList = feedbackTagsForChannel(channel);

  for (const id of tags) {
    const phrase = TAG_REWRITE_PHRASES[id];
    if (phrase) parts.push(phrase);
    for (const intent of TAG_INTENT_MAP[id] || []) feedbackIntents.add(intent);
    if (id === "title_weak") scope = "title";
    if (id === "emoji_low" && (channel === "instagram" || channel === "insta")) {
      scope = "all";
    }
  }

  const memoTrim = String(memo || "").trim();
  const inputPatch = {};
  const combined = [memoTrim, ...parts].join(" ");

  for (const row of MEMO_INTENT_MAP) {
    if (row.re.test(memoTrim)) {
      for (const intent of row.intents) feedbackIntents.add(intent);
      parts.push(row.hint);
    }
  }

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

  return {
    shouldRewrite,
    feedbackText,
    scope,
    inputPatch: {
      ...inputPatch,
      feedbackHints: [...feedbackIntents],
      feedbackIntentDriven: feedbackIntents.size > 0,
    },
    channel,
  };
}
