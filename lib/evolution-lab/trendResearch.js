import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { NAVER_CATEGORY_BASELINES } from "@/lib/evolution-lab/naverTrendBaselines";
import {
  LAB_RESEARCH_CATEGORIES,
  LAB_SENSITIVE_CATEGORIES,
} from "@/lib/evolution-lab/constants";

/**
 * 공개 SEO 베이스라인 + 브랜드 리서치 신호 (크롤·원문 복사 없음)
 */
export function analyzeCategoryTrends(options = {}) {
  const categories = options.categories || [
    ...LAB_RESEARCH_CATEGORIES,
    ...(options.includeSensitive ? LAB_SENSITIVE_CATEGORIES : []),
  ];

  const byCategory = {};
  const signals = [];

  for (const cat of categories) {
    const baseline = NAVER_CATEGORY_BASELINES[cat] || NAVER_CATEGORY_BASELINES.카페;
    const research = runBrandResearchEngine({
      industry: cat,
      brandName: `${cat} 샘플`,
      region: "서울",
      mainKeyword: `서울 ${cat}`,
      purpose: "visitDrive",
    });

    byCategory[cat] = {
      baseline,
      searchStatus: research.sourceStatus,
      structureNotes: [
        baseline.introStyle,
        baseline.paragraphLength,
        baseline.imagePlacement,
        baseline.keywordStyle,
        baseline.storytelling,
        baseline.reviewStyle,
        baseline.infoStyle,
        baseline.ctaStyle,
      ].filter(Boolean),
      inferredTopics: (research.summary?.recentIssues || []).slice(0, 3),
    };

    signals.push({
      category: cat,
      topExposurePattern: baseline.introStyle,
      dwellPattern: baseline.paragraphLength,
      cta: baseline.ctaStyle,
    });
  }

  return {
    analyzedAt: new Date().toISOString(),
    method: "curated_naver_seo_baseline_plus_brand_research",
    categoryCount: categories.length,
    byCategory,
    signals,
    disclaimer:
      "실시간 네이버 순위 크롤이 아닌 공개 운영·SEO 베이스라인 기반 구조 연구입니다.",
  };
}
