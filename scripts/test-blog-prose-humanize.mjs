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
    _meta: { outputWithheld: true, withholdReason: "stale_gate" },
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
assert.equal(polished._meta?.outputWithheld, false);
assert.ok(String(polished.fullCopyText || "").trim().length > 20);

const blogSpammy = humanizeBlogProsePack(
  {
    sections: [
      {
        heading: "이어서 소개",
        body: "📍 여주, 문득 수영장 개장이 떠올라서 여주, 수영장 개장. 🔎 여주 새 브랜드 왜 매장 안내를 찾게 됐는지 방문·상담 때문에 이야기 나누기 전에 기준부터 정리했어요. ✔ 현장 새 브랜드에 직접 들어가 확인했어요 — 마음에 들해요 · 쇼룸 · 프로필 확인.",
      },
    ],
  },
  {
    brandName: "새 브랜드",
    region: "여주",
    topic: "여주, 수영장 개장",
  }
);
assert.ok(!/새\s*브랜드|들해요|🔎|찾게\s*됐/.test(blogSpammy.sections.map((s) => s.body).join("\n")));
assert.ok(String(blogSpammy.fullCopyText || "").trim().length > 30);
assert.ok(!/(?:이어서\s*){2,}/.test(blogSpammy.fullCopyText || ""));

console.log("test-blog-prose-humanize: OK");
