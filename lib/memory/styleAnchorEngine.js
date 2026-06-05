/**
 * Style Anchor — 승인본·피드백·연속 톤을 Writer SSOT로
 */
import { isBriclogMissionEnforced } from "@/lib/product/briclogMission";
import { buildBrandSubenginePromptBlock, isBrandSubengineActive } from "@/lib/product/brandSubengine";
import { packFullContent } from "@/lib/memory/contentStore";

const SNIPPET_LEN = 220;
const MAX_ANCHORS = 3;

function clipSnippet(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > SNIPPET_LEN ? `${t.slice(0, SNIPPET_LEN)}…` : t;
}

/**
 * @param {Array<{ title?: string, channel?: string, prompt_input?: object, full_content?: string }>} items
 */
export function buildStyleAnchorsFromContentItems(items = []) {
  const anchors = [];
  for (const it of items) {
    if (anchors.length >= MAX_ANCHORS) break;
    const channel = it.channel || "blog";
    const pi = it.prompt_input || it.promptInput || {};
    const structured = pi.structured_content;
    let snippet = "";
    if (structured) {
      snippet = clipSnippet(packFullContent(channel, structured));
    } else if (it.full_content) {
      snippet = clipSnippet(it.full_content);
    }
    if (!snippet || snippet.length < 40) continue;
    anchors.push({
      title: String(it.title || "승인본").trim(),
      channel,
      snippet,
    });
  }
  return anchors;
}

/**
 * @param {object} ctx — input / pipeline ctx
 */
export function buildStyleAnchorBrief(ctx = {}) {
  if (!isBriclogMissionEnforced()) return "";

  const anchors = ctx.styleAnchors || ctx.input?.styleAnchors || [];
  const lines = [];

  if (anchors.length) {
    lines.push("【STYLE ANCHOR · 승인본 톤 — 문장 복사 금지, 리듬·말투만 따를 것】");
    anchors.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.title || "승인본"}: ${a.snippet}`);
    });
  } else if (ctx.brandApprovedContentBrief) {
    lines.push(`【STYLE ANCHOR · 승인 이력】\n${ctx.brandApprovedContentBrief}`);
  }

  if (ctx.styleContinuityBrief) {
    lines.push(`톤 연속: ${ctx.styleContinuityBrief}`);
  }
  if (ctx.brandFeedbackBrief) {
    lines.push(`운영자 피드백: ${ctx.brandFeedbackBrief}`);
  }

  if (!lines.length) {
    return "【STYLE ANCHOR】승인본이 없으면 업종·브랜드 메모리 톤만 사용. 매번 처음 소개 금지.";
  }

  const sub = isBrandSubengineActive(ctx)
    ? buildBrandSubenginePromptBlock(ctx)
    : "";

  return [
    ...(sub ? [sub] : []),
    ...lines,
    "승인본과 다른 광고 톤·브로슈어 톤 금지. 이어쓰기(다음 장) 우선.",
  ].join("\n");
}

export function buildStyleAnchorPromptBlock(ctx = {}) {
  const brief = buildStyleAnchorBrief(ctx);
  return brief ? `${brief}`.slice(0, 2800) : "";
}
