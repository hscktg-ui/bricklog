/**
 * 2025~2026 한국 로컬 콘텐츠 글쓰기·띄어쓰기·채널별 습관
 * (네이버 블로그 / 스마트플레이스 / 인스타 캡션 실무 트렌드 반영)
 */

export const CHANNEL_TRENDS = {
  blog: {
    voice: "해요체·구어체 혼합, 블로거 1인칭",
    sentenceLength: "medium",
    lineBreak: "3문장마다 빈 줄",
    spacing: "표준 띄어쓰기, 조사 붙임, 쉼표 뒤 한 칸",
    trends: [
      "도입: 솔직후기·다녀왔어요·직접 방문 계기 (소개형 금지)",
      "제목: 지역+브랜드+솔직후기/방문후기 · 25~40자",
      "‘요즘’, ‘사실’, ‘그래서’, ‘근데’, ‘솔직히’ 자연 연결",
      "키워드는 문장 안에 녹이기 (나열·반복 금지)",
      "마무리는 짧고 부담 없는 CTA",
      "모바일에서 읽기 좋게 문단 2~4줄",
    ],
    avoid: [
      "오늘은 ~ 소개",
      "검색창에 입력",
      "해당 브랜드는",
      "체크리스트로 삼으면",
      "확인하세요",
      "권합니다",
      "체험 전 알아둘 것",
      "알아보시다 보면",
    ],
  },
  place: {
    voice: "사장님 공지, 짧고 단호하지만 친근",
    sentenceLength: "short",
    lineBreak: "한 줄 공지 + 짧은 본문",
    spacing: "공지형·띄어쓰기 정확",
    trends: [
      "입고·운영·이벤트·예약 중심",
      "이모지 0~1개 (🌷 ☕ 등 시즌)",
      "‘~했어요’ ‘~해두었습니다’ 운영 알림",
      "보고 바로 행동 유도",
      "블로그체·SEO 문장 금지",
    ],
    avoid: [
      "알아보시다 보면",
      "상권 분석",
      "키워드",
      "비교해 보시면",
    ],
  },
  instagram: {
    voice: "2025 로컬 브랜드 캡션, 감성+센스",
    sentenceLength: "very-short",
    lineBreak: "1~2문장마다 줄바꿈",
    spacing: "Hook은 마침표 생략 가능",
    trends: [
      "첫 줄 Hook — 시·감정 한 줄",
      "MZ 밈 과장 없음, 자연스러운 구어",
      "저장·공감 유도, 광고 톤 최소",
      "이모지 0~1개",
      "‘~해요’ ‘~더라고요’ ‘~인 날’",
    ],
    avoid: [
      "안녕하세요 여러분",
      "소개해드릴게요",
      "도움이 되길 바라요",
      "정리했습니다",
      "블로그 같은 장문",
    ],
  },
};

/** 자주 틀리는 띄어쓰기·표현 (규칙 기반) */
const SPACING_FIXES = [
  [/(\S)ㆍ/g, "$1 ·"],
  [/ +([,.?!])/g, "$1"],
  [/([가-힣])([A-Za-z])/g, "$1 $2"],
  [/되요/g, "돼요"],
  [/안되/g, "안 돼"],
  [/수있/g, "수 있"],
  [/것같/g, "것 같"],
  [/때문에/g, "때문에"],
  [/ \n/g, "\n"],
  [/\n{3,}/g, "\n\n"],
];

const OUTDATED_TO_NATURAL = [
  ["소개해 드리겠습니다", ""],
  ["알아보시다 보면", ""],
  ["검색창에 입력하신", ""],
  ["도움이 되길 바랍니다", "도움이 되길 바라요"],
  ["확인해 주시기 바랍니다", "확인해 주세요"],
  ["방문해 주시기 바랍니다", "방문해 주세요"],
  ["~ 하겠습니다", "~ 할게요"],
];

export function applyKoreanPolish(text, channel = "blog") {
  if (!text) return "";
  let t = String(text);

  for (const [re, rep] of SPACING_FIXES) {
    t = t.replace(re, rep);
  }
  for (const [from, to] of OUTDATED_TO_NATURAL) {
    if (from) t = t.replaceAll(from, to);
  }

  const avoid = CHANNEL_TRENDS[channel]?.avoid || [];
  for (const phrase of avoid) {
    if (t.includes(phrase)) t = t.replaceAll(phrase, "");
  }

  return t.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function polishBlogPack(blog) {
  if (!blog) return blog;
  return {
    ...blog,
    titles: (blog.titles || []).map((t) => applyKoreanPolish(t, "blog")),
    representativeTitle: applyKoreanPolish(
      blog.representativeTitle || blog.title,
      "blog"
    ),
    title: applyKoreanPolish(blog.representativeTitle || blog.title, "blog"),
    sections: (blog.sections || []).map((s) => ({
      heading: applyKoreanPolish(s.heading, "blog"),
      body: applyKoreanPolish(s.body, "blog"),
    })),
    conclusion: applyKoreanPolish(blog.conclusion, "blog"),
    hashtags: blog.hashtags,
  };
}

export function polishPlacePack(place) {
  if (!place) return place;
  return {
    ...place,
    title: applyKoreanPolish(place.title, "place"),
    shortBody: applyKoreanPolish(place.shortBody, "place"),
    detailBody: applyKoreanPolish(place.detailBody, "place"),
    cta: applyKoreanPolish(place.cta, "place"),
    body: applyKoreanPolish(place.body, "place"),
  };
}

export function polishInstaPack(insta) {
  if (!insta) return insta;
  const hook = applyKoreanPolish(insta.hook, "instagram");
  const body = applyKoreanPolish(insta.body, "instagram");
  const ending = applyKoreanPolish(insta.ending, "instagram");
  const lineBreakBody = [hook, body, ending]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\. \n/g, ".\n\n");
  return {
    ...insta,
    hook,
    body,
    ending,
    lineBreakBody: applyKoreanPolish(lineBreakBody, "instagram"),
  };
}
