"use client";

import { useNarrowWorkspace } from "@/hooks/useNarrowWorkspace";

/** 로그인 후 작업 화면 — 모바일·태블릿(<1024px) 간소 UI */
export function useWorkspaceCompact() {
  const { narrow } = useNarrowWorkspace();
  return { compact: narrow };
}