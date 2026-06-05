/**
 * 고객 UI·출력 — 내부 Mission/AI 역할 문구 미노출 검증
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CUSTOMER_FORBIDDEN_SURFACE_PHRASES,
  CUSTOMER_WORKSPACE_TAGLINE,
  hasCustomerForbiddenSurface,
  scrubCustomerForbiddenSurfaceInPack,
} from "../lib/copy/customerFacing.js";
import { WORKSPACE_BLOG } from "../lib/product/craft.js";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("OK:", msg);
  }
}

assert(
  !hasCustomerForbiddenSurface(WORKSPACE_BLOG.tagline),
  "workspace tagline is customer-safe"
);
assert(
  WORKSPACE_BLOG.tagline === CUSTOMER_WORKSPACE_TAGLINE,
  "workspace tagline uses customerFacing SSOT"
);

const blogForm = readFileSync(
  join(process.cwd(), "components/BlogForm.jsx"),
  "utf8"
);
assert(
  !blogForm.includes("BlogMissionStrip"),
  "BlogForm does not render BlogMissionStrip"
);

const scrubbed = scrubCustomerForbiddenSurfaceInPack({
  title: "테스트 GPT: 글을 쓴다",
  sections: [{ heading: "h", body: "Gemini: 조사한다 · Memory: 브랜드를 유지한다" }],
  conclusion: "세 칸만 채우면 — 왜 찾는지부터, 이 브랜드답게 이어 씁니다.",
});
assert(
  !hasCustomerForbiddenSurface(
    [scrubbed.title, scrubbed.conclusion, scrubbed.sections[0].body].join(" ")
  ),
  "scrubCustomerForbiddenSurfaceInPack removes internal phrases"
);

for (const phrase of CUSTOMER_FORBIDDEN_SURFACE_PHRASES.slice(0, 4)) {
  assert(phrase.length > 8, `forbidden phrase registered: ${phrase.slice(0, 24)}…`);
}

if (failed) {
  process.exit(1);
}
console.log("customer-surface: all checks passed");
