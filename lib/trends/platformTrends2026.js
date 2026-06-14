/**
 * 2026–2027 한국 로컬·네이버·AI 검색 트렌드 SSOT
 * (Next N Search · AuthGR · AI Briefing · Place×Blog 시너지 · GEO)
 *
 * 출처: 공개 SEO·네이버 생태계 분석 (실시간 순위 크롤 아님)
 * @see lib/evolution-lab/naverTrendBaselines.js
 */

export const PLATFORM_TRENDS_VERSION = "2026-2027";
export const PLATFORM_TRENDS_VALID_UNTIL = "2027-12-31";

/** 플랫폼 공통 — AuthGR·AI Briefing·D.I.A 대응 */
export const CORE_PLATFORM_TRENDS = [
  {
    id: "authority_over_keywords",
    label: "키워드보다 권위·주제 일관",
    brief:
      "네이버 Next N Search(AuthGR)는 ‘누가 답할 자격이 있는가’를 본다. 같은 주제를 꾸준히 다루는 계정·브랜드가 단발 트렌드 글보다 유리하다.",
    engineRule:
      "주제 클러스터·브랜드·지역·업종을 한 줄로 명확히. 트렌드 키워드만 억지 삽입 금지.",
  },
  {
    id: "ai_briefing_citation",
    label: "AI Briefing·AI Tab 인용형",
    brief:
      "AI Tab·Briefing은 네이버 블로그·카페 UGC에서 체험·맛·분위기·실무 팁을 끌어온다. 추상 홍보보다 현장 디테일·비교·선택 기준이 인용 후보다.",
    engineRule:
      "스캔 가능한 소제목 + 하위 질문(왜·누가·언제·비교·실수)에 답. FAQ·체크리스트 나열 금지.",
  },
  {
    id: "experience_entity",
    label: "경험(E-E-A-T) + 엔티티 명확",
    brief:
      "경험·관찰·선택 이유가 없는 스펙 나열·AI 요약형 문장은 신뢰 신호가 약하다. 브랜드명·지역·대표 메뉴·서비스는 매번 동일 표기로.",
    engineRule:
      "브랜드·지역·주제 엔티티 표기 일관. 체험/관찰 1회 이상(화자에 맞게).",
  },
  {
    id: "brand_search_loops",
    label: "브랜드 검색·생태계 루프",
    brief:
      "2026–2027은 브랜드명 검색·저장·카톡 공유·플레이스 연동이 비브랜드 cold 트래픽보다 전환·AI 신호에 유리하다. Place·Blog·인스타는 같은 이야기로.",
    engineRule:
      "블로그↔플레이스↔인스타 메시지 정합. Place는 운영·예약·픽업, Blog는 설명·비교, Insta는 Hook·저장.",
  },
  {
    id: "freshness_not_chasing",
    label: "신선함 ≠ 트렌드 추격",
    brief:
      "시즌·이벤트는 맥락에 맞을 때만. 전문 없이 유행어만 붙이는 글은 AuthGR에서 불리하다. pillar 주제는 정기 보강.",
    engineRule:
      "시즌 힌트는 1포인트만. 주제와 무관한 ‘요즘 핫한’ 문구 금지.",
  },
  {
    id: "place_blog_synergy",
    label: "플레이스×블로그 시너지",
    brief:
      "D.I.A·플레이스 알고리즘은 블로그 멘션·정보성·체류를 간접 신호로 쓴다. 본문에 매장명·지역·대표 메뉴를 자연스럽게.",
    engineRule:
      "지역+브랜드+대표 메뉴/서비스 자연 삽입. 플레이스 공지체를 블로그에 복붙 금지.",
  },
];

/** 채널별 2026–2027 실무 */
export const CHANNEL_PLATFORM_TRENDS = {
  blog: {
    priorities: [
      "하위 검색 의도(비교·가격·예약·주차·첫 방문)를 소제목으로 분해",
      "전문·브랜드 화자는 ‘솔직후기’ 남용 금지 — 설명·기준·준비 스토리",
      "체험·방문 화자는 과장 없는 1인칭·장면 2개 이상",
      "제목 25~40자 · 지역+브랜드+질문/후기/가이드",
      "모바일 2~4줄 문단 · 중간 CTA 없이 마무리 한 줄",
    ],
    avoid: [
      "트렌드 키워드만 억지 삽입",
      "AI 요약형 나열·백과 정의",
      "주제 없는 ‘요즘 핫한’",
      "브랜드 계정인데 매번 다른 업종 글",
    ],
  },
  place: {
    priorities: [
      "운영·입고·휴무·예약·픽업 — 보고 바로 행동",
      "플레이스 AI Briefing·예약 전환에 맞는 짧은 팩트",
      "블로그와 같은 이벤트명·기간·혜택 표기",
      "이모지 0~1 · SEO 설명문·키워드 나열 금지",
    ],
    avoid: ["블로그체 장문", "상권 분석·키워드 스터핑", "과장 혜택"],
  },
  instagram: {
    priorities: [
      "저장·공유형 Hook — 2026–2027 로컬 브랜드 캡션",
      "Reels·Clip 연계용 1~2문장 장면 (숏폼은 사용감·비포/애프터 절제)",
      "마이크로 인플루encer 톤: 과장 광고·밈 남용 금지",
      "블로그·플레이스와 같은 프로모 기간·주소 톤",
    ],
    avoid: ["안녕하세요 여러분", "블로그 장문 붙여넣기", "할인만 반복"],
  },
};

const MONTHLY_FOCUS_2026_2027 = [
  { months: [1, 2], focus: "새해·설 · 연말 선물 후속·건강·정리" },
  { months: [2, 3], focus: "발렌타인·화이트데이 · 졸업·입학" },
  { months: [4, 5], focus: "어버이날·가정의달 · 봄 시즌·야외" },
  { months: [6, 7], focus: "장마·휴가 · 여름 메뉴·피크님" },
  { months: [8, 9], focus: "휴가 마무리 · 추석·가을 선물" },
  { months: [10, 11], focus: "가을 감성 · 빼빼로·수능·연말 준비" },
  { months: [12], focus: "연말·크리스마스 · 송년·예약 마감" },
];

function monthFocus(date = new Date()) {
  const m = date.getMonth() + 1;
  return (
    MONTHLY_FOCUS_2026_2027.find((row) => row.months.includes(m))?.focus ||
    "시즌 맥락 1포인트만"
  );
}

function channelKey(channel = "blog") {
  if (channel === "smartplace" || channel === "place") return "place";
  if (channel === "instagram" || channel === "insta") return "instagram";
  return "blog";
}

/** 운영 기획·UI용 짧은 요약 */
export function getPlatformTrendBrief(channel = "blog", date = new Date()) {
  const key = channelKey(channel);
  const ch = CHANNEL_PLATFORM_TRENDS[key];
  const core = CORE_PLATFORM_TRENDS.slice(0, 3)
    .map((t) => t.label)
    .join(" · ");
  return [
    `${PLATFORM_TRENDS_VERSION} · ${monthFocus(date)}`,
    core,
    ...(ch?.priorities?.slice(0, 2) || []),
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 520);
}

/** LLM·채널 프롬프트 블록 */
export function buildPlatformTrendPromptBlock(channel = "blog", ctx = {}) {
  const key = channelKey(channel);
  const ch = CHANNEL_PLATFORM_TRENDS[key];
  const date = ctx.contentDate ? new Date(`${ctx.contentDate}T12:00:00`) : new Date();
  const lines = [
    `【${PLATFORM_TRENDS_VERSION} 플랫폼 트렌드 · ${monthFocus(date)}】`,
    ...CORE_PLATFORM_TRENDS.map((t) => `- ${t.label}: ${t.engineRule}`),
  ];
  if (ch) {
    lines.push(`[${key}] 우선: ${ch.priorities.slice(0, 4).join(" · ")}`);
    if (ch.avoid?.length) {
      lines.push(`[${key}] 금지: ${ch.avoid.slice(0, 4).join(", ")}`);
    }
  }
  lines.push(
    "트렌드는 주제·브랜드·화자와 맞을 때만 1포인트. 무관한 유행어·키워드 스터핑 금지."
  );
  return lines.join("\n").slice(0, 2200);
}

/** Brand Content OS 운영안 — ‘왜 쓸지’ 보조 */
export function getOperatingPlanPlatformStrategy(input = {}) {
  const industry = String(input.industryLabel || input.industry || "").trim();
  const brand = String(input.brandName || "브랜드").trim();
  return [
    `${PLATFORM_TRENDS_VERSION}: AI Briefing·플레이스가 인용할 ‘${brand}’ 주제 권위 쌓기`,
    industry
      ? `${industry} 업종 — 주제 일관·체험/설명 화자 분리·Place·Blog 메시지 정합`
      : "주제 일관·Place·Blog·인스타 동일 스토리",
    "트렌드 키워드 추격보다 pillar 주제 정기 발행·시즌은 맥락 1포인트",
  ];
}

export function isPlatformTrendsActive(date = new Date()) {
  return date <= new Date(`${PLATFORM_TRENDS_VALID_UNTIL}T23:59:59`);
}
