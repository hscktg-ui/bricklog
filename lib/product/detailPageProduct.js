/**
 * 브릭로그 상세 — 스마트스토어·쿠팡 상품 화면.
 * 공개 이름은 브릭로그. 「고르는 화면」은 약속이지 별도 브랜드가 아니다.
 */
export const DETAIL_PAGE_PRODUCT = {
  name: "브릭로그 상세",
  place: "스마트스토어 · 쿠팡",
  promise: "고르는 기준이 보이는 상품 화면",
  eyebrow: "브릭로그",
  headline: "글이 아니라,",
  headlineBreak: "고르는 화면이 생깁니다",
  versusGpt: "챗봇은 상세 글을 줍니다.",
  versusUs: "브릭로그는 붙일 이미지를 줍니다.",
  sub: "화면 순서는 네이버 쇼핑 랭킹 상세입니다. 붙이는 형식은 리스트 샘플처럼 섹션 이미지입니다.",
  loginTitle: "내 상품은 로그인 후",
  loginHint: "아래는 포장 쌀 맛보기입니다. 네이버 쇼핑 랭킹 리듬으로 붙인 860 이미지입니다.",
  sampleCaption:
    "맛보기 · 여주 햅쌀 10kg · 네이버 쇼핑 랭킹 리듬 · 리스트 샘플 이미지",
  samplePath: "/detail/sample",
  sampleZoneId: "landing-detail-sample",
  generateLabel: "만들기",
  ctaLabel: "상세 만들기",
  emptyResult: "왼쪽을 채우고 만들면, 붙일 이미지가 이쪽에 열립니다.",
  busyLine: "상세 이미지를 맞추는 중…",
  successOk: "고르는 화면이 생겼습니다",
  successNeed: "글은 나왔지만, 화면 기준 미달",
  standardOk: "사실·안내 통과",
  standardNeed: "사실·안내 보완 필요",
  engineGradeHint: "구성·글자",
  metaTitle: "브릭로그 상세 — 스마트스토어·쿠팡",
  metaDescription:
    "챗봇 글이 아니라 붙일 이미지입니다. 화면 순서는 네이버 쇼핑 랭킹 상세, 붙이는 형식은 리스트 샘플의 섹션 이미지입니다.",
  pillars: [
    {
      title: "막히는 점부터",
      desc: "스펙을 나열하지 않습니다. 고를 때 멈추는 지점부터 화면을 짭니다.",
    },
    {
      title: "넣은 것만",
      desc: "피사체가 다른 상품 컷을 먼저 채웁니다. 같은 포대를 세 칸에 넣지 않습니다. 없는 후기·가격은 쓰지 않습니다. 빈 피사체만 생성합니다.",
    },
    {
      title: "붙여넣기",
      desc: "네이버 쇼핑 랭킹 상세와 같은 순서로, 리스트 샘플처럼 섹션 이미지를 위에서부터 올립니다. 9개 몰 API는 쓰지 않습니다.",
    },
    {
      title: "나온 뒤 고치기",
      desc: "문장 수정, 이렇게 고쳐 주세요, 이 실패 잡기가 결과 다음에 이어집니다.",
    },
  ],
  fieldGroups: [
    {
      id: "product",
      n: "01",
      title: "상품",
      hint: "이름·가격·배송·컷(포장·원물·라벨)",
    },
    {
      id: "buyer",
      n: "02",
      title: "고르는 사람",
      hint: "누구인지, 어디서 멈추는지",
    },
    {
      id: "copy",
      n: "03",
      title: "화면에 남길 말",
      hint: "강조 문구와 꼭 넣을 내용",
    },
    {
      id: "frame",
      n: "04",
      title: "화면",
      hint: "길이·포인트 색",
    },
  ],
};
