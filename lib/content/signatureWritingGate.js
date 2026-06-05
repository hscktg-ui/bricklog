/**
 * SIGNATURE WRITING — 금지 도입·소제목 후처리
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  buildSignatureWhyHeading,
  isSignatureForbiddenHeading,
  isSignatureForbiddenOpening,
  isSignatureWritingEnforced,
  rewriteSignatureHeading,
  SIGNATURE_WRITING_FLOW,
} from "@/lib/product/signatureWritingEngine";
import { ensureHumanStoryOpeningBody } from "@/lib/product/humanStoryEngine";

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applySignatureWritingGate(pack, ctx = {}) {
  if (!isSignatureWritingEnforced() || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  let headingRewrites = 0;
  let openingAdjusted = false;

  const sections = (pack.sections || []).map((s, idx) => {
    let heading = s?.heading;
    let body = s?.body;
    if (isSignatureForbiddenHeading(heading)) {
      heading = rewriteSignatureHeading(heading, input);
      headingRewrites += 1;
    }
    if (idx === 0 && isSignatureForbiddenOpening(body, input)) {
      heading = buildSignatureWhyHeading(input);
      body = ensureHumanStoryOpeningBody(body, input);
      openingAdjusted = true;
    }
    return { ...s, heading, body };
  });

  if (!headingRewrites && !openingAdjusted) return pack;

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      signatureWritingGate: {
        headingRewrites,
        openingAdjusted,
        flow: SIGNATURE_WRITING_FLOW,
      },
    },
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function scoreSignatureWritingCompliance(pack, ctx = {}) {
  if (!isSignatureWritingEnforced()) {
    return { ok: true, issues: [], score: 10 };
  }
  const input = ctx.input || ctx;
  const issues = [];
  const headings = (pack?.sections || [])
    .map((s) => String(s?.heading || "").trim())
    .filter(Boolean);
  for (const h of headings) {
    if (isSignatureForbiddenHeading(h)) issues.push({ type: "forbidden_heading", value: h });
  }
  const firstBody = pack?.sections?.[0]?.body;
  if (isSignatureForbiddenOpening(firstBody, input)) {
    issues.push({ type: "forbidden_opening", sample: String(firstBody || "").slice(0, 80) });
  }
  const full = getBlogFullText(pack);
  if (/제품은\s*이렇습니다/.test(full)) {
    issues.push({ type: "forbidden_voice", value: "제품은 이렇습니다" });
  }
  return {
    ok: issues.length === 0,
    issues,
    score: issues.length === 0 ? 10 : Math.max(0, 10 - issues.length * 3),
  };
}
