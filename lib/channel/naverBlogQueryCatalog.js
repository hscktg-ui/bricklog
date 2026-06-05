/**
 * 네이버 블로그 학습용 검색 쿼리 카탈로그 — 업종·지역·주제·의도 조합
 */
import {
  GENERAL_CATEGORIES,
  SENSITIVE_CATEGORIES,
  REGIONS,
} from "@/lib/quality/training/constants";

/** 소규모 스모크용 (15건) */
export const NAVER_LEARN_QUERIES_LEGACY = [
  "파주 가구 매장 후기",
  "강남 카페 브런치",
  "수원 꽃집 선물",
  "인천 치과 방문 후기",
  "분당 인테리어 시공",
  "에이스침대 매장 체험",
  "평택 맛집 솔직",
  "홍대 미용실 염색",
  "송도 학원 상담",
  "대구 세차 후기",
  "모션베드 매장 방문",
  "오피모 전시",
  "템퍼 매장 체험",
  "제주 카페 추천",
  "광주 병원 예약",
];

export const EXTENDED_REGIONS = [
  ...REGIONS,
  "수원",
  "분당",
  "일산",
  "파주",
  "평택",
  "성수",
  "이태원",
  "건대",
  "판교",
  "창원",
  "울산",
  "청주",
  "전주",
  "춘천",
  "안양",
  "김포",
  "하남",
  "용인",
  "시흥",
  "광명",
  "구리",
  "의정부",
  "천안",
  "포항",
  "세종",
  "목포",
  "여수",
  "원주",
  "남양주",
];

/** 업종별 검색 토픽 시드 */
export const CATEGORY_TOPIC_SEEDS = {
  카페: ["브런치", "디저트", "루프탑", "작업하기 좋은", "신메뉴", "베이커리", "커피", "티하우스"],
  꽃집: ["꽃다발", "웨딩", "기념일", "장례", "플로리스트", "배달", "화환", "꽃바구니"],
  음식점: ["맛집", "점심", "회식", "솔직후기", "웨이팅", "예약", "코스", "브런치"],
  미용실: ["염색", "펌", "두피", "네일", "속눈썹", "컷", "클리닉", "스타일"],
  학원: ["상담", "입시", "체험수업", "학습지", "특강", "겨울방학", "방학", "수능"],
  가구점: ["침대", "매트리스", "소파", "모션베드", "전시", "행사", "쇼룸", "리클라이너"],
  인테리어: ["시공", "리모델링", "셀프", "견적", "원룸", "주방", "욕실", "도배"],
  헬스장: ["PT", "필라테스", "GX", "등록", "체험", "다이어트", "요가", "크로스핏"],
  광고대행사: ["마케팅", "브랜딩", "SNS", "견적", "포트폴리오", "컨설팅", "바이럴", "퍼포먼스"],
  "온라인 쇼핑몰": ["할인", "신상", "리뷰", "배송", "교환", "이벤트", "세일", "쿠폰"],
  펜션: ["가족", "애견", "바베큐", "풀빌라", "기념일", "조식", "독채", "글램핑"],
  공방: ["원데이클래스", "도자기", "향수", "가죽", "체험", "선물", "캔들", "드로잉"],
  병원: ["예약", "진료", "검진", "상담", "대기", "접수", "물리치료", "MRI"],
  약국: ["야간", "처방", "상담", "영업시간", "위치", "한약", "영양제"],
  법률: ["상담", "분야", "사례", "비용", "절차", "형사", "이혼", "교통사고"],
  세무: ["기장", "세금", "상담", "신고", "절세", "부가세", "종소세"],
  노무: ["퇴직", "임금", "상담", "쟁의", "4대보험", "해고", "산재"],
  부동산: ["매매", "전세", "월세", "입지", "상담", "아파트", "상가", "분양"],
  금융: ["대출", "금리", "상담", "비교", "가입", "적금", "펀드"],
  보험: ["실비", "암", "상담", "청구", "비교", "자동차", "운전자"],
  건강기능식품: ["효능", "복용", "후기", "성분", "비교", "유산균", "오메가3"],
};

export const QUERY_INTENTS = [
  "후기",
  "솔직후기",
  "추천",
  "방문",
  "체험",
  "예약",
  "비교",
  "정리",
  "다녀온",
  "가볼만한",
  "꿀팁",
  "솔직",
  "리뷰",
  "알아본",
  "찾아본",
  "방문후기",
  "체험후기",
  "솔직 리뷰",
];

export const UNIVERSAL_TOPIC_SEEDS = [
  "신규 오픈",
  "할인 행사",
  "프로모션",
  "시즌 메뉴",
  "전시",
  "체험 이벤트",
  "예약 방법",
  "주차",
  "영업시간",
  "웨이팅",
  "가격",
  "견적",
  "A/S",
  "배송",
  "설치",
  "오픈",
  "이벤트",
  "쿠폰",
  "단골",
  "재방문",
];

function dedupeQueries(list) {
  const seen = new Set();
  const out = [];
  for (const q of list) {
    const k = q.replace(/\s+/g, " ").trim().toLowerCase();
    if (k.length < 4 || seen.has(k)) continue;
    seen.add(k);
    out.push(q.replace(/\s+/g, " ").trim());
  }
  return out;
}

/**
 * @param {object} [opts]
 * @returns {string[]}
 */
export function buildNaverBlogLearnQueries(opts = {}) {
  const target = opts.targetQueries ?? 420;
  const fullCatalog = opts.fullCatalog === true || target >= 2000;
  const categories = [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES];
  const regions = opts.regions || EXTENDED_REGIONS;
  const queries = [];

  const intentSlice = fullCatalog ? QUERY_INTENTS : QUERY_INTENTS.slice(0, 5);
  const seedSlice = fullCatalog ? null : 4;
  const regionSlice = fullCatalog ? regions : regions;

  for (const region of regionSlice) {
    for (const category of categories) {
      const seeds = CATEGORY_TOPIC_SEEDS[category] || UNIVERSAL_TOPIC_SEEDS;
      const seedList = seedSlice ? seeds.slice(0, seedSlice) : seeds;
      for (const intent of intentSlice) {
        queries.push(`${region} ${category} ${intent}`);
      }
      for (const seed of seedList) {
        queries.push(`${region} ${seed} ${category}`);
        queries.push(`${region} ${category} ${seed}`);
      }
    }
  }

  if (fullCatalog) {
    for (const region of regions) {
      for (const seed of UNIVERSAL_TOPIC_SEEDS) {
        for (const tail of ["후기", "추천", "방문", "체험", "솔직"]) {
          queries.push(`${region} ${seed} ${tail}`);
        }
      }
    }
    for (const category of categories) {
      for (const intent of QUERY_INTENTS) {
        queries.push(`${category} ${intent}`);
      }
    }
  } else {
    for (const region of regions.slice(0, 12)) {
      for (const seed of UNIVERSAL_TOPIC_SEEDS) {
        queries.push(`${region} ${seed} 후기`);
        queries.push(`${region} ${seed} 추천`);
      }
    }
    for (const category of categories) {
      for (const intent of ["솔직후기", "방문후기", "체험후기", "비교", "정리"]) {
        queries.push(`${category} ${intent}`);
      }
    }
  }

  queries.push(
    "침대 매장 체험",
    "모션베드 후기",
    "템퍼 매장",
    "에이스침대 전시",
    "오피모 전시",
    "꽃집 배달 후기",
    "성수 카페",
    "강남 맛집",
    "네일샵 추천",
    "세차 후기",
    "이사 견적",
    "인테리어 시공 후기",
    "피부과 예약",
    "치과 상담",
    "학원 체험",
    "헬스장 등록",
    "펜션 추천",
    "공방 원데이",
    "쇼핑몰 할인",
    "마케팅 대행사",
    "한의원 후기",
    "동물병원 추천",
    "피부관리 후기",
    "이사업체 후기",
    "렌트카 후기",
    "키즈카페 추천",
    "독서실 후기",
    "코워킹 추천",
    "스튜디오 촬영",
    "웨딩홀 상담"
  );

  const deduped = dedupeQueries(queries);
  if (fullCatalog || deduped.length <= target) return deduped;

  const step = deduped.length / target;
  const sampled = [];
  for (let i = 0; i < target; i++) {
    sampled.push(deduped[Math.floor(i * step)]);
  }
  return dedupeQueries(sampled);
}

export function queryCategoryHint(query = "") {
  const q = String(query || "");
  for (const cat of [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES]) {
    if (q.includes(cat)) return cat;
  }
  if (/카페|브런치|커피/.test(q)) return "카페";
  if (/맛집|음식/.test(q)) return "음식점";
  if (/침대|가구|모션/.test(q)) return "가구점";
  if (/꽃/.test(q)) return "꽃집";
  if (/병원|치과|피부/.test(q)) return "병원";
  return "기타";
}
