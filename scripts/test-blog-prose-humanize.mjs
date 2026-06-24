import assert from "node:assert/strict";
import {
  stripBlogBridgeSpam,
  polishBlogProseParagraph,
  humanizeBlogProsePack,
} from "../lib/content/blogProseHumanize.js";
import { finalizeLaunchPublishBlogPack } from "../lib/config/launchPublishMode.js";

assert.equal(
  stripBlogBridgeSpam("이어서 이어서 향이 좋았어요."),
  "향이 좋았어요."
);
assert.equal(
  stripBlogBridgeSpam("이어서 첫 줄\n\n이어서 둘째 줄"),
  "첫 줄\n\n둘째 줄"
);
assert.equal(
  polishBlogProseParagraph("- \n\n이어서 본문입니다."),
  "본문입니다."
);
assert.ok(!/(?:이어서\s*){2,}/.test(polishBlogProseParagraph("이어서 이어서 테스트")));

const spammy = humanizeBlogProsePack({
  sections: [
    { heading: "이어서 소개", body: "- \n\n이어서 원두 향이 좋아요." },
    { heading: "정리", body: "마지막으로 저장해두세요." },
  ],
});
assert.ok(!/이어서\s*이어서/.test(spammy.sections.map((s) => s.body).join("\n")));
assert.ok(spammy.sections.every((s) => !/^[\s-]+$/.test(s.body)));

const polished = finalizeLaunchPublishBlogPack(
  {
    sections: [
      {
        heading: "테스트",
        body: "이어서 이어서 강남 테스트카페 원두 추천 글입니다. 싱글오리진 원두를 매주 로스팅해 향이 선명하고, 아메리카노 한 잔으로도 쓴맛과 산미 균형이 좋았습니다.",
      },
    ],
  },
  {
    brandName: "테스트카페",
    region: "서울",
    topic: "원두 추천",
    researchFacts: ["싱글오리진 원두를 매주 로스팅합니다."],
  }
);
assert.ok(polished.sections?.length >= 1);
assert.ok(!/(?:이어서\s*){2,}/.test(polished.sections.map((s) => s.body).join("\n")));
assert.ok(polished._meta?.launchPublishFirst === true);

console.log("test-blog-prose-humanize: OK");
