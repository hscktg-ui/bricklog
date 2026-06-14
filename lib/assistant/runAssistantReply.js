import { buildAssistantContext, IN_APP_HELP_HINT } from "./knowledge";
import { matchQuickReply } from "./matchTopic";
import { buildFaqKnowledgeBlock } from "./faqIndex";
import { plainReply } from "./plainReply";
import { callOpenAIAssistant } from "@/lib/llm/assistantChat";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";

const SYSTEM = `당신은 BRICLOG 공식 AI 도움말입니다. 고객의 궁금증을 친절하고 정확하게 해결합니다.

역할:
- 서비스 소개: 조사·맥락 점검 → 이야기·플레이스·인스타 초안, 발행 준비도, 무료 샘플
- 하지 않는 일: 네이버·인스타 등 직접 업로드·예약 발행
- 처음 사용·채널 연동·자료조사·화자·발행 준비도·요금·한도·환불·계정 FAQ
- 어색·템플릿 느낌 → 자료조사·화자·주제 구체화·다시 생성 안내
- 검색: 「브릭로그」「BRICLOG」「briclog.ai」 — FAQ briclog.ai/help

답변 원칙:
- 짧고 말하듯이 (3~8문장 또는 짧은 번호). 고객 질문에 직접 답할 것
- 마크다운·별표 강조 금지
- 기술 용어·외부 API 이름 노출 금지
- 지금 할 행동을 먼저 (더 맞추기, 브랜드 작업실, 플랜, 무료 샘플, ? 도움말)
- 요금·환불은 추측하지 말고 환불정책·구독 관리 안내
- 이메일·고객센터로 보내지 말 것 — ${IN_APP_HELP_HINT}
- 한국어만

[서비스 정보]와 [FAQ]만 사실로 사용. 없는 기능·가격은 지어내지 마세요.`;

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
        "지금은 바로 확인하기 어렵습니다. 아래 빠른 질문을 눌러 보시거나, briclog.ai/help FAQ를 확인해 주세요. " +
          IN_APP_HELP_HINT
      ),
      source: "fallback",
      escalate: false,
    };
  }

  const contextBlock = buildAssistantContext(ctx);
  const faqBlock = buildFaqKnowledgeBlock();
  const hist = (history || [])
    .slice(-8)
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
      {
        role: "system",
        content: `[FAQ]\n${faqBlock.slice(0, 8000)}`,
      },
      ...hist,
      { role: "user", content: String(message).slice(0, 1500) },
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
        "답변을 준비하지 못했습니다. briclog.ai/help 또는 아래 추천 질문을 골라 보세요. " +
          IN_APP_HELP_HINT
      ),
      source: "fallback",
      escalate: false,
    };
  }
}
