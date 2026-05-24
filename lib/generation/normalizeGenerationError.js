/** 블로그 생성 실패 — 사용자에게 에러처럼 보이지 않게 정규화 */

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
      message: raw || "로그인이 필요합니다. 다시 로그인한 뒤 이야기 쓰기를 눌러 주세요.",
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
        "이번에는 연결이 끊겼을 수 있어요. 같은 주제로 「이야기 쓰기」를 한 번 더 눌러 주세요. 두 번째 시도에서 이어집니다.",
      panelTitle: "조금 더 시간이 필요해요",
      toastType: "info",
      soft: true,
      retryable: true,
    };
  }

  if (/Failed to fetch|네트워크|인터넷/i.test(raw)) {
    return {
      message: "인터넷 연결을 확인한 뒤 다시 「이야기 쓰기」를 눌러 주세요.",
      panelTitle: "연결을 확인해 주세요",
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
