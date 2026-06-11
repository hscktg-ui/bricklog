/**
 * 카탈로그 오염 문장 차단 검증
 */
import assert from "node:assert/strict";
import {
  isCatalogContaminationSentence,
  stripCatalogContaminationFromBlogPack,
  stripCatalogContaminationFromChannelPack,
} from "@/lib/product/catalogContaminationGuard.js";

const samples = [
  "에이스침대 비교 시 수면 자세·체압 분산·배송·설치 일정을 함께 적어 두면 상담이 빨라집니다.",
  "직접 확인해 보니 생각보다 선택 기준이 달라졌어요.",
  "비교해 보니 가격보다 방문 동선이 먼저 정리됐어요.",
  "에이스침대에서 확인한 기준이 명확했어요.",
  "경기도 용인 에이스침대, 선택지로 볼 때 — 확인 포인트",
  "공간 설명에서는 방 크기와 배치 동선을 함께 제시해야 선택이 쉬워집니다.",
  "경기도 용인 에이스침대 스트레스리스 — 좌판·등받이·팔걸이를 함께 보면 선택이 수월해요.",
  "프랜차이즈 쇼룸 안내를 기준으로 확인하시면 돼요.",
];

for (const s of samples) {
  assert.ok(isCatalogContaminationSentence(s), `should detect: ${s.slice(0, 40)}`);
}

const blog = stripCatalogContaminationFromBlogPack({
  title: "경기도 용인 에이스침대, 선택지로 볼 때",
  sections: [
    {
      heading: "안내 — 확인 포인트",
      body: "좋은 정보입니다.\n\n직접 확인해 보니 생각보다 선택 기준이 달라졌어요.\n\n비교해 보니 가격보다 방문 동선이 먼저 정리됐어요.",
    },
  ],
});
assert.ok(!/선택지로\s*볼\s*때/.test(blog.title));
assert.ok(!/확인\s*포인트/.test(blog.sections[0].heading));
assert.ok(!/선택\s*기준이\s*달라졌/.test(blog.sections[0].body));

const furniture = stripCatalogContaminationFromBlogPack({
  title: "경기도 용인 에이스침대 스트레스리스",
  conclusion:
    "경기도 용인 에이스침대 스트레스리스 — 좌판·등받이·팔걸이를 함께 보면 선택이 수월해요. 프랜차이즈 쇼룸 안내를 기준으로 확인하시면 돼요.",
  sections: [{ heading: "체험", body: "쇼룸에서 앉아 비교해 봤어요." }],
});
assert.ok(!/좌판·등받이·팔걸이/.test(furniture.conclusion || ""));
assert.ok(!/프랜차이즈\s*쇼룸/.test(furniture.conclusion || ""));
assert.ok(furniture._meta?.catalogContaminationStripped);

const place = stripCatalogContaminationFromChannelPack(
  {
    title: "에이스침대 안내",
    shortNotice: "비교해 보니 가격보다 방문 동선이 먼저 정리됐어요.",
    detailBody: "저희 매장에서 안내드립니다.",
  },
  "place"
);
assert.ok(!/비교해\s*보니/.test(place.shortNotice));
assert.ok(/안내드립니다/.test(place.detailBody));

console.log("OK: catalog contamination guard strips editor v95 / contentGate phrases");
