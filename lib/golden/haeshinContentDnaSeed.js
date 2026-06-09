/**
 * HAESHIN CONTENT DNA SEED — 해신기획 콘텐츠 기준 SSOT
 * GPT 재학습 없음 · 프롬프트·검수·재작성·점수 산정용
 */
export const HAESHIN_DNA_VERSION = "v1";

export const HAESHIN_CONTENT_PHILOSOPHY = [
  "광고처럼 보이지 않는 글",
  "브랜드를 과하게 외치지 않는 글",
  "검색 사용자가 궁금해하는 것에 먼저 답하는 글",
  "일상적인 장면에서 자연스럽게 시작하는 글",
  "브랜드 특징을 본문 속에 은근하게 녹이는 글",
  "과장보다 담백함을 우선하는 글",
  "키워드 반복이 아닌 브랜드 기록을 쌓는 글",
  "사람이 실제로 읽을 수 있는 글",
  "문의와 기억으로 이어지는 글",
  "브랜드의 기록이 쌓이도록 돕는 글",
];

export const DEFAULT_STYLE_PROFILE = {
  tone: "담백함",
  emotion_level: "중간",
  sales_pressure: "낮음",
  brand_exposure: "중간",
  cta_strength: "약함",
  information_density: "중간 이상",
  opening_style: "일상 장면 시작",
  writing_skill: "전문 에디터",
  preferred_voice: "친근하지만 과하지 않은 블로그형",
  avoid_voice: "기계적인 광고문, 설명서 문체, AI 관용구 반복",
};

export const BLOG_STRUCTURE_ARC = [
  "도입부 — 일상 장면·고민에서 시작",
  "검색 의도 정리 — 왜 이 글을 찾았는지",
  "정보 제공 — 추천·기준·보관·방문 전 확인",
  "브랜드 자연 노출 — 중간 이후 은근하게",
  "브랜드 특징 2~4개 — 운영·차별·지역",
  "마무리 — 강한 CTA 없이 자연스러운 안내",
];

export const FORBIDDEN_GLOBAL_PHRASES = [
  "좋은내용",
  "이용",
  "관련해서 를 보면",
  "에서 이용을 볼 때",
  "조건·구성",
  "조건 및 구성",
  "중립적으로 정리",
  "비교가 수월해요",
  "비교가 수월합니다",
  "확인해봤어요",
  "서비스를 제공합니다",
  "제품 및 서비스",
  "브랜드명",
  "지역명",
  "업종명",
  "placeholder",
  "undefined",
  "null",
  "NaN",
];

export const AI_CLICHE_PHRASES = [
  "특별한 경험",
  "소중한 순간",
  "행복을 더하다",
  "감동을 선사하다",
  "가치를 전달하다",
  "풍요롭게 만들다",
  "깊은 유대감",
  "일상의 활력",
  "마음을 전하다",
  "따뜻한 공간",
  "특별한 시간",
  "의미 있는 순간",
  "고객 만족을 최우선으로",
  "최고의 품질",
  "차별화된 서비스",
  "품격 있는",
  "완벽한 하루",
];

export const FORBIDDEN_OPENINGS = [
  /^안녕하세요/,
  /^오늘은\s+.+\s+알아보겠습니다/,
  /^이번\s+포스팅에서는/,
  /최고의\s+.+\s+소개합니다/,
  /특별한\s+경험을\s+선사/,
  /고객\s+만족을\s+최우선/,
];

export const FORBIDDEN_CLOSINGS = [
  /지금\s+바로\s+방문하세요/,
  /최고의\s+선택이\s+될\s+것입니다/,
  /후회\s+없는\s+선택을\s+보장/,
  /많은\s+관심\s+부탁드립니다/,
  /감동을\s+선사하겠습니다/,
];

export const PREFERRED_OPENING_PATTERNS = [
  /계절이\s+바뀌면|여름이\s+시작|6월이\s+시작/,
  /주말\s+아침|퇴근길|집\s+안\s+분위기/,
  /매장을\s+고를\s+때|검색을\s+하다\s+보면|정작\s+무엇을/,
  /특별한\s+날이\s+아니어도/,
  /운영을\s+하다\s+보면/,
];

export const PREFERRED_CLOSING_PATTERNS = [
  /방문\s+전\s+운영\s+시간/,
  /가볍게\s+참고/,
  /계절에\s+따라\s+구성/,
  /작은\s+변화를\s+더하고/,
  /선택\s+기준이\s+정리/,
  /기록에서\s+쌓여/,
];

export const KIM_TAEGYU_VOICE_DNA = [
  "문장을 과하게 꾸미지 않는다",
  "짧고 담백하게 시작한다",
  "일상 상황에서 브랜드 이야기를 끌어낸다",
  "읽는 사람의 상황을 먼저 생각한다",
  "강한 CTA보다 자연스러운 마무리",
  "브랜드는 맥락 안에 남긴다",
  "글 끝에 약한 여운",
  "브랜드 기록·자산 관점",
  "AI스럽거나 광고 같으면 실패",
];

/** 업종별 콘텐츠 DNA */
export const INDUSTRY_CONTENT_DNA = {
  flower_shop: {
    industry: "flower_shop",
    label: "꽃집·무인꽃집",
    searchIntents: [
      "꽃 추천",
      "생일 꽃다발",
      "집들이 꽃",
      "무인 꽃집",
      "24시간 꽃집",
      "늦은 시간 꽃",
    ],
    mustInclude: [
      "꽃 이름",
      "계절성",
      "선물 상황",
      "보관",
      "색감",
      "포장",
      "구매 시간",
    ],
    preferredLines: [
      "여름에는 꽃을 고르는 기준도 조금 달라집니다",
      "집 안에 꽃 한 다발이 놓이면 분위기가",
      "늦은 시간에도 꽃이 필요할 때",
    ],
    forbiddenWords: [
      /원재료/,
      /알레르기/,
      /첨가물/,
      /성분표/,
      /전시\s*관련/,
      /제품\s*구성/,
      /보관\s*성분/,
      /식품\s*기준/,
      /매트리스/,
      /프레임/,
      /쇼룸/,
      /침대\s*체험/,
      /진료\s*과목/,
      /승소\s*보장/,
    ],
    direction:
      "꽃 종류·계절·선물 목적·매장 이용·꽃을 둔 장면 중심. 식품 라벨 표현 금지.",
  },
  cafe: {
    industry: "cafe",
    label: "카페",
    searchIntents: ["신메뉴", "여름 메뉴", "카공", "브런치", "분위기", "좌석", "주차"],
    mustInclude: ["메뉴", "맛", "좌석", "분위기", "방문 상황", "계절"],
    preferredLines: [
      "여름이 되면 시원한 메뉴부터",
      "카페를 고를 때는 메뉴만큼이나",
      "신메뉴는 맛뿐 아니라 계절감",
    ],
    forbiddenWords: [/원재료\s*표기/, /알레르기\s*조건/, /전시\s*구성/, /성분\s*중심/],
    direction: "메뉴·맛·좌석·분위기·방문 이유 중심.",
  },
  tea_cafe: {
    industry: "tea_cafe",
    label: "티카페",
    searchIntents: ["티 메뉴", "다실", "티하우스", "브런치"],
    mustInclude: ["티", "메뉴", "분위기", "좌석"],
    preferredLines: ["차 한 잔의 여유", "티 메뉴는 계절감"],
    forbiddenWords: [/매트리스/, /꽃다발/, /진료/],
    direction: "티·메뉴·공간 분위기 중심.",
  },
  furniture: {
    industry: "furniture",
    label: "가구·침대·매트리스",
    searchIntents: ["매트리스 추천", "침대 체험", "입주 가구", "신혼 가구", "매장 방문"],
    mustInclude: ["착와감", "지지력", "체험", "사이즈", "프레임", "배송", "설치"],
    preferredLines: [
      "매트리스는 설명보다 직접 누워보는",
      "같은 단단함이라도 사람마다",
      "입주나 혼수를 준비할 때",
    ],
    forbiddenWords: [/무조건\s*추천/, /최저가/, /평생\s*사용/, /100%\s*만족/, /통증\s*완화\s*보장/],
    direction: "체험·비교·실사용·선택 기준 중심.",
  },
  medical: {
    industry: "medical",
    label: "병원·의원·치과",
    searchIntents: ["진료 시간", "야간 진료", "예약", "주차", "진료 과목"],
    mustInclude: ["진료", "운영 시간", "예약", "위치", "방문 전 확인"],
    preferredLines: ["진료 전 확인", "예약 방법", "운영 시간"],
    forbiddenWords: [/완치/, /100%\s*효과/, /반드시\s*낫/, /최고\s*병원/, /결과\s*보장/, /부작용\s*없음/],
    direction: "정보 안내 중심. 치료 효과 단정 금지.",
  },
  hospital: {
    industry: "medical",
    label: "병원",
    searchIntents: ["진료", "예약", "접수"],
    mustInclude: ["진료", "예약", "안내"],
    preferredLines: [],
    forbiddenWords: [/완치/, /100%/, /보장/],
    direction: "의료 정보 안내.",
  },
  professional_service: {
    industry: "professional_service",
    label: "법률·세무·노무",
    searchIntents: ["상담", "절차", "준비 서류", "비용 문의"],
    mustInclude: ["상담", "절차", "준비", "확인"],
    preferredLines: ["방문 전 준비", "상담 가능 여부"],
    forbiddenWords: [/승소\s*보장/, /무조건\s*해결/, /100%\s*환급/, /결과\s*보장/],
    direction: "일반 정보 제공. 개별 결과 보장 금지.",
  },
  real_estate: {
    industry: "real_estate",
    label: "부동산·분양",
    searchIntents: ["위치", "가격", "매물", "교통", "방문 상담"],
    mustInclude: ["위치", "확인", "상담", "매물"],
    preferredLines: ["계약 전 확인", "방문 상담"],
    forbiddenWords: [/무조건\s*상승/, /확정\s*수익/, /투자\s*보장/, /지금\s*안\s*사면/],
    direction: "정보·확인 기준 중심. 수익 단정 금지.",
  },
  academy: {
    industry: "academy",
    label: "학원·교육",
    searchIntents: ["커리큘럼", "수업 방식", "시간표", "상담", "학습 분위기"],
    mustInclude: ["수업", "대상", "상담", "커리큘럼"],
    preferredLines: ["수업 방식", "학습 환경"],
    forbiddenWords: [/100%\s*향상/, /무조건\s*합격/, /반드시\s*성공/, /단기간\s*완성\s*보장/],
    direction: "수업·환경·대상·상담 기준 중심.",
  },
  marketing_agency: {
    industry: "marketing_agency",
    label: "광고대행·마케팅",
    searchIntents: ["블로그 마케팅", "스마트플레이스", "브랜드 홍보", "지역 마케팅", "상담"],
    mustInclude: ["운영", "프로세스", "콘텐츠", "브랜드"],
    preferredLines: [
      "광고보다 먼저 브랜드 정보",
      "노출보다 운영 기준",
      "꾸준한 기록",
    ],
    forbiddenWords: [/무조건\s*상위노출/, /100%\s*노출/, /매출\s*폭발/, /단기간\s*대박/],
    direction: "신뢰·운영 방식·프로세스 중심.",
  },
  marketing: {
    industry: "marketing_agency",
    label: "마케팅",
    searchIntents: ["마케팅", "홍보", "콘텐츠"],
    mustInclude: ["운영", "브랜드"],
    preferredLines: [],
    forbiddenWords: [/무조건\s*상위노출/, /100%\s*보장/],
    direction: "마케팅 운영 중심.",
  },
  restaurant: {
    industry: "restaurant",
    label: "식당",
    searchIntents: ["메뉴", "맛집", "예약", "코스"],
    mustInclude: ["메뉴", "분위기", "예약"],
    preferredLines: ["메뉴", "모임"],
    forbiddenWords: [/매트리스/, /꽃다발/],
    direction: "메뉴·분위기·방문 목적.",
  },
  salon: {
    industry: "salon",
    label: "미용·살롱",
    searchIntents: ["컷", "펌", "염색", "네일"],
    mustInclude: ["시술", "스타일", "상담"],
    preferredLines: [],
    forbiddenWords: [/매트리스/, /진료\s*접수/],
    direction: "시술·스타일·상담 중심.",
  },
  etc: {
    industry: "etc",
    label: "기타",
    searchIntents: ["안내", "이용", "문의"],
    mustInclude: ["안내", "확인"],
    preferredLines: [],
    forbiddenWords: [],
    direction: "검색 의도·확인 기준 중심.",
  },
};

export const FAILURE_ARTICLE_RULES = [
  { id: "placeholder", label: "Placeholder 잔존", re: /좋은내용|브랜드명|지역명|업종명|undefined|null|placeholder/i },
  { id: "industry_mix", label: "업종 혼입", re: null },
  { id: "topic_drift", label: "주제 이탈", re: null },
  { id: "voice_mix", label: "말투 혼합", re: null },
  { id: "repeat_spam", label: "반복 문장", re: /비교가\s*수월해요/g },
  { id: "brand_empty", label: "브랜드 특징 없음", re: null },
  { id: "intent_miss", label: "검색 의도 미충족", re: null },
  { id: "fiction", label: "임의 정보 생성", re: null },
];

/** 100점 만점 가중치 (해신기획 SSOT) */
export const HAESHIN_SCORE_WEIGHTS = {
  topic_fit: 20,
  search_intent: 20,
  brand_reflection: 15,
  industry_fit: 10,
  prose_consistency: 10,
  speaker_consistency: 10,
  repetition_removal: 5,
  ai_cliche_removal: 5,
  information_density: 5,
};

export const SAFE_EDIT_MIN_PRESERVE_RATIO = 0.85;
