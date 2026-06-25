/** 클라이언트 블로그 생성 fetch 취소 — ContentContext ↔ pipeline 공유 */

let activeController = null;

export function beginBlogGenerationAbort() {
  activeController?.abort();
  activeController = new AbortController();
  return activeController;
}

export function getBlogGenerationAbortSignal() {
  return activeController?.signal;
}

export function cancelBlogGenerationAbort() {
  if (!activeController) return false;
  activeController.abort();
  activeController = null;
  return true;
}

export function clearBlogGenerationAbort() {
  activeController = null;
}

export function isBlogGenerationAbortError(err) {
  return (
    err?.name === "AbortError" ||
    err?.code === "GENERATION_ABORTED" ||
    err?.cause?.name === "AbortError"
  );
}
