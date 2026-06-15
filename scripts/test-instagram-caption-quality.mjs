/**
 * 인스타 캡션 — 분량·이모지·주제 정합성 회귀
 */
import assert from "node:assert/strict";
import { runInstagramPipeline } from "../lib/contentPipeline.js";
import { checkInstaQuality } from "../utils/qualityCheck.js";

const blog = {
  title: "어버이날, 말 대신 꽃으로 전하는 마음",
  sections: [
    {
      heading: "왜 찾게 됐는지",
      body: "어버이날을 앞두고 부모님께 드릴 꽃을 고르다가 해운대 꽃담을 알게 됐어요.",
    },
    {
      heading: "매장에서 본 것",
      body: "다발 구성과 리본 색을 같이 맞춰 주셨고, 픽업 시간도 당일 안내로 확인했어요.",
    },
  ],
  conclusion: "",
};

const scenarios = [
  {
    label: "flower-medium",
    input: {
      brandName: "꽃담",
      region: "부산 해운대",
      topic: "어버이날 꽃다발",
      mainKeyword: "어버이날 꽃다발",
      industry: "flower",
      instaBodyLength: "medium",
      instaEmojiLevel: "medium",
    },
  },
  {
    label: "cafe-medium",
    input: {
      brandName: "모닝테이블",
      region: "서울 성수",
      topic: "브런치 카페",
      mainKeyword: "성수 브런치",
      industry: "cafe",
      instaBodyLength: "medium",
      instaEmojiLevel: "medium",
    },
  },
];

let fail = 0;

for (const scenario of scenarios) {
  const insta = runInstagramPipeline(scenario.input, blog, "emotional", scenario.label);
  const captionCore =
    insta.lineBreakBody?.replace(/(?:#\S+\s*)+$/, "").trim() ||
    [insta.hook, insta.body, insta.ending].filter(Boolean).join("\n\n");
  const bodyLen = captionCore.replace(/\s/g, "").length;
  const emojis = (captionCore.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  const lines = captionCore.split(/\n+/).filter((l) => l.trim()).length;
  const topicToken = (scenario.input.topic || scenario.input.mainKeyword || "").split(/\s+/)[0];

  try {
    assert.ok(bodyLen >= 180, `${scenario.label}: caption too short (${bodyLen})`);
    assert.ok(emojis >= 3, `${scenario.label}: emojis ${emojis}`);
    assert.ok(lines >= 3, `${scenario.label}: lines ${lines}`);
    assert.ok(
      captionCore.replace(/\s/g, "").includes(topicToken.replace(/\s/g, "")),
      `${scenario.label}: topic "${topicToken}" missing`
    );
    const q = checkInstaQuality(insta, scenario.input);
    assert.ok(q.pass, `${scenario.label}: quality pass`);
    console.log(
      `OK ${scenario.label}: ${bodyLen}chars · ${emojis}emoji · ${lines}lines · hook="${(insta.hook || "").slice(0, 28)}"`
    );
  } catch (err) {
    fail += 1;
    console.error(`FAIL ${scenario.label}:`, err.message);
  }
}

if (fail) {
  console.error(`\n${fail} scenario(s) failed`);
  process.exit(1);
}

console.log("\nOK: instagram caption quality");
