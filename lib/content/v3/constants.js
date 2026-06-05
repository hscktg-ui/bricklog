/** BRICLOG Content Generation Engine V3 */

export const V3_TARGET_SCORE = 95;
export const V3_ENGINE_VERSION = "v3";

export const V3_CONTENT_STRATEGIES = [
  { id: "informational", label: "정보형", hint: "스펙·비교·선택 기준 중심" },
  { id: "brand", label: "브랜드형", hint: "브랜드 철학·포지션·차별점 중심" },
  { id: "review", label: "후기형", hint: "방문·체험·선택 이유 중심(허구 후기 금지)" },
  { id: "local", label: "지역형", hint: "지역명·생활권·방문 맥락 중심" },
  { id: "event", label: "행사형", hint: "출시·이벤트·기간 한정" },
  { id: "product", label: "제품소개형", hint: "제품명·특징·차별점 중심" },
  { id: "news", label: "뉴스형", hint: "출시·변화 사실만(미확인 뉴스 금지)" },
];

/** 업종 무관·이전 템플릿 오염 */
export const V3_INDUSTRY_DRIFT_PHRASES = [
  "기념일을 깜빡했다",
  "꽃 한 다발",
  "테이블 위",
  "퇴근길에 문득",
  "문득 떠올랐",
  "주말 아침",
  "반려견",
  "카페 감성",
  "플라워샵",
  "꽃집",
  "생화 예약",
  "다녀온 뒤 느낀 점",
];

/** AI 오염 표현 — 작성 후 제거·검수 */
export const V3_AI_CONTAMINATION_PHRASES = [
  "혁신",
  "최고",
  "놀라운",
  "감동",
  "기념일을 깜빡했다",
  "주말 아침",
  "어느 날 문득",
  "퇴근길에 문득",
  "테이블 위",
  "꽃 한 다발",
  "삶의 질",
  "특별한 경험",
  "소중한 순간",
  "행복한 시간",
  "따뜻한 공간",
  "감동을 선사",
  "가치를 전달",
  "검색하시는 분",
  "저장해두세요",
];

export const V3_UI_STEPS = [
  { icon: "🏷", text: "브랜드·지역·주제 분석 중…", stage: "analyze" },
  { icon: "🔍", text: "정보 검증·전략 수립 중…", stage: "verify_strategy" },
  { icon: "📊", text: "주제·정보 구조 정리 중…", stage: "seo" },
  { icon: "✍️", text: "콘텐츠 작성 중…", stage: "write" },
  { icon: "✓", text: "팩트·품질 검수 중…", stage: "post_verify" },
];
