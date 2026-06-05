"use client";

import { DEVICE_LABELS } from "@/lib/workspace/devicePreviewCycle";
import {
  DEVICE_WIDTHS,
  previewScaleForViewport,
} from "@/lib/workspace/devicePreviewLayout";
import { useViewport } from "@/hooks/useViewport";

/**
 * 기기 미리보기 — 좁은 폰에서 PC·태블릿도 눈에 보이게 (스케일) / 넓은 화면에서는 max-width
 */
export default function DevicePreviewViewport({
  preview,
  native,
  simulating,
  children,
  className = "",
  dataAttribute = "data-workspace-preview",
}) {
  const { width: viewportWidth } = useViewport();
  const dataProps = { [dataAttribute]: preview };

  if (!simulating) {
    return (
      <div className={className} {...dataProps}>
        {children}
      </div>
    );
  }

  const targetWidth = DEVICE_WIDTHS[preview];
  const fit = previewScaleForViewport(targetWidth, viewportWidth);

  if (fit.mode === "fit") {
    return (
      <div
        className={`mx-auto w-full transition-[max-width] duration-300 ease-out shadow-[0_0_0_1px_rgba(0,0,0,0.06)] ${className}`}
        style={{ maxWidth: fit.width }}
        {...dataProps}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} {...dataProps}>
      <p className="mb-2 text-center text-[10px] font-medium text-[#8B95A1]">
        {DEVICE_LABELS[preview]} 미리보기 · {Math.round(fit.scale * 100)}%
      </p>
      <div className="overflow-x-hidden px-2">
        <div
          className="mx-auto origin-top"
          style={{
            width: fit.width,
            transform: `scale(${fit.scale})`,
            transformOrigin: "top center",
          }}
        >
          <div className="shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">{children}</div>
        </div>
      </div>
    </div>
  );
}
