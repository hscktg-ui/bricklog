import { splitPackSectionsForStructure, ensureMinBlogSections } from "../lib/content/blogLengthControl.js";
import { scoreGiSeungJeonGyeol } from "../lib/content/editorQualityEngine.js";

const input = {
  brandName: "품질감사카페",
  region: "강남",
  topic: "브런치",
  mainKeyword: "브런치",
  industry: "카페",
  blogLengthTier: "medium",
};

const fatBody = Array.from({ length: 8 }, (_, i) =>
  `강남 품질감사카페 브런치 메뉴 ${i + 1}번째 문단입니다. 가격·구성·이용 방법을 비교해 보시면 선택이 수월합니다. 매장 방문 전 예약·주차·대기 시간을 확인하세요.`
).join("\n\n");

const pack = {
  title: "강남 품질감사카페 브런치 후기",
  representativeTitle: "강남 품질감사카페 브런치 후기",
  sections: [
    { heading: "브런치 고민", body: fatBody },
    { heading: "이용 안내", body: fatBody.slice(0, 1200) },
  ],
  conclusion:
    "강남 품질감사카페 브런치 — 가격·구성·이용 방법을 함께 보면 선택이 수월합니다.",
};

const split = splitPackSectionsForStructure(pack, 3);
if (split.sections.length < 3) {
  console.error("FAIL: split should yield >= 3 sections", split.sections.length);
  process.exit(1);
}

const ensured = ensureMinBlogSections(pack, { input }, input);
if (ensured.sections.length < 3) {
  console.error("FAIL: ensure should yield >= 3 sections", ensured.sections.length);
  process.exit(1);
}

const flow = scoreGiSeungJeonGyeol(ensured);
if (!flow.ok && flow.reasons.includes("structure_thin")) {
  console.error("FAIL: structure_thin still present", flow);
  process.exit(1);
}

console.log("OK: sections", ensured.sections.length, "flow", flow.ok);
