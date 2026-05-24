import { NextResponse } from "next/server";

/**
 * 비관리자 데이터 덤프·보내기 차단
 * @param {{ isAdmin?: boolean }} gate
 */
export function denyDataExportUnlessAdmin(gate) {
  if (gate?.isAdmin) return null;
  return NextResponse.json(
    {
      ok: false,
      userMessage:
        "데이터보내기는 운영 관리자만 사용할 수 있습니다. 계정 삭제·개인정보 요청은 설정 또는 고객센터로 문의해 주세요.",
      code: "export_admin_only",
    },
    { status: 403 }
  );
}
