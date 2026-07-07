/**
 * Council 브리프 표준 3케이스 — docs/COUNCIL_BRIEF.md 와 동기화
 */
export const COUNCIL_BRIEF_VERSION = "council-brief-v1";

/** @typedef {"contract_wrong"|"visit_leak"|"macro_only"|"segment_missing"} CouncilAxisTag */

export const COUNCIL_BRIEF_CASES = [
  {
    id: "A",
    label: "정보·제품 소개 (segmented)",
    input: {
      brandName: "그랩앤고플라워",
      region: "평택",
      industry: "꽃집",
      topic: "여름에 사야 할 꽃 소개",
    },
    expect: {
      contractTypes: ["info_guide", "info", "product_guide"],
      density: "segmented",
      visitToneAllowed: false,
      persona: "info_intro",
      perspective: "informational",
      missionVisitForbidden: true,
    },
  },
  {
    id: "B",
    label: "자사·SaaS 소개 (segmented)",
    input: {
      brandName: "브릭로그",
      region: "",
      industry: "SaaS",
      topic: "작업실과 채널별 초안 기능 소개",
    },
    expect: {
      contractTypes: ["product_guide"],
      density: "segmented",
      visitToneAllowed: false,
      persona: "info_intro",
      perspective: "informational",
      missionVisitForbidden: true,
      missionHints: [/작업실|채널|조사/],
    },
  },
  {
    id: "C",
    label: "명시 방문 후기 (narrative)",
    input: {
      brandName: "동네카페",
      region: "홍대",
      industry: "카페",
      topic: "홍대 브런치 카페 방문 후기",
    },
    expect: {
      contractTypes: ["visit_review"],
      density: "narrative",
      visitToneAllowed: true,
      persona: "visit_review",
      perspective: "review",
      missionVisitForbidden: false,
    },
  },
];

export const COUNCIL_MISSION_VISIT_RE =
  /직접\s*(?:가|다녀|봤)|매장\s*문을\s*열고|진열대|비교해\s*봤|다녀왔|들었어요/;

/**
 * @param {object} result
 * @returns {CouncilAxisTag | null}
 */
export function inferCouncilAxisTag(result) {
  if (result.contractWrong) return "contract_wrong";
  if (result.visitLeak) return "visit_leak";
  if (result.segmentMissing) return "segment_missing";
  if (result.macroOnly) return "macro_only";
  return null;
}
