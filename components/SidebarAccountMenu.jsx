"use client";

/**
 * 사이드바 하단 — 계정·환경
 */
export default function SidebarAccountMenu({
  onLogout,
  showAdminLink = false,
  demoMode = false,
}) {
  const itemClass =
    "flex min-h-[36px] w-full items-center rounded-lg px-2 py-1 text-left text-[12px] hover:bg-[#F7F8FA]";

  return (
    <div className="px-2.5 py-1.5">
      <div className="space-y-0">
        {showAdminLink && (
          <a
            href="/admin"
            className={`${itemClass} text-[13px] text-[#8B95A1]`}
          >
            관리자
          </a>
        )}
        <button type="button" onClick={onLogout} className={itemClass}>
          <span className="text-[13px] text-[#8B95A1]">로그아웃</span>
        </button>
      </div>
      {demoMode && (
        <p className="mt-2 text-center text-[10px] text-[#B0B8C1]">데모 모드</p>
      )}
    </div>
  );
}
