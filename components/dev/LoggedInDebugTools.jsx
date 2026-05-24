"use client";

import ClickBlockerDebugPanel from "@/components/dev/ClickBlockerDebugPanel";
import DebugStatePublisher from "@/components/dev/DebugStatePublisher";
import { isClickDebugEnabled } from "@/lib/dev/debugStateRegistry";

/**
 * 로그인 후 화면에 dev 클릭 진단 도구를 붙입니다 (한 번만 마운트).
 */
export default function LoggedInDebugTools({ pageSnapshot, children }) {
  if (!isClickDebugEnabled()) {
    return children;
  }

  return (
    <>
      <DebugStatePublisher fragmentKey="page" snapshot={pageSnapshot} />
      {children}
      <ClickBlockerDebugPanel />
    </>
  );
}
