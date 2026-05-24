import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  formatBlogFullCopy,
  formatPlaceFullCopy,
  formatInstaFullCopy,
} from "@/utils/copyFormatter";
import { pastedTextToBlogPack } from "@/lib/review/pasteToBlogPack";
import { pastedTextToPlacePack } from "@/lib/review/pasteToPlacePack";
import { pastedTextToInstaPack } from "@/lib/review/pasteToInstaPack";
import { auditPastedDraft } from "@/lib/review/auditPastedDraft";

function normalizeChannel(channel) {
  if (channel === "instagram" || channel === "insta") return "instagram";
  if (channel === "place") return "place";
  return "blog";
}

function buildSystemPrompt(channel, params) {
  if (channel === "place") {
    return `당신은 네이버 스마트플레이스·로컬 비즈니스 공지 카피 에디터입니다.
사용자가 직접 쓴 초안을 모바일에서 바로 올리기 좋은 짧은 공지로 다듬습니다.
- 사실·가격·이벤트는 원문에 있는 것만 유지하고 새로 지어내지 않습니다.
- 블로그체·SEO·체류·키워드 나열을 넣지 않습니다.
- 한 줄 공지 15자 이상, 전체 150~350자 권장.
- JSON만: {"title":"상호/제목","shortNotice":"한 줄 공지","detailBody":"상세 안내(없으면 빈 문자열)","cta":"행동 유도 한 줄"}`;
  }
  if (channel === "instagram") {
    return `당신은 인스타그램 피드·릴스 캡션 에디터입니다.
사용자가 직접 쓴 캡션을 짧고 읽기 쉬운 한국어로 다듬습니다.
- 첫 줄은 시선을 끄는 Hook, 이후 줄바꿈을 유지합니다.
- 블로그 설명문·체크리스트·검색창 같은 표현은 피합니다.
- 사실은 원문만 유지, 과장·AI 클리셰를 줄입니다.
- 본문 180~480자 권장, 이모지는 자연스럽게 2개 이상(원문에 있으면 유지).
- JSON만: {"hook":"첫 줄","lineBreakBody":"전체 캡션(줄바꿈 \\n)","hashtags":["태그1","태그2"]}`;
  }
  const lengthTier = resolveBlogLengthTier(params.blogLengthTier || "medium");
  return `당신은 네이버 블로그·로컬 브랜드 카피 에디터입니다.
사용자가 직접 쓴 초안을 자연스러운 한국어로 다듬습니다.
- 사실·가격·이벤트는 원문에 있는 것만 유지하고 새로 지어내지 않습니다.
- 광고·과장·AI 클리셰를 줄입니다.
- 본문 공백 포함 ${lengthTier.min}자 이상, 권장 ${lengthTier.target}자 (상한 약 ${lengthTier.max}자).
- JSON만: {"title":"대표제목","body":"전체 본문(제목·소제목 포함, 문단 사이 \\n\\n)"}`;
}

function formatImprovedOutput(channel, parsed) {
  if (channel === "place") {
    const pack = {
      title: String(parsed.title || "").trim(),
      shortNotice: String(parsed.shortNotice || parsed.short || "").trim(),
      detailBody: String(parsed.detailBody || parsed.detail || "").trim(),
      cta: String(parsed.cta || "지금 확인해 보세요.").trim(),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    };
    pack.shortBody = pack.shortNotice;
    return { pack, text: formatPlaceFullCopy(pack) };
  }
  if (channel === "instagram") {
    const hook = String(parsed.hook || "").trim();
    const lineBreakBody = String(
      parsed.lineBreakBody || parsed.body || ""
    ).trim();
    const pack = {
      hook,
      body: lineBreakBody.replace(hook, "").trim() || lineBreakBody,
      lineBreakBody: lineBreakBody || hook,
      ending: String(parsed.ending || "").trim(),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean)
        : [],
    };
    return { pack, text: formatInstaFullCopy(pack) };
  }
  const improvedBody = String(parsed.body || parsed.text || "").trim();
  const title = String(parsed.title || "").trim();
  const pack = pastedTextToBlogPack(
    title ? `${title}\n\n${improvedBody}` : improvedBody
  );
  if (title) {
    pack.title = title;
    pack.representativeTitle = title;
  }
  return {
    pack,
    text: formatBlogFullCopy(pack, { includeSubheadings: true }),
  };
}

/**
 * @param {object} params
 * @param {string} params.text
 * @param {'blog'|'place'|'instagram'} [params.channel]
 */
export async function improvePastedDraft(params) {
  const text = String(params.text || "").trim();
  const channel = normalizeChannel(params.channel);
  if (!text) {
    return { ok: false, userMessage: "검수할 글을 붙여 넣어 주세요." };
  }

  if (!isOpenAIConfigured()) {
    return {
      ok: false,
      userMessage:
        "AI 개선은 서비스 연결 후 이용할 수 있습니다. 검수 결과만 참고해 주세요.",
    };
  }

  const audit = auditPastedDraft(text, params, channel);
  const hints = [
    ...(params.issueHints || []),
    ...audit.issues.map((i) => i.message),
  ].slice(0, 12);

  const channelLabel =
    channel === "place"
      ? "스마트플레이스"
      : channel === "instagram"
        ? "인스타그램 캡션"
        : "네이버 블로그";

  const signatureBlock = params.signatureBrief || params.v3MasterBrief
    ? `\n\n【BRICLOG 시그니처 — 조사·검증·전략 완료 (일반 GPT와 다름)】\n${String(params.signatureBrief || params.v3MasterBrief).slice(0, 2800)}\n`
    : "";

  const user = `채널: ${channelLabel}
브랜드: ${params.brandName || "(미입력)"}
지역: ${params.region || "(미입력)"}
키워드: ${params.mainKeyword || "(미입력)"}
주제: ${params.topic || params.mainKeyword || "(미입력)"}
${signatureBlock}
개선 포인트:
${hints.map((h) => `- ${h}`).join("\n") || "- 전반적 가독성·자연스러움"}

원문:
${text.slice(0, 12000)}${
    params.personalizationAddon
      ? `\n\n[계정·브랜드 개인화 — 반드시 톤·금지어·습관을 반영, 문장 복사 금지]\n${String(params.personalizationAddon).slice(0, 2400)}`
      : ""
  }`;

  try {
    const raw = await callOpenAIChat(
      [
        { role: "system", content: buildSystemPrompt(channel, params) },
        { role: "user", content: user },
      ],
      { temperature: 0.65, maxTokens: channel === "blog" ? 5000 : 2800 }
    );
    const parsed = JSON.parse(raw);
    const { pack, text: improvedText } = formatImprovedOutput(channel, parsed);
    if (!improvedText?.trim()) {
      return {
        ok: false,
        userMessage: "개선 결과를 만들지 못했습니다. 다시 시도해 주세요.",
      };
    }

    return {
      ok: true,
      channel,
      improvedText,
      pack,
      auditAfter: auditPastedDraft(improvedText, params, channel),
    };
  } catch (e) {
    return {
      ok: false,
      userMessage: e.message?.includes("OPENAI")
        ? "AI 연결을 확인해 주세요."
        : "개선 중 오류가 발생했습니다.",
    };
  }
}
