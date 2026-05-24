/** 브랜드·주제 조사 — 국내·해외 채널 관점 (UI에는 채널 나열을 노출하지 않음) */

export const TOPIC_RESEARCH_CHANNELS = [
  { id: "naver_blog", label: "네이버 블로그·카페", region: "kr" },
  { id: "naver_place", label: "네이버 플레이스·지도", region: "kr" },
  { id: "kakao_map", label: "카카오맵·후기", region: "kr" },
  { id: "instagram_kr", label: "인스타그램·릴스 (국내)", region: "kr" },
  { id: "youtube_kr", label: "유튜브·숏폼 (국내)", region: "kr" },
  { id: "news_kr", label: "국내 뉴스·포털", region: "kr" },
  { id: "community_kr", label: "국내 커뮤니티·Q&A", region: "kr" },
  { id: "google_search", label: "검색·블로그 (글로벌)", region: "global" },
  { id: "instagram_global", label: "인스타·틱톡 (글로벌 트렌드)", region: "global" },
  { id: "youtube_global", label: "유튜브 (글로벌)", region: "global" },
  { id: "industry_reports", label: "업계·리뷰·전문 매체", region: "global" },
];

export function topicResearchSystemRules() {
  const kr = TOPIC_RESEARCH_CHANNELS.filter((c) => c.region === "kr")
    .map((c) => c.label)
    .join(", ");
  const global = TOPIC_RESEARCH_CHANNELS.filter((c) => c.region === "global")
    .map((c) => c.label)
    .join(", ");
  return `요청 주체(브랜드명·지역·업종·주제·목적)에 맞춰, 아래 채널에서 공개적으로 알려진 정보를 **조사·재해석**하세요.
국내: ${kr}
해외·글로벌: ${global}

목표: 브랜드와 오늘의 주제에 대한 사실·트렌드·소비자 관심을 모아, **이 브랜드가 쓸 글**에 쓸 수 있는 조사 brief를 만드세요.
원문 문장·리뷰 복사 금지, 없는 수치·날짜·뉴스 단정 금지.

JSON에 "channelInsights" 배열 필수. 각 항목:
{"channel":"채널명","finding":"2-3문장 한국어","keywords":["..."],"confidence":"high|medium|low"}
국내·해외 채널을 골고루 포함해 최소 8개 항목.
실시간 웹 접근이 없으면 disclaimer에 명시하고, 입력·일반 트렌드만으로 추론하세요.`;
}

export function formatChannelInsightsForBrief(channelInsights = []) {
  if (!Array.isArray(channelInsights) || !channelInsights.length) return "";
  const lines = channelInsights
    .slice(0, 12)
    .map((row) => {
      const ch = row?.channel || row?.id || "채널";
      const finding = String(row?.finding || row?.note || "").trim();
      if (!finding) return null;
      const kw = (row?.keywords || []).slice(0, 4).join(", ");
      return `· ${ch}: ${finding}${kw ? ` (키워드: ${kw})` : ""}`;
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return ["【브랜드·주제 채널 조사 (국내·해외)】", ...lines].join("\n");
}

/** @deprecated use topicResearchSystemRules */
export const domesticResearchSystemRules = topicResearchSystemRules;
/** @deprecated use formatChannelInsightsForBrief */
export { formatChannelInsightsForBrief as formatDomesticChannelInsights };
