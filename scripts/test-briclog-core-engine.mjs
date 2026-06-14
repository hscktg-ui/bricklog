/**
 * BRICLOG Core Engine — manifest fingerprint · stamp · integrity
 */
import assert from "node:assert/strict";
import {
  BRICLOG_CORE_ENGINE_VERSION,
  assessCoreEngineDelivery,
  buildEnterpriseAcquisitionBrief,
  computeProcessFingerprint,
  getCoreEnginePublicProfile,
  stampCoreEngineDeliveryMeta,
  stampCoreEngineOnInput,
  verifyCoreEngineIntegrity,
} from "../lib/product/briclogCoreEngine.js";

const fp = computeProcessFingerprint();
assert.ok(fp.length >= 12, "fingerprint length");

const profile = getCoreEnginePublicProfile();
assert.equal(profile.version, BRICLOG_CORE_ENGINE_VERSION);
assert.equal(profile.fingerprint, fp);
assert.ok(profile.layers.length >= 8);

const input = stampCoreEngineOnInput({
  brandName: "꽃담",
  region: "부산 해운대",
  topic: "어버이날 꽃다발",
  industry: "꽃집",
});
assert.equal(input.briclogCoreEngine, true);
assert.equal(input.coreEnginePreflight.fingerprint, fp);

const pack = {
  title: "어버이날 꽃다발",
  sections: [
    { heading: "왜 찾게 됐는지", body: "어버이날을 앞두고 부모님께 드릴 꽃을 고르다가 해운대 꽃담을 알게 됐어요." },
    { heading: "매장에서 본 것", body: "다발 구성과 리본 색을 같이 맞춰 주셨고, 픽업 시간도 당일 안내로 확인했어요." },
  ],
  conclusion: "일정만 정리해 두면 상담이 빨라집니다.",
};

const assessment = assessCoreEngineDelivery(pack, input, "blog");
assert.ok(assessment.compositeScore >= 0);
assert.ok(assessment.brandOs.score >= 0);

const stamped = stampCoreEngineDeliveryMeta(pack, input, "blog");
assert.equal(stamped._meta.coreEngine.fingerprint, fp);
assert.ok(stamped._meta.coreEngine.integrityToken);

const integrity = verifyCoreEngineIntegrity(stamped);
assert.equal(integrity.ok, true);

const brief = buildEnterpriseAcquisitionBrief({ input, pack: stamped, channel: "blog" });
assert.equal(brief.process.fingerprint, fp);
assert.ok(brief.operatingPlan.headline);

console.log("OK: briclog core engine — fingerprint", fp, "composite", assessment.compositeScore);
