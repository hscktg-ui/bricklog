/** 블로그 생성 실패 — 사용자에게 에러처럼 보이지 않게 정규화 */

const TECHNICAL_ERROR_RES = [
  /cannot access .+ before initialization/i,
  /referenceerror/i,
  /syntaxerror/i,
  /unexpected token/i,
  /is not defined/i,
  /xml/i,
  /\[object object\]/i,
  /module .* not found/i,
  /failed to parse/i,
];

export function isTechnicalErrorMessage(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return false;
  return TECHNICAL_ERROR_RES.some((re) => re.test(raw));
}

export function isGenerationTimeoutError(err) {
  const msg = String(err?.message || err || "");
  return (
    err?.code === "GENERATION_TIMEOUT" ||
    err?.name === "AbortError" ||
    /초과|timeout|timed out|aborted|generation_timeout/i.test(msg)
  );
}

/**
 * @param {unknown} err
 * @returns {{ message: string, panelTitle: string, toastType: 'info'|'error', soft: boolean, retryable: boolean }}
 */
export function normalizeBlogGenerationFailure(err) {
  const raw = String(err?.message || "").trim();
  const status = err?.status;

  if (status === 401 || status === 403) {
    return {
      message: raw || "로그인이 필요합니다. 다시 로그인한 뒤 「조사 후 글 받기」를 눌러 주세요.",
      panelTitle: "로그인·인증을 확인해 주세요",
      toastType: "info",
      soft: true,
      retryable: false,
    };
  }

  if (status === 429) {
    return {
      message: raw || "이번 달 사용 한도에 도달했습니다.",
      panelTitle: "이번 달 한도 안내",
      toastType: "info",
      soft: true,
      retryable: false,
    };
  }

  if (isGenerationTimeoutError(err)) {
    return {
      message:
        "이번에는 연결이 끊겼을 수 있어요. 「조사 후 글 받기」를 한 번 더 눌러 주세요.",
      panelTitle: "조금 더 시간이 필요해요",
      toastType: "info",
      soft: true,
      retryable: true,
    };
  }

  if (/Failed to fetch|네트워크|인터넷/i.test(raw)) {
    return {
      message: "인터넷 연결을 확인한 뒤 다시 「조사 후 글 받기」를 눌러 주세요.",
      panelTitle: "연결을 확인해 주세요",
      toastType: "info",
      soft: true,
      retryable: true,
    };
  }

  if (isTechnicalErrorMessage(raw)) {
    return {
      message:
        "이번에는 글이 준비되지 않았어요. 잠시 후 「조사 후 글 받기」를 다시 눌러 주세요.",
      panelTitle: "잠시 후 다시 시도해 주세요",
      toastType: "info",
      soft: true,
      retryable: true,
    };
  }

  return {
    message:
      raw ||
      "이번에는 글이 준비되지 않았어요. 브랜드 · 지역 · 주제를 구체적으로 입력해 주세요.",
    panelTitle: "입력을 확인해 주세요",
    toastType: "error",
    soft: false,
    retryable: true,
  };
}
