/**
 * 2026~2027 한국 로컬 콘텐츠 글쓰기·띄어쓰기·채널별 습관
 * (Next N Search · AI Briefing · Place×Blog — lib/trends/platformTrends2026.js)
 */

export const CHANNEL_TRENDS = {
  blog: {
    voice: "해요체·구어체 혼합, 화자별 1인칭(체험·브랜드·전문)",
    sentenceLength: "medium",
    lineBreak: "3문장마다 빈 줄",
    spacing: "표준 띄어쓰기, 조사 붙임, 쉼표 뒤 한 칸",
    trends: [
      "2026–27: 주제 일관·하위 질문 소제목(AI Briefing·AuthGR)",
      "체험 화자: 다녀왔어요·직접·솔직히 / 브랜드·전문: 설명·기준·준비",
      "제목: 지역+브랜드+질문/후기/가이드 · 25~40자",
      "브랜드·지역·대표 메뉴 엔티티 표기 일관(Place 연동)",
      "키워드는 문장 안에 녹이기 — 트렌드어·AI 요약 나열 금지",
      "모바일 2~4줄 문단 · 마무리 CTA 한 줄",
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
      "요즘 핫한",
      "트렌드 키워드만",
    ],
  },
  place: {
    voice: "사장님 공지, 짧고 단호하지만 친근",
    sentenceLength: "short",
    lineBreak: "한 줄 공지 + 짧은 본문",
    spacing: "공지형·띄어쓰기 정확",
    trends: [
      "2026–27: Place AI Briefing·예약 전환 — 팩트·기간·혜택 명확",
      "블로그와 동일 이벤트명·매장명·지역 표기",
      "입고·운영·이벤트·예약·픽업 중심",
      "이모지 0~1개 (시즌)",
      "보고 바로 행동 · 블로그체·SEO 문장 금지",
    ],
    avoid: [
      "알아보시다 보면",
      "상권 분석",
      "키워드",
      "비교해 보시면",
    ],
  },
  instagram: {
    voice: "2026–27 로컬 브랜드 캡션, 저장·공유형 Hook",
    sentenceLength: "very-short",
    lineBreak: "1~2문장마다 줄바꿈",
    spacing: "Hook은 마침표 생략 가능",
    trends: [
      "첫 줄 Hook — 저장·공유·Reels/Clip 연계 장면",
      "블로그·Place와 같은 프로모 기간·톤",
      "마이크로 인플루encer 톤 — 광고·밈 과장 금지",
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
  [/안되(?=[요\.?!]|$)/g, "안 돼"],
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
