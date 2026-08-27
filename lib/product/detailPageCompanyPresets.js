/**
 * 해신기획이 바로 쓰는 상세 프리셋 — 가상 브랜드 금지.
 * HOME100은 죽이지 말 것. BRICLOG는 운영 OS.
 */
export const DETAIL_PAGE_COMPANY_PRESETS = [
  {
    id: "haeshin-ops",
    label: "해신기획 · 월간 콘텐츠 운영",
    productName: "지역 브랜드 월간 콘텐츠 운영",
    brandName: "해신기획",
    region: "여주",
    industry: "마케팅 대행",
    target: "글·디자인 검수를 대표가 매번 붙잡지 않으려는 사장님",
    searchIntent: "대행사에 맡기면 광고처럼 나오고, 직접 쓰면 시간이 없다",
    features:
      "네이버 블로그·플레이스·인스타 초안을 한 브랜드 기준으로 맞춤\n조사 없는 글은 내보내지 않음\n대표 검수 루프를 기준 문서로 대체",
    brandDescription:
      "해신기획은 로컬 현장 경험과 AI를 붙여, 사장님이 매 건 카피를 고치지 않아도 되는 브랜드 콘텐츠 운영을 합니다.",
    accent: "#0f1a14",
    pageLength: "standard",
  },
  {
    id: "briclog-os",
    label: "BRICLOG · 브랜드 콘텐츠 OS",
    productName: "BRICLOG 이번 달 운영 계획",
    brandName: "BRICLOG",
    region: "여주",
    industry: "브랜드 콘텐츠",
    target: "네이버·플레이스·인스타를 한 흐름으로 돌리려는 로컬 사장님",
    searchIntent: "글 생성 툴은 많은데, 이번 달 무엇을 올릴지 계획이 없다",
    features:
      "브랜드·지역·주제로 이야기·플레이스·인스타 초안\n조사 우선, 없는 사실은 쓰지 않음\n사람이 쓴 것처럼 읽히는 편집본",
    brandDescription:
      "BRICLOG는 AI Writer가 아니라 로컬 브랜드 콘텐츠 운영 OS입니다. 글을 받는 것이 아니라 이번 달 운영이 생깁니다.",
    accent: "#03a94d",
    pageLength: "standard",
  },
  {
    id: "home100-showroom",
    label: "HOME100 · 쇼룸 상담",
    productName: "HOME100 매트리스 쇼룸 상담",
    brandName: "HOME100",
    region: "여주",
    industry: "가구",
    target: "허리가 먼저 아픈 아침에 침대를 바꾸려는 집",
    searchIntent: "온라인 스펙만 보다가, 누워 보기 전에 뭘 봐야 할지 모르겠다",
    features:
      "쇼룸에서 모델별로 누워 보고 고름\n프레임·매트리스를 따로 강요하지 않음\n상담 후 가져갈 기준을 적어 줌",
    brandDescription:
      "HOME100은 해신기획의 제조·쇼룸 테스트베드입니다. 스펙 나열보다 누워 본 느낌을 기준으로 고릅니다.",
    accent: "#3d2c29",
    pageLength: "standard",
  },
];

export function getDetailPageCompanyPreset(id) {
  return DETAIL_PAGE_COMPANY_PRESETS.find((p) => p.id === id) || null;
}
