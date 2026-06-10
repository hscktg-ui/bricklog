/**
 * 파이프라인 오염 근본 원인 추적 — 「이용」「전시 소식」 등
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { assessBrandFactPresence } from "@/lib/product/briclogResetQualityGate";

/** 코드·엔진별 알려진 오염 원인 (수정 SSOT) */
export const CONTAMINATION_ROOT_CAUSES = {
  bare_utilize: {
    symptom: "본문에 단독 「이용」",
    sources: [
      "lib/content/editorQualityEngine.js — facet fallback 「이용」 (수정됨)",
      "lib/content/blogLengthControl.js — 패딩 문장",
      "lib/content/informationUnitEngine.js — 이용 절차 유닛",
    ],
    fix: "topicWritingFacet·매장 안내 대체, 패딩 문장 업종별 치환",
  },
  exhibition_news: {
    symptom: "「전시 소식」「이 구성」",
    sources: [
      "lib/content/placeholderContaminationEngine.js — furniture topic pronouns (수정됨)",
      "lib/persona/speakerVoiceLock.js — topicEchoVariants 전시소식 (수정됨)",
    ],
    fix: "가구 외 업종 전시 어휘 주입 금지",
  },
  brand_facts_missing: {
    symptom: "브랜드 특징·지역·운영방식 소실",
    sources: [
      "생성 후 voice lock·length refill이 storeFeatures 덮어씀",
      "weaveResearchFacts 조건부 스킵 (anchored>=2)",
    ],
    fix: "brandFactInjectionEngine 배달 직전 강제 주입",
  },
  rereview_destroy: {
    symptom: "재검수 후 글 파괴",
    sources: [
      "applyContentQualityRevision — LLM 전체 재생성 (수정됨)",
    ],
    fix: "paragraphSafeEditEngine — 문단 단위·85% 보존",
  },
};

export function tracePipelineContamination(pack, input = {}) {
  const full = getBlogFullText(pack);
  const counts = countPlaceholderContamination(full);
  const brand = assessBrandFactPresence(pack, input);
  const traces = [];

  if (counts.hits?.bare_utilize) {
    traces.push({ id: "bare_utilize", ...CONTAMINATION_ROOT_CAUSES.bare_utilize });
  }
  if (counts.hits?.exhibition_news || counts.hits?.this_composition) {
    traces.push({ id: "exhibition_news", ...CONTAMINATION_ROOT_CAUSES.exhibition_news });
  }
  if (!brand.ok) {
    traces.push({ id: "brand_facts_missing", ...CONTAMINATION_ROOT_CAUSES.brand_facts_missing });
  }
  if (pack._meta?.paragraphSafeEditSkipped || pack._meta?.goldenSafeEditSkipped) {
    traces.push({ id: "rereview_destroy", ...CONTAMINATION_ROOT_CAUSES.rereview_destroy });
  }

  return {
    traces,
    placeholderCounts: counts,
    brandFacts: brand,
  };
}
