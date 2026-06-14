/**
 * 네이버 블로그 상위 노출·체류 패턴 — 공개 SEO·운영 베이스라인 (실시간 크롤 대체)
 * 연구 루프에서 카테고리별 구조 신호로 사용
 */

export const NAVER_CATEGORY_BASELINES = {
  맛집: {
    introStyle: "방문 계기·첫인상 2~3문장",
    paragraphLength: "3~4줄",
    imagePlacement: "메뉴/매장 사진은 소제목 직후",
    keywordStyle: "지역+맛집+메뉴명 자연 삽입",
    storytelling: "주문→식사 장면→맛 묘사",
    reviewStyle: "담백 후기, 과장 금지",
    infoStyle: "위치·웨이팅·주차 한 블록",
    ctaStyle: "예약/방문 팁 한 줄",
  },
  카페: {
    introStyle: "분위기·좌석 첫 장면",
    paragraphLength: "2~4줄",
    imagePlacement: "음료/인테리어 교차",
    keywordStyle: "지역+카페+시그니처",
    storytelling: "주문→자리→머무는 시간",
    reviewStyle: "감성 절제, 구체 디테일",
    infoStyle: "운영시간·콘센트·주차",
    ctaStyle: "픽업·단골 메뉴",
  },
  꽃집: {
    introStyle: "선물/기념일 맥락",
    paragraphLength: "3~4줄",
    imagePlacement: "꽃다발·포장 컷",
    keywordStyle: "지역+꽃집+시즌",
    storytelling: "고르는 과정·포장",
    reviewStyle: "받는 사람 시선",
    infoStyle: "픽업·배달·가격대",
    ctaStyle: "예약·시즌 이벤트",
  },
  병원: {
    introStyle: "방문 전 고민 (단정 금지)",
    paragraphLength: "짧은 문단",
    imagePlacement: "절제, 과도한 전후 금지",
    keywordStyle: "지역+진료과",
    storytelling: "절차·대기·상담 톤",
    reviewStyle: "경험 서술, 효과 보장 금지",
    infoStyle: "예약·위치·주차",
    ctaStyle: "문의 유도, 결과 단정 금지",
  },
  법률: {
    introStyle: "상황 질문형",
    paragraphLength: "3~5줄",
    keywordStyle: "지역+분야",
    storytelling: "절차 안내",
    reviewStyle: "사례 톤 금지, 일반 정보",
    infoStyle: "상담·준비 서류",
    ctaStyle: "문의, 승소 보장 금지",
  },
  부동산: {
    introStyle: "비교·선택 고민",
    paragraphLength: "3~4줄",
    keywordStyle: "지역+매물 유형",
    storytelling: "입지·생활권",
    reviewStyle: "수익·가격 보장 금지",
    infoStyle: "계약·중개 절차",
    ctaStyle: "상담 예약",
  },
  인테리어: {
    introStyle: "공간 문제→해결",
    paragraphLength: "3~4줄",
    imagePlacement: "Before/After 절제",
    keywordStyle: "스타일+지역",
    storytelling: "시공 과정·소재",
    reviewStyle: "체감 묘사",
    infoStyle: "견적·기간",
    ctaStyle: "상담·포트폴리오",
  },
  가구: {
    introStyle: "생활 불편→제품",
    paragraphLength: "3~4줄",
    keywordStyle: "가구 종류+지역",
    storytelling: "배치·사용감",
    reviewStyle: "실사용 후기",
    infoStyle: "배송·AS",
    ctaStyle: "매장 방문",
  },
  교육: {
    introStyle: "학습 고민",
    paragraphLength: "3~5줄",
    keywordStyle: "과목+지역",
    storytelling: "수업 분위기·변화",
    reviewStyle: "성적 보장 금지",
    infoStyle: "커리큘럼·시간",
    ctaStyle: "체험 수업",
  },
  미용: {
    introStyle: "스타일 니즈",
    paragraphLength: "2~4줄",
    keywordStyle: "지역+시술",
    storytelling: "상담→시술",
    reviewStyle: "전후 과장 금지",
    infoStyle: "가격대·예약",
    ctaStyle: "첫 방문 혜택",
  },
  쇼핑몰: {
    introStyle: "제품 고민·비교",
    paragraphLength: "3~4줄",
    keywordStyle: "제품명+혜택",
    storytelling: "언박싱·사용",
    reviewStyle: "솔직 장단점",
    infoStyle: "배송·교환",
    ctaStyle: "구매 링크 절제",
  },
};

export const DEFAULT_BASELINE = NAVER_CATEGORY_BASELINES.카페;

/** 2026–2027 Next N Search · AuthGR · AI Briefing · Place×Blog (공개 분석 SSOT) */
export const NAVER_PLATFORM_2026 = {
  rankingShift:
    "클릭·키워드 → 주제 권위·작성자 신뢰·체류·저장·Place 연동",
  contentSignals: [
    "하위 검색 의도별 소제목",
    "체험·관찰·선택 기준(추상 홍보 금지)",
    "브랜드·지역·메뉴 엔티티 일관",
    "블로그↔플레이스 메시지 정합",
    "시즌은 맥락 1포인트(트렌드 추격 금지)",
  ],
  avoid: [
    "주제 없는 유행어",
    "AI 요약형 나열",
    "매번 다른 업종 글",
    "플레이스 공지 블로그 복붙",
  ],
};
