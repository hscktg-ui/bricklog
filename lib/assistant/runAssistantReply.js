import { buildAssistantContext, IN_APP_HELP_HINT } from "./knowledge";
import { matchQuickReply } from "./matchTopic";
import { plainReply } from "./plainReply";
import { callOpenAIAssistant } from "@/lib/llm/assistantChat";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";

const SYSTEM = `당신은 BRICLOG 도움말 안내입니다.

역할:
- 서비스가 무엇을 하고 하지 않는지 설명 (글 쌓기·다듬기, 직접 업로드·발행 없음)
- 처음 사용·채널·요금·한도·환불 FAQ
- 톤·주제 설정 안내

답변 원칙:
- 짧고 말하듯이 (3~6문장 또는 짧은 번호)
- 마크다운·별표 강조 금지
- 기술 용어·외부 서비스 이름 노출 금지
- 지금 할 행동을 먼저 (사이드바, 편의·습관, 플랜 업그레이드, 도움말)
- 요금·환불은 추측하지 말고 환불정책·구독 관리 안내
- 이메일·고객센터로 보내지 말 것 — ${IN_APP_HELP_HINT}
- 한국어만

[서비스 정보]만 사실로 사용. 없는 내용은 지어내지 마세요.`;

function sanitizeReply(text) {
  return plainReply(
    String(text || "")
      .replace(/\b(Supabase|OpenAI|API\s*Key|token|session|auth)\b/gi, "")
      .replace(/\s{2,}/g, " ")
  );
}

export async function runAssistantReply(message, ctx = {}, history = []) {
  const quick = matchQuickReply(message, ctx);
  if (quick && !ctx.forceLlm) {
    return {
      ok: true,
      reply: plainReply(quick.reply),
      source: "guide",
      topic: quick.topic,
      escalate: !!quick.escalate,
    };
  }

  if (!isOpenAIConfigured()) {
    if (quick) {
      return {
        ok: true,
        reply: plainReply(quick.reply),
        source: "guide",
        topic: quick.topic,
      };
    }
    return {
      ok: true,
      reply: plainReply(
        "지금은 바로 확인하기 어렵습니다. 아래 빠른 질문을 눌러 보시거나, " +
          IN_APP_HELP_HINT
      ),
      source: "fallback",
      escalate: false,
    };
  }

  const contextBlock = buildAssistantContext(ctx);
  const hist = (history || [])
    .slice(-6)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: plainReply(String(m.content || "").slice(0, 800)),
    }));

  try {
    const raw = await callOpenAIAssistant([
      { role: "system", content: SYSTEM },
      {
        role: "system",
        content: `[서비스 정보]\n${contextBlock}`,
      },
      ...hist,
      { role: "user", content: String(message).slice(0, 1200) },
    ]);

    const reply = sanitizeReply(raw);
    if (!reply) {
      throw new Error("empty");
    }
    return {
      ok: true,
      reply,
      source: "llm",
      topic: quick?.topic || null,
      escalate: false,
    };
  } catch {
    if (quick) {
      return {
        ok: true,
        reply: plainReply(quick.reply),
        source: "guide",
        topic: quick.topic,
      };
    }
    return {
      ok: true,
      reply: plainReply(
        "답변을 준비하지 못했습니다. 아래 빠른 질문을 골라 보시거나, " +
          IN_APP_HELP_HINT
      ),
      source: "fallback",
      escalate: false,
    };
  }
}
