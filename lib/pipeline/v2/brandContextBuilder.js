/**
 * STEP 4 — Context Building (존재하는 정보만, 최소 5개 추출 목표)
 */
import { isJunkValue } from "@/utils/sanitizeInput";

function item(key, label, value, source) {
  if (!value || isJunkValue(value)) return null;
  return { key, label, value: String(value).trim(), source };
}

export function buildBrandContext(profile = {}, ctx = {}) {
  const items = [];
  const research = ctx.brandResearch?.summary || {};

  const push = (k, l, v, s) => {
    const it = item(k, l, v, s);
    if (it) items.push(it);
  };

  push("brand", "브랜드명", profile.brandName, "input");
  push("regionality", "지역성", profile.region, "input");
  push(
    "feature",
    "브랜드 특징",
    profile.storeFeatures || profile.brandDescription,
    "input"
  );
  push(
    "operation",
    "운영 방식",
    research.operationStyle || ctx.brandResearch?.operationStyle,
    "research"
  );
  push(
    "differentiator",
    "차별점",
    research.uniqueness || profile.benefit,
    "research|input"
  );
  push("service", "주요 서비스", profile.service || profile.benefit, "input");
  push("product", "상품·주제", profile.product || profile.topic, "input");
  push("topic", "핵심 주제", profile.topic, "input");
  push(
    "value",
    "가치",
    research.brandValue || profile.includeList?.[0],
    "research|include"
  );
  push(
    "strength",
    "강점",
    research.strengths || ctx.searchSummaryBrief,
    "research"
  );
  push("season", "계절·시점", profile.season, "input");
  push("event", "이벤트", profile.event, "input");

  const unique = [];
  const seen = new Set();
  for (const it of items) {
    const sig = `${it.key}:${it.value.slice(0, 40)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(it);
  }

  return {
    items: unique,
    count: unique.length,
    ready: unique.length >= 5,
    partial: unique.length >= 2,
    bullets: unique.map((i) => i.value),
  };
}

export function brandContextBrief(brandContext) {
  return (brandContext?.items || [])
    .slice(0, 8)
    .map((i) => `· ${i.label}: ${i.value}`)
    .join("\n");
}
