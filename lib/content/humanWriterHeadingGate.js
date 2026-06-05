/**
 * HUMAN WRITER — 금지 소제목 후처리 (설명서·FAQ형 제목 차단)
 */
import { isHumanWriterEngineEnforced } from "@/lib/product/humanWriterEngine";
import {
  isSignatureWritingEnforced,
  isSignatureForbiddenHeading,
  rewriteSignatureHeading,
} from "@/lib/product/signatureWritingEngine";
import {
  isHumanWriterForbiddenHeading,
  rewriteHumanWriterHeading,
} from "@/lib/product/humanWriterEngine";
import {
  isFurnitureExhibitionContext,
  rewriteFurnitureExhibitionHeading,
} from "@/lib/product/furnitureExhibitionEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

function isActive(ctx = {}) {
  const input = ctx.input || ctx;
  if (isBriclogMissionEnforced() && isFurnitureExhibitionContext(input)) return true;
  return isSignatureWritingEnforced() || isHumanWriterEngineEnforced();
}

function isForbiddenHeading(heading, input = {}) {
  const h = String(heading || "");
  if (/찾게\s*되는가|찾게\s*되었는가|왜\s+.+\s*찾게/.test(h)) return true;
  if (isFurnitureExhibitionContext(input)) {
    if (/전시\s*소식이\s*궁금|봐야\s*할\s*기준|방문\s*시\s*확인|A\/S와\s*교환|설치와\s*배송|방문\s*예약\s*방법|특징과\s*기능/.test(h)) {
      return true;
    }
  }
  if (isSignatureWritingEnforced()) return isSignatureForbiddenHeading(heading);
  return isHumanWriterForbiddenHeading(heading);
}

function rewriteHeading(heading, input) {
  if (isFurnitureExhibitionContext(input)) {
    return rewriteFurnitureExhibitionHeading(heading, input);
  }
  if (isSignatureWritingEnforced()) return rewriteSignatureHeading(heading, input);
  return rewriteHumanWriterHeading(heading, input);
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyHumanWriterHeadingGate(pack, ctx = {}) {
  if (!isActive(ctx) || !pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  let rewrites = 0;
  const sections = (pack.sections || []).map((s) => {
    if (!isForbiddenHeading(s?.heading, input)) return s;
    rewrites += 1;
    return {
      ...s,
      heading: rewriteHeading(s.heading, input),
    };
  });
  if (!rewrites) return pack;
  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      humanWriterHeadingGate: { rewrites },
    },
  };
}

/**
 * @param {object} pack
 */
export function scoreHumanWriterHeadingCompliance(pack, ctx = {}) {
  const input = ctx.input || ctx;
  if (!isActive({ input })) {
    return { ok: true, forbidden: [], score: 10 };
  }
  const forbidden = (pack?.sections || [])
    .map((s) => String(s?.heading || "").trim())
    .filter((h) => h && isForbiddenHeading(h, input));
  return {
    ok: forbidden.length === 0,
    forbidden,
    score: forbidden.length === 0 ? 10 : Math.max(0, 10 - forbidden.length * 3),
  };
}
