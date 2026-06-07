/**
 * TOPIC LOCK · TOPIC ANSWER 엔진 회귀
 */
import assert from "node:assert/strict";
import {
  buildAllowedEntityList,
  buildTopicLock,
  detectTopicLockContamination,
  assertTopicLockPreWrite,
  sanitizeTopicLockViolations,
} from "../lib/product/topicLockEngine.js";
import {
  buildTitleAnswerChecklist,
  assessTopicAnswer,
  assertTopicAnswerPostWrite,
} from "../lib/product/topicAnswerEngine.js";
import { PIPELINE_ORDER_STRICT } from "../lib/product/briclogPriority.js";

assert.ok(PIPELINE_ORDER_STRICT.includes("topic_lock"));
assert.ok(PIPELINE_ORDER_STRICT.includes("topic_answer"));

const input = {
  brandName: "에이스침대",
  region: "평택",
  topic: "온누리상품권 10% 안내",
  industry: "furniture",
  includePhrases: "온누리상품권, 10% 할인, 결제 방법, 주의사항",
};

const allowlist = buildAllowedEntityList(input);
assert.ok(allowlist.ok);
assert.ok(allowlist.entities.some((e) => e.text.includes("에이스침대")));
assert.ok(allowlist.entities.some((e) => e.text.includes("온누리")));

const lockGate = assertTopicLockPreWrite({ ...input, topicLock: buildTopicLock(input) });
assert.equal(lockGate.ok, true);

const checklist = buildTitleAnswerChecklist("에이스침대 온누리상품권 10% 안내", input);
assert.ok(checklist.items.length >= 4);
assert.ok(checklist.items.some((i) => /사용\s*방법|상품권/.test(i.label)));

const goodPack = {
  title: "에이스침대 온누리상품권 10% 안내",
  representativeTitle: "에이스침대 온누리상품권 10% 안내",
  sections: [
    {
      heading: "안내",
      body:
        "에이스침대 평택 매장에서 온누리상품권 결제 수단을 사용할 수 있습니다. " +
        "사용 방법은 매장 결제 시 상품권 바코드를 제시하면 됩니다. " +
        "10% 할인이 적용되는 혜택이 있으며, 적용 방식은 결제 금액에서 할인됩니다. " +
        "일부 품목은 제외될 수 있으니 주의사항을 확인해 주세요.",
    },
    {
      heading: "문의",
      body: "에이스침대 평택점 운영 시간과 문의 채널은 매장 안내를 참고하세요.",
    },
    { heading: "정리", body: "온누리상품권 10% 혜택을 이용할 때 확인할 점을 정리했습니다." },
  ],
};

const goodAnswer = assessTopicAnswer(goodPack, { ...input, topicLock: buildTopicLock(input) });
assert.equal(goodAnswer.ok, true, goodAnswer.missingRequired?.join(", "));

const thinPack = {
  title: "에이스침대 온누리상품권 10% 안내",
  sections: [
    { heading: "소개", body: "에이스침대 매장입니다. 편안한 침대를 만나보세요." },
    { heading: "본문", body: "좋은 수면 환경을 제공합니다." },
    { heading: "끝", body: "방문해 주세요." },
  ],
};
const thinAnswer = assessTopicAnswer(thinPack, input);
assert.equal(thinAnswer.ok, false);
assert.ok(thinAnswer.needsRegen);

const petLeakPack = {
  title: "플레르퍼피 방문 후기",
  sections: [
    {
      heading: "본문",
      body: "반려견과 함께 방문했습니다. 매트리스 체압분산 스프링 구조를 비교해 봤어요.",
    },
    { heading: "정리", body: "플레르퍼피 공간이 좋았습니다." },
    { heading: "끝", body: "다음에 또 올게요." },
  ],
};
const petInput = {
  brandName: "플레르퍼피",
  region: "판교",
  topic: "방문 후기",
  industry: "pet_cafe",
};
const leak = detectTopicLockContamination(petLeakPack, {
  ...petInput,
  topicLock: buildTopicLock(petInput),
});
assert.equal(leak.ok, false);

const sanitized = sanitizeTopicLockViolations(petLeakPack, {
  ...petInput,
  topicLock: buildTopicLock(petInput),
});
const sanitizedText = sanitized.sections.map((s) => s.body).join(" ");
assert.ok(!/매트리스|체압분산/.test(sanitizedText) || sanitized._meta?.topicLockSanitized);

const postAnswer = assertTopicAnswerPostWrite(goodPack, input);
assert.equal(postAnswer.ok, true);

console.log("OK: topic lock + topic answer engines");
