/**
 * 추천 주제 엔진 — 브랜드·계절·기록·성과 기반 (규칙 + 휴리스틱)
 */
import { getTodayInspiration } from "@/lib/inspiration/todayInspiration";
import { buildBrandLogTopicCandidates } from "@/lib/memory/brandLogTopicEngine";

function seasonLabel(month) {
  if (month >= 3 && month <= 5) return "봄";
  if (month >= 6 && month <= 8) return "여름";
  if (month >= 9 && month <= 11) return "가을";
  return "겨울";
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

export function buildTopicRecommendations(ctx = {}) {
  const {
    brandName = "",
    industry = "",
    region = "",
    recentTopics = [],
    performancePatterns = [],
    channelsUsed = {},
    storeFeatures = "",
    brandDescription = "",
    includePhrases = "",
    services = "",
    preferredKeywords = "",
    researchFacts = [],
  } = ctx;

  const now = new Date();
  const month = now.getMonth() + 1;
  const season = seasonLabel(month);

  const brandLogTopics = buildBrandLogTopicCandidates({
    brandName,
    region,
    industry,
    season,
    month,
    recentTopics,
    storeFeatures,
    brandDescription,
    includePhrases,
    services,
    preferredKeywords,
    researchFacts,
  }).map((t) => t.topic);

  const insp = getTodayInspiration({
    industryKey: industry,
    brandName,
  });

  const base = [
    ...brandLogTopics.slice(0, 4),
    `${region ? region + " " : ""}${brandName || "우리 매장"} ${season} 시즌 이야기`,
    `${brandName || "브랜드"}를 처음 방문하는 분을 위한 안내`,
    `단골이 다시 찾는 이유 — ${brandName || "브랜드"}의 하루`,
    insp.stories?.[0]?.title || `${season} 분위기에 맞는 소식`,
    `이번 주 ${region || "동네"}에서 꼭 전하고 싶은 한 가지`,
  ];

  const channelBoost = [];
  if (!channelsUsed.place) {
    channelBoost.push({
      channel: "place",
      topic: `${brandName || "매장"} 방문 전 알아두면 좋은 정보`,
    });
  }
  if (!channelsUsed.instagram) {
    channelBoost.push({
      channel: "instagram",
      topic: `짧은 한 줄로 ${brandName || "브랜드"} 분위기 전하기`,
    });
  }
  if (!channelsUsed.blog) {
    channelBoost.push({
      channel: "blog",
      topic: `${brandName || "브랜드"} 이야기를 길게 풀어보기`,
    });
  }

  for (const p of performancePatterns.slice(0, 3)) {
    if (p.includes("제목")) base.push(`반응 좋았던 제목 스타일로 ${season} 주제 다시 쓰기`);
    if (p.includes("도입")) base.push(`짧은 도입부로 시작하는 ${brandName || "브랜드"} 이야기`);
    if (p.includes("플레이스")) channelBoost.push({ channel: "place", topic: "이벤트·운영 소식을 플레이스 톤으로" });
  }

  const weekTopics = uniq([...base, ...recentTopics.map((t) => `이어쓰기: ${t}`)]).slice(
    0,
    5
  );
  const monthTopics = uniq([
    ...weekTopics,
    `${month}월 ${industry || "업종"} 트렌드와 ${brandName || "브랜드"} 연결`,
    `${season} 시즌 프로모션 아이디어`,
    `고객 후기형 vs 브랜드 소개형 — 이번 달은?`,
    `지역 검색에 도움이 되는 ${region || "지역"} 키워드 주제`,
    ...insp.stories.map((s) => s.title),
  ]).slice(0, 10);

  return {
    season,
    brandLogTopics: brandLogTopics.slice(0, 6),
    week: weekTopics.map((topic) => ({ topic, channels: ["blog", "place", "instagram"] })),
    month: monthTopics.map((topic) => ({ topic, channels: ["blog"] })),
    byChannel: {
      blog: weekTopics.slice(0, 5),
      place: channelBoost.filter((c) => c.channel === "place").map((c) => c.topic),
      instagram: channelBoost
        .filter((c) => c.channel === "instagram")
        .map((c) => c.topic),
    },
  };
}
