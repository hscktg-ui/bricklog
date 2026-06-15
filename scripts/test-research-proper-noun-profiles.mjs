/**
 * 조사·고유명 프로필 — 업종·브랜드별 글값 축 회귀
 */
import assert from "node:assert/strict";
import {
  isResearchProperNounTopic,
  scoreResearchProperNounAnchoring,
  scoreResearchFactAnchoringForInput,
} from "../lib/product/researchProperNounProfile.js";
import { buildBlogContextAxes } from "../lib/product/blogContextAxesEngine.js";
import { computeContentQualityValue } from "../lib/product/contentQualityValue.js";

process.env.BRICLOG_MISSION = "true";

const SCENARIOS = [
  {
    id: "stressless",
    input: {
      brandName: "에이스침대",
      region: "경기도 용인",
      topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
      industry: "가구",
      researchFacts: [
        "스트레스리스 제로지 모드·리클라이닝 각도",
        "STRESSLESS MINT LB D200 좌판 쿠션",
      ],
    },
    pack: {
      title: "에이스침대 STRESSLESS MINT LB D200",
      sections: [
        {
          body:
            "경기도 용인 에이스침대에서 STRESSLESS MINT LB D200을 봤어요. 스트레스리스 제로지 모드와 리클라이닝 각도를 바꿔 보니 좌판·등받이 차이가 분명했어요.",
        },
        {
          body:
            "같은 라인에서도 MINT LB 모델마다 쿠션 밀도가 달라, 식탁 높이에 맞춰 앉아 본 뒤 고르는 편이 좋았어요.",
        },
        { body: "프랜차이즈 쇼룸이라 전시 구성은 지점마다 다를 수 있어요." },
      ],
    },
    minTopic: 72,
  },
  {
    id: "tempur_mattress",
    input: {
      brandName: "템퍼",
      region: "서울 강남",
      topic: "TEMPUR PROADAPT 미디엄 매트리스 비교",
      industry: "가구",
      researchFacts: ["PROADAPT 미디엄 체압 분산", "쇼룸 10분 누워보기"],
    },
    pack: {
      title: "강남 템퍼 PROADAPT",
      sections: [
        {
          body:
            "서울 강남 템퍼 쇼룸에서 TEMPUR PROADAPT 미디엄을 10분 넘게 누워 봤어요. 체압 분산이 어디에서 느껴지는지 먼저 확인했어요.",
        },
        { body: "프로애드 라인은 모델마다 상단 쿠션 층이 달라 비교가 필요해요." },
      ],
    },
    minTopic: 70,
  },
  {
    id: "flower_summer",
    input: {
      brandName: "그랩앤고플라워",
      region: "파주 운정",
      topic: "여름 꽃 추천",
      industry: "꽃집",
      researchFacts: ["수국은 습도에 강함", "해바라기는 여름 선물에 많이 고름"],
    },
    pack: {
      title: "파주 운정 여름 꽃 추천",
      sections: [
        {
          body:
            "파주 운정 그랩앤고플라워에서 여름 꽃 추천을 받을 때 수국과 해바라기를 자주 함께 봐요. 수국은 습도에 강하고, 해바라기는 선물용으로 묻는 분이 많아요.",
        },
        { body: "24시간 무인 픽업이라 예약 시간만 맞추면 됩니다." },
      ],
    },
    minTopic: 70,
  },
  {
    id: "salon_treatment",
    input: {
      brandName: "루미에르 살롱",
      region: "부산 해운대",
      topic: "슈링크 리프팅 시술 비교",
      industry: "미용실",
      researchFacts: ["슈링크는 리프팅 시술", "시술 후 붓기 관리"],
    },
    pack: {
      title: "해운대 슈링크 리프팅",
      sections: [
        {
          body:
            "부산 해운대 루미에르 살롱에서 슈링크 리프팅 상담을 받았어요. 시술 전후 붓기 관리와 리프팅 범위를 먼저 확인했어요.",
        },
      ],
    },
    minTopic: 68,
  },
  {
    id: "dental_implant",
    input: {
      brandName: "미소치과",
      region: "대전 유성",
      topic: "지르코니아 임플란트 상담",
      industry: "치과",
      researchFacts: ["지르코니아 보철 재료", "임플란트 상담 시 CT 촬영"],
    },
    pack: {
      title: "유성 지르코니아 임플란트",
      sections: [
        {
          body:
            "대전 유성 미소치과에서 지르코니아 임플란트 상담을 받았어요. CT 촬영 후 임플란트 위치와 보철 재료를 함께 설명해 주셨어요.",
        },
      ],
    },
    minTopic: 68,
  },
  {
    id: "cafe_signature",
    input: {
      brandName: "모닝브루",
      region: "제주 연동",
      topic: "시그니처 블렌드 원두 추천",
      industry: "카페",
      researchFacts: ["핸드드립 시그니처 블렌드", "산미·바디 밸런스"],
    },
    pack: {
      title: "제주 시그니처 블렌드",
      sections: [
        {
          body:
            "제주 연동 모닝브루에서 시그니처 블렌드 원두를 핸드드립으로 맛봤어요. 산미와 바디 밸런스를 비교해 고르기 좋았어요.",
        },
      ],
    },
    minTopic: 68,
  },
  {
    id: "galaxy_phone",
    input: {
      brandName: "삼성전자 서비스센터",
      region: "서울 종로",
      topic: "Galaxy Z Fold6 스펙 비교",
      industry: "전자",
      researchFacts: ["Galaxy Z Fold6 접힘·펼침 두께", "SM-F956 모델"],
    },
    pack: {
      title: "Galaxy Z Fold6 비교",
      sections: [
        {
          body:
            "서울 종로 삼성전자 서비스센터에서 Galaxy Z Fold6를 펼쳐 봤어요. SM-F956 모델 기준 접힘·펼침 두께 차이를 확인했어요.",
        },
      ],
    },
    minTopic: 68,
  },
];

for (const sc of SCENARIOS) {
  assert.ok(
    isResearchProperNounTopic(sc.input),
    `${sc.id} must be research-proper-noun topic`
  );
  const full = sc.pack.sections.map((s) => s.body).join("\n\n");
  const anchor = scoreResearchProperNounAnchoring(full, sc.input);
  assert.ok(
    anchor.score >= sc.minTopic - 8,
    `${sc.id} anchor low: ${anchor.score}`
  );

  const factAnchor = scoreResearchFactAnchoringForInput(full, sc.input);
  assert.ok(
    factAnchor.ratio >= 0.5 || factAnchor.total === 0,
    `${sc.id} fact anchor weak: ${JSON.stringify(factAnchor)}`
  );

  const axes = buildBlogContextAxes(sc.pack, sc.input, {
    grounded: { ok: true, rate: 0.65 },
  });
  const topic = axes.axes.find((a) => a.id === "topic");
  const trust = axes.axes.find((a) => a.id === "trust");
  assert.ok(topic.score >= sc.minTopic, `${sc.id} topic axis: ${topic.score}`);
  assert.ok(trust.score >= 64, `${sc.id} trust axis: ${trust.score}`);

  const sqv = computeContentQualityValue(sc.pack, sc.input);
  assert.ok(
    (sqv.breakdown?.brandSpecificity ?? 100) >= 58,
    `${sc.id} sqv brandSpecificity: ${sqv.breakdown?.brandSpecificity}`
  );
}

console.log(
  "OK: research proper noun profiles —",
  SCENARIOS.map((s) => s.id).join(", ")
);
