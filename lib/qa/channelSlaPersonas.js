/**
 * 채널별 SLA 스모크 — 2분(120s) 이내 결과 노출 목표
 * @see scripts/channel-sla-smoke.mjs
 */

/** prod 전체 파이프라인(조사+생성) — 환경변수 CHANNEL_SLA_MS 로 덮어쓰기 가능 */
export const CHANNEL_SLA_MS = Number(process.env.CHANNEL_SLA_MS) || 180_000;

/** 채널별 실사용자형 입력 (브랜드·지역·주제 분리) */
export const CHANNEL_SLA_PERSONAS = [
  {
    id: "c_blog_cafe",
    channel: "blog",
    label: "이야기 — 강남 카페 사장",
    menuPattern: /이야기/,
    generatePattern: /조사 후 글 받기|구성안 만들기|이야기 쓰기/,
    form: {
      brandName: "SLA모닝브루",
      region: "서울 강남",
      topic: "봄 시즌 브런치 오픈 안내",
      industry: "카페",
    },
    resultHint: "SLA",
  },
  {
    id: "c_place_salon",
    channel: "place",
    label: "플레이스 — 홍대 미용실",
    menuPattern: /플레이스/,
    generatePattern: /플레이스 소개글 만들기/,
    preferStandalone: true,
    form: {
      brandName: "SLA레이어드살롱",
      region: "서울 홍대",
      topic: "5월 컬러 이벤트 예약 안내",
      placeHeadline: "컬러 이벤트",
    },
    resultHint: "영업|공지|안내|이벤트",
  },
  {
    id: "c_insta_flower",
    channel: "insta",
    label: "인스타 — 부산 꽃집",
    menuPattern: /인스타/,
    generatePattern: /인스타 캡션·해시태그 만들기/,
    preferStandalone: true,
    form: {
      brandName: "SLA꽃담",
      region: "부산 해운대",
      topic: "어버이날 꽃다발 예약",
      instaScene: "매장 픽업",
    },
    resultHint: "#|캡션|꽃",
  },
  {
    id: "c_image_pension",
    channel: "image",
    label: "썸네일 문구 — 제주 펜션",
    menuPattern: /썸네일/,
    generatePattern: /썸네일 문구 만들기/,
    preferStandalone: true,
    form: {
      brandName: "SLA애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인",
    },
    resultHint: "prompt|썸네일|비주얼|장면",
  },
];
