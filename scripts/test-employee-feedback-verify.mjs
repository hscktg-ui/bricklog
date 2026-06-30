/**
 * 금일 직원 피드백(유리·임현규) 반영 회귀 — 로컬 SSOT
 * Run: npm run test:employee-feedback-verify
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  toggleContextBeatChip,
  splitContextBeatParts,
  resolveGenerationContextBeat,
  needsGenerationContextBeat,
} from "../lib/product/generationContextBeat.js";
import { applySimpleWorkspaceDefaults } from "../lib/product/simpleWorkspaceDefaults.js";
import { evaluateEditorGradeResearchGate } from "../lib/product/editorGradeResearchGate.js";
import { DEFAULT_RESEARCH_BUNDLE } from "../lib/research/types.js";
import { INDUSTRY_QUICK_PICKS } from "../lib/brand/industryAutocomplete.js";
import { EMPTY_STORY, WRITE_FLOW_STEPS } from "../lib/product/craft.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.BRICLOG_RESET_QUALITY = "true";

// 1) 임현규 — 컨텍스트 비트 칩 토글(중복·해제)
{
  const a = "애월바다 — 오션뷰";
  const b = "애월바다 — 바비큐";
  let line = toggleContextBeatChip("", a);
  line = toggleContextBeatChip(line, b);
  line = toggleContextBeatChip(line, a);
  assert.equal(line, b, "chip deselect leaves other chip");
  assert.deepEqual(splitContextBeatParts(line), [b]);
}

// 2) 임현규 — 침대·매트리스 업종 + 가구 비트
{
  assert.ok(INDUSTRY_QUICK_PICKS.includes("침대·매트리스"), "mattress industry quick pick");
  const beat = resolveGenerationContextBeat({
    brandName: "금성침대",
    industry: "침대·매트리스",
    topic: "김포 매트리스 체험",
  });
  assert.equal(beat.industryKey, "furniture");
  assert.ok(beat.chips.length >= 3, "furniture context chips");
}

// 3) 유리 — 구매자 후기형 오인 방지 (brand_intro)
{
  const applied = applySimpleWorkspaceDefaults({
    brandName: "모닝브루",
    region: "강남",
    topic: "브런치 메뉴",
    v4Speaker: "auto",
  });
  assert.equal(applied.v4Speaker, "brand_intro", "simple mode defaults brand_intro not real_use");
  assert.deepEqual(applied.researchTypes, DEFAULT_RESEARCH_BUNDLE, "research bundle simplified");
}

// 4) 유리 — 조사 팩트 부족 메시지 (N/M)
{
  const gate = evaluateEditorGradeResearchGate({
    brandName: "산책카페",
    region: "전주",
    topic: "한옥마을 카페",
    industry: "카페",
    researchFacts: [{ fact: "산책카페", source: "brand_axis" }],
  });
  assert.equal(gate.ok, false);
  assert.match(gate.userMessage, /현재 \d+\/\d+개/, "fact count in withhold message");
}

// 5) 임현규 — 새 글 쓰기 CTA
{
  assert.equal(EMPTY_STORY.newStoryCta, "새 글 쓰기");
  const editor = readFileSync(join(root, "components/BlogEditor.jsx"), "utf8");
  assert.match(editor, /handleNewStory/, "BlogEditor new story handler");
  assert.match(editor, /EMPTY_STORY\.newStoryCta/, "new story CTA wired");
}

// 6) 임현규 — 브랜드 추가 실패 처리 + 게이트 버튼
{
  const ctx = readFileSync(join(root, "context/BrandWorkspaceContext.jsx"), "utf8");
  const gate = readFileSync(join(root, "components/BrandWorkspaceGate.jsx"), "utf8");
  const switcher = readFileSync(join(root, "components/BrandSwitcher.jsx"), "utf8");
  assert.match(ctx, /emitBrandWorkspaceSelected/, "addBrand emits workspace selected");
  assert.match(gate, /\+ 새 브랜드 추가/, "gate add brand button");
  assert.match(switcher, /catch|error|toast/i, "brand switcher surfaces errors");
}

// 7) 임현규 — 작업실 ↔ 브릭로그 다음 탭
{
  const dash = readFileSync(join(root, "components/Dashboard.jsx"), "utf8");
  const tabs = readFileSync(join(root, "components/workspace/WorkspaceRhythmTabs.jsx"), "utf8");
  assert.match(dash, /WorkspaceRhythmTabs/, "rhythm tabs in dashboard");
  assert.match(dash, /setRhythmTab\("studio"\)/, "menu change resets studio tab");
  assert.match(tabs, /브릭로그 다음/, "next tab label");
}

// 8) 유리 — 4필드 심플 UI (현장 한 줄)
{
  assert.equal(WRITE_FLOW_STEPS.length, 4);
  assert.equal(WRITE_FLOW_STEPS[3].id, "scene");
  const stepped = readFileSync(join(root, "components/product/SteppedWriteFields.jsx"), "utf8");
  assert.match(stepped, /storeFeatures/, "scene maps to storeFeatures");
  const guide = readFileSync(join(root, "components/product/KeywordTopicGuide.jsx"), "utf8");
  assert.match(guide, /주제만 적어도/, "keyword/topic guide for staff");
}

// 9) 얇은 입력 → context beat 필요
{
  const thin = {
    brandName: "애월바다펜션",
    region: "제주",
    topic: "장박 할인 후기",
    industry: "펜션",
  };
  assert.equal(needsGenerationContextBeat(thin), true);
}

console.log("OK employee-feedback-verify (9 checks)");
