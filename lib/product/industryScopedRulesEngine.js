/**
 * 업종 격리 규칙 — 진화·피드백·프롬프트 힌트가 타 업종에 새지 않도록 필터
 */
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";

/** 힌트·금지어에 타 업종 마커가 있으면 현재 업종과 불일치 */
const CROSS_INDUSTRY_MARKERS = {
  flower: [/매트리스|프레임|쇼룸|가구\s*배송|모션\s*베드|침실\s*연출|전시대|오피모/i],
  unmanned_flower: [/매트리스|프레임|쇼룸|가구|침대\s*매장/i],
  furniture: [/꽃다발|화환|무인\s*꽃|리본\s*포장|플라워\s*샵|생화|꽃집/i],
  cafe: [/매트리스|프레임|꽃다발|진료\s*접수|처방|내과/i],
  hospital: [/꽃다발|매트리스|에스프레소|브런치|쇼룸\s*체험/i],
  salon: [/매트리스|꽃다발|진료\s*접수|쇼룸\s*라인업/i],
  restaurant: [/매트리스|꽃다발|헤어\s*디자인|진료/i],
  marketing: [/매트리스|꽃다발|메뉴판|진료\s*접수/i],
  pet: [/매트리스|쇼룸|진료\s*과/i],
  pet_cafe: [/매트리스|쇼룸|진료/i],
  default: [/매트리스\s*체험|꽃다발\s*포장|전시대\s*연출/i],
};

const FURNITURE_ONLY_STRUCTURE =
  /쇼룸\s*체험|매트리스\s*비교|프레임\s*라인업|침실\s*동선|가구\s*배송\s*설치/i;

const FLOWER_ONLY_STRUCTURE =
  /꽃다발\s*포장|무인\s*꽃집\s*24|화환\s*주문|리본\s*색감/i;

function markersForKey(key) {
  return CROSS_INDUSTRY_MARKERS[key] || CROSS_INDUSTRY_MARKERS.default;
}

function lineMatchesForeignIndustry(line, lockedKey) {
  const text = String(line || "");
  if (!text.trim()) return false;
  for (const [key, patterns] of Object.entries(CROSS_INDUSTRY_MARKERS)) {
    if (key === lockedKey || key === "default") continue;
    if (patterns.some((re) => re.test(text))) return true;
  }
  return false;
}

const VISIT_REVIEW_HINT =
  /방문\s*후기|솔직\s*후기|다녀왔어요|장단점·체감|FAQ·체크리스트\s*금지|확인하세요|권합니다/i;

/**
 * @param {string[]} hints
 * @param {object} input
 */
export function filterEvolutionHintsForIndustry(hints = [], input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const block = markersForKey(key);
  const speaker = String(input.v4Speaker || "").trim();
  const columnMode =
    !isVisitReviewTopicInput(input) &&
    ["brand_intro", "expert_info", "magazine", "local_blogger"].includes(speaker);

  return (hints || []).filter((h) => {
    const t = String(h || "");
    if (!t.trim()) return false;
    if (columnMode && VISIT_REVIEW_HINT.test(t)) return false;
    if (block.some((re) => re.test(t))) return false;
    if (key !== "furniture" && FURNITURE_ONLY_STRUCTURE.test(t)) return false;
    if (key !== "flower" && key !== "unmanned_flower" && FLOWER_ONLY_STRUCTURE.test(t)) {
      return false;
    }
    return !lineMatchesForeignIndustry(t, key);
  });
}

/**
 * @param {string[]} phrases
 * @param {object} input
 */
export function filterForbiddenPhrasesForIndustry(phrases = [], input = {}) {
  const key = resolveBriclogIndustryKey(input);
  return (phrases || []).filter((p) => !lineMatchesForeignIndustry(p, key));
}

/**
 * @param {object} input
 * @returns {string}
 */
export function resolveIndustryScopedStructureHint(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const arcs = {
    flower:
      "시즌 도입 → 지역·브랜드 → 꽃 종류(실명 3+) → 목적별 선택 → 보관 팁 → 브랜드 운영 → 여운 마무리",
    furniture:
      "방문 이유 → 쇼룸·제품 구성 → 체험·비교 포인트 → 동선·실측 → 배송·A/S → 브랜드 → 마무리",
    cafe: "분위기·메뉴 → 지역 맥락 → 시즌·대표 메뉴 → 목적별 좌석·시간 → 팁 → 브랜드 → 마무리",
    hospital: "증상·상황 → 지역·병원 → 진료·검사 흐름 → 준비물 → 주의 → 브랜드 → 마무리",
    salon: "스타일 니즈 → 지역·살롱 → 시술·케어 종류 → 선택 기준 → 관리 → 브랜드 → 마무리",
    default:
      "상황 도입 → 지역·브랜드 → 구체 품목·서비스 → 목적별 선택 → 실용 팁 → 운영 특성 → 마무리",
  };
  return arcs[key] || arcs.default;
}
