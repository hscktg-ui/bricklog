"use client";

import Icon from "./Icon";
import {
  VISION_TOOLBAR_BTN,
  VISION_TOOLBAR_BTN_ACCENT,
} from "@/lib/landing/vision2030Styles";

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
        className={VISION_TOOLBAR_BTN}
      >
        <Icon name="copy" className="h-4 w-4" />
        현재 채널 복사
      </button>
      <button
        type="button"
        onClick={onCopyAll}
        disabled={disabled}
        className={VISION_TOOLBAR_BTN_ACCENT}
      >
        <Icon name="copy" className="h-4 w-4" />
        전체 채널 복사
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        className={VISION_TOOLBAR_BTN}
      >
        <Icon name="document" className="h-4 w-4" />
        TXT 다운로드
      </button>
    </div>
  );
}
