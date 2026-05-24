"use client";

import Icon from "./Icon";

export default function ResultToolbar({
  onCopyTab,
  onCopyAll,
  onDownload,
  disabled,
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCopyTab}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-xl border border-[#E8EBED] bg-white px-3 py-2 text-[12px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-50"
      >
        <Icon name="copy" className="h-4 w-4" />
        현재 채널 복사
      </button>
      <button
        type="button"
        onClick={onCopyAll}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-xl border border-[#03C75A]/30 bg-[#E8F9EF] px-3 py-2 text-[12px] font-semibold text-[#03A94D] hover:bg-[#03C75A]/10 disabled:opacity-50"
      >
        <Icon name="copy" className="h-4 w-4" />
        전체 채널 복사
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-xl border border-[#E8EBED] bg-white px-3 py-2 text-[12px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6] disabled:opacity-50"
      >
        <Icon name="document" className="h-4 w-4" />
        TXT 다운로드
      </button>
    </div>
  );
}
