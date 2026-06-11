/**
 * BRICLOG MISSION — V20 제품 정체성 (SSOT: briclogUltimateV20.js)
 */
import { buildHumanWriterEnginePromptBlock } from "@/lib/product/humanWriterEngine";
import { buildBrandMemoryPriorityPromptBlock } from "@/lib/product/brandMemoryPriority";
import { buildAntiSeoSpamPromptBlock } from "@/lib/product/antiSeoSpamEngine";
import { buildEditorPrinciplePromptBlock } from "@/lib/product/editorPrinciple";
import { buildSignatureWritingCorePromptBlock } from "@/lib/product/signatureWritingEngine";
import { buildHumanBeliefPromptBlock } from "@/lib/product/humanBeliefEngine";
import { buildContentQualityPromptBlock } from "@/lib/product/contentQualityEngine";
import { buildHumanStoryEnginePromptBlock } from "@/lib/product/humanStoryEngine";
import { MISSION_PROSE_ENGINE_VERSION } from "@/lib/product/missionProseEngine";
import { buildFurnitureExhibitionWriterBrief } from "@/lib/product/furnitureExhibitionEngine";
import {
  buildStoryTargetEnginePromptBlock,
  buildStoryTargetWriterBrief,
} from "@/lib/product/storyTargetEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildBrandJournalistPromptBlock } from "@/lib/product/brandJournalistDirective";
import { buildNextEvolutionPromptBlock } from "@/lib/product/briclogNextEvolutionDirective";
import { buildEditorHumanizationPromptBlock } from "@/lib/product/editorHumanizationEngine";
import { buildDeepLearningPromptBlock } from "@/lib/product/deepLearningEngine";
import { buildContentDoctrinePromptBlock, buildSpeakerPurposeExplainBrief } from "@/lib/product/briclogContentDoctrine";
import {
  AI_ROLE_CONTRACT,
  BRICLOG_GOAL_BRIEF,
  BRICLOG_MISSION_STATEMENT,
  BRICLOG_ULTIMATE_VERSION,
  buildAiRoleSummaryKo,
  buildUltimateV20HumanAddonBrief,
  buildUltimateV20PromptBlock,
  HUMANITY_ENGINE_BRIEF,
} from "@/lib/product/briclogUltimateV20";

export const BRICLOG_MISSION_VERSION = BRICLOG_ULTIMATE_VERSION;

export { AI_ROLE_CONTRACT, BRICLOG_MISSION_STATEMENT, buildAiRoleSummaryKo };

/** 제품 진화 방향 (내부·프롬프트) */
export const BRICLOG_EVOLUTION_LADDER = [
  "브랜드 조사 시스템",
  "브랜드 메모리 시스템",
  "주제 증명·정보 밀도",
  "브랜드 콘텐츠 운영체제",
  "수정 없이 발행 가능한 편집본",
];

export const BRICLOG_EVOLUTION_BRIEF = `【브릭로그 진화 · V20】
${BRICLOG_EVOLUTION_LADDER.join(" → ")}`;

export const BRICLOG_MISSION_RULES = `【BRICLOG MISSION V20 · AI 오케스트레이션】
- 새로운 사실 전달 · 좋은 설명 우선 · 주제 설명 불가 시 발행 금지.
- Research AI (Gemini): 조사만 — 글 작성 금지.
- Local AI (Naver): 지역·스마트플레이스·연관 검색 — 글 작성 금지.
- Memory AI (BRICLOG): 브랜드 철학·말투·승인·수정 이력 — 글 작성 금지.
- Writer AI (GPT-5.5): 조사·메모리·입력만으로 작성 — 조사 금지.
- Reviewer AI: 중복·허구·적합성·글자수·휴머니티 — 실패 시 재작성.
- 조사 부족 시 작성 금지. 브랜드 관련 검증 사실 5건 미만 작성 금지.
- 검색 문장 재조합 금지 — 사실만 추출·검증 후 편집. 새 사실 없으면 발행 금지.
- 정보량 부족 시 문장 반복·글자수 패딩 금지.
- ${BRICLOG_GOAL_BRIEF.replace(/\n/g, " ")}`;

export const BRICLOG_WRITER_MISSION_BRIEF = `【편집 · Writer AI (GPT-5.5) V20 · 브랜드 기자】
브릭로그는 작가가 아니다. 검증된 조사 사실·브랜드 메모리·사용자 입력만으로 편집.
검색 제목·스니펫·원문 문장을 본문에 직접 넣지 말 것. 사실을 재해석해 독자에게 새 정보를 전달.
정보 부족 시 조사 보강 후 재작성 — 부족한 채 반복·패딩·발행 금지.
글자수 tier는 참고 — 검증된 사실 밀도·편집 품질이 우선.`;

/** @deprecated 고객 UI 노출 금지 — lib/copy/customerFacing.js 사용 */
export const BRICLOG_CUSTOMER_MISSION =
  "세 칸만 채우면 — 왜 찾는지부터, 이 브랜드답게 이어 씁니다.";

/** @deprecated UI 노출 금지 — formatCustomerResearchBlockMessage 사용 */
export const BRICLOG_RESEARCH_INSUFFICIENT_MESSAGE =
  "조사가 아직 충분하지 않아요. 브랜드·지역·주제를 조금 더 구체적으로 적어 주시거나, 잠시 후 다시 시도해 주세요.";

const CHECKLIST_VOICE_MISSION_BRIEF = `【CHECKLIST VOICE 금지 · V20】
정보 영역을 소제목·섹션으로 찍어내지 말 것.
「확인하세요」류 반복 금지. 조사 팩트를 칼럼 흐름(기→승→전→결)에 녹일 것.`;

export {
  isBriclogMissionEnforced,
  isLengthPaddingForbidden,
  isLengthOnlyGateSoft,
  isCoverageExpansionForbidden,
} from "@/lib/product/missionFlags";

export function buildBriclogMissionPromptBlock(input = {}) {
  const blocks = [
    BRICLOG_MISSION_STATEMENT,
    buildContentDoctrinePromptBlock(),
    BRICLOG_GOAL_BRIEF,
    BRICLOG_EVOLUTION_BRIEF,
    BRICLOG_MISSION_RULES,
    BRICLOG_WRITER_MISSION_BRIEF,
    HUMANITY_ENGINE_BRIEF,
    buildUltimateV20HumanAddonBrief(),
  ];
  if (isBriclogMissionEnforced()) {
    const speakerBrief = buildSpeakerPurposeExplainBrief(input);
    if (speakerBrief) blocks.push(speakerBrief);
    blocks.push(buildNextEvolutionPromptBlock(input));
    blocks.push(buildBrandJournalistPromptBlock());
    blocks.push(
      buildUltimateV20PromptBlock("blog"),
      buildSignatureWritingCorePromptBlock(),
      buildHumanStoryEnginePromptBlock(),
      buildStoryTargetEnginePromptBlock(),
      `【MISSION PROSE ENGINE ${MISSION_PROSE_ENGINE_VERSION}】폴백·후처리: 업종 flavor · Human Story 도입 · 체크리스트 필터 · 지역 voice lock.`,
      buildHumanWriterEnginePromptBlock(),
      buildBrandMemoryPriorityPromptBlock(),
      buildAntiSeoSpamPromptBlock(),
      buildEditorPrinciplePromptBlock(),
      buildHumanBeliefPromptBlock(),
      buildContentQualityPromptBlock(),
      CHECKLIST_VOICE_MISSION_BRIEF,
      buildEditorHumanizationPromptBlock(),
      buildDeepLearningPromptBlock(input)
    );
    const exh = buildFurnitureExhibitionWriterBrief(input);
    if (exh) blocks.push(exh);
    const storyTarget = buildStoryTargetWriterBrief(input);
    if (storyTarget) blocks.push(storyTarget);
  }
  return blocks.join("\n\n");
}
