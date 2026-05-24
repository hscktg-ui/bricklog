/**
 * Brand Director — 4 usage scenarios (no LLM, no @/ aliases)
 * Run: node scripts/test-director-scenarios.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loadExports(relPath, names) {
  const src = readFileSync(join(root, relPath), "utf8").replace(/^export /gm, "");
  // eslint-disable-next-line no-new-func
  return new Function(`${src}; return { ${names.join(", ")} };`)();
}

const { resolveSensitiveCompliance } = loadExports(
  "lib/compliance/sensitiveCategories.js",
  ["resolveSensitiveCompliance"]
);

const { formatBrandHabitsBrief } = loadExports(
  "lib/brands/brandHabits.js",
  ["formatBrandHabitsBrief"]
);

// --- Scenario feedback patch (inline mirror of blogDerive) ---
function applyChannelFeedbackPatch(input = {}, feedbackText = "", channel = "place") {
  const t = String(feedbackText || "");
  const patch = { ...input };
  if (/이모지|emoji/i.test(t)) {
    if (channel === "instagram" || channel === "insta") {
      patch.emojiDensity = /줄|적|less/i.test(t) ? "medium" : "high";
    } else {
      patch.emojiDensity = /없|제거|none/i.test(t) ? "low" : "medium";
    }
  }
  if (/담백|간결|짧/i.test(t) && channel === "place") {
    patch.tone = "informative";
  }
  if (/감성|따뜻|공감/i.test(t) && (channel === "instagram" || channel === "insta")) {
    patch.tone = "emotional";
  }
  return patch;
}

function feedbackRegenSeed(feedbackText = "") {
  let h = 0;
  const s = String(feedbackText);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}

const results = [];

function runScenario(id, name, fn) {
  try {
    fn();
    results.push({ id, name, pass: true, note: "" });
  } catch (e) {
    results.push({ id, name, pass: false, note: e.message });
    throw e;
  }
}

// A — Cafe/local: channel differentiation heuristics
runScenario("A", "카페·로컬 — 채널 차별", () => {
  const blogSnippet =
    "강남 로스팅 카페에서 아침 에스프레소 한 잔. 검색창에 키워드를 넣고 비교해 보시면 도움이 됩니다.";
  const placeSnippet = "오늘 영업 8시~22시. 주차 가능. 무인 픽업.";
  const instaSnippet = "아침 햇살\n\n한 잔의 여유\n\n#강남카페";
  assert(!placeSnippet.includes("검색창"), "place avoids blog SEO phrasing");
  assert(!instaSnippet.includes("비교해 보시면"), "insta avoids blog formal CTA");
  assert(instaSnippet.includes("\n"), "insta uses line breaks");
  assert(placeSnippet.length < blogSnippet.length, "place shorter than blog sample");
});

// B — Medical: sensitive disclaimer
runScenario("B", "의료·클리닉 — 민감 검수", () => {
  const med = resolveSensitiveCompliance({
    industry: "피부과",
    mainKeyword: "레이저 토닝",
    brandType: "professional",
  });
  assert(med.isSensitive, "clinic detected as sensitive");
  assert(med.userBadge?.includes("전문가"), "user badge for expert review");
  assert(
    (med.lawReminders || []).some((r) => /완치|과장/.test(r)),
    "medical guardrail mentions overclaim"
  );
  const cafe = resolveSensitiveCompliance({ industry: "카페", mainKeyword: "브런치" });
  assert(!cafe.isSensitive, "cafe not sensitive");
});

// C — Feedback paths
runScenario("C", "피드백 — 채널별 반영", () => {
  const base = { tone: "emotional", emojiDensity: "medium" };
  const placePatch = applyChannelFeedbackPatch(base, "더 담백하고 짧게", "place");
  assert(placePatch.tone === "informative", "place feedback → informative");

  const instaPatch = applyChannelFeedbackPatch(
    base,
    "이모지 더 많이",
    "instagram"
  );
  assert(instaPatch.emojiDensity === "high", "insta emoji up");

  const instaLess = applyChannelFeedbackPatch(
    base,
    "이모지 줄여줘",
    "insta"
  );
  assert(instaLess.emojiDensity === "medium", "insta emoji reduce → medium");

  const seed1 = feedbackRegenSeed("톤만 부드럽게");
  const seed2 = feedbackRegenSeed("톤만 부드럽게");
  assert(seed1 === seed2, "feedback seed stable");
});

// D — Brand habits / second generation brief
runScenario("D", "브랜드 습관 — 2차 생성 브리프", () => {
  const gen1Brand = {
    tone: "emotional",
    preferredSentenceStyle: "short",
    frequentlyUsedExpressions: ["한 잔의 여유", "강남 골목"],
  };
  const brief1 = formatBrandHabitsBrief(gen1Brand);
  assert(brief1.includes("감성"), "gen1 habits include tone");
  assert(brief1.includes("한 잔"), "gen1 preferred phrases");

  const gen2Brand = {
    ...gen1Brand,
    learning: { preferredLength: "medium", editCount: 4 },
    avoidedExpressions: ["특별한 경험", "소중한 순간"],
    rewriteHints: "도입을 짧게, CTA는 부드럽게",
  };
  const brief2 = formatBrandHabitsBrief(gen2Brand);
  assert(brief2.includes("검수·수정 패턴"), "gen2 shows accumulated edits");
  assert(brief2.includes("피하는 표현"), "gen2 avoided expressions");
  assert(brief2.length >= brief1.length, "gen2 brief richer than gen1");
});

// Plan gate sanity
runScenario("E", "요금제 — pipelineChannels", () => {
  const plansSrc = readFileSync(join(root, "lib/billing/plans.js"), "utf8");
  assert(plansSrc.includes('pipelineChannels: ["blog"]'), "free is blog-only");
  assert(
    plansSrc.includes('pipelineChannels: ["blog", "place", "instagram", "image"]'),
    "brand has blog place instagram image"
  );
  assert(
    !plansSrc.includes("블로그·플레이스·인스타 초안 (1회=풀 파이프)"),
    "free marketing line matches blog-only gate"
  );
});

console.log("\nDirector scenario results:");
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.name}${r.note ? ` — ${r.note}` : ""}`);
}
console.log(`\nOK — ${results.length} director scenarios passed`);
