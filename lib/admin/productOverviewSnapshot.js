import fs from "fs";
import path from "path";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
} from "@/lib/brand/copy";
import { LANDING_FAQ_ITEMS } from "@/lib/landing/landingFaq";
import { QUICK_PROMPTS, ASSISTANT_TOPICS } from "@/lib/assistant/knowledge";
import { resolvePublicSiteUrl } from "@/lib/brand/seo";

const PRODUCT_KPIS = [
  { id: "planning", label: "기획", weight: 30 },
  { id: "research", label: "조사", weight: 30 },
  { id: "explain", label: "설명", weight: 20 },
  { id: "writing", label: "글쓰기", weight: 10 },
  { id: "review", label: "검수", weight: 10 },
];

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function verificationStatus() {
  return {
    google: Boolean(
      (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "").trim()
    ),
    naver: Boolean(
      (process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "").trim()
    ),
    daum: Boolean((process.env.NEXT_PUBLIC_DAUM_SITE_VERIFICATION || "").trim()),
  };
}

/**
 * Admin 제품·SEO·도움말 스냅샷 (읽기 전용)
 */
export function getProductOverviewSnapshot() {
  const siteUrl = resolvePublicSiteUrl();
  const crossBatch = readJsonSafe(
    path.join(process.cwd(), "artifacts/cross-channel-batch/latest-summary.json")
  );
  const readiness = readJsonSafe(
    path.join(process.cwd(), "config/product-readiness-score.json")
  );

  return {
    updatedAt: new Date().toISOString(),
    product: {
      title: BRAND_META_TITLE,
      description: BRAND_META_DESCRIPTION.slice(0, 160),
      latestUpdate: BRAND_LATEST_UPDATE,
      kpis: PRODUCT_KPIS,
      features: [
        "조사 우선 · 발행 준비도",
        "무료 샘플: 이야기·플레이스·인스타",
        "플레이스·인스타 전문가 패널",
        "AI 도움말 + FAQ 15항",
        "자동 야간 품질 진화",
      ],
    },
    seo: {
      siteUrl,
      sitemapPaths: ["/", "/help", "/terms", "/privacy", "/refund"],
      verification: verificationStatus(),
      indexablePages: 5,
      helpUrl: `${siteUrl}/help`,
    },
    assistant: {
      faqCount: LANDING_FAQ_ITEMS.length,
      quickPromptCount: QUICK_PROMPTS.length,
      topicCount: ASSISTANT_TOPICS.length,
      helpPath: "/help",
    },
    quality: {
      readinessScore: readiness?.score ?? readiness?.total ?? null,
      readinessGrade: readiness?.grade ?? null,
      crossChannelBatch: crossBatch
        ? {
            passRate: crossBatch.passRate ?? crossBatch.summary?.passRate,
            total: crossBatch.total ?? crossBatch.summary?.total,
            at: crossBatch.finishedAt ?? crossBatch.generatedAt,
          }
        : null,
    },
  };
}
